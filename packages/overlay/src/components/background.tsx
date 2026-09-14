import type { CanvasSpec } from '@stream-kit/types';
import { useMemo, type JSX } from 'react';

import { areaToStyle, safeAreasFor } from '../canvas/safe-areas.js';

interface Faixa {
  readonly left: number;
  readonly width: number;
  readonly opacity: number;
  readonly duracao: number;
  readonly atraso: number;
  readonly reversa: boolean;
}

/**
 * Gerador deterministico.
 *
 * Aleatorio de verdade faria o teste de imagem falhar a cada execucao. Com
 * semente fixa, a cena tem variacao visual e continua comparavel.
 */
function gerarFaixas(quantidade: number, semente: number): Faixa[] {
  let estado = semente;
  const proximo = (): number => {
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    return estado / 4294967296;
  };
  return Array.from({ length: quantidade }, (_, i) => {
    const duracao = 14 + proximo() * 22;
    return {
      left: (i / quantidade) * 130 - 15 + (proximo() * 6 - 3),
      width: 3 + proximo() * 34,
      opacity: 0.08 + proximo() * 0.42,
      duracao,
      atraso: -proximo() * duracao,
      reversa: i % 2 === 1,
    };
  });
}

export function Fundo({
  canvas,
  faixas = 14,
}: {
  canvas: CanvasSpec;
  faixas?: number;
}): JSX.Element {
  const lista = useMemo(
    () => gerarFaixas(faixas, canvas.height),
    [faixas, canvas.height],
  );

  return (
    <div className="fundo" aria-hidden="true">
      <div className="fundo__base" />
      <div className="fundo__brilho" />
      <div className="faixas">
        {lista.map((f, i) => (
          <div
            key={i}
            className="faixa"
            style={{
              left: `${String(f.left.toFixed(2))}%`,
              width: `calc(${String(f.width.toFixed(1))} * var(--u))`,
              opacity: f.opacity.toFixed(2),
              animationDuration: `${String(f.duracao.toFixed(1))}s`,
              animationDelay: `${String(f.atraso.toFixed(1))}s`,
              animationDirection: f.reversa ? 'alternate' : 'alternate-reverse',
            }}
          />
        ))}
        <div className="raio" />
      </div>
      <div className="fundo__vinheta" />
    </div>
  );
}

/** Guias das regioes que o player cobre. So no modo de edicao. */
export function AreasSeguras({ canvas }: { canvas: CanvasSpec }): JSX.Element {
  return (
    <>
      {safeAreasFor(canvas.orientation).map((area) => (
        <div key={area.id} className="area-segura" style={areaToStyle(area)}>
          <span className="area-segura__rotulo">{area.label}</span>
        </div>
      ))}
    </>
  );
}
