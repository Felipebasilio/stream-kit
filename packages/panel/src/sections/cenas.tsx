import { SCENE_IDS, type SceneId } from '@stream-kit/types';
import { useState, type JSX } from 'react';

import type { PainelApi } from '../state/use-panel.hooks.js';
import { Cartao, Texto } from './campos.js';

const ROTULO: Record<SceneId, string> = {
  starting: 'Começando',
  brb: 'Volto já',
  ending: 'Encerrando',
};

export function Cenas({ api }: { api: PainelApi }): JSX.Element {
  const [cena, setCena] = useState<SceneId>('starting');
  const texto = api.state.scenes[cena];

  const mudar = (campo: 'kicker' | 'title' | 'note', valor: string): void => {
    api.alterar({ scenes: { [cena]: { [campo]: valor } } });
  };

  return (
    <Cartao titulo="Textos das telas cheias">
      <div className="abas">
        {SCENE_IDS.map((id) => (
          <button
            key={id}
            className={cena === id ? 'aba on' : 'aba'}
            onClick={() => {
              setCena(id);
            }}
          >
            {ROTULO[id]}
          </button>
        ))}
      </div>
      <div className="linha duas">
        <Texto
          id="kicker"
          rotulo="Linha de cima"
          valor={texto.kicker}
          aoMudar={(v) => {
            mudar('kicker', v);
          }}
        />
        <Texto
          id="titulo"
          rotulo="Título grande"
          valor={texto.title}
          aoMudar={(v) => {
            mudar('title', v);
          }}
        />
      </div>
      <div className="linha">
        <Texto
          id="recado"
          rotulo="Recado abaixo"
          valor={texto.note}
          aoMudar={(v) => {
            mudar('note', v);
          }}
        />
      </div>
    </Cartao>
  );
}
