import type { Social, StreamKitState } from '@stream-kit/types';
import { useEffect, useState, type JSX } from 'react';

import { resolverIcone } from './icon-file.js';
import { IconeRede } from './icons.js';

export function visiveis(state: StreamKitState): readonly Social[] {
  return state.socials.filter((s) => s.show && s.handle.length > 0);
}

function Rede({ rede, ativa }: { rede: Social; ativa?: boolean }): JSX.Element {
  const arquivo = rede.iconFile === undefined ? '' : resolverIcone(rede.iconFile);
  return (
    <div className={ativa === undefined ? 'rede' : `rede${ativa ? ' rede--ativa' : ''}`}>
      <div className="rede__icone">
        {arquivo.length === 0 ? (
          <IconeRede icone={rede.icon} />
        ) : (
          <img src={arquivo} alt="" />
        )}
      </div>
      <div className="rede__arroba">{rede.handle}</div>
    </div>
  );
}

export function BlocoRedes({ state }: { state: StreamKitState }): JSX.Element | null {
  const lista = visiveis(state);
  if (lista.length === 0) return null;
  return (
    <div className="redes-bloco">
      {state.socialsLabel.length > 0 && (
        <div className="redes-bloco__rotulo">{state.socialsLabel}</div>
      )}
      <div className="redes">
        {lista.map((rede, i) => (
          <Rede key={`${rede.icon}-${String(i)}`} rede={rede} />
        ))}
      </div>
    </div>
  );
}

/** Uma rede por vez, em rodizio. Usado na barra inferior, onde falta espaco. */
export function RodizioRedes({
  state,
  intervaloMs = 5000,
}: {
  state: StreamKitState;
  intervaloMs?: number;
}): JSX.Element | null {
  const lista = visiveis(state);
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (lista.length <= 1) return;
    const t = setInterval(() => {
      setIndice((i) => (i + 1) % lista.length);
    }, intervaloMs);
    return () => {
      clearInterval(t);
    };
  }, [lista.length, intervaloMs]);

  if (lista.length === 0) return null;
  const atual = indice % lista.length;

  return (
    <div className="rodizio">
      {lista.map((rede, i) => (
        <Rede key={`${rede.icon}-${String(i)}`} rede={rede} ativa={i === atual} />
      ))}
    </div>
  );
}
