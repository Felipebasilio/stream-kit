import { createServer, type Server } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';

import { canListen, DEFAULT_PORT, findFreePort } from './port.js';

const abertos: Server[] = [];

afterEach(async () => {
  await Promise.all(
    abertos.splice(0).map((s) => new Promise<void>((r) => s.close(() => r()))),
  );
});

function ocupar(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    abertos.push(s);
    s.once('error', reject);
    s.listen(port, '127.0.0.1', () => resolve());
  });
}

describe('findFreePort', () => {
  it('devolve a primeira porta livre', async () => {
    const sonda = (p: number): Promise<boolean> => Promise.resolve(p === 7375);
    expect(await findFreePort(sonda, 7373)).toBe(7375);
  });

  it('devolve a propria porta quando ela esta livre', async () => {
    expect(await findFreePort(() => Promise.resolve(true), 8080)).toBe(8080);
  });

  it('estoura com mensagem clara quando nao acha nenhuma', async () => {
    await expect(findFreePort(() => Promise.resolve(false), 9000)).rejects.toThrow(
      /nenhuma porta livre entre 9000 e 9019/,
    );
  });

  it('usa a porta padrao quando nenhuma e informada', async () => {
    expect(await findFreePort(() => Promise.resolve(true))).toBe(DEFAULT_PORT);
  });
});

describe('canListen', () => {
  it('porta livre devolve true', async () => {
    expect(await canListen(7411, '127.0.0.1')).toBe(true);
  });

  it('porta ocupada devolve false', async () => {
    await ocupar(7412);
    expect(await canListen(7412, '127.0.0.1')).toBe(false);
  });

  it('busca real pula a porta ocupada', async () => {
    await ocupar(7420);
    expect(await findFreePort(canListen, 7420)).toBe(7421);
  });
});
