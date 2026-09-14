/**
 * Icones genericos.
 *
 * Nao usamos os logotipos oficiais: sao marcas registradas, cada plataforma
 * tem regra propria de uso, e um app que distribui isso embutido cria um
 * problema que nao precisa existir. Quem quiser o logo real coloca o SVG na
 * pasta de assets e aponta `iconFile` na rede.
 */

import type { EventKind, SocialIcon } from '@stream-kit/types';
import type { JSX } from 'react';

const GLIFOS: Record<string, JSX.Element> = {
  video: (
    <>
      <rect x="1.5" y="4" width="21" height="16" rx="4" />
      <path d="M10 8.6v6.8L16 12z" fill="#0b1020" />
    </>
  ),
  foto: (
    <>
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="4.6" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.6" cy="6.4" r="1.5" />
    </>
  ),
  chat: (
    <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v9a2.5 2.5 0 0 1-2.5 2.5H9l-5 4v-4H5.5A2.5 2.5 0 0 1 3 14.5z" />
  ),
  aovivo: (
    <>
      <circle cx="12" cy="12" r="3.4" />
      <path
        d="M7.4 7.4a6.5 6.5 0 0 0 0 9.2M16.6 7.4a6.5 6.5 0 0 1 0 9.2M4.4 4.4a10.7 10.7 0 0 0 0 15.2M19.6 4.4a10.7 10.7 0 0 1 0 15.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </>
  ),
  musica: <path d="M9 18.2a3 3 0 1 1-2-2.83V6l11-2.4v9.6a3 3 0 1 1-2-2.83V6.1L9 7.6z" />,
  elo: (
    <>
      <path
        d="M10.4 13.6a4 4 0 0 0 5.66 0l2.83-2.83a4 4 0 1 0-5.66-5.66l-1.2 1.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M13.6 10.4a4 4 0 0 0-5.66 0L5.1 13.23a4 4 0 1 0 5.66 5.66l1.2-1.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </>
  ),
  coracao: (
    <path d="M12 20.3 4.3 12.9a4.8 4.8 0 0 1 6.8-6.8l.9.9.9-.9a4.8 4.8 0 0 1 6.8 6.8z" />
  ),
  estrela: (
    <path d="m12 3.4 2.7 5.6 6.1.85-4.45 4.3 1.07 6.05L12 17.34 6.58 20.2l1.07-6.05L3.2 9.85l6.1-.85z" />
  ),
  moeda: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path
        d="M12 7v10M14.6 9.3c-.5-.8-1.5-1.2-2.6-1.2-1.5 0-2.6.8-2.6 1.9 0 2.6 5.2 1.3 5.2 3.9 0 1.1-1.1 1.9-2.6 1.9-1.1 0-2.1-.4-2.6-1.2"
        fill="none"
        stroke="#0b1020"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  ),
  pessoas: (
    <>
      <circle cx="9" cy="8.2" r="3.5" />
      <circle cx="17" cy="9.4" r="2.7" />
      <path d="M2.5 19.5c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5z" />
      <path d="M16.6 14.2c2.9.2 4.9 2.1 4.9 4.6h-4.2z" />
    </>
  ),
};

const POR_PLATAFORMA: Record<SocialIcon, keyof typeof GLIFOS> = {
  twitch: 'aovivo',
  kick: 'aovivo',
  youtube: 'video',
  instagram: 'foto',
  tiktok: 'musica',
  x: 'chat',
  discord: 'chat',
  site: 'elo',
};

const POR_EVENTO: Record<EventKind, keyof typeof GLIFOS> = {
  follow: 'coracao',
  sub: 'estrela',
  donation: 'moeda',
  raid: 'pessoas',
  chat: 'chat',
};

function Svg({ nome }: { nome: keyof typeof GLIFOS }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {GLIFOS[nome]}
    </svg>
  );
}

export function IconeRede({ icone }: { icone: SocialIcon }): JSX.Element {
  return <Svg nome={POR_PLATAFORMA[icone] ?? 'elo'} />;
}

export function IconeEvento({ tipo }: { tipo: EventKind }): JSX.Element {
  return <Svg nome={POR_EVENTO[tipo] ?? 'coracao'} />;
}
