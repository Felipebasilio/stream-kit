/**
 * Verifica as cenas de tela cheia COM A CONTAGEM LIGADA.
 *
 * Existe por causa de um bug que so aparecia nessa combinacao: no canvas
 * vertical, com a contagem regressiva ligada, o cronometro aparecia por tras
 * do bloco de @s. Os dois se atravessavam porque o bloco de @s era absoluto —
 * ancorado ao rodape, sem empurrar nem ser empurrado — enquanto o palco
 * crescia para baixo com a contagem.
 *
 * A varredura de cenas (`pnpm cenas`) nao pegava: `countdown.enabled` e
 * `false` no estado padrao, entao a contagem nunca era desenhada la. O estado
 * padrao e um caminho feliz, e caminho feliz nao encontra bug.
 *
 * O que se verifica aqui, nas tres resolucoes e nas tres cenas de texto:
 *  1. o palco e o bloco de @s nunca se cruzam
 *  2. nada vaza para fora do quadro
 *  3. o horizontal continua como sempre foi (o bloco segue absoluto la)
 *  4. com cinco redes o vertical ainda acomoda tudo
 *
 * Uso: node scripts/contagem.mjs [--atualizar]
 */

import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const RAIZ = new URL('..', import.meta.url).pathname;
const CLI = join(RAIZ, 'packages/server/dist/cli.js');
const SAIDA = join(RAIZ, 'capturas');
const PORTA = 7653;
const ATUALIZAR = process.argv.includes('--atualizar');

const CANVAS = [
  { id: 'hd', largura: 1920, altura: 1080, orientacao: 'horizontal' },
  { id: 'qhd', largura: 2560, altura: 1440, orientacao: 'horizontal' },
  { id: 'vertical', largura: 1080, altura: 1920, orientacao: 'vertical' },
];

const CENAS = ['starting', 'brb', 'ending'];

/** Piso de legibilidade: 2,2% da altura. Espelha MIN_READABLE_UNITS. */
const PISO_UNIDADES = 22;

/**
 * As animacoes de entrada terminam em 1,22s (a do bloco de @s e a ultima).
 * Medir antes disso le posicoes que ainda estao se movendo — foi assim que uma
 * primeira medicao acusou vazamento onde nao havia.
 */
const ESPERA_ANIMACAO = 1600;

const TRES_REDES = [
  { icon: 'youtube', handle: 'LIPE_BASA', show: true },
  { icon: 'tiktok', handle: 'LIPE_BASA', show: true },
  { icon: 'discord', handle: 'https://discord.gg/abbnxrpe4', show: true },
];

/** Duas a mais, para provar que o layout cede em vez de estourar. */
const CINCO_REDES = [
  ...TRES_REDES,
  { icon: 'instagram', handle: 'LIPE_BASA', show: true },
  { icon: 'kick', handle: 'LIPE_BASA', show: true },
];

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

await mkdir(SAIDA, { recursive: true });
await rm(join(SAIDA, 'estado-contagem.json'), { force: true });

const servidor = spawn(
  'node',
  [CLI, '--port', String(PORTA), '--state', join(SAIDA, 'estado-contagem.json')],
  { stdio: 'ignore' },
);

const base = `http://127.0.0.1:${PORTA}`;
await esperarServidor(`${base}/health`);

