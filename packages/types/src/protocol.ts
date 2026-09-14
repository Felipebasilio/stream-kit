/**
 * Protocolo do WebSocket entre servidor, painel e cenas.
 *
 * Bidirecional desde o inicio (e nao SSE) porque o painel precisa receber de
 * volta: confirmacao de gravacao e estado de conexao. Ver plano 02.
 */

import type { StreamEvent } from './events.js';
import type { StatePatch, StreamKitState } from './state.js';

/** Quem esta do outro lado. Decide o que recebe. */
export type ClientRole = 'overlay' | 'panel';

export type ServerMessage =
  | { readonly type: 'state'; readonly state: StreamKitState }
  | { readonly type: 'event'; readonly event: StreamEvent }
  /** Confirma que o patch de `id` foi aplicado e persistido. */
  | { readonly type: 'ack'; readonly id: string }
  | { readonly type: 'error'; readonly id?: string; readonly message: string };

export type ClientMessage =
  | { readonly type: 'patch'; readonly id: string; readonly patch: StatePatch }
  | { readonly type: 'event'; readonly event: StreamEvent }
  | { readonly type: 'ping' };

export function isClientRole(value: unknown): value is ClientRole {
  return value === 'overlay' || value === 'panel';
}
