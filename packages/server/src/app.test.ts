import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { EventQueue } from '@stream-kit/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp, type App } from './app.js';
import { Hub } from './hub.js';
import { StateStore, type FileSystemLike } from './state-store.js';

const fsVazio: FileSystemLike = {
  readFile: () => Promise.reject(new Error('ENOENT')),
  writeFile: () => Promise.resolve(),
  rename: () => Promise.resolve(),
};

let app: App;
let store: StateStore;
const AGORA = 1_700_000_000_000;

beforeEach(async () => {
  store = new StateStore({ filePath: '/x/state.json', fs: fsVazio, writeDelayMs: 1 });
  await store.load();
  app = await createApp({
    store,
    hub: new Hub(),
    queue: new EventQueue({ now: () => AGORA }),
    now: () => AGORA,
  });
});

describe('GET /health', () => {
  it('responde que esta vivo', async () => {
    const r = await app.fastify.inject({ method: 'GET', url: '/health' });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ ok: true, clients: 0 });
  });
});

describe('GET /api/state', () => {
  it('devolve o estado atual', async () => {
    const r = await app.fastify.inject({ method: 'GET', url: '/api/state' });
    expect(r.statusCode).toBe(200);
    expect(r.json<{ brand: { name: string } }>().brand.name).toBe('SEU CANAL');
  });
});

describe('GET /api/urls', () => {
  it('lista as seis fontes de navegador com o tamanho do canvas', async () => {
    const r = await app.fastify.inject({ method: 'GET', url: '/api/urls' });
    const corpo = r.json<{
      canvas: string;
      urls: { label: string; url: string; width: number; height: number }[];
    }>();
    expect(corpo.canvas).toBe('qhd');
    expect(corpo.urls).toHaveLength(6);
    expect(corpo.urls[0]?.width).toBe(2560);
    expect(corpo.urls[0]?.url).toContain('canvas=qhd');
    expect(corpo.urls[0]?.url).toContain('scene=starting');
  });
});

describe('POST /api/state', () => {
  it('aplica um patch', async () => {
    const r = await app.fastify.inject({
      method: 'POST',
      url: '/api/state',
      payload: { brand: { name: 'BASA' } },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ ok: true, changed: true });
    expect(store.get().brand.name).toBe('BASA');
  });

  it('avisa quando o patch nao muda nada', async () => {
    const r = await app.fastify.inject({
      method: 'POST',
      url: '/api/state',
      payload: { brand: { name: 'SEU CANAL' } },
    });
    expect(r.json()).toEqual({ ok: true, changed: false });
  });

  it('entrada malformada devolve 400 com motivo, nao 500', async () => {
    const r = await app.fastify.inject({
      method: 'POST',
      url: '/api/state',
      payload: [1, 2, 3],
    });
    expect(r.statusCode).toBe(400);
    expect(r.json<{ error: string }>().error).toContain('objeto');
  });

  it('corpo com __proto__ e recusado pelo parser antes de chegar em nos', async () => {
    // Primeira camada de defesa: o Fastify usa um parser de JSON que recusa
    // `__proto__` na entrada. O pedido inteiro morre aqui.
    const r = await app.fastify.inject({
      method: 'POST',
      url: '/api/state',
      headers: { 'content-type': 'application/json' },
      payload: '{"__proto__":{"poluido":true},"socialsLabel":"OK"}',
    });
    expect(r.statusCode).toBe(400);
    expect(store.get().socialsLabel).toBe('ME SEGUE LÁ');
  });

  it('mesmo passando direto pela store, __proto__ nao contamina', () => {
    // Segunda camada: se algum caminho futuro (WebSocket, adaptador de
    // plataforma) entregar o patch sem passar pelo parser do Fastify, o
    // deepMerge ainda barra. Defesa em profundidade.
    const veneno: unknown = JSON.parse(
      '{"__proto__":{"poluido":true},"socialsLabel":"OK"}',
    );
    store.apply(veneno as Parameters<typeof store.apply>[0]);
    expect(store.get().socialsLabel).toBe('OK');
    expect(
      (store.get() as unknown as Record<string, unknown>)['poluido'],
    ).toBeUndefined();
    expect(Object.getPrototypeOf(store.get())).toBe(Object.prototype);
    expect(({} as Record<string, unknown>)['poluido']).toBeUndefined();
  });
});

