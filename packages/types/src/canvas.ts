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

/** Piso de legibilidade: nada de texto abaixo disso (ver plano 03). */
export const MIN_READABLE_UNITS = 18;
