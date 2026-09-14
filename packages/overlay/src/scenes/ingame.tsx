import type { StreamKitState } from '@stream-kit/types';
import type { JSX } from 'react';

import { BarraInferior } from '../components/lower-bar.js';

export function Jogando({ state }: { state: StreamKitState }): JSX.Element {
  const { ingame } = state;
  return (
    <div className="cena">
      {ingame.showCam && (
        <div className="camera">
          <div className="camera__etiqueta">
            <span className="camera__ponto" />
            <span>{ingame.camLabel}</span>
          </div>
        </div>
      )}
      <BarraInferior state={state} />
    </div>
  );
}
