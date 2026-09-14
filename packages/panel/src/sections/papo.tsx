import type { JSX } from 'react';

import type { PainelApi } from '../state/use-panel.hooks.js';
import { Cartao, Texto } from './campos.js';

export function Papo({ api }: { api: PainelApi }): JSX.Element {
  const t = api.state.talking;
  return (
    <Cartao titulo="Cena de papo">
      <div className="linha">
        <Texto
          id="titulo-papo"
          rotulo="Título do painel"
          valor={t.title}
          aoMudar={(v) => {
            api.alterar({ talking: { title: v } });
          }}
        />
      </div>
      <div className="linha">
        <div>
          <label htmlFor="topicos">Tópicos (um por linha)</label>
          <textarea
            id="topicos"
            rows={4}
            value={t.topics.join('\n')}
            onChange={(e) => {
              api.alterar({
                talking: {
                  topics: e.target.value
                    .split('\n')
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0),
                },
              });
            }}
          />
        </div>
      </div>
    </Cartao>
  );
}
