/**
 * Contagem regressiva.
 *
 * Guardada como instante absoluto do fim, nunca como contador que decrementa:
 * contador acumula erro, dessincroniza entre cenas e pula quando a maquina
 * dorme. Com `endsAt`, qualquer cena que abrir no meio ja acerta o numero.
 */

import type { Countdown } from '@stream-kit/types';

export function startCountdown(minutes: number, now: number, label: string): Countdown {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return { enabled: false, endsAt: 0, label };
  }
  return { enabled: true, endsAt: Math.round(now + minutes * 60_000), label };
}

export function stopCountdown(label: string): Countdown {
  return { enabled: false, endsAt: 0, label };
}

/** Milissegundos restantes, nunca negativo. */
export function remainingMs(countdown: Countdown, now: number): number {
  if (!countdown.enabled || countdown.endsAt <= 0) return 0;
  return Math.max(0, countdown.endsAt - now);
}

/** Formata como MM:SS, ou HH:MM:SS quando passa de uma hora. */
export function formatRemaining(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}
