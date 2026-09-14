import { createDefaultState, type EventKind, type QueuedEvent } from '@stream-kit/types';
import { describe, expect, it } from 'vitest';

import { normalizarVolume, planejarSom, tomDe } from './sound-plan.js';

const evento = (kind: EventKind): QueuedEvent => ({
  id: '1',
  platform: 'manual',
  kind,
  user: 'fulano',
  at: 0,
  count: 1,
});

const config = (): ReturnType<typeof createDefaultState>['alerts'] =>
  structuredClone(createDefaultState().alerts);

describe('planejarSom', () => {
  it('sem arquivo escolhido usa o tom sintetizado', () => {
    const plano = planejarSom(config(), evento('follow'));
    expect(plano?.tom).toBeDefined();
    expect(plano?.arquivo).toBeUndefined();
  });

  it('com arquivo escolhido aponta para a pasta de sons do usuario', () => {
    const c = config();
    c.sounds.donation.file = 'moeda.mp3';
    expect(planejarSom(c, evento('donation'))?.arquivo).toBe('/sons/moeda.mp3');
  });

  it('nome de arquivo com espaco e acento e codificado', () => {
    const c = config();
    c.sounds.follow.file = 'meu som ç.mp3';
    expect(planejarSom(c, evento('follow'))?.arquivo).toBe(
      '/sons/meu%20som%20%C3%A7.mp3',
    );
  });

  it('som desligado no geral nao toca nada', () => {
    const c = config();
    c.soundEnabled = false;
    expect(planejarSom(c, evento('follow'))).toBeUndefined();
  });

  it('volume zero naquele tipo nao toca nada', () => {
    const c = config();
    c.sounds.chat.volume = 0;
    expect(planejarSom(c, evento('chat'))).toBeUndefined();
    // e os outros continuam tocando
    expect(planejarSom(c, evento('follow'))).toBeDefined();
  });

  it('o volume sai normalizado', () => {
    const c = config();
    c.sounds.follow.volume = 5;
    expect(planejarSom(c, evento('follow'))?.volume).toBe(1);
  });

  it('aceita outra pasta de sons', () => {
    const c = config();
    c.sounds.follow.file = 'a.mp3';
    expect(planejarSom(c, evento('follow'), '/outro/')?.arquivo).toBe('/outro/a.mp3');
  });
});

describe('tons sintetizados', () => {
  it('todo tipo de evento tem um tom', () => {
    for (const kind of ['follow', 'sub', 'donation', 'raid', 'chat'] as EventKind[]) {
      const tom = tomDe(kind);
      expect(tom.notas.length).toBeGreaterThan(0);
      expect(tom.duracao).toBeGreaterThan(0);
    }
  });

  it('chat e o mais curto, para nao competir com a fala', () => {
    const chat = tomDe('chat');
    for (const kind of ['follow', 'sub', 'donation', 'raid'] as EventKind[]) {
      expect(chat.duracao * chat.notas.length).toBeLessThan(
        tomDe(kind).duracao * tomDe(kind).notas.length,
      );
    }
  });

  it('doacao termina na nota mais alta de todas', () => {
    const maiorDe = (k: EventKind): number => Math.max(...tomDe(k).notas);
    expect(maiorDe('donation')).toBeGreaterThan(maiorDe('follow'));
    expect(maiorDe('donation')).toBeGreaterThan(maiorDe('raid'));
  });
});

describe('normalizarVolume', () => {
  it.each([
    [0.5, 0.5],
    [0, 0],
    [1, 1],
    [-3, 0],
    [9, 1],
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 1],
    [Number.NEGATIVE_INFINITY, 0],
  ])('%s vira %s', (entrada, esperado) => {
    expect(normalizarVolume(entrada)).toBe(esperado);
  });
});
