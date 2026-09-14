/**
 * Estado de fabrica. Substitui o antigo `state.default.json`.
 *
 * Mora aqui, e nao num JSON, para que o compilador garanta que o padrao
 * sempre corresponde ao contrato. Um JSON solto apodrece em silencio.
 */

import { DEFAULT_CANVAS_ID } from './canvas.js';
import { CURRENT_SCHEMA_VERSION, type StreamKitState } from './state.js';

export function createDefaultState(): StreamKitState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    brand: {
      name: 'SEU CANAL',
      accent: '#2f7dff',
      accent2: '#6fd2ff',
      bg1: '#050a16',
      bg2: '#0d2f6b',
      intensity: 1,
      titleFont: 'Anton',
    },
    scenes: {
      starting: {
        kicker: 'A LIVE ESTÁ',
        title: 'COMEÇANDO',
        note: 'Já já a gente começa, fica aí!',
      },
      brb: { kicker: 'VOLTO EM', title: 'INSTANTES', note: 'Não sai daí' },
      ending: {
        kicker: 'A LIVE ESTÁ',
        title: 'ACABANDO',
        note: 'Valeu demais por hoje!',
      },
    },
    socialsLabel: 'ME SEGUE LÁ',
    socials: [
      { icon: 'kick', handle: 'seucanal', show: true },
      { icon: 'instagram', handle: 'seu_insta', show: true },
      { icon: 'youtube', handle: 'seucanal', show: true },
      { icon: 'x', handle: 'seu_x', show: false },
      { icon: 'tiktok', handle: 'seu_tiktok', show: false },
      { icon: 'discord', handle: 'discord.gg/seuserver', show: false },
    ],
    countdown: { enabled: false, endsAt: 0, label: 'COMEÇA EM' },
    ingame: {
      showCam: true,
      camLabel: 'AO VIVO',
      nowPlaying: '',
      ticker: 'Bem-vindo à live! Use !comandos no chat',
      showClock: true,
      showTicker: true,
    },
    talking: {
      title: 'PAPO RETO',
      topics: ['Novidades da semana', 'Perguntas do chat', 'Próximos projetos'],
      showTopics: true,
    },
    alerts: {
      duration: 5000,
      position: 'top',
      messages: {
        follow: '{user} seguiu o canal!',
        sub: '{user} assinou o canal!',
        donation: '{user} mandou {amount}!',
        raid: '{user} chegou com {amount} pessoas!',
        chat: '{user}: {message}',
      },
      soundEnabled: true,
      sounds: {
        follow: { file: '', volume: 0.6 },
        sub: { file: '', volume: 0.8 },
        donation: { file: '', volume: 0.9 },
        raid: { file: '', volume: 0.9 },
        chat: { file: '', volume: 0.3 },
      },
    },
    previewCanvas: DEFAULT_CANVAS_ID,
    presets: [],
    transition: { enabled: true, style: 'wipe', durationMs: 550 },
  };
}
