/**
 * Prova de paridade entre o servidor em Python e o em Node.
 *
 * Sobe os dois contra o MESMO estado e compara o que cada um devolve em
 * /api/state, campo a campo. O plano previa um adaptador de SSE para rodar as
 * cenas antigas contra o servidor novo; trocamos por esta comparacao direta
 * porque escrever um adaptador para um protocolo que a etapa 03 vai aposentar
 * seria trabalho jogado fora.
 */

import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;

async function esperar(url, tentativas = 40) {
  for (let i = 0; i < tentativas; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
    } catch {
      // ainda subindo
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`servidor nao respondeu: ${url}`);
}

function comparar(python, node, caminho = '') {
  const diffs = [];
  const chaves = new Set([...Object.keys(python ?? {}), ...Object.keys(node ?? {})]);
  for (const chave of chaves) {
    const p = python?.[chave];
    const n = node?.[chave];
    const onde = caminho ? `${caminho}.${chave}` : chave;
    const ambosObjeto =
      p && n && typeof p === 'object' && typeof n === 'object' && !Array.isArray(p);
    if (ambosObjeto) {
      diffs.push(...comparar(p, n, onde));
    } else if (JSON.stringify(p) !== JSON.stringify(n)) {
      diffs.push({ campo: onde, python: p, node: n });
    }
  }
  return diffs;
}

const dir = await mkdtemp(join(tmpdir(), 'paridade-'));
const estado = JSON.parse(
  await readFile(join(RAIZ, 'legacy-python', 'state.json'), 'utf8').catch(() =>
    readFile(join(RAIZ, 'legacy-python', 'state.default.json'), 'utf8'),
  ),
);
await writeFile(join(dir, 'state.json'), JSON.stringify(estado), 'utf8');

const py = spawn(
  'python3',
  [join(RAIZ, 'legacy-python', 'server.py'), '--port', '7601'],
  {
    cwd: join(RAIZ, 'legacy-python'),
    stdio: 'ignore',
  },
);
const no = spawn(
  'node',
  [
    join(RAIZ, 'packages/server/dist/cli.js'),
    '--port',
    '7602',
    '--state',
    join(dir, 'state.json'),
  ],
  {
    cwd: dir,
    stdio: 'ignore',
    env: { ...process.env },
  },
);

try {
  const [doPython, doNode] = await Promise.all([
    esperar('http://127.0.0.1:7601/api/state'),
    esperar('http://127.0.0.1:7602/api/state'),
  ]);

  const diffs = comparar(doPython, doNode).filter(
    (d) =>
      !['schemaVersion', 'previewCanvas', 'brand.textFont', 'brand.titleFont'].includes(
        d.campo,
      ),
  );

  // Campo que existe so no Node e recurso NOVO (som, transicao, presets).
  // Regressao de paridade e quando os DOIS tem valor e os valores divergem:
  // ai algo que funcionava parou de funcionar igual.
  const esperados = diffs.filter((d) => d.python === undefined);
  const inesperados = diffs.filter((d) => d.python !== undefined);

  console.log(`campos comparados: ${Object.keys(doPython).length} blocos`);
  console.log(`campos novos, so no Node (esperado): ${esperados.length}`);
  for (const d of esperados) console.log(`  + ${d.campo}`);
  console.log(`diferencas INESPERADAS: ${inesperados.length}`);
  for (const d of inesperados) {
    console.log(
      `  ${d.campo}: python=${JSON.stringify(d.python)} node=${JSON.stringify(d.node)}`,
    );
  }
  process.exitCode = inesperados.length === 0 ? 0 : 1;
} finally {
  py.kill();
  no.kill();
}
