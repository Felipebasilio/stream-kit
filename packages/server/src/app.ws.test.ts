/**
 * Testes da conexao em tempo real com socket de verdade.
 *
 * O comportamento das mensagens ja e coberto em ws-handler.test.ts com objetos
 * falsos. Aqui o que se prova e a amarracao com o Fastify: o canal abre,
 * entrega estado, aceita patch e propaga para as outras conexoes.
 */

import { EventQueue } from '@stream-kit/core';
import type { ServerMessage } from '@stream-kit/types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';

import { createApp, type App } from './app.js';
import { Hub } from './hub.js';
import { canListen, findFreePort } from './port.js';
import { StateStore, type FileSystemLike } from './state-store.js';

const fsVazio: FileSystemLike = {
  readFile: () => Promise.reject(new Error('ENOENT')),
  writeFile: () => Promise.resolve(),
  rename: () => Promise.resolve(),
};

let app: App;
let store: StateStore;
let origem: string;
const abertos: WebSocket[] = [];

beforeEach(async () => {
  store = new StateStore({ filePath: '/x/state.json', fs: fsVazio, writeDelayMs: 1 });
  await store.load();
  app = await createApp({ store, hub: new Hub(), queue: new EventQueue() });
  const porta = await findFreePort(canListen, 7500);
  await app.fastify.listen({ port: porta, host: '127.0.0.1' });
  origem = `ws://127.0.0.1:${String(porta)}`;
});

afterEach(async () => {
  for (const s of abertos.splice(0)) s.close();
  await app.fastify.close();
  await store.close();
});

/**
 * Um cliente que guarda TUDO que chega desde o instante em que o socket e
 * criado. Sem isso ha corrida: o servidor manda o estado assim que a conexao
 * sobe, e um ouvinte registrado depois do evento "open" pode perder essa
 * primeira mensagem.
 */
interface Cliente {
  readonly socket: WebSocket;
  esperar(tipo: string): Promise<ServerMessage>;
}

function criarCliente(role: string): Cliente {
  const socket = new WebSocket(`${origem}/ws?role=${role}`);
  abertos.push(socket);
  const recebidas: ServerMessage[] = [];
  const aguardando: { tipo: string; resolver: (m: ServerMessage) => void }[] = [];

  socket.on('message', (raw: unknown) => {
    const msg = JSON.parse(String(raw)) as ServerMessage;
    const alvo = aguardando.findIndex((a) => a.tipo === msg.type);
    if (alvo >= 0) {
      const [pedido] = aguardando.splice(alvo, 1);
      pedido?.resolver(msg);
      return;
    }
    recebidas.push(msg);
  });

  return {
    socket,
    esperar(tipo: string): Promise<ServerMessage> {
      const jaVeio = recebidas.findIndex((m) => m.type === tipo);
      if (jaVeio >= 0) {
        const [msg] = recebidas.splice(jaVeio, 1);
        if (msg !== undefined) return Promise.resolve(msg);
      }
      return new Promise((resolve, reject) => {
        const prazo = setTimeout(() => reject(new Error(`sem mensagem "${tipo}"`)), 2000);
        aguardando.push({
          tipo,
          resolver: (m) => {
            clearTimeout(prazo);
            resolve(m);
          },
        });
      });
    },
  };
}

/** Conecta e espera o estado inicial, que e sempre a primeira mensagem. */
async function conectar(role: string): Promise<Cliente> {
  const cliente = criarCliente(role);
  await cliente.esperar('state');
  return cliente;
}

