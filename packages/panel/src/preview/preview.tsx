import { CANVASES, CANVAS_IDS, type CanvasId } from '@stream-kit/types';
import { useEffect, useRef, useState, type JSX } from 'react';

const CENAS = [
  { id: 'starting', rotulo: 'Começando' },
  { id: 'brb', rotulo: 'Volto já' },
  { id: 'ending', rotulo: 'Encerrando' },
  { id: 'ingame', rotulo: 'Jogando' },
  { id: 'talking', rotulo: 'Papo' },
  { id: 'alerts', rotulo: 'Alertas' },
  { id: 'audio', rotulo: 'Som' },
] as const;

export function Previa({
  canvas,
  aoTrocarCanvas,
}: {
  canvas: CanvasId;
  aoTrocarCanvas: (id: CanvasId) => void;
}): JSX.Element {
  const [cena, setCena] = useState<string>('starting');
  const [guias, setGuias] = useState(false);
  const [celular, setCelular] = useState(false);
  const moldura = useRef<HTMLDivElement>(null);
  const quadro = useRef<HTMLIFrameElement>(null);

  const spec = CANVASES[canvas];

  useEffect(() => {
    const ajustar = (): void => {
      const caixa = moldura.current;
      const iframe = quadro.current;
      if (caixa === null || iframe === null) return;
      const escala = caixa.clientWidth / spec.width;
      iframe.style.transform = `scale(${String(escala)})`;
      caixa.style.height = `${String(spec.height * escala)}px`;
    };
    ajustar();
    const obs = new ResizeObserver(ajustar);
    if (moldura.current !== null) obs.observe(moldura.current);
    return () => {
      obs.disconnect();
    };
  }, [spec, celular]);

  // A cena de som e invisivel de proposito. Na previa ligamos o modo de edicao
  // para ela se explicar; na transmissao esse parametro nunca existe.
  const precisaExplicar = cena === 'audio';
  const src = `/overlay/?scene=${cena}&canvas=${canvas}${guias || precisaExplicar ? '&edit=1' : ''}`;

  return (
    <div className="previa-caixa">
      <div className="abas">
        {CENAS.map((c) => (
          <button
            key={c.id}
            className={cena === c.id ? 'aba on' : 'aba'}
            onClick={() => {
              setCena(c.id);
            }}
          >
            {c.rotulo}
          </button>
        ))}
      </div>

      <div className="abas">
        {CANVAS_IDS.map((id) => (
          <button
            key={id}
            className={canvas === id ? 'aba on' : 'aba'}
            onClick={() => {
              aoTrocarCanvas(id);
            }}
          >
            {CANVASES[id].label}
          </button>
        ))}
        <button
          className={guias ? 'aba on' : 'aba'}
          onClick={() => {
            setGuias((g) => !g);
          }}
        >
          Guias
        </button>
        <button
          className={celular ? 'aba on' : 'aba'}
          onClick={() => {
            setCelular((c) => !c);
          }}
          title="Mostra a cena no tamanho que ela tem num celular"
        >
          Régua 360px
        </button>
      </div>

      <div
        className={celular ? 'moldura moldura--celular' : 'moldura'}
        ref={moldura}
        data-testid="moldura"
      >
        <iframe
          ref={quadro}
          src={src}
          title="prévia"
          style={{ width: `${String(spec.width)}px`, height: `${String(spec.height)}px` }}
        />
      </div>

      <p className="dica">
        {cena === 'audio'
          ? 'Esta cena não desenha nada — ela só toca o som dos alertas. O aviso acima aparece só aqui na prévia. Adicione no OBS e deixe numa trilha de áudio própria.'
          : cena === 'alerts'
            ? 'Vazia até chegar um evento. Clique num botão "Testar" na seção Alertas para ver o alerta aparecer aqui.'
            : celular
              ? 'É assim que a cena chega para quem assiste no telefone. Se não dá para ler aqui, não dá para ler lá.'
              : 'O xadrez é transparência — nessas áreas o OBS mostra o que está atrás.'}
      </p>
    </div>
  );
}
