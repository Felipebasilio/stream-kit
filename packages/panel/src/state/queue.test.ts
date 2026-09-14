import type { StatePatch } from '@stream-kit/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SendQueue } from './queue.js';

let enviados: { patch: StatePatch; id: string }[];
let agendado: (() => void) | undefined;
let cancelado: number;

function criar(delay = 100): SendQueue {
  return new SendQueue({
    send: (patch, id) => enviados.push({ patch, id }),
    delayMs: delay,
    schedule: (fn) => {
      agendado = fn;
      return 1;
    },
    cancel: () => {
      cancelado++;
      agendado = undefined;
    },
  });
}

beforeEach(() => {
  enviados = [];
  agendado = undefined;
  cancelado = 0;
});

describe('acumulacao', () => {
  it('dois campos diferentes na mesma janela chegam os dois', () => {
    // Regressao do bug do painel em Python: a segunda alteracao cancelava a
    // primeira e o nome do canal se perdia em silencio.
    const fila = criar();
    fila.push({ brand: { name: 'CANAL' } });
    fila.push({ scenes: { starting: { title: 'COMECANDO' } } });
    agendado?.();

    expect(enviados).toHaveLength(1);
    const pacote = enviados[0]?.patch as {
      brand: { name: string };
      scenes: { starting: { title: string } };
    };
    expect(pacote.brand.name).toBe('CANAL');
    expect(pacote.scenes.starting.title).toBe('COMECANDO');
  });

  it('o mesmo campo alterado varias vezes envia so o valor final', () => {
    const fila = criar();
    for (const nome of ['A', 'AB', 'ABC']) fila.push({ brand: { name: nome } });
    agendado?.();
    expect(enviados).toHaveLength(1);
    expect((enviados[0]?.patch as { brand: { name: string } }).brand.name).toBe('ABC');
  });

  it('agenda uma unica vez enquanto houver pacote aberto', () => {
    const fila = criar();
    fila.push({ socialsLabel: 'A' });
    const primeiro = agendado;
    fila.push({ socialsLabel: 'B' });
    expect(agendado).toBe(primeiro);
  });

  it('conta o que esta pendente', () => {
    const fila = criar();
    expect(fila.pendente).toBe(0);
    fila.push({ socialsLabel: 'A' });
    fila.push({ socialsLabel: 'B' });
    expect(fila.pendente).toBe(2);
    agendado?.();
    expect(fila.pendente).toBe(0);
  });

  it('cada envio tem id proprio', () => {
    const fila = criar();
    fila.push({ socialsLabel: 'A' });
    fila.flush();
    fila.push({ socialsLabel: 'B' });
    fila.flush();
    expect(enviados[0]?.id).not.toBe(enviados[1]?.id);
  });
});

describe('flush e clear', () => {
  it('flush envia na hora e cancela o agendamento', () => {
    const fila = criar();
    fila.push({ socialsLabel: 'X' });
    fila.flush();
    expect(enviados).toHaveLength(1);
    expect(cancelado).toBe(1);
  });

  it('flush sem nada pendente nao envia', () => {
    criar().flush();
    expect(enviados).toHaveLength(0);
  });

  it('flush duas vezes seguidas nao duplica', () => {
    const fila = criar();
    fila.push({ socialsLabel: 'X' });
    fila.flush();
    fila.flush();
    expect(enviados).toHaveLength(1);
  });

  it('clear descarta o pendente sem enviar', () => {
    const fila = criar();
    fila.push({ socialsLabel: 'X' });
    fila.clear();
    fila.flush();
    expect(enviados).toHaveLength(0);
  });

  it('clear sem nada agendado nao quebra', () => {
    expect(() => criar().clear()).not.toThrow();
  });
});

describe('padroes', () => {
  it('funciona com setTimeout de verdade quando nada e injetado', () => {
    vi.useFakeTimers();
    const recebidos: StatePatch[] = [];
    const fila = new SendQueue({ send: (p) => recebidos.push(p) });
    fila.push({ socialsLabel: 'X' });
    vi.advanceTimersByTime(200);
    expect(recebidos).toHaveLength(1);
    fila.push({ socialsLabel: 'Y' });
    fila.clear();
    vi.advanceTimersByTime(200);
    expect(recebidos).toHaveLength(1);
    vi.useRealTimers();
  });
});
