/**
 * Conexao com o servidor, com reconexao automatica.
 *
 * O Mac dorme, o wi-fi oscila, o servidor reinicia durante o desenvolvimento.
 * Em todos esses casos a cena precisa voltar sozinha, sem ninguem clicar em
 * "Atualizar" no OBS no meio da transmissao.
 */

import type { ServerMessage, StreamEvent, StreamKitState } from '@stream-kit/types';

/**
 * O minimo que a conexao precisa de um socket. Escrito assim para que o
 * WebSocket nativo sirva sem conversao, e um objeto falso sirva no teste.
 */
export interface SocketLike {
  addEventListener(
    tipo: 'open' | 'close' | 'error' | 'message',
    ouvinte: (ev: { data?: unknown }) => void,
  ): void;
  close(): void;
}

export type SocketFactory = (url: string) => SocketLike;

export interface ConnectionHandlers {
  readonly onState: (state: StreamKitState) => void;
  readonly onEvent: (event: StreamEvent) => void;
  readonly onStatus?: (conectado: boolean) => void;
}

export interface ConnectionOptions {
  readonly url: string;
  readonly createSocket: SocketFactory;
  readonly schedule?: (fn: () => void, ms: number) => unknown;
  readonly cancel?: (handle: unknown) => void;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
}

export function urlDoSocket(location: { protocol: string; host: string }): string {
  const protocolo = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocolo}//${location.host}/ws?role=overlay`;
}

export function connect(
  options: ConnectionOptions,
  handlers: ConnectionHandlers,
): () => void {
  const schedule = options.schedule ?? ((fn, ms) => setTimeout(fn, ms));
  const cancel =
    options.cancel ??
    ((h) => {
      clearTimeout(h as ReturnType<typeof setTimeout>);
    });
  const base = options.baseDelayMs ?? 500;
  const teto = options.maxDelayMs ?? 10_000;

  let atraso = base;
  let encerrado = false;
  let socket: SocketLike | undefined;
  let pendente: unknown;

  const abrir = (): void => {
    if (encerrado) return;
    const atual = options.createSocket(options.url);
    socket = atual;

    atual.addEventListener('open', () => {
      atraso = base;
      handlers.onStatus?.(true);
    });

    atual.addEventListener('message', (ev: { data?: unknown }) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(String(ev.data)) as ServerMessage;
      } catch {
        return; // mensagem estragada nao pode derrubar a cena
      }
      if (msg.type === 'state') handlers.onState(msg.state);
      else if (msg.type === 'event') handlers.onEvent(msg.event);
    });

    const cair = (): void => {
      if (encerrado || socket !== atual) return;
      socket = undefined;
      handlers.onStatus?.(false);
      pendente = schedule(abrir, atraso);
      // Recuo exponencial ate o teto: reconectar sem parar castiga o servidor
      // e nao adianta nada quando ele esta de fato fora.
      atraso = Math.min(atraso * 2, teto);
    };

    atual.addEventListener('close', cair);
    atual.addEventListener('error', cair);
  };

  abrir();

  return () => {
    encerrado = true;
    if (pendente !== undefined) cancel(pendente);
    socket?.close();
  };
}
