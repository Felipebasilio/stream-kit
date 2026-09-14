import type { CanvasSpec, StreamKitState } from '@stream-kit/types';
import type { JSX } from 'react';

import { Fundo } from '../components/background.js';
import { BarraInferior } from '../components/lower-bar.js';

export function Papo({
  state,
  canvas,
}: {
  state: StreamKitState;
  canvas: CanvasSpec;
}): JSX.Element {
  const { talking } = state;
  const topicos = talking.topics.filter((t) => t.length > 0);
  const mostrarPainel =
    talking.showTopics && (topicos.length > 0 || talking.title.length > 0);

  return (
    <div className="cena cena--opaca">
      <Fundo canvas={canvas} faixas={10} />
      {state.brand.name.length > 0 && (
        <div className="marca-dagua">{state.brand.name}</div>
      )}

      <div className="papo-camera" />

      {mostrarPainel && (
        <aside className="papo-painel">
          {talking.title.length > 0 && (
            <h2 className="papo-painel__titulo">{talking.title}</h2>
          )}
          {topicos.map((topico, i) => (
            <div
              key={topico}
              className="papo-topico"
              style={{ animationDelay: `${String(i * 0.08)}s` }}
            >
              <span className="papo-topico__n">{String(i + 1).padStart(2, '0')}</span>
              <span>{topico}</span>
            </div>
          ))}
        </aside>
      )}

      <BarraInferior state={state} canvas={canvas} />
    </div>
  );
}
