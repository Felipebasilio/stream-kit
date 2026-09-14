/**
 * Modelo de evento normalizado.
 *
 * Entra na fundacao ainda sem nenhum adaptador de plataforma (decisao D10):
 * hoje a unica fonte e o painel, disparando manualmente. Quando a Kick entrar,
 * ela so preenche um espaco que ja existe, em vez de forcar um redesenho.
 */

export type Platform = 'manual' | 'kick' | 'youtube' | 'tiktok' | 'twitch';

export type EventKind = 'follow' | 'sub' | 'donation' | 'raid' | 'chat';

export const EVENT_KINDS: readonly EventKind[] = [
  'follow',
  'sub',
  'donation',
  'raid',
  'chat',
];

export interface StreamEvent {
  /** Chave de idempotencia. Webhook reentregue nao pode virar alerta dobrado. */
  readonly id: string;
  readonly platform: Platform;
  readonly kind: EventKind;
  readonly user: string;
  /** Milissegundos desde a epoca, do momento do evento na origem. */
  readonly at: number;
  /** Valor da doacao ou tamanho do raid, ja formatado para exibicao. */
  readonly amount?: string;
  /** Texto do chat, ou recado que acompanha a doacao. */
  readonly message?: string;
}

/**
 * Evento como sai da fila: pode representar varios iguais agrupados.
 * Numa raid, 12 follows viram um alerta com `count: 12`.
 */
export interface QueuedEvent extends StreamEvent {
  readonly count: number;
}

export function isEventKind(value: unknown): value is EventKind {
  return typeof value === 'string' && (EVENT_KINDS as readonly string[]).includes(value);
}
