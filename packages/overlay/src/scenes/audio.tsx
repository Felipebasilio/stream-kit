import type { StreamEvent, StreamKitState } from '@stream-kit/types';
import { useEffect, useRef, type JSX } from 'react';

import { useTocador } from '../audio/player.hooks.js';

/**
 * Cena que so faz barulho.
 *
 * No OBS ela e uma fonte de navegador com audio roteado, sem nada visivel.
 * Fica separada da cena de alertas para que o volume possa ser controlado no
 * mixer e a musica de fundo possa abaixar por sidechain.
 */
export function Som({
  state,
  evento,
}: {
  state: StreamKitState;
  evento: StreamEvent | undefined;
}): JSX.Element {
  const tocar = useTocador(state.alerts);
  const ultimo = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (evento === undefined) return;
    if (ultimo.current === evento.id) return;
    ultimo.current = evento.id;
    tocar({ ...evento, count: 1 });
  }, [evento, tocar]);

  return (
    <div className="cena cena--som">
      <span className="cena--som__aviso">
        Fonte de áudio do Stream Kit — nada aparece aqui de propósito
      </span>
    </div>
  );
}
