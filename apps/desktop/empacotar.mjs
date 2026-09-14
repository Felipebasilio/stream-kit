/**
 * Empacota o processo principal e o servidor num arquivo cada.
 *
 * Por que isso existe, e nao basta o `tsc`:
 *
 * 1. O processo principal do Electron roda como CommonJS, e todos os nossos
 *    pacotes sao ESM. O `.app` abria com "require() of ES Module not
 *    supported" logo na primeira tela.
 * 2. O servidor era copiado para dentro do `.app` sem `package.json` e sem
 *    `node_modules`. Mesmo que o app abrisse, o servidor nao subiria: nem o
 *    Node saberia que aquilo e ESM, nem o fastify estaria la.
 *
 * Empacotar resolve os dois: cada saida vira um arquivo CommonJS autossuficiente,
 * com tudo dentro, sem depender de resolucao de modulos em tempo de execucao.
 * E os imports continuam sendo resolvidos na compilacao, entao o contrato de
 * tipos compartilhado segue valendo.
 */

import { build } from 'esbuild';
import { rm, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');

await rm(join(AQUI, 'dist'), { recursive: true, force: true });
await rm(join(AQUI, 'build', 'server'), { recursive: true, force: true });
await mkdir(join(AQUI, 'build', 'server'), { recursive: true });

const comum = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  logLevel: 'warning',
};

// O processo principal. `electron` fica de fora: ele e fornecido pelo runtime.
await build({
  ...comum,
  entryPoints: [join(AQUI, 'src', 'main.ts')],
  outfile: join(AQUI, 'dist', 'main.cjs'),
  external: ['electron'],
});

// O servidor, com fastify e tudo mais dentro.
await build({
  ...comum,
  entryPoints: [join(RAIZ, 'packages', 'server', 'src', 'cli.ts')],
  outfile: join(AQUI, 'build', 'server', 'cli.cjs'),
  // O fastify carrega alguns modulos por caminho calculado; manter o nome das
  // funcoes evita que a minificacao quebre esses caminhos.
  keepNames: true,
});

console.log('empacotado: dist/main.cjs e build/server/cli.cjs');
