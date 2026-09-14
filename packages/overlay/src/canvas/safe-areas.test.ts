import { describe, expect, it } from 'vitest';

import { areaToStyle, safeAreasFor } from './safe-areas.js';

describe('safeAreasFor', () => {
  it('o vertical tem uma faixa a mais: a coluna de botoes de interacao', () => {
    const h = safeAreasFor('horizontal');
    const v = safeAreasFor('vertical');
    expect(v.length).toBeGreaterThan(h.length);
    expect(v.some((a) => a.id === 'interacao')).toBe(true);
    expect(h.some((a) => a.id === 'interacao')).toBe(false);
  });

  it('no vertical os controles cobrem mais, porque o player e maior na tela', () => {
    const controlesH = safeAreasFor('horizontal').find((a) => a.id === 'controles');
    const controlesV = safeAreasFor('vertical').find((a) => a.id === 'controles');
    expect(controlesV?.bottom).toBeGreaterThan(controlesH?.bottom ?? 0);
  });

  it('toda faixa tem rotulo legivel para aparecer na guia', () => {
    for (const orientacao of ['horizontal', 'vertical'] as const) {
      for (const area of safeAreasFor(orientacao)) {
        expect(area.label.length).toBeGreaterThan(3);
      }
    }
  });
});

describe('areaToStyle', () => {
  it('faixa de baixo vira barra colada no rodape', () => {
    expect(areaToStyle({ id: 'x', label: 'x', bottom: 0.08 })).toEqual({
      left: '0',
      right: '0',
      bottom: '0',
      height: '8%',
    });
  });

  it('faixa de cima vira barra colada no topo', () => {
    expect(areaToStyle({ id: 'x', label: 'x', top: 0.06 })).toEqual({
      left: '0',
      right: '0',
      top: '0',
      height: '6%',
    });
  });

  it('faixa da direita vira coluna', () => {
    expect(areaToStyle({ id: 'x', label: 'x', right: 0.15 })).toEqual({
      top: '0',
      bottom: '0',
      right: '0',
      width: '15%',
    });
  });

  it('faixa da esquerda vira coluna', () => {
    expect(areaToStyle({ id: 'x', label: 'x', left: 0.1 })).toEqual({
      top: '0',
      bottom: '0',
      left: '0',
      width: '10%',
    });
  });

  it('sem nenhum lado definido vira coluna de largura zero, em vez de estourar', () => {
    expect(areaToStyle({ id: 'x', label: 'x' })).toEqual({
      top: '0',
      bottom: '0',
      left: '0',
      width: '0%',
    });
  });
});
