import { createDefaultState } from '@stream-kit/types';
import { describe, expect, it } from 'vitest';

import { CACHE_KEY, readCache, writeCache, type StorageLike } from './cache.js';

class ArmazenamentoFalso implements StorageLike {
  dados = new Map<string, string>();
  falharLeitura = false;
  falharEscrita = false;

  getItem(chave: string): string | null {
    if (this.falharLeitura) throw new Error('acesso negado');
    return this.dados.get(chave) ?? null;
  }
  setItem(chave: string, valor: string): void {
    if (this.falharEscrita) throw new Error('cota estourada');
    this.dados.set(chave, valor);
  }
}

describe('cache do ultimo estado', () => {
  it('grava e le de volta', () => {
    const armazenamento = new ArmazenamentoFalso();
    const estado = { ...createDefaultState(), socialsLabel: 'ME SEGUE' };
    writeCache(armazenamento, estado);
    expect(readCache(armazenamento).socialsLabel).toBe('ME SEGUE');
  });

  it('sem nada gravado devolve o padrao — nunca uma tela vazia', () => {
    expect(readCache(new ArmazenamentoFalso())).toEqual(createDefaultState());
  });

  it('conteudo estragado devolve o padrao em vez de estourar', () => {
    const armazenamento = new ArmazenamentoFalso();
    armazenamento.dados.set(CACHE_KEY, '{ isso nao e json');
    expect(readCache(armazenamento)).toEqual(createDefaultState());
  });

  it('cache de uma versao antiga do formato e migrado na leitura', () => {
    const armazenamento = new ArmazenamentoFalso();
    armazenamento.dados.set(
      CACHE_KEY,
      JSON.stringify({ brand: { name: 'BASA', textFont: 'Anton' } }),
    );
    const estado = readCache(armazenamento);
    expect(estado.brand.name).toBe('BASA');
    expect(estado.brand.titleFont).toBe('Anton');
  });

  it('armazenamento bloqueado na leitura nao derruba a cena', () => {
    const armazenamento = new ArmazenamentoFalso();
    armazenamento.falharLeitura = true;
    expect(readCache(armazenamento)).toEqual(createDefaultState());
  });

  it('armazenamento bloqueado na escrita nao derruba a cena', () => {
    const armazenamento = new ArmazenamentoFalso();
    armazenamento.falharEscrita = true;
    expect(() => writeCache(armazenamento, createDefaultState())).not.toThrow();
  });

  it('sem armazenamento nenhum (modo privado) tudo continua funcionando', () => {
    expect(readCache(undefined)).toEqual(createDefaultState());
    expect(() => writeCache(undefined, createDefaultState())).not.toThrow();
  });
});
