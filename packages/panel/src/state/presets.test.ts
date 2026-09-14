import { createDefaultState, type Brand } from '@stream-kit/types';
import { describe, expect, it } from 'vitest';

import { aplicarPreset, criarPreset, removerPreset, salvarPreset } from './presets.js';

const marca = (accent: string): Brand => ({ ...createDefaultState().brand, accent });

describe('salvarPreset', () => {
  it('adiciona uma identidade nova', () => {
    const lista = salvarPreset([], 'live de código', marca('#111111'));
    expect(lista).toHaveLength(1);
    expect(lista[0]?.name).toBe('live de código');
    expect(lista[0]?.brand.accent).toBe('#111111');
  });

  it('nome repetido atualiza em vez de duplicar', () => {
    const um = salvarPreset([], 'jogo', marca('#111111'));
    const dois = salvarPreset(um, 'jogo', marca('#222222'));
    expect(dois).toHaveLength(1);
    expect(dois[0]?.brand.accent).toBe('#222222');
    expect(dois[0]?.id).toBe(um[0]?.id);
  });

  it('nome repetido ignora maiusculas e espacos nas pontas', () => {
    const um = salvarPreset([], 'Jogo', marca('#111111'));
    expect(salvarPreset(um, '  jogo  ', marca('#222222'))).toHaveLength(1);
  });

  it('nome vazio nao salva', () => {
    expect(salvarPreset([], '   ', marca('#111111'))).toHaveLength(0);
  });

  it('lista sem o nome procurado apenas acrescenta', () => {
    const lista = salvarPreset(
      salvarPreset([], 'a', marca('#111111')),
      'b',
      marca('#222222'),
    );
    expect(lista.map((p) => p.name)).toEqual(['a', 'b']);
  });

  it('nao altera a lista original', () => {
    const original = salvarPreset([], 'a', marca('#111111'));
    salvarPreset(original, 'b', marca('#222222'));
    expect(original).toHaveLength(1);
  });

  it('guarda uma copia da marca, nao a referencia', () => {
    const m = marca('#111111');
    const lista = salvarPreset([], 'x', m);
    m.accent = '#999999';
    expect(lista[0]?.brand.accent).toBe('#111111');
  });
});

describe('aplicarPreset', () => {
  it('devolve a marca salva', () => {
    const lista = salvarPreset([], 'x', marca('#abcdef'));
    expect(aplicarPreset(lista, lista[0]?.id ?? '')?.accent).toBe('#abcdef');
  });

  it('id desconhecido devolve indefinido', () => {
    expect(aplicarPreset([], 'fantasma')).toBeUndefined();
  });
});

describe('removerPreset', () => {
  it('tira so o pedido', () => {
    let lista = salvarPreset([], 'a', marca('#111111'));
    lista = salvarPreset(lista, 'b', marca('#222222'));
    const restante = removerPreset(lista, lista[0]?.id ?? '');
    expect(restante).toHaveLength(1);
    expect(restante[0]?.name).toBe('b');
  });

  it('id desconhecido nao muda nada', () => {
    const lista = salvarPreset([], 'a', marca('#111111'));
    expect(removerPreset(lista, 'fantasma')).toHaveLength(1);
  });
});

describe('criarPreset', () => {
  it('gera ids distintos', () => {
    expect(criarPreset('a', marca('#111111')).id).not.toBe(
      criarPreset('a', marca('#111111')).id,
    );
  });

  it('respeita um id informado', () => {
    expect(criarPreset('a', marca('#111111'), 'fixo').id).toBe('fixo');
  });

  it('tira espacos das pontas do nome', () => {
    expect(criarPreset('  a  ', marca('#111111')).name).toBe('a');
  });
});
