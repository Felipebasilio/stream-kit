import { describe, expect, it } from 'vitest';

import { resolverCamera } from './camera.js';

const painel = { showCam: true, camPosition: 'left-bottom' } as const;

describe('resolverCamera', () => {
  it('sem override, quem manda e o painel', () => {
    expect(resolverCamera(painel, null)).toEqual({
      mostrar: true,
      posicao: 'left-bottom',
    });
  });

  it('o painel tambem manda no desligar', () => {
    expect(resolverCamera({ ...painel, showCam: false }, null).mostrar).toBe(false);
  });

  it('a URL vence o painel', () => {
    expect(resolverCamera(painel, 'right-top')).toEqual({
      mostrar: true,
      posicao: 'right-top',
    });
  });

  it('a URL liga a camera mesmo com o painel desligado', () => {
    // Uma cena do OBS com `cam=` pede aquele layout. Se o painel pudesse
    // vetar, a cena ficaria vazia sem explicacao no meio da live.
    expect(resolverCamera({ ...painel, showCam: false }, 'right-bottom')).toEqual({
      mostrar: true,
      posicao: 'right-bottom',
    });
  });

  it('cam=off esconde mesmo com o painel ligado', () => {
    expect(resolverCamera(painel, 'off').mostrar).toBe(false);
  });

  it('cam=off nao perde a posicao escolhida no painel', () => {
    // Importa porque a moldura volta para o lugar certo quando a camera
    // reaparece, em vez de pular para o canto padrao.
    expect(resolverCamera({ ...painel, camPosition: 'right-top' }, 'off').posicao).toBe(
      'right-top',
    );
  });
});
