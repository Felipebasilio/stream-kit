/**
 * Registro de conexoes em tempo real.
 *
 * Nao conhece WebSocket: fala com uma interface minima. Isso deixa o
 * comportamento dificil (cliente lento, cliente morto) testavel sem abrir
 * socket de verdade.
 */

import type { ClientRole, ServerMessage } from '@stream-kit/types';

export interface SocketLike {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  /** Bytes esperando para sair. Cliente lento acumula aqui. */
  readonly bufferedAmount?: number;
}

export interface HubOptions {
  /**
   * Acima disso o cliente e considerado lento demais e e desconectado.
   * Cliente lento nao pode segurar o processo enquanto voce esta ao vivo.
   */
  readonly maxBufferedBytes?: number;
  readonly onWarning?: (message: string) => void;
}

interface Client {
  readonly socket: SocketLike;
  readonly role: ClientRole;
  alive: boolean;
}

export const SLOW_CLIENT_CODE = 1013;
export const STALE_CLIENT_CODE = 1001;

export class Hub {
  private readonly clients = new Map<string, Client>();
  private readonly maxBufferedBytes: number;
  private readonly onWarning: (message: string) => void;
  private proximoId = 0;

  constructor(options: HubOptions = {}) {
    this.maxBufferedBytes = options.maxBufferedBytes ?? 1_000_000;
    this.onWarning = options.onWarning ?? ((): void => {});
  }

  get size(): number {
    return this.clients.size;
  }

  countByRole(role: ClientRole): number {
    let total = 0;
    for (const client of this.clients.values()) if (client.role === role) total += 1;
    return total;
  }

  add(socket: SocketLike, role: ClientRole): string {
    const id = `c${String(this.proximoId++)}`;
    this.clients.set(id, { socket, role, alive: true });
    return id;
  }

  remove(id: string): void {
    this.clients.delete(id);
  }

  /** Envia para um cliente so. Devolve `false` se ele foi descartado. */
  sendTo(id: string, message: ServerMessage): boolean {
    const client = this.clients.get(id);
    if (client === undefined) return false;
    return this.deliver(id, client, JSON.stringify(message));
  }

  /** Envia para todos, ou so para um papel. */
  broadcast(message: ServerMessage, role?: ClientRole): number {
    const payload = JSON.stringify(message);
    let entregues = 0;
    for (const [id, client] of [...this.clients]) {
      if (role !== undefined && client.role !== role) continue;
      if (this.deliver(id, client, payload)) entregues += 1;
    }
    return entregues;
  }

  private deliver(id: string, client: Client, payload: string): boolean {
    const buffered = client.socket.bufferedAmount ?? 0;
    if (buffered > this.maxBufferedBytes) {
      this.onWarning(
        `cliente ${id} lento demais (${String(buffered)} bytes); desconectando`,
      );
      this.drop(id, client, SLOW_CLIENT_CODE, 'cliente lento');
      return false;
    }
    try {
      client.socket.send(payload);
      return true;
    } catch (erro) {
      this.onWarning(`falha ao enviar para ${id}: ${String(erro)}`);
      this.drop(id, client, STALE_CLIENT_CODE, 'falha no envio');
      return false;
    }
  }

  private drop(id: string, client: Client, code: number, reason: string): void {
    this.clients.delete(id);
    try {
      client.socket.close(code, reason);
    } catch {
      // Socket ja morto: nada a fazer, e nao pode derrubar o servidor.
    }
  }

  /** Marca vivo ao receber pong. */
  markAlive(id: string): void {
    const client = this.clients.get(id);
    if (client !== undefined) client.alive = true;
  }

  /**
   * Uma rodada de ping: derruba quem nao respondeu a anterior e marca os
   * demais como pendentes. Devolve quantos foram derrubados.
   */
  sweep(ping: (id: string) => void): number {
    let derrubados = 0;
    for (const [id, client] of [...this.clients]) {
      if (!client.alive) {
        this.drop(id, client, STALE_CLIENT_CODE, 'sem resposta');
        derrubados += 1;
        continue;
      }
      client.alive = false;
      try {
        ping(id);
      } catch {
        this.drop(id, client, STALE_CLIENT_CODE, 'falha no ping');
        derrubados += 1;
      }
    }
    return derrubados;
  }

  closeAll(code = 1001, reason = 'servidor encerrando'): void {
    for (const [id, client] of [...this.clients]) this.drop(id, client, code, reason);
  }
}
