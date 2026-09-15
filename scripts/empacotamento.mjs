/**
 * Verifica o que o `.app` faz no primeiro segundo de vida.
 *
 * Existe porque bugs de empacotamento passam por tipos, testes e lint e so
 * aparecem depois de instalar o app. Ja pegou dois:
 *
 *  1. "require() of ES Module not supported": o processo principal roda como
 *     CommonJS e todos os nossos pacotes sao ESM. E o servidor copiado para
 *     dentro do app estava sem package.json e sem node_modules.
 *  2. `Route GET:/ not found` na janela do painel. O servidor subia, `/health`
 *     respondia, e o painel dava 404 — porque o processo principal nunca
 *     passava `--overlay` e `--panel` para o filho.
 *
 * O segundo bug e a razao de este arquivo ter mudado de forma. A versao
 * anterior subia o servidor com os caminhos que ELA MESMA escolhia, e por isso
 * dava OK em "serve o painel" enquanto o app de verdade servia 404. Agora ela
 * PERGUNTA ao `main.cjs` quais argumentos ele usaria, e sobe o servidor com
 * exatamente aqueles — inclusive fingindo estar empacotado, que e o caminho
 * que ninguem exercitava.
 *
 * Aqui o Electron e dublado e o servidor e de verdade.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, symlink } from 'node:fs/promises';
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

// --- 1. o processo principal carrega, e com que argumentos ele sobe? -----
/*
 * `--no-experimental-require-module` e a peca central desta verificacao.
 *
 * O Node 22 (o do seu terminal) aceita `require()` de um modulo ESM. O Node 20
 * embutido no Electron 33 NAO aceita. Foi exatamente por isso que o primeiro
 * bug passou por tipos, testes e lint aqui e so apareceu depois de instalar.
 *
 * Com a flag, reproduzimos aqui o comportamento de la.
 */
async function carregarMain({ empacotado, resourcesPath }) {
  const roteiro = `
  const Module = require('node:module');
  const real = Module._load;
  const naoFaz = () => {};

  ${resourcesPath === undefined ? '' : `process.resourcesPath = ${JSON.stringify(resourcesPath)};`}

  // Guarda o handler de 'ready': sem chama-lo o app nunca sobe o servidor, e
  // era justamente no spawn que o bug morava.
  let aoFicarPronto;
  const app = {
    on: (evento, fn) => { if (evento === 'ready') aoFicarPronto = fn; },
    isPackaged: ${String(empacotado)},
    getVersion: () => '0.1.0',
    quit: naoFaz,
    exit: naoFaz,
  };
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

  // Dubla o spawn para capturar COMO o app chamaria o servidor, sem chamar.
  let capturado;
  const filhoFalso = {
    pid: 1234,
    kill: () => true,
    on: naoFaz,
    stdout: { on: naoFaz },
  };
  const processoFalso = {
    ...require('node:child_process'),
    spawn: (comando, args) => { capturado ??= { comando, args }; return filhoFalso; },
  };

  Module._load = function (pedido, ...resto) {
    if (pedido === 'electron') return falso;
    if (pedido === 'node:child_process' || pedido === 'child_process') return processoFalso;
    return real.call(this, pedido, ...resto);
  };

  require(${JSON.stringify(MAIN)});
  console.log('CARREGOU');
  if (typeof aoFicarPronto === 'function') aoFicarPronto();
  console.log('SPAWN ' + JSON.stringify(capturado ?? null));
  // Sai na hora: o app agenda uma consulta de atualizacao para 8s depois.
  process.exit(0);
`;

  const filho = spawn(process.execPath, [
    '--no-experimental-require-module',
    '-e',
    roteiro,
  ]);
  let saida = '';
  let erro = '';
  filho.stdout.on('data', (d) => (saida += String(d)));
  filho.stderr.on('data', (d) => (erro += String(d)));
  const codigo = await new Promise((r) => filho.once('exit', r));

  const linha = saida.split('\n').find((l) => l.startsWith('SPAWN '));
  return {
    codigo,
    saida,
    erro,
    carregou: saida.includes('CARREGOU'),
    spawn: linha === undefined ? null : JSON.parse(linha.slice(6)),
  };
}

const dev = await carregarMain({ empacotado: false });

checar(
  'o processo principal carrega sem erro de modulo',
  dev.codigo === 0 && dev.carregou,
  dev.erro.split('\n').find((l) => l.includes('Error')) ?? '',
);
checar(
  'nenhum ERR_REQUIRE_ESM no Node do Electron',
  !dev.erro.includes('ERR_REQUIRE_ESM'),
  dev.erro.includes('ERR_REQUIRE_ESM') ? 'o app nao abriria' : '',
);
checar('o app sobe o servidor ao ficar pronto', dev.spawn !== null);

/*
 * O teste do bug do 404.
 *
 * Nao basta o servidor saber servir o painel quando alguem diz onde ele esta:
 * o APP precisa dizer. A versao anterior desta verificacao escolhia os
 * caminhos por conta propria e por isso dava OK enquanto o app real servia
 * `Route GET:/ not found`.
 */
const argsDev = dev.spawn?.args ?? [];
checar(
  'o app diz ao servidor onde estao as cenas',
  argsDev.includes('--overlay'),
  argsDev.join(' '),
);
checar(
  'o app diz ao servidor onde esta o painel',
  argsDev.includes('--panel'),
  argsDev.join(' '),
);

