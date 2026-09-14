import type { Social, SocialIcon } from '@stream-kit/types';
import { useEffect, useState, type JSX } from 'react';

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
  const [arquivos, setArquivos] = useState<string[]>([]);

  useEffect(() => {
    void fetch('/api/icons')
      .then((r) => r.json() as Promise<{ icons: string[] }>)
      .then((d) => {
        setArquivos(d.icons);
      })
      .catch(() => {
        setArquivos([]);
      });
  }, []);

  const atualizar = (indice: number, mudanca: Partial<Social>): void => {
    api.alterar({
      socials: lista.map((s, i) => (i === indice ? { ...s, ...mudanca } : s)),
    });
  };

  /**
   * Trocar o arquivo nao e um patch como os outros: voltar para o icone
   * generico significa a chave `iconFile` deixar de existir, e nao virar
   * `undefined` (o contrato e `exactOptionalPropertyTypes`).
   */
  const trocarArquivo = (indice: number, nome: string): void => {
    api.alterar({
      socials: lista.map((s, i) => {
        if (i !== indice) return s;
        const base: Social = { icon: s.icon, handle: s.handle, show: s.show };
        return nome.length === 0 ? base : { ...base, iconFile: nome };
      }),
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
          <select
            aria-label={`ícone de ${rede.icon}`}
            value={rede.iconFile ?? ''}
            onChange={(e) => {
              trocarArquivo(i, e.target.value);
            }}
          >
            <option value="">ícone genérico</option>
            {arquivos.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
            {rede.iconFile !== undefined && !arquivos.includes(rede.iconFile) && (
              <option value={rede.iconFile}>{rede.iconFile}</option>
            )}
          </select>
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

      <p className="dica">
        Os ícones que acompanham o app são <b>genéricos</b> de propósito: os logos
        oficiais são marca registrada e cada plataforma tem regra própria de uso. Para
        usar o logo de verdade, baixe o SVG (ou PNG) na página de imprensa da plataforma,
        coloque em <code>~/Library/Application Support/StreamKit/icones/</code>,
        recarregue o painel e escolha o arquivo na coluna do ícone.
        <br />
        Prefira arquivo quadrado e claro sobre fundo transparente — a barra é escura.
      </p>
    </Cartao>
  );
}
