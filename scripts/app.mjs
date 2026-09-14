/**
 * Verificacao do ciclo de vida do servidor dentro do app.
 *
 * Os testes unitarios usam processos falsos. Aqui e o processo de verdade, com
 * as tres coisas que estragam a experiencia se derem errado:
 *
 *  1. sobrar um Node rodando depois de fechar (porta presa na proxima abertura)
 *  2. perder a ultima edicao ao fechar
 *  3. ficar preso esperando um processo travado
 *
 * O empacotamento em .app so pode ser verificado no macOS — nao da para
 * construir um app de macOS fora dele. Isso fica com o Felipe (`pnpm dmg`).
 */

import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  ServidorEmbutido,
  lerPortaDaSaida,
} from '../apps/desktop/dist/server-process.js';

const RAIZ = new URL('..', import.meta.url).pathname;
const CLI = join(RAIZ, 'packages/server/dist/cli.js');

let falhas = 0;
const checar = (nome, ok, detalhe = '') => {
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${nome}${detalhe ? ` — ${detalhe}` : ''}`);
};

const vivo = (pid) => {
  if (pid === undefined) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const dir = await mkdtemp(join(tmpdir(), 'app-'));
const estado = join(dir, 'state.json');

let porta;
const servidor = new ServidorEmbutido({
  spawn: (comando, args) =>
    spawn(comando, [...args], { stdio: ['ignore', 'pipe', 'inherit'] }),
  executavel: process.execPath,
  args: [CLI, '--state', estado, '--port', '7680'],
  aoImprimir: (linha) => {
    porta ??= lerPortaDaSaida(linha);
  },
});

servidor.iniciar();
const pid = servidor.pid;

for (let i = 0; i < 80 && porta === undefined; i++) {
  await new Promise((r) => setTimeout(r, 150));
}

checar(
  'o app sobe o servidor e descobre a porta pela saida dele',
  porta !== undefined,
  String(porta),
);
checar(
  'o servidor responde na porta descoberta',
  (await fetch(`http://127.0.0.1:${porta}/health`)).ok,
);

// Uma edicao sem esperar a gravacao: e o pior caso de fechar o app.
await fetch(`http://127.0.0.1:${porta}/api/state`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ brand: { name: 'FECHANDO O APP' } }),
});

const resultado = await servidor.parar();
checar(
  'o servidor sai com educacao, sem precisar ser morto',
  resultado === 'saiu',
  resultado,
);
checar('nenhum processo orfao fica para tras', !vivo(pid), `pid ${String(pid)}`);

const salvo = JSON.parse(await readFile(estado, 'utf8'));
checar(
  'a ultima edicao foi gravada antes de sair',
  salvo.brand.name === 'FECHANDO O APP',
  salvo.brand.name,
);

// A porta precisa estar livre de novo para a proxima abertura.
const livre = spawnSync(process.execPath, [
  '-e',
  `const n=require('node:net');const s=n.createServer();s.once('error',()=>process.exit(1));s.listen(${porta},'127.0.0.1',()=>s.close(()=>process.exit(0)));`,
]);
checar('a porta fica livre para a proxima abertura', livre.status === 0);

console.log(falhas === 0 ? '\ntudo passou' : `\n${falhas} verificacao(oes) falharam`);
process.exitCode = falhas === 0 ? 0 : 1;
