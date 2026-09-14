/**
 * Gera um stinger em .webm com canal alfa a partir da transicao do app.
 *
 * Para que serve: o OBS troca de cena com um video de transicao. Como as
 * cores vem do estado, o stinger sai na identidade do momento — regerar e um
 * comando.
 *
 * Precisa do ffmpeg. No macOS: `brew install ffmpeg`.
 * Uso: node scripts/stinger.mjs [--porta 7670] [--saida stinger.webm]
 */

import { spawn, spawnSync } from 'node:child_process';
import { mkdir, rm, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const RAIZ = new URL('..', import.meta.url).pathname;
const CLI = join(RAIZ, 'packages/server/dist/cli.js');

const arg = (nome, padrao) => {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? (process.argv[i + 1] ?? padrao) : padrao;
};

const PORTA = Number(arg('porta', '7670'));
const SAIDA = arg('saida', join(RAIZ, 'capturas', 'stinger.webm'));
const FPS = 60;

const temFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
if (!temFfmpeg) {
  console.error('ffmpeg nao encontrado.');
  console.error('No macOS:  brew install ffmpeg');
  console.error('');
  console.error('Sem ele nao da para montar o .webm com canal alfa. Enquanto isso, a');
  console.error('transicao continua funcionando como cena de navegador — que inclusive');
  console.error('segue as cores do painel ao vivo, coisa que o arquivo pronto nao faz.');
  process.exit(1);
}

const quadros = join(RAIZ, 'capturas', 'quadros-stinger');
await rm(quadros, { recursive: true, force: true });
await mkdir(quadros, { recursive: true });

const servidor = spawn(
  'node',
  [
    CLI,
    '--port',
    String(PORTA),
    '--state',
    join(RAIZ, 'capturas', 'estado-stinger.json'),
  ],
  { stdio: 'ignore' },
);
for (let i = 0; i < 80; i++) {
  try {
    if ((await fetch(`http://127.0.0.1:${PORTA}/health`)).ok) break;
  } catch {
    /* subindo */
  }
  await new Promise((r) => setTimeout(r, 150));
}

const estado = await fetch(`http://127.0.0.1:${PORTA}/api/state`).then((r) => r.json());
const duracao = estado.transition.durationMs;
const total = Math.ceil((duracao / 1000) * FPS);

const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? undefined,
  args: ['--no-sandbox'],
});

try {
  const ctx = await navegador.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const pagina = await ctx.newPage();
  await pagina.goto(
    `http://127.0.0.1:${PORTA}/overlay/?scene=transition-only&canvas=hd&hold=1`,
    { waitUntil: 'load' },
  );
  await pagina.waitForTimeout(500);

  // Congela a animacao e avanca o relogio quadro a quadro. Capturar em tempo
  // real perderia quadros e o stinger sairia tremido.
  await pagina.evaluate(() => {
    document.documentElement.dataset.congelado = '1';
  });

  await fetch(`http://127.0.0.1:${PORTA}/api/transition`, { method: 'POST' });
  await pagina.waitForSelector('.transicao', { timeout: 3000 });

  for (let i = 0; i < total; i++) {
    const t = (i / FPS) * 1000;
    await pagina.evaluate((ms) => {
      for (const el of document.querySelectorAll('.transicao, .transicao__faixa')) {
        for (const anim of el.getAnimations()) {
          anim.pause();
          anim.currentTime = ms;
        }
      }
    }, t);
    await pagina.screenshot({
      path: join(quadros, `q${String(i).padStart(4, '0')}.png`),
      omitBackground: true,
    });
  }

  const quantos = (await readdir(quadros)).length;
  console.log(`${quantos} quadros capturados (${duracao}ms a ${FPS}fps)`);

  await new Promise((resolve, reject) => {
    const ff = spawn(
      'ffmpeg',
      [
        '-y',
        '-framerate',
        String(FPS),
        '-i',
        join(quadros, 'q%04d.png'),
        '-c:v',
        'libvpx-vp9',
        '-pix_fmt',
        'yuva420p', // o "a" e o canal alfa: sem ele o fundo vira preto
        '-b:v',
        '4M',
        '-auto-alt-ref',
        '0',
        SAIDA,
      ],
      { stdio: 'ignore' },
    );
    ff.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg saiu com ${code}`)),
    );
  });

  console.log(`pronto: ${SAIDA}`);
  console.log('No OBS: Transicoes -> + -> Stinger -> escolha esse arquivo.');
} finally {
  servidor.kill('SIGKILL');
  await navegador.close();
}
