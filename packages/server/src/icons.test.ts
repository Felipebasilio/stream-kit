import { describe, expect, it } from 'vitest';

import { ehArquivoDeIcone, listarIcones } from './icons.js';

describe('ehArquivoDeIcone', () => {
  it.each(['kick.svg', 'TIKTOK.SVG', 'logo.png', 'marca.webp'])('aceita %s', (nome) => {
    expect(ehArquivoDeIcone(nome)).toBe(true);
  });

  it.each(['leia-me.txt', 'som.mp3', 'sem-extensao', 'foto.psd'])('recusa %s', (nome) => {
    expect(ehArquivoDeIcone(nome)).toBe(false);
  });
});

describe('listarIcones', () => {
  it('devolve so imagem, em ordem', () => {
    expect(listarIcones(['zap.svg', 'leia-me.txt', 'kick.png'])).toEqual([
      'kick.png',
      'zap.svg',
    ]);
  });

  it('ignora arquivos ocultos do sistema', () => {
    expect(listarIcones(['.DS_Store', '._oculto.svg', 'bom.svg'])).toEqual(['bom.svg']);
  });

  it('ordena respeitando acentos do portugues', () => {
    expect(listarIcones(['ícone.svg', 'abelha.svg', 'zebra.svg'])).toEqual([
      'abelha.svg',
      'ícone.svg',
      'zebra.svg',
    ]);
  });

  it('pasta vazia devolve lista vazia', () => {
    expect(listarIcones([])).toEqual([]);
  });
});
