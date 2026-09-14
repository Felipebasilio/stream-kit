import { describe, expect, it } from 'vitest';

import {
  formatRemaining,
  remainingMs,
  startCountdown,
  stopCountdown,
} from './countdown.js';

const AGORA = 1_700_000_000_000;

describe('startCountdown', () => {
  it('guarda o instante do fim, nao a duracao', () => {
    const cd = startCountdown(10, AGORA, 'COMEÇA EM');
    expect(cd.enabled).toBe(true);
    expect(cd.endsAt).toBe(AGORA + 600_000);
  });

  it.each([
    ['zero', 0],
    ['negativo', -5],
    ['NaN', Number.NaN],
    ['infinito', Number.POSITIVE_INFINITY],
  ])('%s desliga em vez de criar contagem invalida', (_nome, minutos) => {
    const cd = startCountdown(minutos, AGORA, 'X');
    expect(cd.enabled).toBe(false);
    expect(cd.endsAt).toBe(0);
  });

  it('aceita fracao de minuto', () => {
    expect(startCountdown(0.5, AGORA, 'X').endsAt).toBe(AGORA + 30_000);
  });
});

describe('stopCountdown', () => {
  it('zera mantendo o rotulo', () => {
    expect(stopCountdown('COMEÇA EM')).toEqual({
      enabled: false,
      endsAt: 0,
      label: 'COMEÇA EM',
    });
  });
});

describe('remainingMs', () => {
  it('conta para tras', () => {
    const cd = startCountdown(10, AGORA, 'X');
    expect(remainingMs(cd, AGORA + 60_000)).toBe(540_000);
  });

  it('nunca fica negativo depois do fim', () => {
    const cd = startCountdown(1, AGORA, 'X');
    expect(remainingMs(cd, AGORA + 999_999)).toBe(0);
  });

  it('desligada devolve zero', () => {
    expect(remainingMs({ enabled: false, endsAt: AGORA + 1000, label: '' }, AGORA)).toBe(
      0,
    );
    expect(remainingMs({ enabled: true, endsAt: 0, label: '' }, AGORA)).toBe(0);
  });

  it('relogio do sistema andando para tras nao estoura', () => {
    const cd = startCountdown(10, AGORA, 'X');
    expect(remainingMs(cd, AGORA - 3_600_000)).toBe(4_200_000);
  });
});

describe('formatRemaining', () => {
  it.each([
    [0, '00:00'],
    [1000, '00:01'],
    [59_000, '00:59'],
    [60_000, '01:00'],
    [599_000, '09:59'],
    [3_599_000, '59:59'],
    [3_600_000, '01:00:00'],
    [7_322_000, '02:02:02'],
  ])('%i ms vira %s', (ms, esperado) => {
    expect(formatRemaining(ms)).toBe(esperado);
  });

  it('negativo vira 00:00 em vez de texto quebrado na tela', () => {
    expect(formatRemaining(-5000)).toBe('00:00');
  });
});
