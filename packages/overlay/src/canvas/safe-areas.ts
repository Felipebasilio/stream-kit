/**
 * Areas que o player da plataforma cobre.
 *
 * Nao e teoria: os controles do player, o titulo e, no celular, a camada de
 * interacao ficam POR CIMA do seu video. O que estiver nessas faixas some
 * justamente para quem assiste no telefone — que e a maioria.
 *
 * As guias so aparecem no modo de edicao (`?edit=1`).
 */

import type { Orientation } from '@stream-kit/types';

export interface SafeArea {
  readonly id: string;
  readonly label: string;
  /** Fracao do lado correspondente, de 0 a 1. */
  readonly top?: number;
  readonly bottom?: number;
  readonly left?: number;
  readonly right?: number;
}

const HORIZONTAL: readonly SafeArea[] = [
  { id: 'controles', label: 'controles do player', bottom: 0.08 },
  { id: 'titulo', label: 'titulo e opcoes', top: 0.06 },
];

const VERTICAL: readonly SafeArea[] = [
  { id: 'controles', label: 'controles do player', bottom: 0.12 },
  { id: 'titulo', label: 'titulo e opcoes', top: 0.08 },
  { id: 'interacao', label: 'botoes de interacao', right: 0.15 },
];

export function safeAreasFor(orientation: Orientation): readonly SafeArea[] {
  return orientation === 'vertical' ? VERTICAL : HORIZONTAL;
}

/** Um retangulo em porcentagem, pronto para virar estilo inline. */
export function areaToStyle(area: SafeArea): Record<string, string> {
  if (area.bottom !== undefined) {
    return {
      left: '0',
      right: '0',
      bottom: '0',
      height: `${String(area.bottom * 100)}%`,
    };
  }
  if (area.top !== undefined) {
    return { left: '0', right: '0', top: '0', height: `${String(area.top * 100)}%` };
  }
  if (area.right !== undefined) {
    return { top: '0', bottom: '0', right: '0', width: `${String(area.right * 100)}%` };
  }
  return {
    top: '0',
    bottom: '0',
    left: '0',
    width: `${String((area.left ?? 0) * 100)}%`,
  };
}
