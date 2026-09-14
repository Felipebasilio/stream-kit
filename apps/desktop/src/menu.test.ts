import { describe, expect, it } from 'vitest';

import { montarItens, urlDoPainel } from './menu.js';

describe('montarItens', () => {
  it('traz uma entrada por cena, incluindo a de som', () => {
    const itens = montarItens(7373, 'qhd');
    expect(itens).toHaveLength(7);
    expect(itens.map((i) => i.rotulo).join(' ')).toContain('Som');
  });

  it('cada rotulo mostra a resolucao, que e o que o usuario precisa digitar no OBS', () => {
    for (const item of montarItens(7373, 'qhd')) {
      expect(item.rotulo).toContain('2560x1440');
    }
  });

  it('as URLs levam a porta e o canvas certos', () => {
    const [primeiro] = montarItens(8080, 'vertical');
    expect(primeiro?.url).toBe(
      'http://localhost:8080/overlay/?scene=starting&canvas=vertical',
    );
    expect(primeiro?.copiar).toBe(primeiro?.url);
  });

  it('trocar de canvas troca todas as URLs', () => {
    const hd = montarItens(7373, 'hd');
    const vertical = montarItens(7373, 'vertical');
    expect(hd.every((i) => i.url.includes('canvas=hd'))).toBe(true);
    expect(vertical.every((i) => i.url.includes('canvas=vertical'))).toBe(true);
  });
});

describe('urlDoPainel', () => {
  it('aponta para a raiz na porta escolhida', () => {
    expect(urlDoPainel(7379)).toBe('http://localhost:7379/');
  });
});
