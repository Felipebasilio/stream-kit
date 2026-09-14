/* =========================================================================
   Ícones genéricos (play, foto, chat, live...).

   Não uso aqui os logotipos oficiais das plataformas — são marcas
   registradas e cada uma tem sua própria regra de uso. Se você quiser os
   logos de verdade, baixe o SVG oficial na página de imprensa/brand da
   plataforma, salve em overlay/shared/icons/ e no painel use o campo
   "arquivo do ícone" (ex.: icons/twitch.svg). O bus.js carrega o arquivo
   no lugar do ícone genérico.
   ========================================================================= */

const GLYPHS = {
  // play dentro de um retângulo arredondado - vídeo / canal de vídeo
  video: '<rect x="1.5" y="4" width="21" height="16" rx="4"/><path d="M10 8.6v6.8L16 12z" fill="#0b1020"/>',
  // câmera - foto / rede de imagens
  photo: '<rect x="2" y="2" width="20" height="20" rx="5.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.6" cy="6.4" r="1.5"/>',
  // balão de fala - chat / comunidade
  chat: '<path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v9a2.5 2.5 0 0 1-2.5 2.5H9l-5 4v-4H5.5A2.5 2.5 0 0 1 3 14.5z"/>',
  // ponto ao vivo com ondas - live / streaming
  live: '<circle cx="12" cy="12" r="3.4"/><path d="M7.4 7.4a6.5 6.5 0 0 0 0 9.2M16.6 7.4a6.5 6.5 0 0 1 0 9.2M4.4 4.4a10.7 10.7 0 0 0 0 15.2M19.6 4.4a10.7 10.7 0 0 1 0 15.2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  // nota musical - áudio / vídeos curtos
  music: '<path d="M9 18.2a3 3 0 1 1-2-2.83V6l11-2.4v9.6a3 3 0 1 1-2-2.83V6.1L9 7.6z"/>',
  // elo de corrente - link genérico
  link: '<path d="M10.4 13.6a4 4 0 0 0 5.66 0l2.83-2.83a4 4 0 1 0-5.66-5.66l-1.2 1.2" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/><path d="M13.6 10.4a4 4 0 0 0-5.66 0L5.1 13.23a4 4 0 1 0 5.66 5.66l1.2-1.2" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>',
  // coração - seguidor
  heart: '<path d="M12 20.3 4.3 12.9a4.8 4.8 0 0 1 6.8-6.8l.9.9.9-.9a4.8 4.8 0 0 1 6.8 6.8z"/>',
  // estrela - assinante
  star: '<path d="m12 3.4 2.7 5.6 6.1.85-4.45 4.3 1.07 6.05L12 17.34 6.58 20.2l1.07-6.05L3.2 9.85l6.1-.85z"/>',
  // moeda - doação
  coin: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M14.6 9.3c-.5-.8-1.5-1.2-2.6-1.2-1.5 0-2.6.8-2.6 1.9 0 2.6 5.2 1.3 5.2 3.9 0 1.1-1.1 1.9-2.6 1.9-1.1 0-2.1-.4-2.6-1.2" fill="none" stroke="#0b1020" stroke-width="1.6" stroke-linecap="round"/>',
  // pessoas - raid
  people: '<circle cx="9" cy="8.2" r="3.5"/><circle cx="17" cy="9.4" r="2.7"/><path d="M2.5 19.5c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5z"/><path d="M16.6 14.2c2.9.2 4.9 2.1 4.9 4.6h-4.2z"/>'
};

/* Qual glifo genérico usar para cada plataforma. */
const PLATFORM_GLYPH = {
  twitch: 'live',
  kick: 'live',
  youtube: 'video',
  instagram: 'photo',
  tiktok: 'music',
  x: 'chat',
  twitter: 'chat',
  bluesky: 'chat',
  threads: 'chat',
  discord: 'chat',
  telegram: 'chat',
  site: 'link',
  link: 'link'
};

export function iconSvg(name) {
  const key = GLYPHS[name] ? name : (PLATFORM_GLYPH[name] || 'link');
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${GLYPHS[key]}</svg>`;
}

export function alertIcon(type) {
  const map = { follow: 'heart', sub: 'star', donation: 'coin', raid: 'people' };
  return iconSvg(map[type] || 'heart');
}

export const AVAILABLE_ICONS = Object.keys(PLATFORM_GLYPH);