describe('POST /api/event', () => {
  it('aceita um evento manual', async () => {
    const r = await app.fastify.inject({
      method: 'POST',
      url: '/api/event',
      payload: { kind: 'follow', user: 'fulano' },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json<{ ok: boolean }>().ok).toBe(true);
  });

  it('evento invalido devolve 400', async () => {
    const r = await app.fastify.inject({
      method: 'POST',
      url: '/api/event',
      payload: { kind: 'boost', user: 'x' },
    });
    expect(r.statusCode).toBe(400);
  });

  it('reentrega do mesmo id nao dispara duas vezes', async () => {
    const payload = { id: 'w1', kind: 'follow', user: 'a' };
    await app.fastify.inject({ method: 'POST', url: '/api/event', payload });
    const r = await app.fastify.inject({ method: 'POST', url: '/api/event', payload });
    expect(r.statusCode).toBe(200);
    expect(app.queue.size).toBe(0);
  });
});

describe('POST /api/countdown', () => {
  it('inicia guardando o instante do fim', async () => {
    const r = await app.fastify.inject({
      method: 'POST',
      url: '/api/countdown',
      payload: { minutes: 10 },
    });
    expect(r.json<{ endsAt: number }>().endsAt).toBe(AGORA + 600_000);
    expect(store.get().countdown.enabled).toBe(true);
  });

  it('zero minutos para a contagem', async () => {
    await app.fastify.inject({
      method: 'POST',
      url: '/api/countdown',
      payload: { minutes: 10 },
    });
    const r = await app.fastify.inject({
      method: 'POST',
      url: '/api/countdown',
      payload: { minutes: 0 },
    });
    expect(r.json<{ endsAt: number }>().endsAt).toBe(0);
    expect(store.get().countdown.enabled).toBe(false);
  });

  it('preserva o rotulo configurado', async () => {
    store.apply({ countdown: { label: 'FALTA' } });
    await app.fastify.inject({
      method: 'POST',
      url: '/api/countdown',
      payload: { minutes: 5 },
    });
    expect(store.get().countdown.label).toBe('FALTA');
  });

  it('minutos invalidos devolvem 400', async () => {
    const r = await app.fastify.inject({
      method: 'POST',
      url: '/api/countdown',
      payload: { minutes: 'muitos' },
    });
    expect(r.statusCode).toBe(400);
  });

  it('corpo vazio devolve 400 em vez de estourar', async () => {
    const r = await app.fastify.inject({
      method: 'POST',
      url: '/api/countdown',
      headers: { 'content-type': 'application/json' },
      payload: '{}',
    });
    expect(r.statusCode).toBe(400);
  });
});

describe('POST /api/transition', () => {
  it('dispara a transicao quando ela esta ligada', async () => {
    const r = await app.fastify.inject({ method: 'POST', url: '/api/transition' });
    expect(r.statusCode).toBe(200);
    expect(r.json<{ enabled: boolean }>().enabled).toBe(true);
  });

  it('desligada no painel, nada e enviado para as cenas', async () => {
    store.apply({ transition: { enabled: false } });
    const r = await app.fastify.inject({ method: 'POST', url: '/api/transition' });
    expect(r.json<{ enabled: boolean }>().enabled).toBe(false);
  });
});

describe('GET /api/sounds', () => {
  it('sem pasta configurada devolve lista vazia', async () => {
    const r = await app.fastify.inject({ method: 'GET', url: '/api/sounds' });
    expect(r.json()).toEqual({ sounds: [] });
  });

  it('pasta inexistente devolve lista vazia em vez de erro', async () => {
    const outro = await createApp({ store, staticRoots: { sounds: '/nao/existe' } });
    const r = await outro.fastify.inject({ method: 'GET', url: '/api/sounds' });
    expect(r.json()).toEqual({ sounds: [] });
    await outro.fastify.close();
  });

  it('lista os arquivos de audio da pasta do usuario', async () => {
    const pasta = await mkdtemp(join(tmpdir(), 'sons-'));
    await writeFile(join(pasta, 'alerta.mp3'), 'x');
    await writeFile(join(pasta, 'leia-me.txt'), 'x');
    const outro = await createApp({ store, staticRoots: { sounds: pasta } });
    const r = await outro.fastify.inject({ method: 'GET', url: '/api/sounds' });
    expect(r.json()).toEqual({ sounds: ['alerta.mp3'] });
    await outro.fastify.close();
  });

  it('serve o arquivo de som em /sons', async () => {
    const pasta = await mkdtemp(join(tmpdir(), 'sons-'));
    await writeFile(join(pasta, 'alerta.mp3'), 'conteudo');
    const outro = await createApp({ store, staticRoots: { sounds: pasta } });
    const r = await outro.fastify.inject({ method: 'GET', url: '/sons/alerta.mp3' });
    expect(r.statusCode).toBe(200);
    await outro.fastify.close();
  });
});

describe('arquivos estaticos', () => {
  const raizOverlay = new URL('../../overlay/dist', import.meta.url).pathname;

  it('serve o build das cenas em /overlay', async () => {
    const outro = await createApp({ store, staticRoots: { overlay: raizOverlay } });
    const r = await outro.fastify.inject({ method: 'GET', url: '/overlay/index.html' });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('<div id="raiz">');
    await outro.fastify.close();
  });

  it('pasta inexistente nao impede o servidor de subir', async () => {
    // Acontece o tempo todo em desenvolvimento: servidor de pe antes do build.
    const outro = await createApp({
      store,
      staticRoots: { overlay: '/nao/existe', panel: '/tambem/nao' },
    });
    const r = await outro.fastify.inject({ method: 'GET', url: '/health' });
    expect(r.statusCode).toBe(200);
    await outro.fastify.close();
  });
});

describe('opcoes padrao', () => {
  it('createApp funciona sem hub, fila ou relogio informados', async () => {
    const outro = await createApp({ store });
    const r = await outro.fastify.inject({ method: 'GET', url: '/health' });
    expect(r.statusCode).toBe(200);
    await outro.fastify.close();
  });
});
