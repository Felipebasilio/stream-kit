/**
 * Verifica a moldura da camera e a pilula de redes na barra.
 *
 * Tres coisas, nas tres resolucoes:
 *  1. cada uma das quatro posicoes cai no canto certo, respeita a margem e
 *     nao invade o que o player cobre
 *  2. a proporcao da moldura e a do recorte da webcam (280x260), para a
 *     imagem nao precisar ser esticada
 *  3. `cam=off` some com a moldura, e um @ longo (uma URL de convite do
 *     Discord) aparece inteiro em vez de ser cortado
 *
 * Uso: node scripts/camera.mjs [--atualizar]
 */

import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const RAIZ = new URL('..', import.meta.url).pathname;
const CLI = join(RAIZ, 'packages/server/dist/cli.js');
const SAIDA = join(RAIZ, 'capturas');
const PORTA = 7652;
const ATUALIZAR = process.argv.includes('--atualizar');

const CANVAS = [
  { id: 'hd', largura: 1920, altura: 1080 },
  { id: 'qhd', largura: 2560, altura: 1440 },
  { id: 'vertical', largura: 1080, altura: 1920 },
];

const POSICOES = ['left-top', 'right-top', 'left-bottom', 'right-bottom'];

/** Proporcao do recorte da webcam. Espelha CAM_ASPECT no contrato. */
const PROPORCAO = 280 / 260;

/** Fracoes que o player cobre. Espelham safe-areas.ts. */
const COBERTURA = {
  horizontal: { topo: 0.06, base: 0.08, direita: 0 },
  vertical: { topo: 0.08, base: 0.12, direita: 0.15 },
};

/**
 * Dois @s de tamanhos bem diferentes, de proposito.
 *
 * O longo e o convite do Discord, que era cortado no meio. O curto existe
 * para provar o outro lado: a pilula dele nao pode herdar a largura do
 * Discord so porque os dois dividem a mesma celula do rodizio.
 */
const ARROBA_LONGA = 'https://discord.gg/lipebasa';
const ARROBA_CURTA = '@lipe';

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
await rm(join(SAIDA, 'estado-camera.json'), { force: true });

const servidor = spawn(
  'node',
  [CLI, '--port', String(PORTA), '--state', join(SAIDA, 'estado-camera.json')],
  { stdio: 'ignore' },
);

const base = `http://127.0.0.1:${PORTA}`;
await esperarServidor(`${base}/health`);

// Um @ longo de proposito: e o caso que cortava antes.
await fetch(`${base}/api/state`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    socials: [
      { icon: 'kick', handle: ARROBA_CURTA, show: true },
      { icon: 'discord', handle: ARROBA_LONGA, show: true },
    ],
  }),
});

const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? undefined,
  args: ['--no-sandbox', '--force-color-profile=srgb', '--font-render-hinting=none'],
});

function medir() {
  const cam = document.querySelector('.camera');
  const icone = document.querySelector(
    '.rodizio .rede__icone svg, .rodizio .rede__icone img',
  );
  const caixaIcone = document.querySelector('.rodizio .rede__icone');
  const barra = document.querySelector('.barra');
  const rodizio = document.querySelector('.rodizio');
  return {
    camera:
      cam === null
        ? null
        : (() => {
            const r = cam.getBoundingClientRect();
            return {
              x: Math.round(r.left),
              y: Math.round(r.top),
              w: Math.round(r.width),
              h: Math.round(r.height),
            };
          })(),
    // Uma entrada por @ visivel, na ordem em que entram no rodizio.
    pilulas: [...document.querySelectorAll('.rodizio .rede')].map((el) => {
      const arroba = el.querySelector('.rede__arroba');
      return {
        texto: arroba === null ? '' : arroba.textContent,
        largura: Math.round(el.getBoundingClientRect().width),
        // scrollWidth maior que clientWidth e exatamente o corte.
        cortado: arroba !== null && arroba.scrollWidth > arroba.clientWidth + 1,
      };
    }),
    rodizioLargura:
      rodizio === null ? 0 : Math.round(rodizio.getBoundingClientRect().width),
    respiroIcone:
      icone === null || caixaIcone === null
        ? null
        : Math.round(
            (caixaIcone.getBoundingClientRect().width -
              icone.getBoundingClientRect().width) /
              2,
          ),
    fundoBarra: barra === null ? null : getComputedStyle(barra).backgroundImage,
  };
}

