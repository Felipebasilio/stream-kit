import { describe, expect, it } from 'vitest';

import { conferirRaizes, explicarRaizFaltando, type RaizPedida } from './static-roots.js';

const painel: RaizPedida = {
  nome: 'painel',
  caminho: '/app/Resources/panel',
  explicito: true,
};
const cenas: RaizPedida = {
  nome: 'cenas',
  caminho: '/app/Resources/overlay',
  explicito: true,
};
const palpite: RaizPedida = {
  nome: 'painel',
  caminho: '/repo/packages/panel/dist',
  explicito: false,
};

const tudoExiste = (): boolean => true;
const nadaExiste = (): boolean => false;

describe('conferirRaizes', () => {
  it('com tudo no lugar, nao ha nada a relatar', () => {
    expect(conferirRaizes([painel, cenas], tudoExiste)).toEqual({
      faltando: [],
      avisos: [],
    });
  });

  it('pasta pedida por nome e que nao existe impede o servidor de subir', () => {
    // Este e exatamente o caso do `.app` empacotado sem o painel: sem isto o
    // servidor subia e devolvia 404 na cara de quem abriu o app.
    const r = conferirRaizes([painel], nadaExiste);
    expect(r.faltando).toEqual([painel]);
    expect(r.avisos).toEqual([]);
  });

  it('palpite que nao acertou vira aviso, nao impedimento', () => {
    // `pnpm dev:server` antes do primeiro build. Ninguem esta ao vivo.
    const r = conferirRaizes([palpite], nadaExiste);
    expect(r.faltando).toEqual([]);
    expect(r.avisos).toEqual([palpite]);
  });

  it('separa os dois tipos na mesma rodada', () => {
    const r = conferirRaizes([painel, palpite], nadaExiste);
    expect(r.faltando).toEqual([painel]);
    expect(r.avisos).toEqual([palpite]);
  });

  it('relata todas as que faltam, nao so a primeira', () => {
    // Quem esta consertando o empacotamento precisa ver a lista inteira de
    // uma vez, em vez de descobrir uma por execucao.
    expect(conferirRaizes([painel, cenas], nadaExiste).faltando).toEqual([painel, cenas]);
  });

  it('confere pelo caminho de verdade, um por um', () => {
    const existe = (c: string): boolean => c === painel.caminho;
    expect(conferirRaizes([painel, cenas], existe).faltando).toEqual([cenas]);
  });

  it('lista vazia nao inventa problema', () => {
    expect(conferirRaizes([], nadaExiste)).toEqual({ faltando: [], avisos: [] });
  });
});

describe('explicarRaizFaltando', () => {
  it('diz o nome, o caminho e o que fazer', () => {
    const texto = explicarRaizFaltando(painel);
    expect(texto).toContain('painel');
    expect(texto).toContain('/app/Resources/panel');
    expect(texto).toContain('Reinstale');
  });
});
