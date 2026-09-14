import type { Social, SocialIcon } from '@stream-kit/types';
import type { JSX } from 'react';

import type { PainelApi } from '../state/use-panel.hooks.js';
import { Cartao, Texto } from './campos.js';

const ICONES: readonly SocialIcon[] = [
  'kick',
  'twitch',
  'youtube',
  'instagram',
  'tiktok',
  'x',
  'discord',
  'site',
];

export function Redes({ api }: { api: PainelApi }): JSX.Element {
  const lista = api.state.socials;

  const atualizar = (indice: number, mudanca: Partial<Social>): void => {
    api.alterar({
      socials: lista.map((s, i) => (i === indice ? { ...s, ...mudanca } : s)),
    });
  };

  return (
    <Cartao titulo="Redes sociais">
      {lista.map((rede, i) => (
        <div className="rede-linha" key={`${rede.icon}-${String(i)}`}>
          <input
            type="checkbox"
            aria-label={`mostrar ${rede.handle}`}
            checked={rede.show}
            onChange={(e) => {
              atualizar(i, { show: e.target.checked });
            }}
          />
          <select
            aria-label={`plataforma de ${rede.handle}`}
            value={rede.icon}
            onChange={(e) => {
              atualizar(i, { icon: e.target.value as SocialIcon });
            }}
          >
            {ICONES.map((ic) => (
              <option key={ic} value={ic}>
                {ic}
              </option>
            ))}
          </select>
          <input
            type="text"
            aria-label={`@ de ${rede.icon}`}
            value={rede.handle}
            onChange={(e) => {
              atualizar(i, { handle: e.target.value });
            }}
          />
          <button
            className="fantasma perigo"
            title="remover"
            onClick={() => {
              api.alterar({ socials: lista.filter((_, n) => n !== i) });
            }}
          >
            ✕
          </button>
        </div>
      ))}

      <div className="linha duas" style={{ marginTop: 12 }}>
        <Texto
          id="titulo-redes"
          rotulo="Título da barra"
          valor={api.state.socialsLabel}
          aoMudar={(v) => {
            api.alterar({ socialsLabel: v });
          }}
        />
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            onClick={() => {
              api.alterar({
                socials: [...lista, { icon: 'site', handle: 'seusite.com', show: true }],
              });
            }}
          >
            + Adicionar rede
          </button>
        </div>
      </div>
    </Cartao>
  );
}
