/**
 * Fila de envio do painel.
 *
 * Existe por causa de um bug real do painel em Python: cada alteracao
 * CANCELAVA a anterior que ainda nao tinha saido. Mexer em dois campos dentro
 * da mesma janela de espera perdia o primeiro em silencio — a tela mostrava o
 * valor certo e o servidor nunca recebia.
 *
 * Aqui as alteracoes se ACUMULAM num pacote unico. Agrupar nunca pode
 * significar descartar.
 */

import { mergePatches } from '@stream-kit/core';
import type { StatePatch } from '@stream-kit/types';

export interface SendQueueOptions {
  readonly send: (patch: StatePatch, id: string) => void;
  readonly delayMs?: number;
  readonly schedule?: (fn: () => void, ms: number) => unknown;
  readonly cancel?: (handle: unknown) => void;
  readonly gerarId?: () => string;
}

export class SendQueue {
  private pendentes: StatePatch[] = [];
  private handle: unknown;
  private contador = 0;

  private readonly send: (patch: StatePatch, id: string) => void;
  private readonly delayMs: number;
  private readonly schedule: (fn: () => void, ms: number) => unknown;
  private readonly cancel: (handle: unknown) => void;
  private readonly gerarId: () => string;

  constructor(options: SendQueueOptions) {
    this.send = options.send;
    this.delayMs = options.delayMs ?? 120;
    this.schedule = options.schedule ?? ((fn, ms) => setTimeout(fn, ms));
    this.cancel =
      options.cancel ??
      ((h): void => {
        clearTimeout(h as ReturnType<typeof setTimeout>);
      });
    this.gerarId = options.gerarId ?? ((): string => `p${String(++this.contador)}`);
  }

  get pendente(): number {
    return this.pendentes.length;
  }

  push(patch: StatePatch): void {
    this.pendentes.push(patch);
    if (this.handle !== undefined) return;
    this.handle = this.schedule(() => {
      this.handle = undefined;
      this.flush();
    }, this.delayMs);
  }

  /** Envia agora o que estiver acumulado. */
  flush(): void {
    if (this.handle !== undefined) {
      this.cancel(this.handle);
      this.handle = undefined;
    }
    if (this.pendentes.length === 0) return;
    const pacote = mergePatches<StatePatch>(this.pendentes);
    this.pendentes = [];
    this.send(pacote, this.gerarId());
  }

  /** Descarta o que nao foi enviado. Usado ao restaurar padroes. */
  clear(): void {
    if (this.handle !== undefined) {
      this.cancel(this.handle);
      this.handle = undefined;
    }
    this.pendentes = [];
  }
}
