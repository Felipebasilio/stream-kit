import type { CanvasSpec, StreamKitState } from '@stream-kit/types';
import { useEffect, useState, type JSX } from 'react';

import { mostrarRelogio } from './bar-fit.js';
import { RodizioRedes, visiveis } from './socials.js';

function agora(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function useRelogio(): string {
  const [hora, setHora] = useState(agora);
  useEffect(() => {
    const t = setInterval(() => {
      setHora(agora());
    }, 10_000);
    return () => {
      clearInterval(t);
    };
  }, []);
  return hora;
}

export function BarraInferior({
  state,
  canvas,
}: {
  state: StreamKitState;
  canvas: CanvasSpec;
}): JSX.Element {
  const hora = useRelogio();
  const { ingame } = state;
  const relogio = mostrarRelogio({
    showClock: ingame.showClock,
    orientation: canvas.orientation,
    handles: visiveis(state).map((r) => r.handle),
  });

  return (
    <div className="barra">
      {state.brand.name.length > 0 && (
        <div className="barra__marca">{state.brand.name}</div>
      )}

      {/*
        O bloco do meio abriga o letreiro e o "jogando agora".

        No vertical o letreiro some e sobra espaco aqui — e por isso o
        "jogando" mora neste bloco, e nao junto do relogio: espremido a direita
        ele quebrava em duas linhas e vazava pela borda da tela.
      */}
      <div className="barra__meio">
        {ingame.showTicker && ingame.ticker.length > 0 && (
          <div className="letreiro-caixa">
            <div className="letreiro">{ingame.ticker}</div>
          </div>
        )}
        {ingame.nowPlaying.length > 0 && (
          <div className="jogando">
            <div className="jogando__caixa">
              <span className="jogando__rotulo">JOGANDO</span>
              <span className="jogando__valor" title={ingame.nowPlaying}>
                {ingame.nowPlaying}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="barra__direita">
        <RodizioRedes state={state} />
        {relogio && <div className="relogio">{hora}</div>}
      </div>
    </div>
  );
}
