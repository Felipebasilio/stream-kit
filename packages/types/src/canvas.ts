/**
 * Canvas: o tamanho em que uma cena e desenhada.
 *
 * Regra do projeto: um desenho, N resolucoes. A resolucao so muda a escala;
 * o que muda de verdade o layout e a ORIENTACAO.
 */

export type Orientation = 'horizontal' | 'vertical';

export type CanvasId = 'hd' | 'qhd' | 'vertical';

export interface CanvasSpec {
  readonly id: CanvasId;
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly orientation: Orientation;
}

export const CANVASES: Readonly<Record<CanvasId, CanvasSpec>> = {
  hd: {
    id: 'hd',
    label: '1920x1080',
    width: 1920,
    height: 1080,
    orientation: 'horizontal',
  },
  qhd: {
    id: 'qhd',
    label: '2560x1440',
    width: 2560,
    height: 1440,
    orientation: 'horizontal',
  },
  vertical: {
    id: 'vertical',
    label: '1080x1920',
    width: 1080,
    height: 1920,
    orientation: 'vertical',
  },
} as const;

/** Canvas padrao: 1440p, que e o que o YouTube premia com bitrate maior. */
export const DEFAULT_CANVAS_ID: CanvasId = 'qhd';

export const CANVAS_IDS: readonly CanvasId[] = ['hd', 'qhd', 'vertical'];

export function isCanvasId(value: unknown): value is CanvasId {
  return typeof value === 'string' && (CANVAS_IDS as readonly string[]).includes(value);
}

/**
 * Resolve um canvas a partir de texto vindo da URL (`?canvas=qhd`).
 * Entrada desconhecida cai no padrao em vez de quebrar a cena no ar.
 */
export function resolveCanvas(value: unknown): CanvasSpec {
  return isCanvasId(value) ? CANVASES[value] : CANVASES[DEFAULT_CANVAS_ID];
}

/**
 * A unidade base do sistema de layout: 1u = altura / 1000.
 * Todo tamanho de cena e multiplo disso, o que torna o desenho identico
 * em qualquer resolucao da mesma orientacao.
 */
export function baseUnit(canvas: CanvasSpec): number {
  return canvas.height / 1000;
}

/**
 * Piso de legibilidade, em unidades base (= 2,2% da altura do canvas).
 *
 * De onde vem o numero: a maioria assiste no celular, onde um quadro de
 * 2560px de largura e reduzido para algo perto de 1170px fisicos. Nessa
 * reducao, 2,2% da altura sobrevive; 1,5% (que era o tamanho dos @s no kit
 * antigo) vira um borrao. Em pixels isso da 24px em 1080p e 32px em 1440p.
 *
 * Nao e opiniao: existe um teste que varre cada cena e falha se algum texto
 * ficar abaixo disso.
 */
export const MIN_READABLE_UNITS = 22;

/** Escala tipografica da cena, em unidades base. */
export const TYPE_SCALE = {
  /** Linha pequena acima do titulo, sempre em caixa alta e espacada. */
  kicker: 28,
  /** Texto corrido: recados, topicos, letreiro. */
  body: 26,
  /** Rotulos de destaque: "ME SEGUE LA", etiqueta da camera. */
  label: 24,
  /** @s e valores curtos. */
  handle: 22,
  /** O numero da contagem regressiva. */
  countdown: 90,
  /** O texto grande. Se ajusta sozinho para caber. */
  title: 200,
} as const;
