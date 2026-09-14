import type { StreamEvent } from '@stream-kit/types';
import { beforeEach, describe, expect, it } from 'vitest';

import { EventQueue, formatAlertMessage } from './event-queue.js';

let relogio = 1_000_000;
const agora = (): number => relogio;

function evento(over: Partial<StreamEvent> = {}): StreamEvent {
  return {
    id: over.id ?? `id-${String(Math.random())}`,
    platform: over.platform ?? 'kick',
    kind: over.kind ?? 'follow',
    user: over.user ?? 'fulano',
    at: over.at ?? relogio,
    ...(over.amount === undefined ? {} : { amount: over.amount }),
    ...(over.message === undefined ? {} : { message: over.message }),
  };
}

beforeEach(() => {
  relogio = 1_000_000;
});

describe('ordem e basico', () => {
  it('sai na ordem em que entrou', () => {
    const fila = new EventQueue({ now: agora, coalescibleKinds: [] });
    fila.push(evento({ id: '1', user: 'a' }));
    fila.push(evento({ id: '2', user: 'b' }));
    expect(fila.shift()?.user).toBe('a');
    expect(fila.shift()?.user).toBe('b');
    expect(fila.shift()).toBeUndefined();
  });

  it('peek mostra sem remover', () => {
    const fila = new EventQueue({ now: agora });
    fila.push(evento({ id: '1', user: 'a' }));
    expect(fila.peek()?.user).toBe('a');
    expect(fila.size).toBe(1);
  });

  it('peek em fila vazia devolve undefined', () => {
    expect(new EventQueue({ now: agora }).peek()).toBeUndefined();
  });

  it('clear esvazia mas continua barrando reentrega', () => {
    const fila = new EventQueue({ now: agora });
    fila.push(evento({ id: 'x' }));
    fila.clear();
    expect(fila.size).toBe(0);
    expect(fila.push(evento({ id: 'x' }))).toBe('duplicate');
  });

  it('reset esquece tudo', () => {
    const fila = new EventQueue({ now: agora });
    fila.push(evento({ id: 'x' }));
    fila.reset();
    expect(fila.push(evento({ id: 'x' }))).toBe('queued');
  });
});

describe('deduplicacao', () => {
  it('reentrega do mesmo webhook nao vira alerta dobrado', () => {
    const fila = new EventQueue({ now: agora });
    expect(fila.push(evento({ id: 'w1' }))).toBe('queued');
    expect(fila.push(evento({ id: 'w1' }))).toBe('duplicate');
    expect(fila.size).toBe(1);
  });

  it('esquece ids antigos ao passar do limite de memoria', () => {
    const fila = new EventQueue({ now: agora, dedupeMemory: 2, coalescibleKinds: [] });
    fila.push(evento({ id: 'a' }));
    fila.push(evento({ id: 'b' }));
    fila.push(evento({ id: 'c' })); // 'a' sai da memoria
    expect(fila.push(evento({ id: 'a' }))).toBe('queued');
    expect(fila.push(evento({ id: 'c' }))).toBe('duplicate');
  });
});

