import type { StreamKitState } from '@stream-kit/types';
import { useEffect, useState, type JSX } from 'react';

import { RodizioRedes } from './socials.js';

function useRelogio(): string {
  const [hora, setHora] = useState(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  );
  useEffect(() => {
    const t = setInterval(() => {
      setHora(
        new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      );
    }, 10_000);
    return () => {
      clearInterval(t);
    };
  }, []);
  return hora;
}

export function BarraInferior({ state }: { state: StreamKitState }): JSX.Element {
  const hora = useRelogio();
  const { ingame } = state;

  return (
    <div className="barra">
      {state.brand.name.length > 0 && (
        <div className="barra__marca">{state.brand.name}</div>
      )}
      {ingame.showTicker && ingame.ticker.length > 0 && (
        <div className="barra__meio">
          <div className="letreiro">{ingame.ticker}</div>
        </div>
      )}
      <div className="barra__direita">
        <RodizioRedes state={state} />
        {ingame.nowPlaying.length > 0 && (
          <div className="jogando">
            <div>
              <span className="jogando__rotulo">JOGANDO</span>
              <span>{ingame.nowPlaying}</span>
            </div>
          </div>
        )}
        {ingame.showClock && <div className="relogio">{hora}</div>}
      </div>
    </div>
  );
}
