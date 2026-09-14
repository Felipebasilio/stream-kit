/**
 * Prova que um icone do usuario chega ate a cena.
 *
 * O campo `iconFile` existia no contrato e a cena ja sabia desenhar um <img>,
 * mas nao havia pasta servida nem jeito de escolher pelo painel: a
 * documentacao mandava apontar um caminho que o servidor nao servia. Esta
 * verificacao existe para isso nao voltar a acontecer — ela nao olha codigo,
 * olha o pixel.
 *
 * Uso: node scripts/icones.mjs
 */

import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const RAIZ = new URL('..', import.meta.url).pathname;
const CLI = join(RAIZ, 'packages/server/dist/cli.js');
const PORTA = 7651;

/** Quadrado magenta: nenhuma cor do tema chega perto, entao nao ha falso OK. */
const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
  '<rect width="24" height="24" fill="#ff00ff"/></svg>';

let falhas = 0;
function checar(nome, ok, detalhe = '') {
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${nome}${detalhe ? ` — ${detalhe}` : ''}`);
}

async function esperarServidor(url) {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* subindo */
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('servidor nao subiu');
}

const pastaDados = await mkdtemp(join(tmpdir(), 'stream-kit-icones-'));
await mkdir(join(pastaDados, 'icones'), { recursive: true });
await writeFile(join(pastaDados, 'icones', 'teste.svg'), SVG);

const servidor = spawn(
  'node',
  [CLI, '--port', String(PORTA), '--state', join(pastaDados, 'state.json')],
  { stdio: 'ignore' },
);

const base = `http://127.0.0.1:${PORTA}`;
await esperarServidor(`${base}/health`);

const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? undefined,
  args: ['--no-sandbox'],
});

try {
  // 1. o servidor enxerga a pasta que ele mesmo criou
  const lista = await (await fetch(`${base}/api/icons`)).json();
  checar(
    'o painel consegue listar os icones do usuario',
    lista.icons.includes('teste.svg'),
    JSON.stringify(lista.icons),
  );

  // 2. o arquivo e servido de verdade
  const arquivo = await fetch(`${base}/icones/teste.svg`);
  checar(
    'o arquivo e servido em /icones',
    arquivo.status === 200,
    `HTTP ${arquivo.status}`,
  );

  // 3. escolher o arquivo e o que o painel faz: guardar o nome no estado
  await fetch(`${base}/api/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      socials: [
        { icon: 'tiktok', handle: 'LIPE_BASA', show: true, iconFile: 'teste.svg' },
      ],
    }),
  });

  // 4. a cena desenha o arquivo, e nao o glifo generico
  const ctx = await navegador.newContext({ viewport: { width: 1920, height: 1080 } });
  const pagina = await ctx.newPage();
  await pagina.goto(`${base}/overlay/?scene=ingame&canvas=hd`, {
    waitUntil: 'networkidle',
  });
  await pagina.waitForTimeout(600);

  const img = await pagina.evaluate(() => {
    const el = document.querySelector('.rede__icone img');
    if (el === null) return null;
    const r = el.getBoundingClientRect();
    return {
      src: el.getAttribute('src'),
      carregou: el.complete && el.naturalWidth > 0,
      largura: Math.round(r.width),
      altura: Math.round(r.height),
      glifoGenerico: document.querySelector('.rede__icone svg') !== null,
    };
  });

  checar('a cena troca o glifo generico pelo arquivo', img !== null);
  if (img !== null) {
    checar(
      'o caminho aponta para a pasta servida',
      img.src === '/icones/teste.svg',
      img.src,
    );
    checar('o navegador conseguiu carregar a imagem', img.carregou);
    checar(
      'o icone tem tamanho na tela',
      img.largura > 10 && img.altura > 10,
      `${img.largura}x${img.altura}`,
    );
    checar('nao sobrou glifo generico junto', !img.glifoGenerico);
  }

  // 5. tirar o arquivo volta para o glifo — sem isso nao da para desfazer
  await fetch(`${base}/api/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      socials: [{ icon: 'tiktok', handle: 'LIPE_BASA', show: true }],
    }),
  });
  await pagina.waitForTimeout(400);
  const voltou = await pagina.evaluate(
    () =>
      document.querySelector('.rede__icone svg') !== null &&
      document.querySelector('.rede__icone img') === null,
  );
  checar('voltar para o icone generico funciona', voltou);

  await ctx.close();
} finally {
  await navegador.close();
  servidor.kill('SIGTERM');
}

console.log(falhas === 0 ? '\ntudo passou' : `\n${falhas} falha(s)`);
process.exit(falhas === 0 ? 0 : 1);
