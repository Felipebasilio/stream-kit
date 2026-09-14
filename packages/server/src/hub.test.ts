import { describe, expect, it, vi } from 'vitest';

import { Hub, SLOW_CLIENT_CODE, STALE_CLIENT_CODE, type SocketLike } from './hub.js';

class SocketFalso implements SocketLike {
  enviados: string[] = [];
  fechadoCom: number | undefined;
  bufferedAmount = 0;
  falharEnvio = false;
  falharFechamento = false;

  send(data: string): void {
    if (this.falharEnvio) throw new Error('socket morto');
    this.enviados.push(data);
  }
  close(code?: number): void {
    if (this.falharFechamento) throw new Error('ja fechado');
    this.fechadoCom = code;
  }
}

const MSG = { type: 'ack', id: 'x' } as const;

describe('registro', () => {
  it('conta por papel', () => {
    const hub = new Hub();
    hub.add(new SocketFalso(), 'overlay');
    hub.add(new SocketFalso(), 'overlay');
    hub.add(new SocketFalso(), 'panel');
    expect(hub.size).toBe(3);
    expect(hub.countByRole('overlay')).toBe(2);
    expect(hub.countByRole('panel')).toBe(1);
  });

  it('remove pelo id', () => {
    const hub = new Hub();
    const id = hub.add(new SocketFalso(), 'panel');
    hub.remove(id);
    expect(hub.size).toBe(0);
  });

  it('ids sao distintos', () => {
    const hub = new Hub();
    expect(hub.add(new SocketFalso(), 'panel')).not.toBe(
      hub.add(new SocketFalso(), 'panel'),
    );
  });
});

describe('envio', () => {
  it('sendTo entrega a um cliente so', () => {
    const hub = new Hub();
    const a = new SocketFalso();
    const b = new SocketFalso();
    const idA = hub.add(a, 'panel');
    hub.add(b, 'panel');
    expect(hub.sendTo(idA, MSG)).toBe(true);
    expect(a.enviados).toHaveLength(1);
    expect(b.enviados).toHaveLength(0);
  });

  it('sendTo para id inexistente devolve false', () => {
    expect(new Hub().sendTo('fantasma', MSG)).toBe(false);
  });

  it('broadcast atinge todos', () => {
    const hub = new Hub();
    hub.add(new SocketFalso(), 'overlay');
    hub.add(new SocketFalso(), 'panel');
    expect(hub.broadcast(MSG)).toBe(2);
  });

  it('broadcast por papel filtra', () => {
    const hub = new Hub();
    const cena = new SocketFalso();
    const painel = new SocketFalso();
    hub.add(cena, 'overlay');
    hub.add(painel, 'panel');
    expect(hub.broadcast(MSG, 'panel')).toBe(1);
    expect(cena.enviados).toHaveLength(0);
    expect(painel.enviados).toHaveLength(1);
  });
});

describe('cliente problematico', () => {
  it('cliente lento e desconectado em vez de segurar o servidor', () => {
    const avisos: string[] = [];
    const hub = new Hub({ maxBufferedBytes: 100, onWarning: (m) => avisos.push(m) });
    const lento = new SocketFalso();
    lento.bufferedAmount = 5000;
    hub.add(lento, 'overlay');
    expect(hub.broadcast(MSG)).toBe(0);
    expect(hub.size).toBe(0);
    expect(lento.fechadoCom).toBe(SLOW_CLIENT_CODE);
    expect(avisos.join(' ')).toContain('lento');
  });

  it('socket que estoura no envio e descartado', () => {
    const avisos: string[] = [];
    const hub = new Hub({ onWarning: (m) => avisos.push(m) });
    const morto = new SocketFalso();
    morto.falharEnvio = true;
    hub.add(morto, 'overlay');
    expect(hub.broadcast(MSG)).toBe(0);
    expect(hub.size).toBe(0);
    expect(avisos.join(' ')).toContain('falha ao enviar');
  });

  it('erro ao fechar nao derruba o servidor', () => {
    const hub = new Hub();
    const ruim = new SocketFalso();
    ruim.falharEnvio = true;
    ruim.falharFechamento = true;
    hub.add(ruim, 'overlay');
    expect(() => hub.broadcast(MSG)).not.toThrow();
  });

  it('socket sem bufferedAmount e tratado como zero', () => {
    const hub = new Hub({ maxBufferedBytes: 0 });
    const simples: SocketLike = { send: vi.fn(), close: vi.fn() };
    hub.add(simples, 'overlay');
    expect(hub.broadcast(MSG)).toBe(1);
  });
});

describe('ping e limpeza', () => {
  it('derruba quem nao respondeu a rodada anterior', () => {
    const hub = new Hub();
    const mudo = new SocketFalso();
    hub.add(mudo, 'overlay');
    expect(hub.sweep(() => {})).toBe(0); // primeira rodada: so marca
    expect(hub.sweep(() => {})).toBe(1); // nao respondeu: sai
    expect(hub.size).toBe(0);
    expect(mudo.fechadoCom).toBe(STALE_CLIENT_CODE);
  });

  it('quem responde com pong sobrevive', () => {
    const hub = new Hub();
    const vivo = new SocketFalso();
    const id = hub.add(vivo, 'overlay');
    hub.sweep(() => {});
    hub.markAlive(id);
    expect(hub.sweep(() => {})).toBe(0);
    expect(hub.size).toBe(1);
  });

  it('markAlive em id inexistente nao quebra', () => {
    expect(() => new Hub().markAlive('fantasma')).not.toThrow();
  });

  it('ping que estoura derruba o cliente', () => {
    const hub = new Hub();
    hub.add(new SocketFalso(), 'overlay');
    const derrubados = hub.sweep(() => {
      throw new Error('socket fechou');
    });
    expect(derrubados).toBe(1);
  });

  it('closeAll fecha todo mundo', () => {
    const hub = new Hub();
    const a = new SocketFalso();
    hub.add(a, 'overlay');
    hub.add(new SocketFalso(), 'panel');
    hub.closeAll();
    expect(hub.size).toBe(0);
    expect(a.fechadoCom).toBe(1001);
  });
});
