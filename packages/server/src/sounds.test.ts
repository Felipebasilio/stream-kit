import { describe, expect, it } from 'vitest';

import { ehArquivoDeSom, listarSons } from './sounds.js';

describe('ehArquivoDeSom', () => {
  it.each(['a.mp3', 'b.WAV', 'c.ogg', 'd.m4a', 'e.aac', 'f.flac'])(
    'aceita %s',
    (nome) => {
      expect(ehArquivoDeSom(nome)).toBe(true);
    },
  );

  it.each(['a.txt', 'b.png', 'sem-extensao', 'c.mp4'])('recusa %s', (nome) => {
    expect(ehArquivoDeSom(nome)).toBe(false);
  });
});

describe('listarSons', () => {
  it('devolve so audio, em ordem', () => {
    expect(listarSons(['zebra.mp3', 'leia-me.txt', 'alerta.wav'])).toEqual([
      'alerta.wav',
      'zebra.mp3',
    ]);
  });

  it('ignora arquivos ocultos do sistema', () => {
    expect(listarSons(['.DS_Store', '._oculto.mp3', 'bom.mp3'])).toEqual(['bom.mp3']);
  });

  it('ordena respeitando acentos do portugues', () => {
    expect(listarSons(['ácido.mp3', 'abelha.mp3', 'zebra.mp3'])).toEqual([
      'abelha.mp3',
      'ácido.mp3',
      'zebra.mp3',
    ]);
  });

  it('pasta vazia devolve lista vazia', () => {
    expect(listarSons([])).toEqual([]);
  });
});