try {
  for (const canvas of CANVAS) {
    const orientacao = canvas.largura >= canvas.altura ? 'horizontal' : 'vertical';
    const cobre = COBERTURA[orientacao];
    const ctx = await navegador.newContext({
      viewport: { width: canvas.largura, height: canvas.altura },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });

    for (const pos of POSICOES) {
      const pagina = await ctx.newPage();
      await pagina.goto(`${base}/overlay/?scene=ingame&canvas=${canvas.id}&cam=${pos}`, {
        waitUntil: 'load',
      });
      await pagina.waitForTimeout(700);

      const m = await pagina.evaluate(medir);
      const nome = `${canvas.id} ${pos}`;

      if (m.camera === null) {
        checar(`${nome}: a moldura aparece`, false);
        await pagina.close();
        continue;
      }

      const { x, y, w, h } = m.camera;
      const direita = x + w;
      const base_ = y + h;

      checar(
        `${nome}: proporcao do recorte da webcam`,
        Math.abs(w / h - PROPORCAO) < 0.02,
        `${w}x${h} (${(w / h).toFixed(3)} contra ${PROPORCAO.toFixed(3)})`,
      );

      /*
       * O lado e medido dentro da area VISIVEL, nao do quadro.
       *
       * No vertical os 15% da direita ficam embaixo dos botoes de interacao
       * do celular: uma moldura "na direita" que ignorasse isso estaria na
       * direita do arquivo e no meio da tela de quem assiste.
       */
      const limiteDireito = canvas.largura * (1 - cobre.direita);
      const centroX = x + w / 2;
      const naEsquerda = pos.startsWith('left');
      checar(
        `${nome}: no lado ${naEsquerda ? 'esquerdo' : 'direito'} da area visivel`,
        naEsquerda ? centroX < limiteDireito / 2 : centroX > limiteDireito / 2,
        `x=${x} ate ${direita}, meio visivel em ${Math.round(limiteDireito / 2)}`,
      );

      const emCima = pos.endsWith('top');
      checar(
        `${nome}: ${emCima ? 'em cima' : 'embaixo'}`,
        emCima ? base_ < canvas.altura / 2 : y > canvas.altura / 2,
        `y=${y} ate ${base_}`,
      );

      const invasoes = [];
      if (y < canvas.altura * cobre.topo) invasoes.push('titulo do player');
      if (base_ > canvas.altura * (1 - cobre.base)) invasoes.push('controles do player');
      if (cobre.direita > 0 && direita > canvas.largura * (1 - cobre.direita)) {
        invasoes.push('botoes de interacao');
      }
      checar(
        `${nome}: fora das areas que o player cobre`,
        invasoes.length === 0,
        invasoes.join(', '),
      );

      // A moldura nunca pode encostar na barra inferior.
      checar(
        `${nome}: nao encosta na barra inferior`,
        base_ < canvas.altura - 84 * (canvas.altura / 1000),
        `sobra ${Math.round(canvas.altura - base_)}px`,
      );

      if (pos === 'left-bottom') {
        // `text-transform` muda o desenho, nao o textContent: compara cru.
        const acha = (alvo) => m.pilulas.find((p) => p.texto === alvo);
        const curta = acha(ARROBA_CURTA);
        const longa = acha(ARROBA_LONGA);

        checar(
          `${canvas.id}: o @ longo aparece inteiro`,
          longa !== undefined && !longa.cortado,
          `"${longa?.texto ?? 'sumiu'}" em ${String(longa?.largura ?? 0)}px`,
        );
        /*
         * As pilulas dividem a mesma celula do rodizio. O padrao da celula e
         * esticar todo mundo ate a largura da maior, e era isso que dava ao
         * "@lipe" a pilula gigante do Discord.
         */
        checar(
          `${canvas.id}: cada @ tem a largura do seu proprio texto`,
          curta !== undefined &&
            longa !== undefined &&
            curta.largura < longa.largura * 0.6,
          `curta ${String(curta?.largura ?? 0)}px contra longa ${String(longa?.largura ?? 0)}px`,
        );
        /*
         * A caixa do rodizio, por outro lado, NAO pode encolher junto: ela
         * reserva a largura da maior. Se encolhesse, o relogio escorregaria de
         * lugar a cada cinco segundos.
         */
        checar(
          `${canvas.id}: a caixa do rodizio nao encolhe com o @ da vez`,
          longa !== undefined && m.rodizioLargura >= longa.largura,
          `caixa ${String(m.rodizioLargura)}px, maior pilula ${String(longa?.largura ?? 0)}px`,
        );
        checar(
          `${canvas.id}: o icone tem respiro dentro do quadrado`,
          m.respiroIcone !== null && m.respiroIcone >= 8,
          `${String(m.respiroIcone)}px de cada lado`,
        );
        checar(
          `${canvas.id}: a barra nao tem mais faixa de fundo`,
          m.fundoBarra === 'none',
          String(m.fundoBarra),
        );
        if (ATUALIZAR) {
          await pagina.screenshot({ path: join(SAIDA, `camera-${canvas.id}.png`) });
        }
      }

      await pagina.close();
    }

    // --- sem camera --------------------------------------------------------
    const semCam = await ctx.newPage();
    await semCam.goto(`${base}/overlay/?scene=ingame&canvas=${canvas.id}&cam=off`, {
      waitUntil: 'load',
    });
    await semCam.waitForTimeout(500);
    const vazio = await semCam.evaluate(() => ({
      camera: document.querySelector('.camera') !== null,
      barra: document.querySelector('.barra') !== null,
    }));
    checar(`${canvas.id} cam=off: a moldura some`, !vazio.camera);
    checar(`${canvas.id} cam=off: a barra continua`, vazio.barra);
    await semCam.close();

    await ctx.close();
  }

  // --- a URL vence o painel, que e o que faz o botao unico funcionar -------
  {
    await fetch(`${base}/api/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingame: { showCam: false, camPosition: 'left-bottom' } }),
    });
    const ctx = await navegador.newContext({ viewport: { width: 1920, height: 1080 } });
    const pagina = await ctx.newPage();
    await pagina.goto(`${base}/overlay/?scene=ingame&canvas=hd&cam=right-top`, {
      waitUntil: 'load',
    });
    await pagina.waitForTimeout(500);
    const r = await pagina.evaluate(() => {
      const el = document.querySelector('.camera');
      if (el === null) return null;
      const b = el.getBoundingClientRect();
      return { classe: el.className, x: Math.round(b.left), y: Math.round(b.top) };
    });
    checar(
      'a cena com cam= ignora o painel desligado',
      r !== null && r.classe.includes('camera--right-top'),
      r === null ? 'sem moldura' : `${r.classe} em ${r.x},${r.y}`,
    );
    await ctx.close();
  }

  // --- sem cam= na URL, quem manda e o painel ------------------------------
  {
    await fetch(`${base}/api/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingame: { showCam: true, camPosition: 'right-bottom' } }),
    });
    const ctx = await navegador.newContext({ viewport: { width: 1920, height: 1080 } });
    const pagina = await ctx.newPage();
    await pagina.goto(`${base}/overlay/?scene=ingame&canvas=hd`, { waitUntil: 'load' });
    await pagina.waitForTimeout(500);

    const antes = await pagina.evaluate(
      () => document.querySelector('.camera')?.className ?? '',
    );
    checar(
      'sem cam= a cena obedece ao painel',
      antes.includes('camera--right-bottom'),
      antes,
    );

    // E muda ao vivo, que e o ponto do painel existir.
    await fetch(`${base}/api/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingame: { camPosition: 'left-top' } }),
    });
    await pagina.waitForTimeout(900);
    const depois = await pagina.evaluate(() => {
      const el = document.querySelector('.camera');
      return {
        classe: el?.className ?? '',
        transicao: el === null ? '' : getComputedStyle(el).transitionProperty,
      };
    });
    checar(
      'trocar de posicao no painel move a moldura ao vivo',
      depois.classe.includes('camera--left-top'),
      depois.classe,
    );
    checar(
      'o deslocamento e animado, nao um pulo',
      depois.transicao.includes('left') && depois.transicao.includes('top'),
      depois.transicao,
    );
    await ctx.close();
  }
} finally {
  await navegador.close();
  servidor.kill('SIGTERM');
}

console.log(falhas === 0 ? '\ntudo passou' : `\n${falhas} falha(s)`);
process.exit(falhas === 0 ? 0 : 1);
