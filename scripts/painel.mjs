/**
 * Verificacao de ponta a ponta do painel.
 *
 * Prova o que os testes unitarios nao alcancam: o caminho inteiro de uma
 * alteracao, do campo no painel ate o pixel na cena que vai ao ar.
 */

import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const RAIZ = new URL('..', import.meta.url).pathname;
const CLI = join(RAIZ, 'packages/server/dist/cli.js');
const SAIDA = join(RAIZ, 'capturas');
const PORTA = 7660;
const BASE = `http://127.0.0.1:${PORTA}`;

let falhas = 0;
function checar(nome, ok, detalhe = '') {
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${nome}${detalhe ? ` — ${detalhe}` : ''}`);
}

// Comeca sempre do zero: estado que sobra de uma execucao anterior faz o
// teste de desfazer passar ou falhar por acaso.
await mkdir(SAIDA, { recursive: true });
await rm(join(SAIDA, 'estado-painel.json'), { force: true });

const servidor = spawn(
  'node',
  [CLI, '--port', String(PORTA), '--state', join(SAIDA, 'estado-painel.json')],
  { stdio: 'ignore' },
);
servidor.saida = new Promise((r) => servidor.once('exit', r));

for (let i = 0; i < 80; i++) {
  try {
    const r = await fetch(`${BASE}/health`);
    if (r.ok) break;
  } catch {
    /* subindo */
  }
  await new Promise((r) => setTimeout(r, 150));
}

const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? undefined,
  args: ['--no-sandbox'],
});
const ctx = await navegador.newContext({ viewport: { width: 1680, height: 1200 } });

const estado = () => fetch(`${BASE}/api/state`).then((r) => r.json());

try {
  const painel = await ctx.newPage();
  const errosPainel = [];
  painel.on('pageerror', (e) => errosPainel.push(e.message));
  await painel.goto(`${BASE}/`, { waitUntil: 'load' });
  await painel.waitForSelector('#nome-canal');

  const cena = await ctx.newPage();
  await cena.goto(`${BASE}/overlay/?scene=starting&canvas=hd`, { waitUntil: 'load' });
  await cena.waitForTimeout(600);

  checar('painel abre sem erro de JS', errosPainel.length === 0, errosPainel.join(' | '));
  checar(
    'painel mostra que esta conectado',
    await painel.locator('[data-testid="conexao"].on').isVisible(),
  );

  // --- alteracao chega na cena ------------------------------------------
  await painel.fill('#nome-canal', 'CANAL DO FELIPE');
  await painel.waitForTimeout(500);
  checar(
    'nome digitado no painel aparece na cena',
    (await cena.textContent('.marca-dagua')) === 'CANAL DO FELIPE',
    await cena.textContent('.marca-dagua'),
  );

  // --- a regressao do bug do Python -------------------------------------
  await painel.fill('#nome-canal', 'PRIMEIRO');
  await painel.fill('#titulo', 'SEGUNDO');
  await painel.waitForTimeout(600);
  const depois = await estado();
  checar(
    'dois campos alterados em sequencia chegam os dois ao servidor',
    depois.brand.name === 'PRIMEIRO' && depois.scenes.starting.title === 'SEGUNDO',
    `nome=${depois.brand.name} titulo=${depois.scenes.starting.title}`,
  );

  // --- desfazer ---------------------------------------------------------
  await painel.keyboard.press('Control+z');
  await painel.waitForTimeout(500);
  const desfeito = await estado();
  checar(
    'desfazer volta o ultimo campo alterado',
    desfeito.scenes.starting.title !== 'SEGUNDO',
    `titulo agora: ${desfeito.scenes.starting.title}`,
  );

  await painel.keyboard.press('Control+Shift+z');
  await painel.waitForTimeout(500);
  checar('refazer traz de volta', (await estado()).scenes.starting.title === 'SEGUNDO');

  // --- paleta ------------------------------------------------------------
  await painel.getByRole('button', { name: 'Roxo' }).click();
  await painel.waitForTimeout(500);
  const corNaCena = await cena.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
  );
  checar('paleta escolhida chega na cena', corNaCena === '#8b5cf6', corNaCena);

  // --- alerta ------------------------------------------------------------
  const cenaAlerta = await ctx.newPage();
  await cenaAlerta.goto(`${BASE}/overlay/?scene=alerts&canvas=hd`, { waitUntil: 'load' });
  await cenaAlerta.waitForTimeout(600);
  await painel.getByRole('button', { name: 'Testar doação' }).click();
  await cenaAlerta.waitForSelector('.alerta', { timeout: 3000 }).catch(() => {});
  const textoAlerta = await cenaAlerta.textContent('.alerta__texto').catch(() => '');
  checar(
    'botao de teste dispara o alerta na cena',
    (textoAlerta ?? '').includes('fulano_teste'),
    textoAlerta ?? 'nenhum alerta',
  );

  // --- troca de canvas ---------------------------------------------------
  await painel.getByRole('button', { name: '1080x1920' }).click();
  await painel.waitForTimeout(500);
  checar('troca de canvas fica salva', (await estado()).previewCanvas === 'vertical');
  const src = await painel.getAttribute('iframe[title="prévia"]', 'src');
  checar(
    'a previa passa a mostrar o vertical',
    (src ?? '').includes('canvas=vertical'),
    src ?? '',
  );

  // --- regua de celular --------------------------------------------------
  await painel.getByRole('button', { name: 'Régua 360px' }).click();
  await painel.waitForTimeout(400);
  const larguraRegua = await painel.evaluate(
    () =>
      document.querySelector('[data-testid="moldura"]')?.getBoundingClientRect().width,
  );
  checar(
    'a regua mostra a cena no tamanho de um celular',
    Math.round(larguraRegua ?? 0) === 360,
    `${String(larguraRegua)}px`,
  );

  // --- transicao ---------------------------------------------------------
  await painel.getByRole('button', { name: '1920x1080' }).click();
  await painel.waitForTimeout(300);
  const cenaTransicao = await ctx.newPage();
  await cenaTransicao.goto(`${BASE}/overlay/?scene=starting&canvas=hd`, {
    waitUntil: 'load',
  });
  await cenaTransicao.waitForTimeout(600);

  await painel.getByRole('button', { name: 'Tocar agora' }).click();
  const apareceu = await cenaTransicao
    .waitForSelector('.transicao', { timeout: 2000 })
    .then(() => true)
    .catch(() => false);
  checar('transicao pedida no painel aparece na cena', apareceu);

  await cenaTransicao.waitForTimeout(900);
  const sumiu = (await cenaTransicao.locator('.transicao').count()) === 0;
  checar('a transicao sai sozinha depois da duracao', sumiu);

  // Desligada, nao deve aparecer: e o interruptor de emergencia no meio da live.
  await painel.locator('#transicao-ligada').uncheck();
  await painel.waitForTimeout(400);
  await fetch(`${BASE}/api/transition`, { method: 'POST' });
  await cenaTransicao.waitForTimeout(500);
  checar(
    'transicao desligada nao aparece',
    (await cenaTransicao.locator('.transicao').count()) === 0,
  );
  await painel.locator('#transicao-ligada').check();
  await painel.waitForTimeout(300);

  // --- som ---------------------------------------------------------------
  const cenaSom = await ctx.newPage();
  await cenaSom.addInitScript(() => {
    // Conta quantas vezes o app pediu para tocar um tom sintetizado.
    window.__tons = 0;
    const Original = window.AudioContext;
    window.AudioContext = class extends Original {
      createOscillator() {
        window.__tons += 1;
        return super.createOscillator();
      }
    };
  });
  const errosSom = [];
  cenaSom.on('pageerror', (e) => errosSom.push(e.message));
  await cenaSom.goto(`${BASE}/overlay/?scene=audio&canvas=hd`, { waitUntil: 'load' });
  await cenaSom.waitForTimeout(600);
  checar('cena de som carrega sem erro', errosSom.length === 0, errosSom.join(' | '));

  await fetch(`${BASE}/api/event`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'som1', kind: 'donation', user: 'x', amount: 'R$ 5' }),
  });
  await cenaSom.waitForTimeout(700);
  const tons = await cenaSom.evaluate(() => window.__tons ?? 0);
  checar('evento toca o tom sintetizado', tons > 0, `${String(tons)} osciladores`);

  await fetch(`${BASE}/api/state`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ alerts: { soundEnabled: false } }),
  });
  await cenaSom.waitForTimeout(400);
  const antesDeDesligado = await cenaSom.evaluate(() => window.__tons ?? 0);
  await fetch(`${BASE}/api/event`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'som2', kind: 'follow', user: 'y' }),
  });
  await cenaSom.waitForTimeout(700);
  checar(
    'com o som desligado nada toca',
    (await cenaSom.evaluate(() => window.__tons ?? 0)) === antesDeDesligado,
  );
  await fetch(`${BASE}/api/state`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ alerts: { soundEnabled: true } }),
  });

  // --- persistencia entre recarregamentos --------------------------------
  await painel.reload({ waitUntil: 'load' });
  await painel.waitForSelector('#nome-canal');
  await painel.waitForTimeout(600);
  checar(
    'ao reabrir, o painel mostra o que foi configurado',
    (await painel.inputValue('#nome-canal')) === 'PRIMEIRO',
    await painel.inputValue('#nome-canal'),
  );

  await painel.screenshot({ path: join(SAIDA, 'painel.png'), fullPage: true });
} finally {
  servidor.kill('SIGKILL');
  await navegador.close();
}

console.log(falhas === 0 ? '\ntudo passou' : `\n${falhas} verificacao(oes) falharam`);
process.exitCode = falhas === 0 ? 0 : 1;
