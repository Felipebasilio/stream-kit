/**
 * O sistema de canvas.
 *
 * Uma cena, N resolucoes. A resolucao so muda a ESCALA; o que muda o layout e
 * a ORIENTACAO. Tudo que tem tamanho na cena e multiplo de `--u`, que vale a
 * altura do canvas dividida por mil. Assim o desenho em 1080p e o mesmo em
 * 1440p, sem uma linha de CSS duplicada.
 */

import {
  isCamPosition,
  resolveCanvas,
  type CamPosition,
  type CanvasSpec,
} from '@stream-kit/types';

/**
 * `&cam=` fixa a camera numa posicao, ignorando o painel.
 *
 * Existe para o jeito de trocar de layout no OBS com um botao so: cada cena
 * do OBS tem a sua fonte de navegador com o `cam` dela e a webcam ja
 * posicionada no lugar certo. Trocar de cena move a moldura e a webcam
 * juntas, sem precisar acertar as duas na mao.
 *
 * `off` esconde a camera — e o layout sem camera, que pelo painel exigiria
 * achar a caixinha "mostrar camera" no meio de uma live.
 */
export type CamOverride = CamPosition | 'off';

export function readCamFromUrl(search: string): CamOverride | null {
  const valor = new URLSearchParams(search).get('cam');
  if (valor === null) return null;
  const limpo = valor.trim().toLowerCase();
  if (limpo === 'off' || limpo === 'none' || limpo === '0') return 'off';
  return isCamPosition(limpo) ? limpo : null;
}

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

/**
 * Mantem a transicao montada indefinidamente. Usado pelo gerador de stinger.
 * Nunca deve ser ligado numa cena que vai ao ar.
 */
export function readHoldFromUrl(search: string): boolean {
  return new URLSearchParams(search).get('hold') === '1';
}
