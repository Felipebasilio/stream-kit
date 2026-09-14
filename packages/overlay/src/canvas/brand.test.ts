import { createDefaultState } from '@stream-kit/types';
import { describe, expect, it } from 'vitest';

import { applyBrand, type EstiloAlvo } from './brand.js';

function alvoFalso(): EstiloAlvo & { props: Record<string, string> } {
  const props: Record<string, string> = {};
  return {
    props,
    setProperty(nome, valor) {
      props[nome] = valor;
    },
  };
}

describe('applyBrand', () => {
  it('leva as quatro cores do estado para o CSS', () => {
    const alvo = alvoFalso();
    applyBrand(alvo, {
      ...createDefaultState().brand,
      accent: '#8b5cf6',
      accent2: '#c4b5fd',
      bg1: '#0a0614',
      bg2: '#3b1a6b',
    });
    expect(alvo.props['--accent']).toBe('#8b5cf6');
    expect(alvo.props['--accent-2']).toBe('#c4b5fd');
    expect(alvo.props['--bg-1']).toBe('#0a0614');
    expect(alvo.props['--bg-2']).toBe('#3b1a6b');
  });

  it('leva a intensidade, que controla a animacao de fundo', () => {
    const alvo = alvoFalso();
    applyBrand(alvo, { ...createDefaultState().brand, intensity: 0 });
    expect(alvo.props['--intensity']).toBe('0');
  });

  it('monta a familia de fonte com alternativa, para nunca ficar sem fonte', () => {
    const alvo = alvoFalso();
    applyBrand(alvo, { ...createDefaultState().brand, titleFont: 'Bebas Neue' });
    expect(alvo.props['--title-font']).toContain("'Bebas Neue'");
    expect(alvo.props['--title-font']).toContain('sans-serif');
  });
});
