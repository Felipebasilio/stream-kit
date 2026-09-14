/**
 * Desfazer e refazer.
 *
 * Guarda estados inteiros, nao patches: desfazer precisa conseguir REMOVER um
 * item de uma lista, e patch parcial nao expressa remocao. Como o estado e um
 * objeto pequeno, o custo e irrelevante perto do beneficio de corrigir um erro
 * de digitacao ao vivo com Cmd+Z.
 */

import { isDeepEqual } from '@stream-kit/core';
import type { StreamKitState } from '@stream-kit/types';

export const LIMITE_PADRAO = 50;

export class History {
  private passado: StreamKitState[] = [];
  private futuro: StreamKitState[] = [];

  constructor(private readonly limite: number = LIMITE_PADRAO) {}

  get podeDesfazer(): boolean {
    return this.passado.length > 0;
  }
  get podeRefazer(): boolean {
    return this.futuro.length > 0;
  }
  get tamanho(): number {
    return this.passado.length;
  }

  /**
   * Registra o estado ANTES de uma alteracao do usuario.
   * Estado igual ao topo nao entra: evitar entradas repetidas e o que faz o
   * Cmd+Z voltar um passo de verdade, e nao ficar preso no mesmo ponto.
   */
  registrar(anterior: StreamKitState): void {
    const topo = this.passado.at(-1);
    if (topo !== undefined && isDeepEqual(topo, anterior)) return;
    this.passado.push(anterior);
    if (this.passado.length > this.limite) this.passado.shift();
    // Um caminho novo apaga o futuro: e o comportamento que todo editor tem.
    this.futuro = [];
  }

  desfazer(atual: StreamKitState): StreamKitState | undefined {
    const anterior = this.passado.pop();
    if (anterior === undefined) return undefined;
    this.futuro.push(atual);
    return anterior;
  }

  refazer(atual: StreamKitState): StreamKitState | undefined {
    const proximo = this.futuro.pop();
    if (proximo === undefined) return undefined;
    this.passado.push(atual);
    return proximo;
  }

  limpar(): void {
    this.passado = [];
    this.futuro = [];
  }
}
