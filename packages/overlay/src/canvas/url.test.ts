import { CANVASES } from '@stream-kit/types';
import { describe, expect, it } from 'vitest';

import {
  applyCanvas,
  readCanvasFromUrl,
  readEditModeFromUrl,
  readSceneFromUrl,
} from './url.js';

describe('leitura da URL', () => {
  it('le o canvas pedido', () => {
    expect(readCanvasFromUrl('?canvas=vertical').id).toBe('vertical');
    expect(readCanvasFromUrl('?canvas=hd').id).toBe('hd');
  });

  it('canvas desconhecido cai no padrao em vez de quebrar a cena no ar', () => {
    expect(readCanvasFromUrl('?canvas=8k').id).toBe('qhd');
    expect(readCanvasFromUrl('').id).toBe('qhd');
  });

  it('le a cena, com starting como padrao', () => {
    expect(readSceneFromUrl('?scene=ingame')).toBe('ingame');
    expect(readSceneFromUrl('')).toBe('starting');
  });

  it('o modo de edicao so liga com edit=1', () => {
    expect(readEditModeFromUrl('?edit=1')).toBe(true);
    expect(readEditModeFromUrl('?edit=true')).toBe(false);
    expect(readEditModeFromUrl('')).toBe(false);
  });

  it('a ordem dos parametros nao importa', () => {
    expect(readCanvasFromUrl('?scene=brb&canvas=hd&edit=1').id).toBe('hd');
    expect(readSceneFromUrl('?canvas=hd&scene=brb')).toBe('brb');
  });
});

describe('applyCanvas', () => {
  function elementoFalso(): HTMLElement {
    const props: Record<string, string> = {};
    return {
      style: {
        setProperty(nome: string, valor: string) {
          props[nome] = valor;
        },
        get props() {
          return props;
        },
      },
      dataset: {} as Record<string, string>,
    } as unknown as HTMLElement;
  }

  it('define a unidade base como altura dividida por mil', () => {
    const el = elementoFalso();
    applyCanvas(el, CANVASES.qhd);
    const props = (el.style as unknown as { props: Record<string, string> }).props;
    expect(props['--u']).toBe('1.44px');
    expect(props['--canvas-w']).toBe('2560px');
    expect(props['--canvas-h']).toBe('1440px');
  });

  it('1080p e 1440p diferem so pela escala', () => {
    const a = elementoFalso();
    const b = elementoFalso();
    applyCanvas(a, CANVASES.hd);
    applyCanvas(b, CANVASES.qhd);
    const pa = (a.style as unknown as { props: Record<string, string> }).props;
    const pb = (b.style as unknown as { props: Record<string, string> }).props;
    expect(parseFloat(pb['--u'] ?? '0') / parseFloat(pa['--u'] ?? '1')).toBeCloseTo(
      4 / 3,
    );
    expect(a.dataset['orientation']).toBe(b.dataset['orientation']);
  });

  it('marca a orientacao, que e o que muda o layout', () => {
    const el = elementoFalso();
    applyCanvas(el, CANVASES.vertical);
    expect(el.dataset['orientation']).toBe('vertical');
    expect(el.dataset['canvas']).toBe('vertical');
  });
});