// --- 1b. e agora fingindo estar dentro de um `.app` ----------------------
/*
 * O caminho que ninguem exercitava. `localizar()` tem dois ramos e so o de
 * desenvolvimento era visto aqui; o de dentro do `.app` so aparecia depois de
 * instalar. Montamos uma pasta com a mesma forma de `Contents/Resources` e
 * conferimos que os caminhos apontam para dentro dela.
 */
const resources = await mkdtemp(join(tmpdir(), 'resources-'));
await mkdir(join(resources, 'server'), { recursive: true });
await symlink(SERVIDOR, join(resources, 'server', 'cli.cjs'));
await symlink(join(RAIZ, 'packages/overlay/dist'), join(resources, 'overlay'));
await symlink(join(RAIZ, 'packages/panel/dist'), join(resources, 'panel'));

const empacotado = await carregarMain({ empacotado: true, resourcesPath: resources });
const argsApp = empacotado.spawn?.args ?? [];
/*
 * `indexOf` devolve -1 quando a bandeira nao esta la, e -1 + 1 e 0 — que e o
 * caminho do proprio servidor. A primeira versao disto dava OK dizendo que as
 * cenas apontavam para `server/cli.cjs`. Verificacao que mente e pior que
 * verificacao que falta.
 */
const valorDe = (bandeira) => {
  const i = argsApp.indexOf(bandeira);
  return i < 0 ? undefined : argsApp[i + 1];
};

checar('empacotado, o app tambem sobe o servidor', empacotado.spawn !== null);
checar(
  'empacotado, o servidor vem de dentro do .app',
  typeof argsApp[0] === 'string' && argsApp[0].startsWith(resources),
  argsApp[0] ?? '',
);
for (const [bandeira, pasta] of [
  ['--overlay', 'cenas'],
  ['--panel', 'painel'],
]) {
  const caminho = valorDe(bandeira);
  checar(
    `empacotado, ${pasta} apontam para dentro do .app`,
    typeof caminho === 'string' && caminho.startsWith(resources),
    caminho ?? 'nao passado',
  );
  checar(
    `empacotado, a pasta de ${pasta} existe`,
    existsSync(caminho ?? ''),
    caminho ?? '',
  );
}

// --- 2. o servidor empacotado sobe sozinho? ------------------------------
const dir = await mkdtemp(join(tmpdir(), 'pack-'));
const porta = 7702;
/*
 * Sobe o servidor com os argumentos QUE O APP USARIA, nao com os nossos.
 * E a diferenca entre provar que o servidor funciona e provar que o app
 * funciona — e so a segunda importa para quem instalou o `.app`.
 */
const srv = spawn(
  process.execPath,
  [...argsApp, '--port', String(porta), '--state', join(dir, 'state.json')],
  /*
   * `cwd` fora do monorepo, de proposito.
   *
   * Dentro de um `.app` o diretorio de trabalho nunca e a pasta do projeto.
   * Rodando daqui, o palpite relativo ao cwd acertaria por acidente e o
   * servidor serviria o painel mesmo sem o app ter passado os caminhos — que
   * foi exatamente como o bug do 404 passou batido.
   */
  { stdio: ['ignore', 'pipe', 'pipe'], cwd: dir },
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

// --- 3. caminho errado recusa subir, em vez de servir 404 ----------------
/*
 * A outra metade da defesa.
 *
 * Mesmo com o app passando os caminhos, um empacotamento futuro pode passar um
 * caminho que nao existe. Antes o servidor subia assim mesmo e so devolvia 404
 * — o app abria uma janela com `Route GET:/ not found` e nenhuma pista. Agora
 * ele recusa subir e diz o que houve, que e o que o app consegue mostrar numa
 * caixa de erro.
 */
{
  const erradoDir = await mkdtemp(join(tmpdir(), 'ruim-'));
  const ruim = spawn(
    process.execPath,
    [
      SERVIDOR,
      '--port',
      '7703',
      '--state',
      join(erradoDir, 'state.json'),
      '--overlay',
      join(erradoDir, 'nao-existe-overlay'),
      '--panel',
      join(erradoDir, 'nao-existe-painel'),
    ],
    { stdio: ['ignore', 'pipe', 'pipe'], cwd: erradoDir },
  );
  let saidaRuim = '';
  ruim.stdout.on('data', (d) => (saidaRuim += String(d)));
  ruim.stderr.on('data', (d) => (saidaRuim += String(d)));
  const codigoRuim = await new Promise((r) => ruim.once('exit', r));

  checar(
    'pasta inexistente faz o servidor recusar subir',
    codigoRuim === 1,
    `saiu com ${String(codigoRuim)}`,
  );
  checar(
    'o erro diz qual pasta e onde ela deveria estar',
    saidaRuim.includes('painel') && saidaRuim.includes('nao-existe-painel'),
    saidaRuim.split('\n').find((l) => l.includes('[erro]')) ?? saidaRuim.slice(0, 120),
  );
  checar(
    'o erro diz o que fazer',
    saidaRuim.includes('Reinstale'),
    saidaRuim.includes('Reinstale') ? '' : 'mensagem sem saida para o usuario',
  );
  checar(
    'nao anuncia porta nenhuma: nao chegou a escutar',
    !saidaRuim.includes('"streamKit":"ready"'),
  );
}

console.log(falhas === 0 ? '\ntudo passou' : `\n${falhas} verificacao(oes) falharam`);
process.exitCode = falhas === 0 ? 0 : 1;
