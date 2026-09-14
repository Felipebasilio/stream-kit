/**
 * As rotas HTTP e o canal em tempo real.
 */

import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';

import { EventQueue, startCountdown, stopCountdown } from '@stream-kit/core';
import { isClientRole, type CanvasId, type StreamEvent } from '@stream-kit/types';
import Fastify, { type FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';

import { Hub, type SocketLike } from './hub.js';
import type { StateStore } from './state-store.js';
import { attachClient } from './ws-handler.js';
import { listOverlayUrls } from './urls.js';
import { listarSons } from './sounds.js';
import { listarIcones } from './icons.js';
import { validateEvent, validateMinutes, validatePatch } from './validate.js';

export interface StaticRoots {
  /** Pasta do build das cenas, servida em /overlay. */
  readonly overlay?: string;
  /** Pasta do build do painel, servida na raiz. */
  readonly panel?: string;
  /** Pasta de sons do usuario, servida em /sons. */
  readonly sounds?: string;
  /** Pasta de icones do usuario, servida em /icones. */
  readonly icons?: string;
}

export interface AppOptions {
  readonly store: StateStore;
  readonly staticRoots?: StaticRoots;
  readonly hub?: Hub;
  readonly queue?: EventQueue;
  readonly now?: () => number;
  readonly logger?: boolean;
}

export interface App {
  readonly fastify: FastifyInstance;
  readonly hub: Hub;
  readonly queue: EventQueue;
  /**
   * Uma rodada de ping/pong: derruba quem nao respondeu a anterior e pinga os
   * demais. Quem some sem fechar direito (Mac dormindo, wi-fi caindo) deixaria
   * uma conexao zumbi ocupando o hub para sempre sem isso.
   * Devolve quantos foram derrubados.
   */
  heartbeat(): number;
}

export async function createApp(options: AppOptions): Promise<App> {
  const { store } = options;
  const hub = options.hub ?? new Hub();
  const queue = options.queue ?? new EventQueue();
  const now = options.now ?? ((): number => Date.now());

  /** Sockets vivos, para conseguir enviar ping de verdade. */
  const sockets = new Map<string, { ping(): void }>();

  const fastify = Fastify({ logger: options.logger ?? false });
  await fastify.register(websocket);

  // Qualquer alteracao do estado vai para todas as conexoes.
  store.subscribe((state) => {
    hub.broadcast({ type: 'state', state });
  });

  const publicarEvento = (event: StreamEvent): void => {
    const resultado = queue.push(event);
    if (resultado === 'duplicate') return;
    const proximo = queue.shift();
    if (proximo !== undefined) hub.broadcast({ type: 'event', event: proximo });
  };

  // Arquivos estaticos: registrados so quando a pasta existe, para o servidor
  // subir normalmente durante o desenvolvimento, antes de haver build.
  const overlayRoot = options.staticRoots?.overlay;
  if (overlayRoot !== undefined && existsSync(overlayRoot)) {
    await fastify.register(fastifyStatic, {
      root: overlayRoot,
      prefix: '/overlay/',
      decorateReply: false,
    });
  }
  const soundsRoot = options.staticRoots?.sounds;
  if (soundsRoot !== undefined && existsSync(soundsRoot)) {
    await fastify.register(fastifyStatic, {
      root: soundsRoot,
      prefix: '/sons/',
      decorateReply: false,
    });
  }

  const iconsRoot = options.staticRoots?.icons;
  if (iconsRoot !== undefined && existsSync(iconsRoot)) {
    await fastify.register(fastifyStatic, {
      root: iconsRoot,
      prefix: '/icones/',
      decorateReply: false,
    });
  }

  const panelRoot = options.staticRoots?.panel;
  if (panelRoot !== undefined && existsSync(panelRoot)) {
    await fastify.register(fastifyStatic, {
      root: panelRoot,
      prefix: '/',
      decorateReply: false,
    });
  }

  const dispararTransicao = (): void => {
    if (!store.get().transition.enabled) return;
    // So as cenas precisam saber: o painel ja sabe que pediu.
    hub.broadcast({ type: 'transition' }, 'overlay');
  };

  fastify.get('/health', () => ({ ok: true, clients: hub.size }));

  fastify.post('/api/transition', (_request, reply) => {
    dispararTransicao();
    return reply.send({ ok: true, enabled: store.get().transition.enabled });
  });

  fastify.get('/api/state', () => store.get());

  fastify.get('/api/sounds', async () => {
    if (soundsRoot === undefined || !existsSync(soundsRoot)) return { sounds: [] };
    try {
      return { sounds: listarSons(await readdir(soundsRoot)) };
    } catch {
      return { sounds: [] };
    }
  });

  fastify.get('/api/icons', async () => {
    if (iconsRoot === undefined || !existsSync(iconsRoot)) return { icons: [] };
    try {
      return { icons: listarIcones(await readdir(iconsRoot)) };
    } catch {
      return { icons: [] };
    }
  });

  fastify.get('/api/urls', (request) => {
    const canvas = store.get().previewCanvas;
    const origin = `${request.protocol}://${request.hostname}`;
    return { canvas, urls: listOverlayUrls(origin, canvas as CanvasId) };
  });

  fastify.post('/api/state', (request, reply) => {
    const validado = validatePatch(request.body);
    if (!validado.ok) return reply.code(400).send({ ok: false, error: validado.error });
    const mudou = store.apply(validado.value);
    return reply.send({ ok: true, changed: mudou });
  });

  fastify.post('/api/event', (request, reply) => {
    const validado = validateEvent(request.body);
    if (!validado.ok) return reply.code(400).send({ ok: false, error: validado.error });
    publicarEvento(validado.value);
    return reply.send({ ok: true, id: validado.value.id });
  });

  fastify.post('/api/countdown', (request, reply) => {
    const corpo = (request.body ?? {}) as Record<string, unknown>;
    const validado = validateMinutes(corpo['minutes']);
    if (!validado.ok) return reply.code(400).send({ ok: false, error: validado.error });
    const label = store.get().countdown.label;
    const countdown =
      validado.value > 0
        ? startCountdown(validado.value, now(), label)
        : stopCountdown(label);
    store.apply({ countdown });
    return reply.send({ ok: true, endsAt: countdown.endsAt });
  });

  fastify.get('/ws', { websocket: true }, (connection, request) => {
    const papel = (request.query as Record<string, unknown> | undefined)?.['role'];
    const role = isClientRole(papel) ? papel : 'overlay';
    const socket = connection as unknown as SocketLike;

    const cliente = attachClient(socket, role, {
      hub,
      store,
      onEvent: publicarEvento,
      onTransition: dispararTransicao,
    });
    sockets.set(cliente.id, connection as unknown as { ping(): void });

    const encerrar = (): void => {
      sockets.delete(cliente.id);
      cliente.onClose();
    };

    connection.on('message', (raw: unknown) => {
      cliente.onMessage(String(raw));
    });
    connection.on('pong', () => {
      hub.markAlive(cliente.id);
    });
    connection.on('close', encerrar);
    connection.on('error', encerrar);
  });

  const heartbeat = (): number =>
    hub.sweep((id) => {
      const socket = sockets.get(id);
      if (socket === undefined) throw new Error('socket sumiu');
      socket.ping();
    });

  return { fastify, hub, queue, heartbeat };
}
