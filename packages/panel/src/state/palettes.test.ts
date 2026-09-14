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

  it('nenhum nome repetido', () => {
    expect(new Set(PALETAS.map((p) => p.nome)).size).toBe(PALETAS.length);
  });
});
