/**
 * Fila de eventos que viram alerta na tela.
 *
 * Existe para resolver tres coisas que so aparecem ao vivo:
 *
 * - REENTREGA: plataforma reenvia o mesmo webhook e o alerta sai dobrado.
 *   Resolvido por `id`.
 * - RAJADA: uma raid manda 200 eventos em segundos e a fila nunca esvazia.
 *   Resolvido por agrupamento ("+12 seguidores") e por teto de tamanho.
 * - ORDEM: alerta tem que sair na ordem em que aconteceu.
 *
 * Nenhum adaptador de plataforma existe ainda (decisao D4). Hoje a unica
 * fonte e o painel. A fila entra agora porque enfiar isso depois, com o
 * consumidor ja escrito, e caro (decisao D10).
 */

import type { EventKind, QueuedEvent, StreamEvent } from '@stream-kit/types';

export type PushResult = 'queued' | 'coalesced' | 'duplicate' | 'dropped';

export interface EventQueueOptions {
  /** Teto de itens esperando. Ao estourar, o mais antigo sai. */
  readonly maxSize?: number;
  /** Janela em que eventos do mesmo tipo se agrupam num alerta so. */
  readonly coalesceWindowMs?: number;
  /**
   * Tipos que podem ser agrupados.
   *
   * Doacao fica de fora de proposito: cada uma merece agradecimento proprio,
   * com o valor. Chat tambem: agrupar mensagem perde o texto.
   */
  readonly coalescibleKinds?: readonly EventKind[];
  /** Quantos ids lembrar para barrar reentrega. */
  readonly dedupeMemory?: number;
  /** Relogio injetavel, para o teste nao precisar esperar de verdade. */
  readonly now?: () => number;
}

const DEFAULTS = {
  maxSize: 50,
  coalesceWindowMs: 3000,
  coalescibleKinds: ['follow', 'sub'] as readonly EventKind[],
  dedupeMemory: 500,
};

interface MutableQueued {
  event: StreamEvent;
  count: number;
  /** Quando o ultimo evento entrou neste grupo. Base da janela de agrupamento. */
  lastAt: number;
}

export class EventQueue {
  private readonly items: MutableQueued[] = [];
  private readonly seen = new Set<string>();
  private readonly seenOrder: string[] = [];

  private readonly maxSize: number;
  private readonly coalesceWindowMs: number;
  private readonly coalescibleKinds: ReadonlySet<EventKind>;
  private readonly dedupeMemory: number;
  private readonly now: () => number;

  constructor(options: EventQueueOptions = {}) {
    this.maxSize = options.maxSize ?? DEFAULTS.maxSize;
    this.coalesceWindowMs = options.coalesceWindowMs ?? DEFAULTS.coalesceWindowMs;
    this.coalescibleKinds = new Set(
      options.coalescibleKinds ?? DEFAULTS.coalescibleKinds,
    );
    this.dedupeMemory = options.dedupeMemory ?? DEFAULTS.dedupeMemory;
    this.now = options.now ?? (() => Date.now());
  }

  get size(): number {
    return this.items.length;
  }

  /** Quantos eventos representados, contando os agrupados. */
  get eventCount(): number {
    return this.items.reduce((total, item) => total + item.count, 0);
  }

  push(event: StreamEvent): PushResult {
    if (this.seen.has(event.id)) return 'duplicate';
    this.remember(event.id);

    const last = this.items.at(-1);
    if (
      last !== undefined &&
      this.coalescibleKinds.has(event.kind) &&
      last.event.kind === event.kind &&
      last.event.platform === event.platform &&
      this.now() - last.lastAt <= this.coalesceWindowMs
    ) {
      last.count += 1;
      last.lastAt = this.now();
      return 'coalesced';
    }

    this.items.push({ event, count: 1, lastAt: this.now() });

    if (this.items.length > this.maxSize) {
      // Numa rajada, o recente importa mais que o antigo: descarta o mais velho.
      this.items.shift();
      return 'dropped';
    }
    return 'queued';
  }

  shift(): QueuedEvent | undefined {
    const item = this.items.shift();
    if (item === undefined) return undefined;
    return { ...item.event, count: item.count };
  }

  peek(): QueuedEvent | undefined {
    const item = this.items[0];
    if (item === undefined) return undefined;
    return { ...item.event, count: item.count };
  }

  clear(): void {
    this.items.length = 0;
  }

  /** Esquece os ids vistos. So para teste e para troca de conta. */
  reset(): void {
    this.clear();
    this.seen.clear();
    this.seenOrder.length = 0;
  }

  private remember(id: string): void {
    this.seen.add(id);
    this.seenOrder.push(id);
    while (this.seenOrder.length > this.dedupeMemory) {
      const oldest = this.seenOrder.shift();
      if (oldest !== undefined) this.seen.delete(oldest);
    }
  }
}

/**
 * Preenche o modelo de texto do alerta.
 * Placeholder sem valor correspondente vira string vazia, nunca "undefined"
 * escrito na tela ao vivo.
 */
export function formatAlertMessage(template: string, event: QueuedEvent): string {
  return template
    .replaceAll('{user}', event.user)
    .replaceAll('{amount}', event.amount ?? '')
    .replaceAll('{message}', event.message ?? '')
    .replaceAll('{count}', String(event.count));
}
