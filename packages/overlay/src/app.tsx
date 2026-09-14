import { SCENE_IDS, type SceneId } from '@stream-kit/types';
import { useEffect, type JSX } from 'react';

import { AreasSeguras } from './components/background.js';
import {
  readCamFromUrl,
  readEditModeFromUrl,
  readHoldFromUrl,
  readSceneFromUrl,
} from './canvas/url.js';
import { useBrand } from './canvas/use-brand.hooks.js';
import { useCanvas } from './canvas/use-canvas.hooks.js';
import { Transicao } from './components/transition.js';
import { Alertas } from './scenes/alerts.js';
import { Som } from './scenes/audio.js';
import { TelaCheia } from './scenes/fullscreen.js';
import { Jogando } from './scenes/ingame.js';
import { Papo } from './scenes/talking.js';
import { useStreamState } from './state/use-stream-state.hooks.js';

function ehCenaDeTexto(valor: string): valor is SceneId {
  return (SCENE_IDS as readonly string[]).includes(valor);
}

export function App({ search }: { search: string }): JSX.Element {
  const canvas = useCanvas(search);
  const cena = readSceneFromUrl(search);
  const edicao = readEditModeFromUrl(search);
  const segurar = readHoldFromUrl(search);
  const cam = readCamFromUrl(search);
  const { state, evento, gatilhoTransicao } = useStreamState();
  useBrand(state.brand);

  // Marca a raiz para o CSS saber que esta em edicao. E o que faz o aviso da
  // cena de som aparecer na previa e nunca na transmissao.
  useEffect(() => {
    if (edicao) document.documentElement.dataset['edicao'] = '1';
    else delete document.documentElement.dataset['edicao'];
  }, [edicao]);

  const conteudo = ehCenaDeTexto(cena) ? (
    <TelaCheia scene={cena} state={state} canvas={canvas} />
  ) : cena === 'ingame' ? (
    <Jogando state={state} canvas={canvas} cam={cam} />
  ) : cena === 'talking' ? (
    <Papo state={state} canvas={canvas} />
  ) : cena === 'alerts' ? (
    <Alertas state={state} evento={evento} />
  ) : cena === 'audio' ? (
    <Som state={state} evento={evento} />
  ) : cena === 'transition-only' ? (
    // Usada pelo gerador de stinger: so a cortina, sobre transparencia.
    <div className="cena" />
  ) : (
    <TelaCheia scene="starting" state={state} canvas={canvas} />
  );

  return (
    <>
      {conteudo}
      <Transicao config={state.transition} gatilho={gatilhoTransicao} segurar={segurar} />
      {edicao && <AreasSeguras canvas={canvas} />}
    </>
  );
}