describe('canal em tempo real', () => {
  it('entrega o estado assim que conecta', async () => {
    const cliente = criarCliente('overlay');
    const msg = await cliente.esperar('state');
    expect(msg.type === 'state' && msg.state.brand.name).toBe('SEU CANAL');
  });

  it('patch do painel chega nas cenas', async () => {
    const cena = await conectar('overlay');
    const painel = await conectar('panel');

    const aguardando = cena.esperar('state');
    painel.socket.send(
      JSON.stringify({ type: 'patch', id: 'p1', patch: { brand: { name: 'AO VIVO' } } }),
    );

    const msg = await aguardando;
    expect(msg.type === 'state' && msg.state.brand.name).toBe('AO VIVO');
    expect(store.get().brand.name).toBe('AO VIVO');
  });

  it('painel recebe confirmacao do patch', async () => {
    const painel = await conectar('panel');
    const aguardando = painel.esperar('ack');
    painel.socket.send(
      JSON.stringify({ type: 'patch', id: 'p9', patch: { socialsLabel: 'X' } }),
    );
    const msg = await aguardando;
    expect(msg.type === 'ack' && msg.id).toBe('p9');
  });

  it('evento disparado no painel chega na cena de alertas', async () => {
    const cena = await conectar('overlay');
    const painel = await conectar('panel');

    const aguardando = cena.esperar('event');
    painel.socket.send(
      JSON.stringify({
        type: 'event',
        event: { id: 'e1', kind: 'donation', user: 'Felipe', amount: 'R$ 20' },
      }),
    );

    const msg = await aguardando;
    expect(msg.type === 'event' && msg.event.user).toBe('Felipe');
    expect(msg.type === 'event' && msg.event.count).toBe(1);
  });

  it('evento pelo HTTP tambem chega na cena', async () => {
    const cena = await conectar('overlay');
    const aguardando = cena.esperar('event');
    await app.fastify.inject({
      method: 'POST',
      url: '/api/event',
      payload: { id: 'http1', kind: 'follow', user: 'viaHttp' },
    });
    const msg = await aguardando;
    expect(msg.type === 'event' && msg.event.user).toBe('viaHttp');
  });

  it('sem papel na URL assume cena, que nao pode escrever', async () => {
    const cliente = await conectar('');
    const aguardando = cliente.esperar('error');
    cliente.socket.send(
      JSON.stringify({ type: 'patch', id: 'p1', patch: { socialsLabel: 'X' } }),
    );
    const msg = await aguardando;
    expect(msg.type === 'error' && msg.message).toContain('painel');
    expect(store.get().socialsLabel).toBe('ME SEGUE LÁ');
  });

  it('papel desconhecido tambem vira cena', async () => {
    await conectar('admin');
    expect(app.hub.countByRole('overlay')).toBe(1);
    expect(app.hub.countByRole('panel')).toBe(0);
  });

  it('mensagem invalida responde erro sem derrubar a conexao', async () => {
    const cliente = await conectar('panel');
    const aguardando = cliente.esperar('error');
    cliente.socket.send('{ isso nao e json');
    await aguardando;
    expect(cliente.socket.readyState).toBe(WebSocket.OPEN);
  });

  it('heartbeat pinga de verdade e quem responde sobrevive', async () => {
    const cliente = await conectar('panel');
    expect(app.heartbeat()).toBe(0); // primeira rodada: marca pendente e pinga
    // o cliente ws responde pong sozinho; damos tempo de chegar
    await new Promise((r) => setTimeout(r, 150));
    expect(app.heartbeat()).toBe(0); // respondeu: continua vivo
    expect(app.hub.size).toBe(1);
    expect(cliente.socket.readyState).toBe(WebSocket.OPEN);
  });

  it('heartbeat derruba cliente cujo socket sumiu', () => {
    // Registro no hub sem socket correspondente: e o que sobra quando uma
    // conexao morre de um jeito que nao dispara "close". O ping estoura e o
    // cliente precisa sair, em vez de virar zumbi ocupando o hub.
    app.hub.add({ send: () => {}, close: () => {} }, 'overlay');
    expect(app.hub.size).toBe(1);
    expect(app.heartbeat()).toBe(1);
    expect(app.hub.size).toBe(0);
  });

  it('desconectar remove do hub', async () => {
    const cliente = await conectar('panel');
    expect(app.hub.size).toBe(1);
    cliente.socket.close();
    await new Promise((r) => setTimeout(r, 200));
    expect(app.hub.size).toBe(0);
  });
});
