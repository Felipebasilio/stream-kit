/**
 * Amarracao com a Web Audio API. A regra esta em sound-plan.ts.
 *
 * Uma cena dedicada toca o audio (`?scene=audio`), separada da cena visual de
 * alertas. Separar permite controlar o volume no mixer do OBS e aplicar
 * sidechain na musica sem encostar no overlay.
 */

import type { AlertConfig, QueuedEvent } from '@stream-kit/types';
import { useCallback, useRef } from 'react';

import { planejarSom, type Tom } from './sound-plan.js';

type ContextoDeAudio = AudioContext;

function tocarTom(ctx: ContextoDeAudio, tom: Tom, volume: number): void {
  const agora = ctx.currentTime;
  tom.notas.forEach((frequencia, i) => {
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.type = tom.onda;
    osc.frequency.value = frequencia;

    const inicio = agora + i * tom.duracao;
    const fim = inicio + tom.duracao;
    // Envelope curto: sem isso cada nota estala no comeco e no fim.
    ganho.gain.setValueAtTime(0, inicio);
    ganho.gain.linearRampToValueAtTime(volume, inicio + 0.012);
    ganho.gain.exponentialRampToValueAtTime(0.0001, fim);

    osc.connect(ganho).connect(ctx.destination);
    osc.start(inicio);
    osc.stop(fim + 0.02);
  });
}

export function useTocador(config: AlertConfig): (evento: QueuedEvent) => void {
  const contexto = useRef<ContextoDeAudio | undefined>(undefined);

  return useCallback(
    (evento: QueuedEvent) => {
      const plano = planejarSom(config, evento);
      if (plano === undefined) return;

      if (plano.arquivo !== undefined) {
        const audio = new Audio(plano.arquivo);
        audio.volume = plano.volume;
        // Arquivo ausente ou formato nao suportado nao pode derrubar a cena.
        void audio.play().catch(() => undefined);
        return;
      }

      if (plano.tom === undefined) return;
      contexto.current ??= new AudioContext();
      const ctx = contexto.current;
      void ctx.resume().catch(() => undefined);
      tocarTom(ctx, plano.tom, plano.volume);
    },
    [config],
  );
}
