import type { JSX } from 'react';

import type { PainelApi } from '../state/use-panel.hooks.js';
import { Cartao, Marcar, Texto } from './campos.js';

export function Jogo({ api }: { api: PainelApi }): JSX.Element {
  const g = api.state.ingame;
  const mudar = (campo: keyof typeof g, valor: string | boolean): void => {
    api.alterar({ ingame: { [campo]: valor } });
  };

  return (
    <Cartao titulo="Overlay in-game">
      <div className="linha tres">
        <Texto
          id="cam-label"
          rotulo="Etiqueta da câmera"
          valor={g.camLabel}
          aoMudar={(v) => {
            mudar('camLabel', v);
          }}
        />
        <Texto
          id="jogando"
          rotulo="Jogando agora"
          valor={g.nowPlaying}
          placeholder="vazio esconde"
          aoMudar={(v) => {
            mudar('nowPlaying', v);
          }}
        />
        <div>
          <label>Mostrar</label>
          <div className="botoes">
            <Marcar
              id="ver-cam"
              rotulo="câmera"
              valor={g.showCam}
              aoMudar={(v) => {
                mudar('showCam', v);
              }}
            />
            <Marcar
              id="ver-relogio"
              rotulo="relógio"
              valor={g.showClock}
              aoMudar={(v) => {
                mudar('showClock', v);
              }}
            />
            <Marcar
              id="ver-letreiro"
              rotulo="letreiro"
              valor={g.showTicker}
              aoMudar={(v) => {
                mudar('showTicker', v);
              }}
            />
          </div>
        </div>
      </div>
      <div className="linha">
        <Texto
          id="letreiro"
          rotulo="Letreiro da barra inferior"
          valor={g.ticker}
          aoMudar={(v) => {
            mudar('ticker', v);
          }}
        />
      </div>
    </Cartao>
  );
}
