import { CANVASES, type CanvasId } from '@stream-kit/types';
import { useState, type JSX } from 'react';

const CENAS: readonly { id: string; rotulo: string }[] = [
  { id: 'starting', rotulo: 'Começando' },
  { id: 'brb', rotulo: 'Volto já' },
  { id: 'ending', rotulo: 'Encerrando' },
  { id: 'ingame', rotulo: 'Jogando' },
  { id: 'talking', rotulo: 'Papo' },
  { id: 'alerts', rotulo: 'Alertas' },
  { id: 'audio', rotulo: 'Som' },
];

export function UrlsDoObs({ canvas }: { canvas: CanvasId }): JSX.Element {
  const [copiado, setCopiado] = useState<string | undefined>(undefined);
  const spec = CANVASES[canvas];
  const origem = window.location.origin;

  return (
    <>
      <h2
        style={{
          margin: '20px 0 10px',
          fontSize: 12,
          letterSpacing: '.22em',
          color: '#8ea3cc',
        }}
      >
        URLS PARA O OBS — {spec.label}
      </h2>
      <div className="urls">
        {CENAS.map((c) => {
          const url = `${origem}/overlay/?scene=${c.id}&canvas=${canvas}`;
          return (
            <div className="url" key={c.id}>
              <b>{c.rotulo}</b>
              <code>{url}</code>
              <button
                className="fantasma"
                onClick={() => {
                  void navigator.clipboard.writeText(url).then(() => {
                    setCopiado(c.id);
                    setTimeout(() => {
                      setCopiado(undefined);
                    }, 1200);
                  });
                }}
              >
                {copiado === c.id ? 'copiado!' : 'copiar'}
              </button>
            </div>
          );
        })}
      </div>
      <p className="dica">
        No OBS: <b>+ → Navegador</b>, largura <b>{spec.width}</b>, altura{' '}
        <b>{spec.height}</b>.
        <br />
        Marque <b>&quot;Desligar a fonte quando não estiver visível&quot;</b> para
        economizar CPU.
      </p>
    </>
  );
}
