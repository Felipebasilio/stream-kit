/**
 * Captura e verificacao visual das cenas.
 *
 * Faz tres coisas por cena, em cada canvas:
 *  1. tira a imagem de referencia
 *  2. mede TODO texto renderizado e falha se algum ficar abaixo do piso de
 *     legibilidade (o teste que prova que da para ler no celular)
 *  3. confere que nada essencial invade as areas que o player cobre
 *
 * Uso: node scripts/cenas.mjs [--atualizar]
 */

import { spawn } from 'node:child_process';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const RAIZ = new URL('..', import.meta.url).pathname;
const CLI = join(RAIZ, 'packages/server/dist/cli.js');
const SAIDA = join(RAIZ, 'capturas');
const PORTA = 7650;

const CANVAS = [
  { id: 'hd', largura: 1920, altura: 1080 },
  { id: 'qhd', largura: 2560, altura: 1440 },
  { id: 'vertical', largura: 1080, altura: 1920 },
];

const CENAS = ['starting', 'brb', 'ending', 'ingame', 'talking', 'alerts'];

/** Piso: 2,2% da altura do canvas. Espelha MIN_READABLE_UNITS. */
const PISO_UNIDADES = 22;

let falhas = 0;
const relatorio = [];

function checar(nome, ok, detalhe = '') {
  if (!ok) falhas++;
  relatorio.push({ nome, ok, detalhe });
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

// Estado limpo: a imagem de referencia precisa ser a mesma toda execucao.
await mkdir(SAIDA, { recursive: true });
await rm(join(SAIDA, 'estado-de-teste.json'), { force: true });

const servidor = spawn(
  'node',
  [
    CLI,
    '--port',
    String(PORTA),
    '--state',
    join(RAIZ, 'capturas', 'estado-de-teste.json'),
  ],
  { stdio: 'ignore' },
);
servidor.saida = new Promise((r) => servidor.once('exit', r));

await esperarServidor(`http://127.0.0.1:${PORTA}/health`);

const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? undefined,
  args: ['--no-sandbox', '--force-color-profile=srgb', '--font-render-hinting=none'],
});

try {
  for (const canvas of CANVAS) {
    const ctx = await navegador.newContext({
      viewport: { width: canvas.largura, height: canvas.altura },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce', // congela animacao: imagem comparavel entre execucoes
    });

    for (const cena of CENAS) {
      const pagina = await ctx.newPage();
      const erros = [];
      pagina.on('pageerror', (e) => erros.push(e.message));

      const url = `http://127.0.0.1:${PORTA}/overlay/?scene=${cena}&canvas=${canvas.id}`;
      await pagina.goto(url, { waitUntil: 'load' });

      if (cena === 'alerts') {
        // A cena de alertas so mostra algo quando um evento chega.
        await pagina.waitForTimeout(400);
        await fetch(`http://127.0.0.1:${PORTA}/api/event`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: `cap-${cena}-${canvas.id}`,
            kind: 'donation',
            user: 'Felipe',
            amount: 'R$ 20,00',
          }),
        });
      }
      await pagina.waitForTimeout(1200);

      const nome = `${cena}-${canvas.id}`;
      await pagina.screenshot({ path: join(SAIDA, `${nome}.png`) });

      checar(
        `${nome}: sem erro de JS`,
        erros.length === 0,
        erros.slice(0, 2).join(' | '),
      );

      // --- legibilidade -------------------------------------------------
      const pequenos = await pagina.evaluate((pisoUnidades) => {
        const u = parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--u'),
        );
        const piso = pisoUnidades * u;
        const achados = [];
        for (const el of document.querySelectorAll('*')) {
          const texto = [...el.childNodes]
            .filter((n) => n.nodeType === 3)
            .map((n) => n.textContent.trim())
            .join('');
          if (texto.length === 0) continue;
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0')
            continue;
          const fs = parseFloat(cs.fontSize);
          if (fs < piso - 0.5) {
            achados.push({ texto: texto.slice(0, 24), fs: Math.round(fs * 10) / 10 });
          }
        }
        return { piso: Math.round(piso * 10) / 10, achados };
      }, PISO_UNIDADES);

      checar(
        `${nome}: todo texto acima do piso de ${pequenos.piso}px`,
        pequenos.achados.length === 0,
        pequenos.achados.map((a) => `"${a.texto}" ${a.fs}px`).join(', '),
      );

      // --- areas seguras ------------------------------------------------
      const invasoes = await pagina.evaluate(() => {
        const orient = document.documentElement.dataset.orientation;
        const h = window.innerHeight;
        const w = window.innerWidth;
        const faixas =
          orient === 'vertical'
            ? [
                { nome: 'controles', y0: h * 0.88, y1: h, x0: 0, x1: w },
                { nome: 'interacao', y0: 0, y1: h, x0: w * 0.85, x1: w },
              ]
            : [{ nome: 'controles', y0: h * 0.92, y1: h, x0: 0, x1: w }];
        const achados = [];
        for (const el of document.querySelectorAll(
          '.titulo, .kicker, .recado, .rede__arroba, .contagem__valor, .alerta__texto, .papo-topico',
        )) {
          const r = el.getBoundingClientRect();
          if (r.width === 0) continue;
          for (const f of faixas) {
            const cruza =
              r.bottom > f.y0 && r.top < f.y1 && r.right > f.x0 && r.left < f.x1;
            if (cruza) achados.push(`${el.className} invade ${f.nome}`);
          }
        }
        return achados;
      });

      checar(
        `${nome}: nada essencial em area insegura`,
        invasoes.length === 0,
        invasoes.join(', '),
      );

      await pagina.close();
    }
    await ctx.close();
  }

  // --- a cena nunca fica preta ------------------------------------------
  {
    const ctx = await navegador.newContext({ viewport: { width: 1920, height: 1080 } });
    const pagina = await ctx.newPage();
    await pagina.goto(`http://127.0.0.1:${PORTA}/overlay/?scene=starting&canvas=hd`, {
      waitUntil: 'load',
    });
    await pagina.waitForTimeout(800);
    const antes = await pagina.textContent('.titulo');

    servidor.kill('SIGKILL');
    await servidor.saida;
    await pagina.waitForTimeout(1500);

    const depois = await pagina.textContent('.titulo');
    const visivel = await pagina.evaluate(
      () => document.querySelector('.titulo')?.getBoundingClientRect().width > 0,
    );
    await pagina.screenshot({ path: join(SAIDA, 'servidor-fora.png') });
    checar(
      'servidor cai e a cena continua desenhando',
      depois === antes && visivel,
      `antes="${antes}" depois="${depois}"`,
    );
    await ctx.close();
  }
} finally {
  servidor.kill('SIGKILL');
  await navegador.close();
}

const imagens = existsSync(SAIDA)
  ? (await readdir(SAIDA)).filter((f) => f.endsWith('.png'))
  : [];
await writeFile(
  join(SAIDA, 'relatorio.json'),
  JSON.stringify({ falhas, imagens: imagens.length, relatorio }, null, 2),
);

console.log(`\n${imagens.length} imagens em capturas/`);
console.log(falhas === 0 ? 'tudo passou' : `${falhas} verificacao(oes) falharam`);
process.exitCode = falhas === 0 ? 0 : 1;
