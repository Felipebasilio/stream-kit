import type { StreamKitState } from '@stream-kit/types';
import { useState, type JSX } from 'react';

import { aplicarPreset, removerPreset, salvarPreset } from '../state/presets.js';
import { PALETAS } from '../state/palettes.js';
import type { PainelApi } from '../state/use-panel.hooks.js';
import { Cartao, Cor, Texto } from './campos.js';

export function Identidade({ api }: { api: PainelApi }): JSX.Element {
  const { state } = api;
  const [nomePreset, setNomePreset] = useState('');

  const mudarMarca = (
    campo: keyof StreamKitState['brand'],
    valor: string | number,
  ): void => {
    api.alterar({ brand: { [campo]: valor } });
  };

  return (
    <Cartao titulo="Identidade">
      <div className="linha duas">
        <Texto
          id="nome-canal"
          rotulo="Nome do canal"
          valor={state.brand.name}
          aoMudar={(v) => {
            mudarMarca('name', v);
          }}
        />
        <div>
          <label htmlFor="intensidade">Intensidade da animação de fundo</label>
          <input
            id="intensidade"
            type="range"
            min={0}
            max={1.6}
            step={0.05}
            value={state.brand.intensity}
            onChange={(e) => {
              mudarMarca('intensity', Number(e.target.value));
            }}
          />
        </div>
      </div>

      <div className="linha quatro">
        <Cor
          id="cor-accent"
          rotulo="Cor principal"
          valor={state.brand.accent}
          aoMudar={(v) => {
            mudarMarca('accent', v);
          }}
        />
        <Cor
          id="cor-accent2"
          rotulo="Cor de destaque"
          valor={state.brand.accent2}
          aoMudar={(v) => {
            mudarMarca('accent2', v);
          }}
        />
        <Cor
          id="cor-bg1"
          rotulo="Fundo escuro"
          valor={state.brand.bg1}
          aoMudar={(v) => {
            mudarMarca('bg1', v);
          }}
        />
        <Cor
          id="cor-bg2"
          rotulo="Fundo claro"
          valor={state.brand.bg2}
          aoMudar={(v) => {
            mudarMarca('bg2', v);
          }}
        />
      </div>

      <div className="fichas">
        {PALETAS.map((p) => (
          <button
            key={p.nome}
            className="aba"
            style={{ borderColor: p.cores.accent }}
            onClick={() => {
              api.alterar({ brand: p.cores });
            }}
          >
            {p.nome}
          </button>
        ))}
      </div>

      <div className="linha duas" style={{ marginTop: 6 }}>
        <Texto
          id="nome-preset"
          rotulo="Salvar esta identidade como"
          valor={nomePreset}
          placeholder="ex.: live de código"
          aoMudar={setNomePreset}
        />
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            disabled={nomePreset.trim().length === 0}
            onClick={() => {
              api.alterar({
                presets: salvarPreset(state.presets, nomePreset, state.brand),
              });
              setNomePreset('');
            }}
          >
            Salvar identidade
          </button>
        </div>
      </div>

      {state.presets.length > 0 && (
        <div className="fichas">
          {state.presets.map((p) => (
            <span key={p.id} style={{ display: 'inline-flex', gap: 4 }}>
              <button
                className="aba"
                style={{ borderColor: p.brand.accent }}
                onClick={() => {
                  const brand = aplicarPreset(state.presets, p.id);
                  if (brand !== undefined) api.alterar({ brand });
                }}
              >
                {p.name}
              </button>
              <button
                className="fantasma perigo"
                title={`apagar ${p.name}`}
                onClick={() => {
                  api.alterar({ presets: removerPreset(state.presets, p.id) });
                }}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </Cartao>
  );
}
