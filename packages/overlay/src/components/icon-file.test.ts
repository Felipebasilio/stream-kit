import { describe, expect, it } from 'vitest';

import { resolverIcone } from './icon-file.js';

describe('resolverIcone', () => {
  it('nome simples vira caminho da pasta servida', () => {
    expect(resolverIcone('tiktok.svg')).toBe('/icones/tiktok.svg');
  });

  it('escapa nome com espaco e acento', () => {
    expect(resolverIcone('meu ícone.svg')).toBe('/icones/meu%20%C3%ADcone.svg');
  });

  it('ignora espaco em volta', () => {
    expect(resolverIcone('  kick.png  ')).toBe('/icones/kick.png');
  });

  it('vazio continua vazio', () => {
    expect(resolverIcone('   ')).toBe('');
  });

  it.each(['/icones/a.svg', './a.svg', '../assets/a.svg'])(
    'respeita caminho escrito a mao (%s)',
    (valor) => {
      expect(resolverIcone(valor)).toBe(valor);
    },
  );

  it.each(['https://exemplo.com/a.svg', 'data:image/svg+xml,<svg/>'])(
    'respeita URL (%s)',
    (valor) => {
      expect(resolverIcone(valor)).toBe(valor);
    },
  );
});
