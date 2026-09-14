import type { CanvasSpec, StreamKitState } from '@stream-kit/types';
import type { JSX } from 'react';

import { resolverCamera } from '../canvas/camera.js';
import type { CamOverride } from '../canvas/url.js';
import { BarraInferior } from '../components/lower-bar.js';

export function Jogando({
  state,
  canvas,
  cam = null,
}: {
  state: StreamKitState;
  canvas: CanvasSpec;
  cam?: CamOverride | null;
}): JSX.Element {
  const { ingame } = state;
  const camera = resolverCamera(ingame, cam);

  return (
    <div className="cena">
      {camera.mostrar && (
        <div className={`camera camera--${camera.posicao}`}>
          <div className="camera__etiqueta">
            <span className="camera__ponto" />
            <span>{ingame.camLabel}</span>
          </div>
        </div>
      )}
      <BarraInferior state={state} canvas={canvas} />
    </div>
  );
}
