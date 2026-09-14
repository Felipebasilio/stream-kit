/**
 * Quem decide onde a camera fica.
 *
 * Duas fontes mandam nisso: o painel (o estado) e a URL da fonte de
 * navegador. A URL vence quando diz alguma coisa, e isso nao e capricho — e o
 * que permite ter uma cena do OBS por layout, cada uma com a webcam ja
 * posicionada no canto certo. Sem isso a moldura desenharia sempre no canto
 * que o painel escolheu e brigaria com a webcam.
 */

import type { CamPosition, IngameConfig } from '@stream-kit/types';

import type { CamOverride } from './url.js';

export interface EstadoCamera {
  readonly mostrar: boolean;
  readonly posicao: CamPosition;
}

export function resolverCamera(
  ingame: Pick<IngameConfig, 'showCam' | 'camPosition'>,
  override: CamOverride | null,
): EstadoCamera {
  if (override === 'off') return { mostrar: false, posicao: ingame.camPosition };
  if (override !== null) return { mostrar: true, posicao: override };
  return { mostrar: ingame.showCam, posicao: ingame.camPosition };
}
