/**
 * Amarracao do React em volta de canvas/url.ts.
 *
 * Fora da medicao de cobertura de linha por decisao de projeto (D9): o que ha
 * de logica aqui esta em url.ts, com teste proprio; o que sobra e ligacao com
 * o ciclo de vida do React, exercitada pela suite de imagem.
 */

import type { CanvasSpec } from '@stream-kit/types';
import { useEffect, useMemo } from 'react';

import { applyCanvas, readCanvasFromUrl } from './url.js';

export function useCanvas(search: string): CanvasSpec {
  const canvas = useMemo(() => readCanvasFromUrl(search), [search]);
  useEffect(() => {
    applyCanvas(document.documentElement, canvas);
  }, [canvas]);
  return canvas;
}