describe('agrupamento', () => {
  it('follows seguidos viram um alerta com contagem', () => {
    const fila = new EventQueue({ now: agora, coalesceWindowMs: 3000 });
    expect(fila.push(evento({ id: '1', kind: 'follow' }))).toBe('queued');
    expect(fila.push(evento({ id: '2', kind: 'follow' }))).toBe('coalesced');
    expect(fila.push(evento({ id: '3', kind: 'follow' }))).toBe('coalesced');
    expect(fila.size).toBe(1);
    expect(fila.eventCount).toBe(3);
    expect(fila.shift()?.count).toBe(3);
  });

  it('fora da janela nao agrupa', () => {
    const fila = new EventQueue({ now: agora, coalesceWindowMs: 1000 });
    fila.push(evento({ id: '1', kind: 'follow' }));
    relogio += 1500;
    expect(fila.push(evento({ id: '2', kind: 'follow' }))).toBe('queued');
    expect(fila.size).toBe(2);
  });

  it('a janela conta do ultimo do grupo, nao do primeiro', () => {
    const fila = new EventQueue({ now: agora, coalesceWindowMs: 1000 });
    fila.push(evento({ id: '1', kind: 'follow' }));
    relogio += 800;
    expect(fila.push(evento({ id: '2', kind: 'follow' }))).toBe('coalesced');
    relogio += 800;
    expect(fila.push(evento({ id: '3', kind: 'follow' }))).toBe('coalesced');
  });

  it('doacao nunca agrupa, porque cada uma merece agradecimento proprio', () => {
    const fila = new EventQueue({ now: agora });
    fila.push(evento({ id: '1', kind: 'donation', amount: 'R$ 10' }));
    expect(fila.push(evento({ id: '2', kind: 'donation', amount: 'R$ 20' }))).toBe(
      'queued',
    );
    expect(fila.size).toBe(2);
  });

  it('chat nunca agrupa, porque agrupar perderia o texto', () => {
    const fila = new EventQueue({ now: agora });
    fila.push(evento({ id: '1', kind: 'chat', message: 'oi' }));
    expect(fila.push(evento({ id: '2', kind: 'chat', message: 'tudo bem?' }))).toBe(
      'queued',
    );
  });

  it('tipos diferentes nao se agrupam', () => {
    const fila = new EventQueue({ now: agora, coalescibleKinds: ['follow', 'sub'] });
    fila.push(evento({ id: '1', kind: 'follow' }));
    expect(fila.push(evento({ id: '2', kind: 'sub' }))).toBe('queued');
  });

  it('plataformas diferentes nao se agrupam', () => {
    const fila = new EventQueue({ now: agora });
    fila.push(evento({ id: '1', kind: 'follow', platform: 'kick' }));
    expect(fila.push(evento({ id: '2', kind: 'follow', platform: 'youtube' }))).toBe(
      'queued',
    );
  });
});

describe('rajada', () => {
  it('descarta o mais antigo ao estourar o teto', () => {
    const fila = new EventQueue({ now: agora, maxSize: 3, coalescibleKinds: [] });
    fila.push(evento({ id: '1', user: 'primeiro' }));
    fila.push(evento({ id: '2' }));
    fila.push(evento({ id: '3' }));
    expect(fila.push(evento({ id: '4', user: 'ultimo' }))).toBe('dropped');
    expect(fila.size).toBe(3);
    expect(fila.peek()?.id).toBe('2');
  });

  it('200 eventos de raid nao travam nem duplicam', () => {
    const fila = new EventQueue({ now: agora, maxSize: 50, coalesceWindowMs: 3000 });
    for (let i = 0; i < 200; i++)
      fila.push(evento({ id: `r${String(i)}`, kind: 'follow' }));
    expect(fila.size).toBe(1);
    expect(fila.shift()?.count).toBe(200);
  });

  it('eventCount em fila vazia e zero', () => {
    expect(new EventQueue({ now: agora }).eventCount).toBe(0);
  });

  it('usa Date.now quando nenhum relogio e injetado', () => {
    const fila = new EventQueue();
    expect(fila.push(evento({ id: 'sem-relogio' }))).toBe('queued');
  });
});

describe('formatAlertMessage', () => {
  const base = { ...evento({ id: 'x', user: 'Felipe' }), count: 1 };

  it('preenche user, amount, message e count', () => {
    expect(
      formatAlertMessage('{user} mandou {amount}', { ...base, amount: 'R$ 20,00' }),
    ).toBe('Felipe mandou R$ 20,00');
    expect(formatAlertMessage('{user}: {message}', { ...base, message: 'oi' })).toBe(
      'Felipe: oi',
    );
    expect(formatAlertMessage('+{count}', { ...base, count: 12 })).toBe('+12');
  });

  it('placeholder sem valor vira vazio, nunca "undefined" na tela', () => {
    expect(formatAlertMessage('{user} mandou {amount}', base)).toBe('Felipe mandou ');
    expect(formatAlertMessage('{message}', base)).toBe('');
  });

  it('substitui todas as ocorrencias', () => {
    expect(formatAlertMessage('{user} {user}', base)).toBe('Felipe Felipe');
  });

  it('modelo sem placeholder passa intacto', () => {
    expect(formatAlertMessage('obrigado!', base)).toBe('obrigado!');
  });
});
