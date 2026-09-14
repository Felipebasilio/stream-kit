/**
 * O contrato do estado. Fonte unica de verdade para servidor, painel e cenas.
 *
 * Mudar um campo aqui quebra a compilacao de quem usa errado — que e
 * exatamente o ponto da migracao para TypeScript.
 */

import type { CanvasId } from './canvas.js';

/** Sobe de 1 para 2 quando o formato mudar de forma incompativel. */
export const CURRENT_SCHEMA_VERSION = 1;

export type SceneId = 'starting' | 'brb' | 'ending';

export const SCENE_IDS: readonly SceneId[] = ['starting', 'brb', 'ending'];

export interface SceneText {
  /** Linha pequena acima do titulo. */
  kicker: string;
  /** O texto grande. Se ajusta sozinho para caber na largura do canvas. */
  title: string;
  /** Recado abaixo do titulo. Vazio esconde a linha. */
  note: string;
}

export interface Brand {
  name: string;
  accent: string;
  accent2: string;
  bg1: string;
  bg2: string;
  /** 0 desliga a animacao de fundo; 1 e o padrao; ate 1.6 exagera. */
  intensity: number;
  titleFont: string;
}

export type SocialIcon =
  'twitch' | 'kick' | 'youtube' | 'instagram' | 'tiktok' | 'x' | 'discord' | 'site';

export interface Social {
  icon: SocialIcon;
  handle: string;
  show: boolean;
  /**
   * Caminho para um SVG do usuario, relativo a pasta de assets.
   * Opcional porque os icones que acompanham o app sao genericos de
   * proposito — logos oficiais sao marca registrada de cada plataforma.
   */
  iconFile?: string;
}

export interface Countdown {
  enabled: boolean;
  /** Instante do fim, absoluto. Nunca um contador que acumula erro. */
  endsAt: number;
  label: string;
}

export interface IngameConfig {
  showCam: boolean;
  camLabel: string;
  /** Vazio esconde o bloco inteiro. */
  nowPlaying: string;
  ticker: string;
  showClock: boolean;
  showTicker: boolean;
}

export interface TalkingConfig {
  title: string;
  topics: string[];
  showTopics: boolean;
}

export type AlertPosition = 'top' | 'center' | 'bottom';

export interface AlertConfig {
  /** Duracao na tela, em milissegundos. */
  duration: number;
  position: AlertPosition;
  /** Modelos de texto. Aceitam {user} e {amount}. */
  messages: {
    follow: string;
    sub: string;
    donation: string;
    raid: string;
    chat: string;
  };
}

/**
 * Uma identidade visual salva com nome.
 *
 * Existe para trocar de "live de codigo" para "live de jogo" num clique, em
 * vez de reeditar cor por cor no meio da transmissao.
 */
export interface Preset {
  readonly id: string;
  readonly name: string;
  readonly brand: Brand;
}

export interface StreamKitState {
  schemaVersion: number;
  brand: Brand;
  scenes: Record<SceneId, SceneText>;
  socialsLabel: string;
  socials: Social[];
  countdown: Countdown;
  ingame: IngameConfig;
  talking: TalkingConfig;
  alerts: AlertConfig;
  /** Canvas escolhido no painel para a previa. Nao afeta o OBS. */
  previewCanvas: CanvasId;
  /** Identidades salvas. Vazio ate o usuario salvar a primeira. */
  presets: Preset[];
}

/**
 * Patch parcial e profundo.
 *
 * Arrays sao substituidos por inteiro, nunca mesclados item a item: mesclar
 * array por indice e a origem classica de bug silencioso ao remover um item.
 */
export type DeepPartial<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export type StatePatch = DeepPartial<StreamKitState>;
