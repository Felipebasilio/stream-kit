import type { CanvasId } from '@stream-kit/types';
import type { JSX } from 'react';

import { Previa } from './preview/preview.js';
import { UrlsDoObs } from './preview/urls.js';
import { Alertas } from './sections/alertas.js';
import { Cenas } from './sections/cenas.js';
import { Contagem } from './sections/contagem.js';
import { Identidade } from './sections/identidade.js';
import { Jogo } from './sections/jogo.js';
import { Papo } from './sections/papo.js';
import { Redes } from './sections/redes.js';
import { Som } from './sections/som.js';
import { Transicao } from './sections/transicao.js';
import { usePainel } from './state/use-panel.hooks.js';

export function App(): JSX.Element {
  const api = usePainel();

  return (
    <>
      <header>
        <span className={api.conectado ? 'ponto on' : 'ponto'} data-testid="conexao" />
        <h1>STREAM KIT</h1>
        <span className="apagado">
          {api.conectado ? 'ao vivo — as cenas atualizam na hora' : 'reconectando…'}
        </span>
        <span className="espaco" />
        <button className="fantasma" onClick={api.desfazer} disabled={!api.podeDesfazer}>
          Desfazer
        </button>
        <button className="fantasma" onClick={api.refazer} disabled={!api.podeRefazer}>
          Refazer
        </button>
      </header>

      <div className="grade">
        <div>
          <Identidade api={api} />
          <Cenas api={api} />
          <Contagem api={api} />
          <Redes api={api} />
          <Jogo api={api} />
          <Papo api={api} />
          <Alertas api={api} />
          <Som api={api} />
          <Transicao api={api} />
        </div>
        <div>
          <Previa
            canvas={api.state.previewCanvas}
            aoTrocarCanvas={(id: CanvasId) => {
              api.alterar({ previewCanvas: id });
            }}
          />
          <div className="cartao" style={{ marginTop: 18 }}>
            <UrlsDoObs canvas={api.state.previewCanvas} />
          </div>
        </div>
      </div>
    </>
  );
}
