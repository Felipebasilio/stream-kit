import { describe, expect, it } from 'vitest';

import {
  analisarVersao,
  avaliarRelease,
  compararVersoes,
  verificarAtualizacao,
} from './version.js';

describe('analisarVersao', () => {
  it.each([
    ['1.2.3', { maior: 1, menor: 2, correcao: 3 }],
    ['v1.2.3', { maior: 1, menor: 2, correcao: 3 }],
    ['V0.1.0', { maior: 0, menor: 1, correcao: 0 }],
    ['  2.0.0  ', { maior: 2, menor: 0, correcao: 0 }],
    ['1.5', { maior: 1, menor: 5, correcao: 0 }],
  ])('le %s', (texto, esperado) => {
    expect(analisarVersao(texto)).toEqual(esperado);
  });

  it.each(['', 'abc', '1', '1.2.3.4', '1.a.3', '-1.0.0', '1.2.3-beta'])(
    'recusa %s',
    (texto) => {
      expect(analisarVersao(texto)).toBeUndefined();
    },
  );
});

describe('compararVersoes', () => {
  const v = (t: string): NonNullable<ReturnType<typeof analisarVersao>> =>
    analisarVersao(t) as NonNullable<ReturnType<typeof analisarVersao>>;

  it('compara em cascata: maior, menor, correcao', () => {
    expect(compararVersoes(v('2.0.0'), v('1.9.9'))).toBeGreaterThan(0);
    expect(compararVersoes(v('1.2.0'), v('1.1.9'))).toBeGreaterThan(0);
    expect(compararVersoes(v('1.1.2'), v('1.1.1'))).toBeGreaterThan(0);
    expect(compararVersoes(v('1.1.1'), v('1.1.1'))).toBe(0);
    expect(compararVersoes(v('1.0.0'), v('1.0.1'))).toBeLessThan(0);
  });

  it('10 e maior que 9, e nao menor como no texto', () => {
    expect(compararVersoes(v('0.10.0'), v('0.9.0'))).toBeGreaterThan(0);
  });
});

describe('avaliarRelease', () => {
  it('versao mais nova avisa, com link', () => {
    const r = avaliarRelease('0.1.0', {
      tag_name: 'v0.2.0',
      html_url: 'https://github.com/x/y/releases/tag/v0.2.0',
    });
    expect(r.temNova).toBe(true);
    expect(r.versaoNova).toBe('v0.2.0');
    expect(r.url).toContain('releases');
  });

  it('mesma versao nao avisa', () => {
    expect(avaliarRelease('0.2.0', { tag_name: 'v0.2.0' }).temNova).toBe(false);
  });

  it('versao mais antiga no GitHub nao avisa', () => {
    expect(avaliarRelease('0.3.0', { tag_name: 'v0.2.0' }).temNova).toBe(false);
  });

  it('rascunho e pre-lancamento sao ignorados', () => {
    expect(avaliarRelease('0.1.0', { tag_name: 'v9.0.0', draft: true }).temNova).toBe(
      false,
    );
    expect(
      avaliarRelease('0.1.0', { tag_name: 'v9.0.0', prerelease: true }).temNova,
    ).toBe(false);
  });

  it('tag ilegivel vira aviso de erro, nao promessa de atualizacao', () => {
    const r = avaliarRelease('0.1.0', { tag_name: 'ultima' });
    expect(r.temNova).toBe(false);
    expect(r.erro).toContain('ilegivel');
  });

  it('resposta sem tag_name de texto vira aviso de erro', () => {
    const r = avaliarRelease('0.1.0', { tag_name: 42 });
    expect(r.temNova).toBe(false);
    expect(r.erro).toContain('ilegivel');
  });

  it('versao do proprio app ilegivel nao promete atualizacao', () => {
    expect(avaliarRelease('desenvolvimento', { tag_name: 'v9.0.0' }).temNova).toBe(false);
  });

  it('sem resposta nao quebra', () => {
    expect(avaliarRelease('0.1.0', undefined).temNova).toBe(false);
  });

  it('release sem link ainda avisa', () => {
    const r = avaliarRelease('0.1.0', { tag_name: 'v1.0.0' });
    expect(r.temNova).toBe(true);
    expect(r.url).toBeUndefined();
  });
});

describe('verificarAtualizacao', () => {
  it('consulta e avalia', async () => {
    const r = await verificarAtualizacao('0.1.0', () =>
      Promise.resolve({ tag_name: 'v0.9.0' }),
    );
    expect(r.temNova).toBe(true);
  });

  it('GitHub fora do ar nao atrapalha quem so quer transmitir', async () => {
    const r = await verificarAtualizacao('0.1.0', () =>
      Promise.reject(new Error('sem internet')),
    );
    expect(r.temNova).toBe(false);
    expect(r.erro).toContain('sem internet');
  });

  it('usa a URL informada', async () => {
    let pedida = '';
    await verificarAtualizacao(
      '0.1.0',
      (url) => {
        pedida = url;
        return Promise.resolve(undefined);
      },
      'https://exemplo/releases',
    );
    expect(pedida).toBe('https://exemplo/releases');
  });
});
