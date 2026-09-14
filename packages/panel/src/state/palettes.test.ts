import { describe, expect, it } from 'vitest';

import { PALETAS } from './palettes.js';

describe('paletas prontas', () => {
  it('toda paleta tem as quatro cores em hexadecimal', () => {
    for (const p of PALETAS) {
      for (const [campo, valor] of Object.entries(p.cores)) {
        expect(valor, `${p.nome}.${campo}`).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it('o fundo escuro e sempre mais escuro que o claro', () => {
    const luminancia = (hex: string): number =>
      parseInt(hex.slice(1, 3), 16) +
      parseInt(hex.slice(3, 5), 16) +
      parseInt(hex.slice(5, 7), 16);
    for (const p of PALETAS) {
      expect(luminancia(p.cores.bg1), p.nome).toBeLessThan(luminancia(p.cores.bg2));
    }
  });

  it('a cor de destaque e mais clara que a principal, para contrastar', () => {
    const luminancia = (hex: string): number =>
      parseInt(hex.slice(1, 3), 16) +
      parseInt(hex.slice(3, 5), 16) +
      parseInt(hex.slice(5, 7), 16);
    for (const p of PALETAS) {
      expect(luminancia(p.cores.accent2), p.nome).toBeGreaterThan(
        luminancia(p.cores.accent),
      );
    }
  });

  it('existe um tema escuro neutro', () => {
    const preto = PALETAS.find((p) => p.nome === 'Preto');
    expect(preto).toBeDefined();
    expect(preto?.cores.bg1).toBe('#000000');
  });

  it('a cor principal e escura o bastante para texto branco por cima', () => {
    // A barra inferior e a etiqueta da camera usam texto branco sobre a cor
    // principal. Uma cor clara ali deixaria o texto ilegivel.
    const luminancia = (hex: string): number =>
      (parseInt(hex.slice(1, 3), 16) * 0.299 +
        parseInt(hex.slice(3, 5), 16) * 0.587 +
        parseInt(hex.slice(5, 7), 16) * 0.114) /
      255;
    for (const p of PALETAS) {
      expect(luminancia(p.cores.accent), p.nome).toBeLessThan(0.62);
    }
  });

  it('nenhum nome repetido', () => {
    expect(new Set(PALETAS.map((p) => p.nome)).size).toBe(PALETAS.length);
  });
});
