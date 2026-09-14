import type { StreamEvent } from '@stream-kit/types';
import { beforeEach, describe, expect, it } from 'vitest';

import { Hub, type SocketLike } from './hub.js';
import { StateStore, type FileSystemLike } from './state-store.js';
import { attachClient } from './ws-handler.js';

const fsVazio: FileSystemLike = {
  readFile: () => Promise.reject(new Error('ENOENT')),
  writeFile: () => Promise.resolve(),
  rename: () => Promise.resolve(),
};

class SocketFalso implements SocketLike {
  enviados: unknown[] = [];
  send(data: string): void {
    this.enviados.push(JSON.parse(data));
  }
  close(): void {}
  ultima(): Record<string, unknown> {
    return (this.enviados.at(-1) ?? {}) as Record<string, unknown>;
  }
}

let hub: Hub;
let store: StateStore;
let eventos: StreamEvent[];
let transicoes: number;

beforeEach(async () => {
  hub = new Hub();
  store = new StateStore({ filePath: '/x/state.json', fs: fsVazio, writeDelayMs: 1 });
  await store.load();
  eventos = [];
  transicoes = 0;
});

function conectar(role: 'overlay' | 'panel'): {
  socket: SocketFalso;
  cliente: ReturnType<typeof attachClient>;
} {
  const socket = new SocketFalso();
  const cliente = attachClient(socket, role, {
    hub,
    store,
    onEvent: (e) => eventos.push(e),
    onTransition: () => {
      transicoes += 1;
    },
  });
  return { socket, cliente };
}

describe('conexao', () => {
  it('manda o estado na hora, para a cena nao ficar em branco', () => {
    const { socket } = conectar('overlay');
    expect(socket.ultima()['type']).toBe('state');
  });

  it('fechar remove do hub', () => {
    const { cliente } = conectar('overlay');
    expect(hub.size).toBe(1);
    cliente.onClose();
    expect(hub.size).toBe(0);
  });
});

describe('patch', () => {
  it('painel escreve e recebe confirmacao', () => {
    const { socket, cliente } = conectar('panel');
    cliente.onMessage(
      JSON.stringify({ type: 'patch', id: 'p1', patch: { brand: { name: 'NOVO' } } }),
    );
    expect(store.get().brand.name).toBe('NOVO');
    expect(socket.ultima()).toEqual({ type: 'ack', id: 'p1' });
  });

  it('cena nao escreve estado', () => {
    const { socket, cliente } = conectar('overlay');
    cliente.onMessage(
      JSON.stringify({ type: 'patch', id: 'p1', patch: { brand: { name: 'HACK' } } }),
    );
    expect(store.get().brand.name).toBe('SEU CANAL');
    expect(socket.ultima()['type']).toBe('error');
    expect(String(socket.ultima()['message'])).toContain('painel');
  });

  it('patch invalido responde erro com o id, sem alterar nada', () => {
    const { socket, cliente } = conectar('panel');
    cliente.onMessage(JSON.stringify({ type: 'patch', id: 'p2', patch: 'nao e objeto' }));
    expect(socket.ultima()['type']).toBe('error');
    expect(socket.ultima()['id']).toBe('p2');
  });
});

describe('evento', () => {
  it('evento valido e repassado', () => {
    const { cliente } = conectar('panel');
    cliente.onMessage(
      JSON.stringify({ type: 'event', event: { kind: 'follow', user: 'fulano' } }),
    );
    expect(eventos).toHaveLength(1);
    expect(eventos[0]?.user).toBe('fulano');
  });

  it('evento invalido responde erro e nao repassa', () => {
    const { socket, cliente } = conectar('panel');
    cliente.onMessage(JSON.stringify({ type: 'event', event: { kind: 'boost' } }));
    expect(eventos).toHaveLength(0);
    expect(socket.ultima()['type']).toBe('error');
  });

  it('cena tambem pode disparar evento', () => {
    const { cliente } = conectar('overlay');
    cliente.onMessage(
      JSON.stringify({ type: 'event', event: { kind: 'follow', user: 'a' } }),
    );
    expect(eventos).toHaveLength(1);
  });
});

describe('transicao', () => {
  it('o painel pode pedir', () => {
    const { cliente } = conectar('panel');
    cliente.onMessage(JSON.stringify({ type: 'transition' }));
    expect(transicoes).toBe(1);
  });

  it('a cena nao pode pedir', () => {
    const { socket, cliente } = conectar('overlay');
    cliente.onMessage(JSON.stringify({ type: 'transition' }));
    expect(transicoes).toBe(0);
    expect(socket.ultima()['type']).toBe('error');
  });
});

describe('mensagens ruins', () => {
  it('ping marca vivo e nao responde nada', () => {
    const { socket, cliente } = conectar('overlay');
    const antes = socket.enviados.length;
    cliente.onMessage(JSON.stringify({ type: 'ping' }));
    expect(socket.enviados).toHaveLength(antes);
  });

  it.each([
    ['json quebrado', '{ nao e json'],
    ['tipo desconhecido', '{"type":"apagar_tudo"}'],
    ['sem tipo', '{"a":1}'],
    ['json valido mas escalar', '42'],
    ['nulo', 'null'],
  ])('%s responde erro em vez de derrubar', (_nome, bruto) => {
    const { socket, cliente } = conectar('panel');
    expect(() => cliente.onMessage(bruto)).not.toThrow();
    expect(socket.ultima()['type']).toBe('error');
  });
});
