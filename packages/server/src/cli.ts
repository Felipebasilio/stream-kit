/**
 * Ponto de entrada do processo. Sobe o servidor e encerra com educacao.
 *
 * Fica fora da medicao de cobertura: e amarracao, nao logica. O que ele
 * coordena (store, hub, portas) e testado em separado.
 */

import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { CANVASES, type CanvasId } from '@stream-kit/types';

import { createApp } from './app.js';
import { nodeFs } from './node-fs.js';
import { resolvePort, resolveStatePath } from './paths.js';
import { canListen, DEFAULT_PORT, findFreePort } from './port.js';
import { StateStore } from './state-store.js';
import { listOverlayUrls } from './urls.js';

const HOST = '127.0.0.1';
const PING_INTERVAL_MS = 20_000;

/** Le um caminho de pasta do argumento, ou cai no padrao do monorepo. */
function resolvePasta(argumento: string, padraoRelativo: string): string {
  const indice = process.argv.indexOf(argumento);
  const informado = indice >= 0 ? process.argv[indice + 1] : undefined;
  if (informado !== undefined && informado.length > 0) return resolve(informado);
  return resolve(process.cwd(), padraoRelativo);
}

async function main(): Promise<void> {
  const portaPedida = resolvePort(process.argv, DEFAULT_PORT);
  const caminhoEstado = resolveStatePath({ argv: process.argv, env: process.env });

  // A pasta de dados pode nao existir na primeira execucao.
  const pastaDados = dirname(caminhoEstado);
  const pastaSons = resolve(pastaDados, 'sons');
  const pastaIcones = resolve(pastaDados, 'icones');
  await mkdir(pastaDados, { recursive: true });
  await mkdir(pastaSons, { recursive: true });
  await mkdir(pastaIcones, { recursive: true });

  const store = new StateStore({
    filePath: caminhoEstado,
    fs: nodeFs,
    onWarning: (m) => {
      console.warn(`[estado] ${m}`);
    },
  });
  await store.load();

  const porta = await findFreePort(canListen, portaPedida, HOST);
  // Quem sabe onde estao os builds e quem chama: o app de Mac passa os
  // caminhos dentro do .app, e em desenvolvimento caimos na pasta do
  // monorepo. Antes isso era deduzido de `import.meta.url`, o que quebrava ao
  // empacotar — e ainda amarrava o servidor a uma disposicao de pastas.
  const app = await createApp({
    store,
    staticRoots: {
      overlay: resolvePasta('--overlay', 'packages/overlay/dist'),
      panel: resolvePasta('--panel', 'packages/panel/dist'),
      sounds: pastaSons,
      icons: pastaIcones,
    },
  });
  const { fastify, hub } = app;

  const ping = setInterval(() => {
    const derrubados = app.heartbeat();
    if (derrubados > 0) console.warn(`  ${String(derrubados)} conexao(oes) sem resposta`);
  }, PING_INTERVAL_MS);

  await fastify.listen({ port: porta, host: HOST });

  const origin = `http://localhost:${String(porta)}`;
  const canvas = store.get().previewCanvas as CanvasId;
  const spec = CANVASES[canvas];

  // Linha estruturada em stdout, para quem esta lendo com um programa.
  // O texto bonito vai para stderr; misturar os dois obrigaria o app de Mac a
  // raspar texto humano para descobrir em que porta o servidor ficou.
  process.stdout.write(
    `${JSON.stringify({ streamKit: 'ready', port: porta, panel: origin, state: caminhoEstado })}\n`,
  );

  console.warn(`\n  Stream Kit no ar`);
  console.warn(`  Painel: ${origin}/`);
  console.warn(`  Estado: ${caminhoEstado}`);
  console.warn(`  Sons:   ${pastaSons}`);
  console.warn(`  Ícones: ${pastaIcones}`);
  console.warn(`\n  Fontes de navegador no OBS (${spec.label}):`);
  for (const item of listOverlayUrls(origin, canvas)) {
    console.warn(`    ${item.label.padEnd(12)} ${item.url}`);
  }
  console.warn('\n  Ctrl+C para parar.\n');

  let encerrando = false;
  const encerrar = (sinal: string): void => {
    if (encerrando) return;
    encerrando = true;
    console.warn(`\n  Encerrando (${sinal})...`);
    clearInterval(ping);
    hub.closeAll();
    void (async (): Promise<void> => {
      await fastify.close();
      await store.close();
      console.warn('  Estado salvo. Ate mais.');
      process.exit(0);
    })();
  };

  process.on('SIGINT', () => {
    encerrar('SIGINT');
  });
  process.on('SIGTERM', () => {
    encerrar('SIGTERM');
  });
}

main().catch((erro: unknown) => {
  console.error('falha ao subir o servidor:', erro);
  process.exit(1);
});
