import { describe, expect, it } from 'vitest';

import { LIMITE_ARROBA_VERTICAL, mostrarRelogio } from './bar-fit.js';

const curto = ['@lipe_basa'];
const longo = ['https://discord.gg/lipebasa'];

describe('mostrarRelogio', () => {
  it('desligado no painel continua desligado', () => {
    expect(
      mostrarRelogio({ showClock: false, orientation: 'horizontal', handles: curto }),
    ).toBe(false);
  });

  it('no horizontal cabem os dois, mesmo com @ longo', () => {
    expect(
      mostrarRelogio({ showClock: true, orientation: 'horizontal', handles: longo }),
    ).toBe(true);
  });

  it('no vertical, @ curto mantem o relogio', () => {
    expect(
      mostrarRelogio({ showClock: true, orientation: 'vertical', handles: curto }),
    ).toBe(true);
  });

  it('no vertical, @ longo tira o relogio em vez de cortar o @', () => {
    expect(
      mostrarRelogio({ showClock: true, orientation: 'vertical', handles: longo }),
    ).toBe(false);
  });

  it('quem decide e o maior da lista, nao o primeiro', () => {
    expect(
      mostrarRelogio({
        showClock: true,
        orientation: 'vertical',
        handles: ['@a', ...longo],
      }),
    ).toBe(false);
  });

  it('sem nenhuma rede o relogio fica', () => {
    expect(
      mostrarRelogio({ showClock: true, orientation: 'vertical', handles: [] }),
    ).toBe(true);
  });

  it('o limite e inclusivo', () => {
    const naMedida = 'x'.repeat(LIMITE_ARROBA_VERTICAL);
    const umAMais = 'x'.repeat(LIMITE_ARROBA_VERTICAL + 1);
    expect(
      mostrarRelogio({ showClock: true, orientation: 'vertical', handles: [naMedida] }),
    ).toBe(true);
    expect(
      mostrarRelogio({ showClock: true, orientation: 'vertical', handles: [umAMais] }),
    ).toBe(false);
  });
});
