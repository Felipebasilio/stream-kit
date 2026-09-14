/**
 * Cache local do ultimo estado bom.
 *
 * Requisito, nao melhoria: se o servidor cair no meio da live, a cena NAO
 * PODE FICAR PRETA. Ela pinta o ultimo estado conhecido e continua desenhando
 * como se nada tivesse acontecido. O espectador nunca ve erro nosso.
 */

import { createDefaultState, type StreamKitState } from '@stream-kit/types';
import { migrate } from '@stream-kit/core';

export const CACHE_KEY = 'stream-kit:ultimo-estado';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readCache(storage: StorageLike | undefined): StreamKitState {
  if (storage === undefined) return createDefaultState();
  try {
    const bruto = storage.getItem(CACHE_KEY);
    if (bruto === null) return createDefaultState();
    return migrate(JSON.parse(bruto)).state;
  } catch {
    // Armazenamento bloqueado ou conteudo estragado: melhor o padrao que nada.
    return createDefaultState();
  }
}

export function writeCache(
  storage: StorageLike | undefined,
  state: StreamKitState,
): void {
  if (storage === undefined) return;
  try {
    storage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch {
    // Modo privado, cota estourada: seguir em frente sem cache e aceitavel.
  }
}