async function porRedes(socials) {
  await fetch(`${base}/api/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ socials }),
  });
}

// A contagem LIGADA e o ponto de toda esta verificacao.
await porRedes(TRES_REDES);
await fetch(`${base}/api/countdown`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ minutes: 15 }),
});

const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? undefined,
  args: ['--no-sandbox', '--force-color-profile=srgb', '--font-render-hinting=none'],
});

/** Roda no navegador: devolve as caixas que interessam e os tamanhos de fonte. */
function medir() {
  const caixa = (el) => {
    const r = el.getBoundingClientRect();
    return {
      t: Math.round(r.top),
      b: Math.round(r.bottom),
      l: Math.round(r.left),
      r: Math.round(r.right),
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  };
  const um = (sel) => {
    const el = document.querySelector(sel);
    return el === null ? null : caixa(el);
  };

  const pecas = [];
  for (const sel of ['.kicker', '.titulo', '.recado', '.contagem', '.redes-bloco']) {
    for (const el of document.querySelectorAll(sel)) {
      const c = caixa(el);
      if (c.w > 0 && c.h > 0) pecas.push({ sel, ...c });
    }
  }

  const textos = [];
  for (const el of document.querySelectorAll('.contagem__valor, .contagem__rotulo')) {
    textos.push({
      classe: el.className,
      px: parseFloat(getComputedStyle(el).fontSize),
    });
  }

  const bloco = document.querySelector('.redes-bloco');
  return {
    palco: um('.palco'),
    redes: um('.redes-bloco'),
    contagem: um('.contagem'),
    pecas,
    textos,
    posicaoDoBloco: bloco === null ? null : getComputedStyle(bloco).position,
  };
}

const cruzam = (a, z) => a.b > z.t && a.t < z.b && a.r > z.l && a.l < z.r;

try {
  for (const canvas of CANVAS) {
    const ctx = await navegador.newContext({
      viewport: { width: canvas.largura, height: canvas.altura },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });

    for (const cena of CENAS) {
      const pagina = await ctx.newPage();
      await pagina.goto(`${base}/overlay/?scene=${cena}&canvas=${canvas.id}`, {
        waitUntil: 'load',
      });
      await pagina.waitForTimeout(ESPERA_ANIMACAO);

      const m = await pagina.evaluate(medir);
      const nome = `${cena}-${canvas.id}`;

      checar(`${nome}: a contagem esta na tela`, m.contagem !== null);

      // --- 1. o bug relatado -------------------------------------------
      /*
       * A medicao e de CONTEUDO contra conteudo, nao de caixa contra caixa.
       *
       * No horizontal o palco ocupa a altura inteira de propósito, e o bloco
       * de @s flutua por cima dele — as caixas se cruzam e esta certo, porque
       * o texto fica centralizado bem longe do rodape. Comparar as caixas ali
       * acusaria um problema que nao existe.
       */
      if (m.redes !== null) {
        const porCima = m.pecas.filter(
          (p) => p.sel !== '.redes-bloco' && cruzam(p, m.redes),
        );
        checar(
          `${nome}: nada do palco fica por tras dos @s`,
          porCima.length === 0,
          porCima
            .map(
              (p) =>
                `${p.sel} ${String(p.t)}-${String(p.b)} contra @s ${String(m.redes.t)}`,
            )
            .join(', '),
        );
      }

      /*
       * No vertical existe a garantia mais forte: ali o bloco de @s e uma
       * linha da coluna, entao nem as CAIXAS podem se cruzar. E isso que
       * mantem o layout de pe quando o conteudo cresce.
       */
      if (canvas.orientacao === 'vertical' && m.palco !== null && m.redes !== null) {
        checar(
          `${nome}: o palco e os @s dividem a coluna sem se cruzar`,
          !cruzam(m.palco, m.redes),
          `palco ate ${String(m.palco.b)}, @s a partir de ${String(m.redes.t)}`,
        );
      }

      // --- 2. nada vaza para fora do quadro ----------------------------
      const vazando = m.pecas.filter(
        (p) =>
          p.t < -1 || p.l < -1 || p.b > canvas.altura + 1 || p.r > canvas.largura + 1,
      );
      checar(
        `${nome}: nada vaza para fora do quadro`,
        vazando.length === 0,
        vazando.map((p) => `${p.sel} ${String(p.t)}-${String(p.b)}`).join(', '),
      );

      // --- 3. o cronometro continua legivel ----------------------------
      const piso = (PISO_UNIDADES * canvas.altura) / 1000;
      const pequenos = m.textos.filter((t) => t.px < piso - 0.5);
      checar(
        `${nome}: o texto da contagem passa do piso de ${piso.toFixed(1)}px`,
        pequenos.length === 0,
        pequenos.map((t) => `${t.classe} ${t.px.toFixed(1)}px`).join(', '),
      );

      // --- 4. o horizontal continua como sempre foi --------------------
      /*
       * Guarda explicita do pedido: consertar o vertical sem mexer no que ja
       * funcionava. No horizontal o bloco de @s segue absoluto, flutuando
       * acima do rodape; se um dia ele virar `relative` aqui, alguem mudou o
       * horizontal sem querer.
       */
      const esperada = canvas.orientacao === 'vertical' ? 'relative' : 'absolute';
      checar(
        `${nome}: o bloco de @s e ${esperada}, como manda a orientacao`,
        m.posicaoDoBloco === esperada,
        String(m.posicaoDoBloco),
      );

      if (ATUALIZAR && cena === 'starting') {
        await pagina.screenshot({ path: join(SAIDA, `contagem-${canvas.id}.png`) });
      }
      await pagina.close();
    }
    await ctx.close();
  }

  // --- 5. com cinco redes o vertical ainda acomoda -----------------------
  /*
   * O caso que quebraria de novo se alguem "consertasse" com numeros fixos em
   * vez de deixar o layout ceder sozinho.
   */
  await porRedes(CINCO_REDES);
  {
    const ctx = await navegador.newContext({
      viewport: { width: 1080, height: 1920 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });
    const pagina = await ctx.newPage();
    await pagina.goto(`${base}/overlay/?scene=starting&canvas=vertical`, {
      waitUntil: 'load',
    });
    await pagina.waitForTimeout(ESPERA_ANIMACAO);
    const m = await pagina.evaluate(medir);

    checar(
      'vertical com cinco redes: o palco cede em vez de estourar',
      m.palco !== null && m.redes !== null && !cruzam(m.palco, m.redes),
      m.palco === null ? 'sem palco' : `palco ate ${String(m.palco.b)}`,
    );
    const porCima = m.pecas.filter(
      (p) => m.redes !== null && p.sel !== '.redes-bloco' && cruzam(p, m.redes),
    );
    checar(
      'vertical com cinco redes: nada do palco fica por tras dos @s',
      porCima.length === 0,
      porCima.map((p) => p.sel).join(', '),
    );
    const vazando = m.pecas.filter((p) => p.b > 1921 || p.t < -1);
    checar(
      'vertical com cinco redes: nada vaza para fora do quadro',
      vazando.length === 0,
      vazando.map((p) => `${p.sel} ${String(p.t)}-${String(p.b)}`).join(', '),
    );
    await ctx.close();
  }
} finally {
  await navegador.close();
  servidor.kill('SIGTERM');
}

console.log(falhas === 0 ? '\ntudo passou' : `\n${falhas} falha(s)`);
process.exit(falhas === 0 ? 0 : 1);
