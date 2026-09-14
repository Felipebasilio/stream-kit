import { useState, type JSX } from 'react';

import type { PainelApi } from '../state/use-panel.hooks.js';
import { Cartao, Texto } from './campos.js';

export function Contagem({ api }: { api: PainelApi }): JSX.Element {
  const [minutos, setMinutos] = useState(10);

  return (
    <Cartao titulo="Contagem regressiva">
      <div className="linha duas">
        <Texto
          id="rotulo-contagem"
          rotulo="Rótulo"
          valor={api.state.countdown.label}
          aoMudar={(v) => {
            api.alterar({ countdown: { label: v } });
          }}
        />
        <div>
          <label htmlFor="minutos">Minutos</label>
          <input
            id="minutos"
            type="number"
            min={0}
            max={180}
            value={minutos}
            onChange={(e) => {
              setMinutos(Number(e.target.value));
            }}
          />
        </div>
      </div>
      <div className="botoes">
        <button
          className="principal"
          onClick={() => {
            api.contagem(minutos);
          }}
        >
          Iniciar
        </button>
        {[5, 10, 15].map((m) => (
          <button
            key={m}
            onClick={() => {
              setMinutos(m);
              api.contagem(m);
            }}
          >
            {m} min
          </button>
        ))}
        <button
          className="perigo"
          onClick={() => {
            api.contagem(0);
          }}
        >
          Parar
        </button>
      </div>
    </Cartao>
  );
}
