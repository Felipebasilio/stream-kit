/**
 * O que acontece numa conexao em tempo real.
 *
 * Separado do Fastify de proposito: assim da para exercitar cliente lento,
 * mensagem invalida e desconexao com objetos falsos, sem abrir socket.
 */

import type {
  ClientMessage,
  ClientRole,
  ServerMessage,
  StreamEvent,
} from '@stream-kit/types';

import type { Hub, SocketLike } from './hub.js';
import type { StateStore } from './state-store.js';
import { validateEvent, validatePatch } from './validate.js';

export interface WsDeps {
  readonly hub: Hub;
  readonly store: StateStore;
  readonly onEvent: (event: StreamEvent) => void;
}

function parse(raw: string): ClientMessage | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return undefined;
    const type = (parsed as Record<string, unknown>)['type'];
    if (type !== 'patch' && type !== 'event' && type !== 'ping') return undefined;
    return parsed as ClientMessage;
  } catch {
    return undefined;
  }
}

/** Registra a conexao e devolve o tratador de mensagens e o de fechamento. */
export function attachClient(
  socket: SocketLike,
  role: ClientRole,
  deps: WsDeps,
): { readonly id: string; onMessage: (raw: string) => void; onClose: () => void } {
  const id = deps.hub.add(socket, role);

  // Estado inicial na hora: a cena nao pode ficar em branco esperando patch.
  deps.hub.sendTo(id, { type: 'state', state: deps.store.get() });

  const responder = (message: ServerMessage): void => {
    deps.hub.sendTo(id, message);
  };

  return {
    id,
    onMessage(raw: string): void {
      const message = parse(raw);
      if (message === undefined) {
        responder({ type: 'error', message: 'mensagem invalida' });
        return;
      }

      if (message.type === 'ping') {
        deps.hub.markAlive(id);
        return;
      }

      if (message.type === 'patch') {
        // Cena nao muda estado. So o painel escreve.
        if (role !== 'panel') {
          responder({
            type: 'error',
            id: message.id,
            message: 'somente o painel escreve',
          });
          return;
        }
        const validado = validatePatch(message.patch);
        if (!validado.ok) {
          responder({ type: 'error', id: message.id, message: validado.error });
          return;
        }
        deps.store.apply(validado.value);
        responder({ type: 'ack', id: message.id });
        return;
      }

      const validado = validateEvent(message.event);
      if (!validado.ok) {
        responder({ type: 'error', message: validado.error });
        return;
      }
      deps.onEvent(validado.value);
    },
    onClose(): void {
      deps.hub.remove(id);
    },
  };
}
