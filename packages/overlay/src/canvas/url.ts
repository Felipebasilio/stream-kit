/**
 * O sistema de canvas.
 *
 * Uma cena, N resolucoes. A resolucao so muda a ESCALA; o que muda o layout e
 * a ORIENTACAO. Tudo que tem tamanho na cena e multiplo de `--u`, que vale a
 * altura do canvas dividida por mil. Assim o desenho em 1080p e o mesmo em
 * 1440p, sem uma linha de CSS duplicada.
 */

import { resolveCanvas, type CanvasSpec } from '@stream-kit/types';

export function readCanvasFromUrl(search: string): CanvasSpec {
  return resolveCanvas(new URLSearchParams(search).get('canvas'));
}

export function readSceneFromUrl(search: string): string {
  return new URLSearchParams(search).get('scene') ?? 'starting';
}

/** Modo de edicao: liga guias de area segura. Nunca ligado na transmissao. */
export function readEditModeFromUrl(search: string): boolean {
  return new URLSearchParams(search).get('edit') === '1';
}

export function applyCanvas(root: HTMLElement, canvas: CanvasSpec): void {
  root.style.setProperty('--u', `${String(canvas.height / 1000)}px`);
  root.style.setProperty('--canvas-w', `${String(canvas.width)}px`);
  root.style.setProperty('--canvas-h', `${String(canvas.height)}px`);
  root.dataset['orientation'] = canvas.orientation;
  root.dataset['canvas'] = canvas.id;
}
