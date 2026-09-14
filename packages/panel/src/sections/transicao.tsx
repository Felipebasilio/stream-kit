import type { TransitionStyle } from '@stream-kit/types';
import type { JSX } from 'react';

import type { PainelApi } from '../state/use-panel.hooks.js';
import { Cartao, Marcar } from './campos.js';

const ESTILOS: readonly { id: TransitionStyle; rotulo: string; nota: string }[] = [
  { id: 'wipe', rotulo: 'Cortina', nota: 'faixas diagonais atravessam a tela' },
  { id: 'shutter', rotulo: 'Persiana', nota: 'três lâminas horizontais' },
  { id: 'flash', rotulo: 'Estouro', nota: 'clarão curto, o menos intrusivo' },
];

export function Transicao({ api }: { api: PainelApi }): JSX.Element {
  const t = api.state.transition;
  const estilo = ESTILOS.find((e) => e.id === t.style);

  return (
    <Cartao titulo="Transição">
      <div className="abas">
        {ESTILOS.map((e) => (
          <button
            key={e.id}
            className={t.style === e.id ? 'aba on' : 'aba'}
            onClick={() => {
              api.alterar({ transition: { style: e.id } });
            }}
          >
            {e.rotulo}
          </button>
        ))}
      </div>

      <div className="linha duas">
        <div>
          <label htmlFor="duracao-transicao">
            Duração: {t.durationMs}ms
            {t.durationMs > 700 ? ' — acima de 700ms começa a irritar' : ''}
          </label>
          <input
            id="duracao-transicao"
            type="range"
            min={250}
            max={1000}
            step={50}
            value={t.durationMs}
            onChange={(e) => {
              api.alterar({ transition: { durationMs: Number(e.target.value) } });
            }}
          />
        </div>
        <div>
          <label>Ligada</label>
          <Marcar
            id="transicao-ligada"
            rotulo="tocar transição"
            valor={t.enabled}
            aoMudar={(v) => {
              api.alterar({ transition: { enabled: v } });
            }}
          />
        </div>
      </div>

      <div className="botoes">
        <button className="principal" onClick={api.transicao} disabled={!t.enabled}>
          Tocar agora
        </button>
      </div>
      <p className="dica">
        {estilo?.nota}. A transição toca por cima de qualquer cena aberta e segue as cores
        da identidade — coisa que um arquivo de vídeo pronto não faz.
      </p>
    </Cartao>
  );
}
