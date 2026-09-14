/**
 * Verifica o que o `.app` faz no primeiro segundo de vida.
 *
 * Existe porque um bug passou por tipos, testes e lint e so apareceu depois de
 * instalar o app: o processo principal roda como CommonJS e todos os nossos
 * pacotes sao ESM, entao a primeira linha do `main.js` estourava com
 * "require() of ES Module not supported". E, mesmo se abrisse, o servidor
 * copiado para dentro do app estava sem package.json e sem node_modules.
 *
 * Aqui o Electron e dublado e o servidor e de verdade.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const DESKTOP = join(RAIZ, 'apps/desktop');
const MAIN = join(DESKTOP, 'dist/main.cjs');
const SERVIDOR = join(DESKTOP, 'build/server/cli.cjs');

let falhas = 0;
const checar = (nome, ok, detalhe = '') => {
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${nome}${detalhe ? ` — ${detalhe}` : ''}`);
};

checar('o processo principal foi empacotado', existsSync(MAIN));
checar('o servidor foi empacotado num arquivo so', existsSync(SERVIDOR));
if (falhas > 0) {
  console.log('\nrode `pnpm --filter @stream-kit/desktop bundle` antes');
  process.exit(1);
}

// --- 1. o processo principal carrega como CommonJS? ----------------------
/*
 * `--no-experimental-require-module` e a peca central desta verificacao.
 *
 * O Node 22 (o do seu terminal) aceita `require()` de um modulo ESM. O Node 20
 * embutido no Electron 33 NAO aceita. Foi exatamente por isso que o bug passou
 * por tipos, testes e lint aqui e so apareceu depois de instalar o app.
 *
 * Com a flag, reproduzimos aqui o comportamento de la.
 */
const carga = spawn(process.execPath, [
  '--no-experimental-require-module',
  '-e',
  `
  const Module = require('node:module');
  const real = Module._load;
  // Dubla o electron: nada de janela, so o bastante para o modulo carregar.
  const naoFaz = () => {};
  const app = { on: naoFaz, isPackaged: false, getVersion: () => '0.1.0', quit: naoFaz, exit: naoFaz };
  const falso = {
    app,
    BrowserWindow: class { constructor() {} loadURL() {} on() {} focus() {} isDestroyed() { return false; } },
    Tray: class { setToolTip() {} setContextMenu() {} },
    Menu: { buildFromTemplate: () => ({}) },
    nativeImage: { createEmpty: () => ({}) },
    clipboard: { writeText: naoFaz },
    dialog: { showErrorBox: naoFaz, showMessageBox: async () => ({ response: 1 }) },
    shell: { openExternal: async () => {} },
  };
  Module._load = function (pedido, ...resto) {
    if (pedido === 'electron') return falso;
    return real.call(this, pedido, ...resto);
  };
  require(${JSON.stringify(MAIN)});
  console.log('CARREGOU');
`,
]);

let saida = '';
let erro = '';
carga.stdout.on('data', (d) => (saida += String(d)));
carga.stderr.on('data', (d) => (erro += String(d)));
const codigo = await new Promise((r) => carga.once('exit', r));

checar(
  'o processo principal carrega sem erro de modulo',
  codigo === 0 && saida.includes('CARREGOU'),
  erro.split('\n').find((l) => l.includes('Error')) ?? '',
);
checar(
  'nenhum ERR_REQUIRE_ESM no Node do Electron',
  !erro.includes('ERR_REQUIRE_ESM'),
  erro.includes('ERR_REQUIRE_ESM') ? 'o app nao abriria' : '',
);

// --- 2. o servidor empacotado sobe sozinho? ------------------------------
const dir = await mkdtemp(join(tmpdir(), 'pack-'));
const porta = 7702;
const srv = spawn(
  process.execPath,
  [
    SERVIDOR,
    '--port',
    String(porta),
    '--state',
    join(dir, 'state.json'),
    '--overlay',
    join(RAIZ, 'packages/overlay/dist'),
    '--panel',
    join(RAIZ, 'packages/panel/dist'),
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);

let linhaPronto;
srv.stdout.on('data', (d) => {
  for (const linha of String(d).split('\n')) {
    if (linha.trim().startsWith('{')) linhaPronto ??= linha.trim();
  }
});
let erroServidor = '';
srv.stderr.on('data', (d) => (erroServidor += String(d)));

let vivo = false;
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(`http://127.0.0.1:${porta}/health`)).ok) {
      vivo = true;
      break;
    }
  } catch {
    /* subindo */
  }
  await new Promise((r) => setTimeout(r, 150));
}

checar(
  'o servidor empacotado sobe',
  vivo,
  erroServidor.split('\n').find((l) => l.includes('Error')) ?? '',
);
checar('anuncia a porta em stdout', linhaPronto !== undefined, linhaPronto ?? '');

if (vivo) {
  const painel = await fetch(`http://127.0.0.1:${porta}/`);
  const cena = await fetch(`http://127.0.0.1:${porta}/overlay/?scene=starting&canvas=hd`);
  checar('serve o painel', painel.ok);
  checar('serve as cenas', cena.ok);

  await fetch(`http://127.0.0.1:${porta}/api/state`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ socialsLabel: 'EMPACOTADO' }),
  });
  srv.kill('SIGTERM');
  await new Promise((r) => srv.once('exit', r));
  const salvo = JSON.parse(await readFile(join(dir, 'state.json'), 'utf8'));
  checar(
    'grava o estado ao encerrar',
    salvo.socialsLabel === 'EMPACOTADO',
    salvo.socialsLabel,
  );
} else {
  srv.kill('SIGKILL');
}

console.log(falhas === 0 ? '\ntudo passou' : `\n${falhas} verificacao(oes) falharam`);
process.exitCode = falhas === 0 ? 0 : 1;
