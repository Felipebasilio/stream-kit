import { describe, expect, it } from 'vitest';

import { ajustarTitulo, type Medivel } from './fit-text.js';

/**
 * Elemento falso cuja largura e proporcional ao tamanho da fonte.
 * `porUnidade` representa quantos pixels de largura cada pixel de fonte gera —
 * o equivalente ao "quanto a palavra e larga".
 */
function medivel(porUnidade: number): Medivel & { tamanho(): number } {
  const style = { fontSize: '0px' };
  return {
    style,
    get scrollWidth() {
      return parseFloat(style.fontSize) * porUnidade;
    },
    tamanho() {
      return parseFloat(style.fontSize);
    },
  };
}

describe('ajustarTitulo', () => {
  it('titulo curto fica no tamanho cheio', () => {
    const el = medivel(3);
    const unidades = ajustarTitulo(el, 2252, 1.44);
    expect(unidades).toBe(200);
    expect(el.tamanho()).toBeCloseTo(288);
  });

  it('titulo longo encolhe ate caber', () => {
    // "VOLTAMOS JA JA PESSOAL" e muito mais largo que "BRB".
    const el = medivel(12);
    ajustarTitulo(el, 2252, 1.44);
    expect(el.scrollWidth).toBeLessThanOrEqual(2252);
  });

  it('respeita o piso: nao encolhe para sempre', () => {
    const el = medivel(500);
    const unidades = ajustarTitulo(el, 100, 1.44);
    expect(unidades).toBe(60);
  });

  it('o mesmo texto ocupa a mesma proporcao em 1080p e em 1440p', () => {
    const a = medivel(12);
    const b = medivel(12);
    const hd = ajustarTitulo(a, 1920 * 0.88, 1.08);
    const qhd = ajustarTitulo(b, 2560 * 0.88, 1.44);
    // Mesmo numero de unidades = mesmo desenho, so mudou a escala.
    expect(hd).toBe(qhd);
  });

  it('o vertical, mais estreito, encolhe mais', () => {
    const largo = medivel(12);
    const estreito = medivel(12);
    const noHorizontal = ajustarTitulo(largo, 2560 * 0.88, 1.44);
    const noVertical = ajustarTitulo(estreito, 1080 * 0.68, 1.92);
    expect(noVertical).toBeLessThan(noHorizontal);
  });

  it('aceita limites proprios', () => {
    const el = medivel(50);
    expect(ajustarTitulo(el, 100, 1, 120, 100)).toBe(100);
  });
});
