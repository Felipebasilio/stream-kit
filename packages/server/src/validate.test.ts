import { describe, expect, it } from 'vitest';

import { validateEvent, validateMinutes, validatePatch } from './validate.js';

describe('validatePatch', () => {
  it('aceita objeto comum', () => {
    const r = validatePatch({ brand: { name: 'X' } });
    expect(r.ok).toBe(true);
  });

  it('aceita objeto vazio', () => {
    expect(validatePatch({}).ok).toBe(true);
  });

  it.each([
    ['null', null],
    ['array', [1, 2]],
    ['texto', 'nao'],
    ['numero', 7],
    ['indefinido', undefined],
  ])('recusa %s', (_nome, entrada) => {
    const r = validatePatch(entrada);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('objeto');
  });

  it('recusa aninhamento absurdo', () => {
    let fundo: unknown = { fim: 1 };
    for (let i = 0; i < 30; i++) fundo = { n: fundo };
    const r = validatePatch(fundo);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('aninhado');
  });

  it('recusa aninhamento absurdo dentro de array', () => {
    let fundo: unknown = { fim: 1 };
    for (let i = 0; i < 30; i++) fundo = [fundo];
    expect(validatePatch({ lista: fundo }).ok).toBe(false);
  });

  it('aceita profundidade razoavel com array', () => {
    expect(validatePatch({ socials: [{ icon: 'kick', handle: 'a' }] }).ok).toBe(true);
  });
});

describe('validateEvent', () => {
  it('aceita o minimo e completa id e horario', () => {
    const r = validateEvent({ kind: 'follow', user: 'fulano' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.platform).toBe('manual');
      expect(r.value.id.length).toBeGreaterThan(0);
      expect(r.value.at).toBeGreaterThan(0);
    }
  });

  it('preserva id, horario, valor e mensagem quando vem', () => {
    const r = validateEvent({
      id: 'w1',
      kind: 'donation',
      user: 'a',
      platform: 'kick',
      at: 123,
      amount: 'R$ 10',
      message: 'valeu',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({
        id: 'w1',
        kind: 'donation',
        user: 'a',
        platform: 'kick',
        at: 123,
        amount: 'R$ 10',
        message: 'valeu',
      });
    }
  });

  it.each([
    ['nao objeto', 'texto', 'objeto'],
    ['tipo desconhecido', { kind: 'boost', user: 'a' }, 'tipo de evento'],
    ['sem usuario', { kind: 'follow' }, 'usuario'],
    ['usuario vazio', { kind: 'follow', user: '' }, 'usuario'],
    [
      'plataforma desconhecida',
      { kind: 'follow', user: 'a', platform: 'orkut' },
      'plataforma',
    ],
  ])('recusa %s', (_nome, entrada, trecho) => {
    const r = validateEvent(entrada);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(trecho);
  });

  it('id vazio e horario invalido sao substituidos', () => {
    const r = validateEvent({ id: '', kind: 'follow', user: 'a', at: Number.NaN });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.id.length).toBeGreaterThan(0);
      expect(Number.isFinite(r.value.at)).toBe(true);
    }
  });

  it('amount e message de tipo errado sao descartados', () => {
    const r = validateEvent({ kind: 'follow', user: 'a', amount: 10, message: {} });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.amount).toBeUndefined();
      expect(r.value.message).toBeUndefined();
    }
  });
});

describe('validateMinutes', () => {
  it.each([0, 1, 10, 1440])('aceita %i', (m) => {
    expect(validateMinutes(m).ok).toBe(true);
  });

  it('aceita texto numerico', () => {
    const r = validateMinutes('15');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(15);
  });

  it.each([
    ['negativo', -1],
    ['acima do limite', 1441],
    ['texto', 'dez'],
    ['nulo', null],
    ['infinito', Number.POSITIVE_INFINITY],
    ['indefinido', undefined],
    ['string vazia', ''],
    ['objeto', {}],
  ])('recusa %s', (_nome, entrada) => {
    expect(validateMinutes(entrada).ok).toBe(false);
  });
});
