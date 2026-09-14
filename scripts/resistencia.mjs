/**
 * Prova de resistencia do servidor: as duas coisas do plano 02 que so
 * aparecem em uso real.
 *
 *  1. Ctrl+C (SIGINT) nao pode perder a ultima edicao.
 *  2. Matar o processo na marra (SIGKILL) nao pode deixar um state.json
 *     pela metade — se deixar, o app nao abre na proxima vez.
 */

import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CLI = new URL('../packages/server/dist/cli.js', import.meta.url).pathname;

async function subir(dir, porta) {
  const proc = spawn(
    'node',
    [CLI, '--port', String(porta), '--state', join(dir, 'state.json')],
    {
      stdio: 'ignore',
    },
  );
  // O ouvinte de saida precisa existir ANTES de o processo poder morrer:
  // registrar depois perde o evento e o script trava esperando para sempre.
  proc.saida = new Promise((r) => proc.once('exit', r));
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${porta}/health`);
      if (r.ok) return proc;
    } catch {
      // subindo
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  proc.kill('SIGKILL');
  throw new Error('servidor nao subiu');
}

function editar(porta, nome) {
  return fetch(`http://127.0.0.1:${porta}/api/state`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ brand: { name: nome } }),
  });
}

const esperarFim = (proc) => proc.saida;

let falhas = 0;
function checar(nome, condicao, detalhe = '') {
  console.log(`${condicao ? 'OK  ' : 'FALHA'} ${nome}${detalhe ? ` — ${detalhe}` : ''}`);
  if (!condicao) falhas++;
}

// --- 1. SIGINT preserva a ultima edicao -----------------------------------
{
  const dir = await mkdtemp(join(tmpdir(), 'sigint-'));
  const proc = await subir(dir, 7610);
  await editar(7610, 'EDICAO ANTES DO CTRL C');
  // Sem esperar o debounce de gravacao de proposito: e o pior caso.
  proc.kill('SIGINT');
  await esperarFim(proc);

  const salvo = JSON.parse(await readFile(join(dir, 'state.json'), 'utf8'));
  checar(
    'SIGINT grava a ultima edicao',
    salvo.brand.name === 'EDICAO ANTES DO CTRL C',
    `gravado: ${JSON.stringify(salvo.brand.name)}`,
  );
}

// --- 2. SIGKILL no meio da atividade nao corrompe -------------------------
{
  const dir = await mkdtemp(join(tmpdir(), 'sigkill-'));
  const proc = await subir(dir, 7611);
  await editar(7611, 'PRIMEIRA');
  await new Promise((r) => setTimeout(r, 300)); // deixa gravar
  // Agora uma rajada de edicoes e um kill no meio dela.
  const rajada = [];
  for (let i = 0; i < 200; i++) rajada.push(editar(7611, `EDICAO ${i}`));
  setTimeout(() => proc.kill('SIGKILL'), 30);
  await Promise.allSettled(rajada);
  await esperarFim(proc);

  let conteudo = '';
  let ok = false;
  try {
    conteudo = await readFile(join(dir, 'state.json'), 'utf8');
    const dados = JSON.parse(conteudo);
    ok = typeof dados.brand?.name === 'string' && dados.schemaVersion === 1;
  } catch {
    ok = false;
  }
  checar(
    'SIGKILL no meio da rajada deixa um arquivo integro',
    ok,
    `${conteudo.length} bytes, JSON valido: ${ok}`,
  );
}

process.exitCode = falhas === 0 ? 0 : 1;
