import { describe, expect, it } from 'vitest';

import { deepMerge, isDeepEqual, mergePatches } from './merge.js';

describe('deepMerge', () => {
  it('mescla chaves aninhadas sem apagar as irmas', () => {
    const base = { brand: { name: 'A', accent: '#111' }, outro: 1 };
    const out = deepMerge(base, { brand: { name: 'B' } });
    expect(out).toEqual({ brand: { name: 'B', accent: '#111' }, outro: 1 });
  });

  it('nao muta a entrada', () => {
    const base = { brand: { name: 'A' } };
    const copia = structuredClone(base);
    deepMerge(base, { brand: { name: 'B' } });
    expect(base).toEqual(copia);
  });

  it('substitui array por inteiro em vez de mesclar por indice', () => {
    const base = { socials: [{ handle: 'a' }, { handle: 'b' }, { handle: 'c' }] };
    const out = deepMerge(base, { socials: [{ handle: 'a' }] });
    // Se mesclasse por indice, 'b' e 'c' sobreviveriam. Esse e o bug que a
    // regra evita: apagar uma rede no painel deixaria fantasmas na cena.
    expect(out.socials).toHaveLength(1);
  });

  it('aceita null como valor, para apagar', () => {
    const out = deepMerge({ a: 1 }, { a: null });
    expect(out).toEqual({ a: null });
  });

  it('ignora undefined, que significa "nao mexe"', () => {
    expect(deepMerge({ a: 1 }, { a: undefined })).toEqual({ a: 1 });
    expect(deepMerge({ a: 1 }, undefined)).toEqual({ a: 1 });
  });

  it('cria chave que nao existia', () => {
    expect(deepMerge({ a: 1 }, { b: { c: 2 } })).toEqual({ a: 1, b: { c: 2 } });
  });

  it('troca escalar por objeto e objeto por escalar', () => {
    expect(deepMerge({ a: 1 }, { a: { b: 2 } })).toEqual({ a: { b: 2 } });
    expect(deepMerge({ a: { b: 2 } }, { a: 1 })).toEqual({ a: 1 });
  });

  it('quando a base nao e objeto, o patch vence', () => {
    expect(deepMerge(5 as unknown, { a: 1 })).toEqual({ a: 1 });
    expect(deepMerge(null as unknown, { a: 1 })).toEqual({ a: 1 });
  });

  it('nao trata instancia de classe como objeto mesclavel', () => {
    const data = new Date(0);
    expect(deepMerge({ d: new Date(1) }, { d: data }).d).toBe(data);
  });

  it('aguenta profundidade grande', () => {
    let base: Record<string, unknown> = { fim: 1 };
    let patch: Record<string, unknown> = { fim: 2 };
    for (let i = 0; i < 40; i++) {
      base = { n: base };
      patch = { n: patch };
    }
    const out = deepMerge(base, patch);
    let cursor: Record<string, unknown> = out;
    for (let i = 0; i < 40; i++) cursor = cursor['n'] as Record<string, unknown>;
    expect(cursor['fim']).toBe(2);
  });
});

describe('mergePatches', () => {
  it('junta patches de campos diferentes sem perder nenhum', () => {
    // Regressao do bug real do painel em Python: o segundo patch cancelava o
    // primeiro que ainda nao tinha sido enviado, e o nome do canal se perdia.
    const out = mergePatches<{ brand: { name: string }; scenes: { starting: string } }>([
      { brand: { name: 'CANAL' } },
      { scenes: { starting: 'COMECANDO' } },
    ]);
    expect(out.brand.name).toBe('CANAL');
    expect(out.scenes.starting).toBe('COMECANDO');
  });

  it('o ultimo valor do mesmo campo vence', () => {
    const out = mergePatches<{ a: number }>([{ a: 1 }, { a: 2 }, { a: 3 }]);
    expect(out.a).toBe(3);
  });

  it('lista vazia vira objeto vazio', () => {
    expect(mergePatches([])).toEqual({});
  });
});

describe('isDeepEqual', () => {
  it('compara objetos aninhados', () => {
    expect(isDeepEqual({ a: { b: [1, 2] } }, { a: { b: [1, 2] } })).toBe(true);
    expect(isDeepEqual({ a: { b: [1, 2] } }, { a: { b: [1, 3] } })).toBe(false);
  });

  it('detecta diferenca de quantidade de chaves', () => {
    expect(isDeepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(isDeepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
  });

  it('detecta chave com nome diferente', () => {
    expect(isDeepEqual({ a: 1 }, { b: 1 })).toBe(false);
  });

  it('compara arrays de tamanhos diferentes', () => {
    expect(isDeepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(isDeepEqual([1, 2], [1, 2])).toBe(true);
  });

  it('escalares e tipos distintos', () => {
    expect(isDeepEqual(1, 1)).toBe(true);
    expect(isDeepEqual(1, '1')).toBe(false);
    expect(isDeepEqual(null, null)).toBe(true);
    expect(isDeepEqual(null, {})).toBe(false);
    expect(isDeepEqual([1], { 0: 1 })).toBe(false);
  });
});
