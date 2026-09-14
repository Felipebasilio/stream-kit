import { formatRemaining, remainingMs } from '@stream-kit/core';
import type { Countdown } from '@stream-kit/types';
import { useEffect, useState, type JSX } from 'react';

/**
 * Recalcula a partir do instante do fim, nunca decrementando um contador.
 * Assim uma cena aberta no meio ja acerta o numero, e dormir a maquina nao
 * dessincroniza as cenas entre si.
 */
export function Contagem({ countdown }: { countdown: Countdown }): JSX.Element | null {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    if (!countdown.enabled) return;
    const t = setInterval(() => {
      setAgora(Date.now());
    }, 250);
    return () => {
      clearInterval(t);
    };
  }, [countdown.enabled]);

  if (!countdown.enabled || countdown.endsAt <= 0) return null;

  return (
    <div className="contagem">
      {countdown.label.length > 0 && (
        <div className="contagem__rotulo">{countdown.label}</div>
      )}
      <div className="contagem__valor">
        {formatRemaining(remainingMs(countdown, agora))}
      </div>
    </div>
  );
}
