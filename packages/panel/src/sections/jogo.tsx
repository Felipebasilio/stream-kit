import { CAM_POSITIONS, type CamPosition } from '@stream-kit/types';
import type { JSX } from 'react';

import type { PainelApi } from '../state/use-panel.hooks.js';
import { Cartao, Marcar, Texto } from './campos.js';

const ROTULO_POSICAO: Record<CamPosition, string> = {
  'left-top': '↖ esq. cima',
  'right-top': '↗ dir. cima',
  'left-bottom': '↙ esq. baixo',
  'right-bottom': '↘ dir. baixo',
};

/**
 * Na ordem em que aparecem na tela, nao na ordem do contrato — mas derivada
 * do contrato, para uma posicao nova nunca ficar de fora do painel sem que
 * ninguem perceba.
 */
const ORDEM: readonly CamPosition[] = [...CAM_POSITIONS].sort((a, b) => {
  const linha = (p: CamPosition): number => (p.endsWith('top') ? 0 : 1);
  const coluna = (p: CamPosition): number => (p.startsWith('left') ? 0 : 1);
  return linha(a) - linha(b) || coluna(a) - coluna(b);
});

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
        <div>
          <label>Posição da câmera</label>
          <div className="cantos">
            {ORDEM.map((pos) => (
              <button
                key={pos}
                type="button"
                aria-pressed={g.camPosition === pos}
                className={g.camPosition === pos ? '' : 'fantasma'}
                disabled={!g.showCam}
                onClick={() => {
                  mudar('camPosition', pos);
                }}
              >
                {ROTULO_POSICAO[pos]}
              </button>
            ))}
          </div>
          <p className="dica">
            Muda a moldura ao vivo, com a transição. No OBS dá para fixar a posição por
            cena com <code>&amp;cam=left-top</code> na URL — é assim que um botão só do
            Stream Deck troca a moldura e a webcam juntas. Ver <code>docs/OBS.md</code>.
          </p>
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
