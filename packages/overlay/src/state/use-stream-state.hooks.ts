/**
 * Amarracao do React em volta de state/connection.ts e state/cache.ts.
 * Fora da cobertura de linha pelo mesmo motivo de use-canvas.hooks.ts.
 */

import type { StreamEvent, StreamKitState } from '@stream-kit/types';
import { useEffect, useRef, useState } from 'react';

import { readCache, writeCache } from './cache.js';
import { connect, urlDoSocket } from './connection.js';

export interface StreamStateResult {
  readonly state: StreamKitState;
  readonly conectado: boolean;
  readonly evento: StreamEvent | undefined;
  /** Cresce a cada pedido de transicao. Zero significa "nenhum ainda". */
  readonly gatilhoTransicao: number;
}

function armazenamentoLocal(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined; // navegador com armazenamento bloqueado
  }
}

export function useStreamState(): StreamStateResult {
  const armazenamento = useRef<Storage | undefined>(armazenamentoLocal());

  // Pinta o cache ANTES de conectar: a cena nunca aparece em branco.
  const [state, setState] = useState<StreamKitState>(() =>
    readCache(armazenamento.current),
  );
  const [conectado, setConectado] = useState(false);
  const [evento, setEvento] = useState<StreamEvent | undefined>(undefined);
  const [gatilhoTransicao, setGatilho] = useState(0);

  useEffect(() => {
    return connect(
      { url: urlDoSocket(window.location), createSocket: (url) => new WebSocket(url) },
      {
        onState: (novo) => {
          setState(novo);
          writeCache(armazenamento.current, novo);
        },
        onEvent: setEvento,
        onTransition: () => {
          setGatilho((g) => g + 1);
        },
        onStatus: setConectado,
      },
    );
  }, []);

  return { state, conectado, evento, gatilhoTransicao };
}
