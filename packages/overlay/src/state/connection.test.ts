import { createDefaultState } from '@stream-kit/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { connect, urlDoSocket, type SocketLike } from './connection.js';

class SocketFalso implements SocketLike {
  ouvintes = new Map<string, ((ev: { data?: unknown }) => void)[]>();
  fechado = false;

  addEventListener(tipo: string, ouvinte: (ev: { data?: unknown }) => void): void {
    const lista = this.ouvintes.get(tipo) ?? [];
    lista.push(ouvinte);
    this.ouvintes.set(tipo, lista);
  }
  close(): void {
    this.fechado = true;
  }
  disparar(tipo: string, ev: { data?: unknown } = {}): void {
    for (const o of this.ouvintes.get(tipo) ?? []) o(ev);
  }
}

let criados: SocketFalso[];
let agendados: { fn: () => void; ms: number }[];

function montar(opcoes: Partial<Parameters<typeof connect>[0]> = {}) {
  const estados: unknown[] = [];
  const eventos: unknown[] = [];
  const status: boolean[] = [];
  const fechar = connect(
    {
      url: 'ws://x/ws',
      createSocket: () => {
        const s = new SocketFalso();
        criados.push(s);
        return s;
      },
      schedule: (fn, ms) => {
        agendados.push({ fn, ms });
        return agendados.length - 1;
      },
      cancel: () => {},
      baseDelayMs: 100,
      maxDelayMs: 800,
      ...opcoes,
    },
    {
      onState: (s) => estados.push(s),
      onEvent: (e) => eventos.push(e),
      onStatus: (c) => status.push(c),
    },
  );
  return { estados, eventos, status, fechar };
}

beforeEach(() => {
  criados = [];
  agendados = [];
});

describe('conexao', () => {
  it('abre assim que e criada', () => {
    montar();
    expect(criados).toHaveLength(1);
  });

  it('avisa quando conecta e quando cai', () => {
    const { status } = montar();
    criados[0]?.disparar('open');
    criados[0]?.disparar('close');
    expect(status).toEqual([true, false]);
  });

  it('entrega estado e evento separadamente', () => {
    const { estados, eventos } = montar();
    criados[0]?.disparar('message', {
      data: JSON.stringify({ type: 'state', state: createDefaultState() }),
    });
    criados[0]?.disparar('message', {
      data: JSON.stringify({
        type: 'event',
        event: { id: '1', kind: 'follow', user: 'a' },
      }),
    });
    expect(estados).toHaveLength(1);
    expect(eventos).toHaveLength(1);
  });

  it('mensagem estragada e ignorada sem derrubar a cena', () => {
    const { estados } = montar();
    expect(() => criados[0]?.disparar('message', { data: '{ quebrado' })).not.toThrow();
    expect(estados).toHaveLength(0);
  });

  it('tipo desconhecido e ignorado', () => {
    const { estados, eventos } = montar();
    criados[0]?.disparar('message', { data: JSON.stringify({ type: 'ack', id: 'x' }) });
    expect(estados).toHaveLength(0);
    expect(eventos).toHaveLength(0);
  });
});

describe('reconexao', () => {
  it('agenda nova tentativa quando a conexao cai', () => {
    montar();
    criados[0]?.disparar('close');
    expect(agendados).toHaveLength(1);
    expect(agendados[0]?.ms).toBe(100);
  });

  it('erro tambem dispara reconexao', () => {
    montar();
    criados[0]?.disparar('error');
    expect(agendados).toHaveLength(1);
  });

  it('o atraso dobra a cada falha, ate o teto', () => {
    montar();
    const atrasos: number[] = [];
    for (let i = 0; i < 6; i++) {
      criados.at(-1)?.disparar('close');
      const ultimo = agendados.at(-1);
      if (ultimo === undefined) break;
      atrasos.push(ultimo.ms);
      ultimo.fn(); // simula o tempo passando
    }
    expect(atrasos).toEqual([100, 200, 400, 800, 800, 800]);
  });

  it('conectar de novo zera o atraso', () => {
    montar();
    criados[0]?.disparar('close');
    agendados[0]?.fn();
    criados[1]?.disparar('open');
    criados[1]?.disparar('close');
    expect(agendados.at(-1)?.ms).toBe(100);
  });

  it('queda repetida do mesmo socket nao agenda duas vezes', () => {
    montar();
    criados[0]?.disparar('close');
    criados[0]?.disparar('error');
    expect(agendados).toHaveLength(1);
  });

  it('fechar de proposito nao reconecta', () => {
    const { fechar } = montar();
    fechar();
    criados[0]?.disparar('close');
    expect(agendados).toHaveLength(0);
    expect(criados[0]?.fechado).toBe(true);
  });

  it('fechar cancela uma reconexao ja agendada', () => {
    const cancelar = vi.fn();
    const { fechar } = montar({ cancel: cancelar });
    criados[0]?.disparar('close');
    fechar();
    expect(cancelar).toHaveBeenCalledTimes(1);
    agendados[0]?.fn();
    expect(criados).toHaveLength(1);
  });

  it('o cancelamento padrao usa clearTimeout de verdade', () => {
    vi.useFakeTimers();
    const criados2: SocketFalso[] = [];
    const fechar = connect(
      {
        url: 'ws://x',
        createSocket: () => {
          const s = new SocketFalso();
          criados2.push(s);
          return s;
        },
        baseDelayMs: 50,
      },
      { onState: () => {}, onEvent: () => {} },
    );
    criados2[0]?.disparar('close');
    fechar();
    vi.advanceTimersByTime(500);
    // Se o clearTimeout padrao nao funcionasse, um segundo socket apareceria.
    expect(criados2).toHaveLength(1);
    vi.useRealTimers();
  });

  it('usa setTimeout de verdade quando nenhum agendador e injetado', () => {
    const fechar = connect(
      { url: 'ws://x', createSocket: () => new SocketFalso() },
      { onState: () => {}, onEvent: () => {} },
    );
    expect(() => fechar()).not.toThrow();
  });
});

describe('urlDoSocket', () => {
  it('http vira ws e https vira wss', () => {
    expect(urlDoSocket({ protocol: 'http:', host: 'localhost:7373' })).toBe(
      'ws://localhost:7373/ws?role=overlay',
    );
    expect(urlDoSocket({ protocol: 'https:', host: 'x.com' })).toBe(
      'wss://x.com/ws?role=overlay',
    );
  });

  it('a cena sempre se apresenta como overlay, nunca como painel', () => {
    expect(urlDoSocket({ protocol: 'http:', host: 'a' })).toContain('role=overlay');
  });
});
