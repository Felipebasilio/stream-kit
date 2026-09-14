/**
 * Validacao do que chega pela rede.
 *
 * O servidor ouve so em localhost, mas qualquer pagina aberta no navegador do
 * Felipe consegue falar com localhost. Entao entrada continua sendo entrada:
 * malformada responde 400 com motivo, nunca 500 e nunca aceita em silencio.
 */

import type { StatePatch, StreamEvent } from '@stream-kit/types';
import { isEventKind } from '@stream-kit/types';

export type Validated<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly error: string;
    };

/** Patch fundo demais quase sempre e engano ou ataque. */
const PROFUNDIDADE_MAXIMA = 12;
const PLATAFORMAS = new Set(['manual', 'kick', 'youtube', 'tiktok', 'twitch']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function profundidade(value: unknown, nivel = 0): number {
  if (nivel > PROFUNDIDADE_MAXIMA) return nivel;
  if (Array.isArray(value)) {
    return value.reduce<number>(
      (max, item) => Math.max(max, profundidade(item, nivel + 1)),
      nivel,
    );
  }
  if (!isPlainObject(value)) return nivel;
  let max = nivel;
  for (const key of Object.keys(value)) {
    max = Math.max(max, profundidade(value[key], nivel + 1));
  }
  return max;
}

export function validatePatch(raw: unknown): Validated<StatePatch> {
  if (!isPlainObject(raw)) {
    return { ok: false, error: 'o patch precisa ser um objeto' };
  }
  if (profundidade(raw) > PROFUNDIDADE_MAXIMA) {
    return { ok: false, error: 'patch aninhado demais' };
  }
  return { ok: true, value: raw as StatePatch };
}

export function validateEvent(raw: unknown): Validated<StreamEvent> {
  if (!isPlainObject(raw)) {
    return { ok: false, error: 'o evento precisa ser um objeto' };
  }
  const kind = raw['kind'];
  if (!isEventKind(kind)) {
    return { ok: false, error: `tipo de evento desconhecido: ${String(kind)}` };
  }
  const user = raw['user'];
  if (typeof user !== 'string' || user.length === 0) {
    return { ok: false, error: 'o evento precisa de um usuario' };
  }
  const platform = typeof raw['platform'] === 'string' ? raw['platform'] : 'manual';
  if (!PLATAFORMAS.has(platform)) {
    return { ok: false, error: `plataforma desconhecida: ${platform}` };
  }
  const id =
    typeof raw['id'] === 'string' && raw['id'].length > 0
      ? raw['id']
      : `ev-${String(Date.now())}-${Math.random().toString(36).slice(2, 8)}`;
  const at =
    typeof raw['at'] === 'number' && Number.isFinite(raw['at']) ? raw['at'] : Date.now();

  const amount = raw['amount'];
  const message = raw['message'];

  return {
    ok: true,
    value: {
      id,
      platform: platform as StreamEvent['platform'],
      kind,
      user,
      at,
      ...(typeof amount === 'string' ? { amount } : {}),
      ...(typeof message === 'string' ? { message } : {}),
    },
  };
}

export function validateMinutes(raw: unknown): Validated<number> {
  // `null` e string vazia viram 0 em `Number()`. Aceitar isso faria um corpo
  // malformado PARAR a contagem regressiva em silencio, no meio da live.
  if (raw === null || raw === undefined || raw === '') {
    return { ok: false, error: 'minutos e obrigatorio' };
  }
  if (typeof raw !== 'number' && typeof raw !== 'string') {
    return { ok: false, error: 'minutos precisa ser numero' };
  }
  const minutes = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 24 * 60) {
    return { ok: false, error: 'minutos precisa ser um numero entre 0 e 1440' };
  }
  return { ok: true, value: minutes };
}
