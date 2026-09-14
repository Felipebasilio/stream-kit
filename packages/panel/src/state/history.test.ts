import { createDefaultState, type StreamKitState } from '@stream-kit/types';
import { describe, expect, it } from 'vitest';

import { History } from './history.js';

function comNome(nome: string): StreamKitState {
  return {
    ...createDefaultState(),
    brand: { ...createDefaultState().brand, name: nome },
  };
}

describe('desfazer', () => {
  it('volta ao estado anterior', () => {
    const h = new History();
    const a = comNome('A');
    const b = comNome('B');
    h.registrar(a);
    expect(h.desfazer(b)?.brand.name).toBe('A');
  });

  it('sem historico nao faz nada', () => {
    expect(new History().desfazer(comNome('A'))).toBeUndefined();
  });

  it('varios passos voltam na ordem certa', () => {
    const h = new History();
    h.registrar(comNome('A'));
    h.registrar(comNome('B'));
    let atual = comNome('C');
    atual = h.desfazer(atual) ?? atual;
    expect(atual.brand.name).toBe('B');
    atual = h.desfazer(atual) ?? atual;
    expect(atual.brand.name).toBe('A');
    expect(h.desfazer(atual)).toBeUndefined();
  });

  it('estado igual ao topo nao vira passo novo', () => {
    // Sem isso o Cmd+Z ficaria preso: varias entradas identicas seguidas.
    const h = new History();
    h.registrar(comNome('A'));
    h.registrar(comNome('A'));
    h.registrar(comNome('A'));
    expect(h.tamanho).toBe(1);
  });

  it('respeita o limite, descartando o mais antigo', () => {
    const h = new History(3);
    for (const n of ['A', 'B', 'C', 'D', 'E']) h.registrar(comNome(n));
    expect(h.tamanho).toBe(3);
    let atual = comNome('F');
    const vistos: string[] = [];
    for (let i = 0; i < 3; i++) {
      atual = h.desfazer(atual) ?? atual;
      vistos.push(atual.brand.name);
    }
    expect(vistos).toEqual(['E', 'D', 'C']);
  });
});

describe('refazer', () => {
  it('volta para frente depois de desfazer', () => {
    const h = new History();
    h.registrar(comNome('A'));
    const desfeito = h.desfazer(comNome('B'));
    expect(h.refazer(desfeito ?? comNome('A'))?.brand.name).toBe('B');
  });

  it('sem nada desfeito nao faz nada', () => {
    expect(new History().refazer(comNome('A'))).toBeUndefined();
  });

  it('uma alteracao nova apaga o futuro', () => {
    // Comportamento de qualquer editor: ramificar descarta o caminho antigo.
    const h = new History();
    h.registrar(comNome('A'));
    const desfeito = h.desfazer(comNome('B')) ?? comNome('A');
    expect(h.podeRefazer).toBe(true);
    h.registrar(desfeito);
    expect(h.podeRefazer).toBe(false);
  });

  it('desfazer e refazer varias vezes mantem a coerencia', () => {
    const h = new History();
    h.registrar(comNome('A'));
    h.registrar(comNome('B'));
    let atual = comNome('C');
    atual = h.desfazer(atual) ?? atual;
    atual = h.desfazer(atual) ?? atual;
    expect(atual.brand.name).toBe('A');
    atual = h.refazer(atual) ?? atual;
    atual = h.refazer(atual) ?? atual;
    expect(atual.brand.name).toBe('C');
  });
});

describe('estado do historico', () => {
  it('informa o que da para fazer', () => {
    const h = new History();
    expect(h.podeDesfazer).toBe(false);
    expect(h.podeRefazer).toBe(false);
    h.registrar(comNome('A'));
    expect(h.podeDesfazer).toBe(true);
  });

  it('limpar zera tudo', () => {
    const h = new History();
    h.registrar(comNome('A'));
    h.desfazer(comNome('B'));
    h.limpar();
    expect(h.podeDesfazer).toBe(false);
    expect(h.podeRefazer).toBe(false);
  });
});
