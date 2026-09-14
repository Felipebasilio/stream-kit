/**
 * As URLs que vao para o OBS.
 *
 * Ficam num lugar so porque tres consumidores precisam delas: o terminal ao
 * subir, o painel (botao de copiar) e o gerador de colecao de cenas.
 */

import { CANVASES, type CanvasId } from '@stream-kit/types';

export interface OverlayUrl {
  readonly label: string;
  readonly path: string;
}

export const OVERLAY_PATHS: readonly OverlayUrl[] = [
  { label: 'Começando', path: '/overlay/?scene=starting' },
  { label: 'Volto já', path: '/overlay/?scene=brb' },
  { label: 'Encerrando', path: '/overlay/?scene=ending' },
  { label: 'Jogando', path: '/overlay/?scene=ingame' },
  { label: 'Papo', path: '/overlay/?scene=talking' },
  { label: 'Alertas', path: '/overlay/?scene=alerts' },
];

export function buildUrl(origin: string, path: string, canvas: CanvasId): string {
  const separador = path.includes('?') ? '&' : '?';
  return `${origin}${path}${separador}canvas=${canvas}`;
}

export function listOverlayUrls(
  origin: string,
  canvas: CanvasId,
): readonly { label: string; url: string; width: number; height: number }[] {
  const spec = CANVASES[canvas];
  return OVERLAY_PATHS.map((item) => ({
    label: item.label,
    url: buildUrl(origin, item.path, canvas),
    width: spec.width,
    height: spec.height,
  }));
}
