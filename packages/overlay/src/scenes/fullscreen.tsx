import {
  baseUnit,
  type CanvasSpec,
  type SceneId,
  type StreamKitState,
} from '@stream-kit/types';
import { useEffect, useLayoutEffect, useRef, type JSX } from 'react';

import { Fundo } from '../components/background.js';
import { Contagem } from '../components/countdown.js';
import { ajustarTitulo } from '../components/fit-text.js';
import { BlocoRedes } from '../components/socials.js';

export function TelaCheia({
  scene,
  state,
  canvas,
}: {
  scene: SceneId;
  state: StreamKitState;
  canvas: CanvasSpec;
}): JSX.Element {
  const texto = state.scenes[scene];
  const titulo = useRef<HTMLHeadingElement>(null);

  const ajustar = (): void => {
    const el = titulo.current;
    if (el === null) return;
    // No horizontal sobra largura; no vertical o titulo tem que caber a
    // esquerda da coluna de botoes de interacao do player.
    const fracao = canvas.orientation === 'vertical' ? 0.68 : 0.88;
    ajustarTitulo(el, canvas.width * fracao, baseUnit(canvas));
  };

  useLayoutEffect(ajustar, [texto.title, canvas]);

  // A fonte pode chegar depois do primeiro quadro: remede quando ela carregar,
  // senao o titulo salta de tamanho no ar.
  useEffect(() => {
    void document.fonts.ready.then(ajustar);
  });

  return (
    <div className="cena cena--opaca">
      <Fundo canvas={canvas} />
      {state.brand.name.length > 0 && (
        <div className="marca-dagua">{state.brand.name}</div>
      )}

      <main className="palco">
        {texto.kicker.length > 0 && <div className="kicker">{texto.kicker}</div>}
        <h1 className="titulo" ref={titulo}>
          {texto.title}
        </h1>
        {texto.note.length > 0 && <div className="recado">{texto.note}</div>}
        <Contagem countdown={state.countdown} />
      </main>

      <BlocoRedes state={state} />
    </div>
  );
}
