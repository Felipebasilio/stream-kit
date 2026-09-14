import type { TransitionConfig } from '@stream-kit/types';
import { useEffect, useState, type JSX } from 'react';

/**
 * Cortina de transicao.
 *
 * Meio segundo de animacao entre cenas muda a percepcao de producao mais que
 * qualquer detalhe de layout. Aqui ela e uma cena de navegador que anima sob
 * comando, o que permite seguir as cores do painel ao vivo — coisa que um
 * arquivo de video pronto nao faz.
 */
export function Transicao({
  config,
  gatilho,
  segurar = false,
}: {
  config: TransitionConfig;
  gatilho: number;
  /**
   * Mantem a cortina montada depois do fim. Usado so pelo gerador de stinger,
   * que captura quadro a quadro e leva muito mais tempo de relogio do que a
   * duracao da animacao — sem isso o componente desmonta no meio da captura e
   * o video sai com quadros vazios.
   */
  segurar?: boolean;
}): JSX.Element | null {
  const [tocando, setTocando] = useState(false);

  useEffect(() => {
    if (gatilho === 0 || !config.enabled) return;
    setTocando(true);
    if (segurar) return;
    const t = setTimeout(() => {
      setTocando(false);
    }, config.durationMs);
    return () => {
      clearTimeout(t);
    };
  }, [gatilho, config.enabled, config.durationMs, segurar]);

  if (!tocando) return null;

  return (
    <div
      className={`transicao transicao--${config.style}`}
      style={{ animationDuration: `${String(config.durationMs)}ms` }}
      aria-hidden="true"
    >
      <span
        className="transicao__faixa"
        style={{ animationDuration: `${String(config.durationMs)}ms` }}
      />
      <span
        className="transicao__faixa"
        style={{ animationDuration: `${String(config.durationMs)}ms` }}
      />
      <span
        className="transicao__faixa"
        style={{ animationDuration: `${String(config.durationMs)}ms` }}
      />
    </div>
  );
}
