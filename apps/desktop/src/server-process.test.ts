import { describe, expect, it, vi } from 'vitest';

import {
  lerPortaDaSaida,
  ServidorEmbutido,
  type ProcessoFilho,
} from './server-process.js';

class FilhoFalso implements ProcessoFilho {
  pid = 4242;
  sinais: (NodeJS.Signals | undefined)[] = [];
  private saidas: ((c: number | null) => void)[] = [];
  private erros: ((e: Error) => void)[] = [];
  private dados: ((p: unknown) => void)[] = [];
  stdout = {
    on: (_e: 'data', ouvinte: (p: unknown) => void): void => {
      this.dados.push(ouvinte);
    },
  };

  kill(sinal?: NodeJS.Signals): boolean {
    this.sinais.push(sinal);
    return true;
  }
  on(evento: 'exit' | 'error', ouvinte: never): void {
    if (evento === 'exit') this.saidas.push(ouvinte as (c: number | null) => void);
    else this.erros.push(ouvinte as (e: Error) => void);
  }
  sair(codigo: number | null = 0): void {
    for (const o of this.saidas) o(codigo);
  }
  falhar(erro: Error): void {
    for (const o of this.erros) o(erro);
  }
  imprimir(texto: string): void {
    for (const o of this.dados) o(texto);
  }
}

function montar(over: Partial<Parameters<typeof criar>[0]> = {}) {
  return criar(over);
}

function criar(over: Record<string, unknown> = {}): {
  servidor: ServidorEmbutido;
  filhos: FilhoFalso[];
  saidas: (number | null)[];
  erros: Error[];
  linhas: string[];
} {
  const filhos: FilhoFalso[] = [];
  const saidas: (number | null)[] = [];
  const erros: Error[] = [];
  const linhas: string[] = [];
  const servidor = new ServidorEmbutido({
    spawn: () => {
      const f = new FilhoFalso();
      filhos.push(f);
      return f;
    },
    executavel: 'node',
    args: ['cli.js'],
    aoSair: (c) => saidas.push(c),
    aoFalhar: (e) => erros.push(e),
    aoImprimir: (l) => linhas.push(l),
    ...over,
  });
  return { servidor, filhos, saidas, erros, linhas };
}

describe('iniciar', () => {
  it('sobe um filho e informa o pid', () => {
    const { servidor, filhos } = montar();
    servidor.iniciar();
    expect(filhos).toHaveLength(1);
    expect(servidor.rodando).toBe(true);
    expect(servidor.pid).toBe(4242);
  });

  it('iniciar duas vezes nao sobe dois servidores', () => {
    const { servidor, filhos } = montar();
    servidor.iniciar();
    servidor.iniciar();
    expect(filhos).toHaveLength(1);
  });

  it('o filho morrendo sozinho e avisado', () => {
    const { servidor, filhos, saidas } = montar();
    servidor.iniciar();
    filhos[0]?.sair(1);
    expect(saidas).toEqual([1]);
    expect(servidor.rodando).toBe(false);
  });

  it('falha ao subir e avisada em vez de derrubar o app', () => {
    const { servidor, filhos, erros } = montar();
    servidor.iniciar();
    filhos[0]?.falhar(new Error('executavel nao encontrado'));
    expect(erros).toHaveLength(1);
    expect(servidor.rodando).toBe(false);
  });

  it('repassa o que o servidor imprime', () => {
    const { servidor, filhos, linhas } = montar();
    servidor.iniciar();
    filhos[0]?.imprimir('Painel: http://localhost:7373/');
    expect(linhas[0]).toContain('7373');
  });

  it('depois de morrer, da para subir de novo', () => {
    const { servidor, filhos } = montar();
    servidor.iniciar();
    filhos[0]?.sair(0);
    servidor.iniciar();
    expect(filhos).toHaveLength(2);
  });
});

describe('parar', () => {
  it('pede SIGTERM e espera o servidor gravar antes de sair', async () => {
    const { servidor, filhos } = montar();
    servidor.iniciar();
    const promessa = servidor.parar();
    expect(filhos[0]?.sinais).toEqual(['SIGTERM']);
    filhos[0]?.sair(0);
    expect(await promessa).toBe('saiu');
  });

  it('processo travado passa do prazo e e morto, para nao virar orfao', async () => {
    let disparar: (() => void) | undefined;
    const { servidor, filhos } = montar({
      prazoDeSaidaMs: 10,
      schedule: (fn: () => void) => {
        disparar = fn;
        return 1;
      },
      cancel: () => {},
    });
    servidor.iniciar();
    const promessa = servidor.parar();
    disparar?.();
    expect(await promessa).toBe('morto');
    expect(filhos[0]?.sinais).toEqual(['SIGTERM', 'SIGKILL']);
  });

  it('parar sem ter iniciado nao quebra', async () => {
    expect(await montar().servidor.parar()).toBe('nao-rodava');
  });

  it('parar duas vezes em paralelo nao manda dois SIGTERM', async () => {
    const { servidor, filhos } = montar();
    servidor.iniciar();
    const a = servidor.parar();
    const b = servidor.parar();
    filhos[0]?.sair(0);
    expect(await a).toBe('saiu');
    expect(await b).toBe('saiu');
    expect(filhos[0]?.sinais.filter((s) => s === 'SIGTERM')).toHaveLength(1);
  });

  it('usa setTimeout de verdade quando nada e injetado', async () => {
    vi.useFakeTimers();
    const { servidor, filhos } = montar({ prazoDeSaidaMs: 50 });
    servidor.iniciar();
    const promessa = servidor.parar();
    await vi.advanceTimersByTimeAsync(100);
    expect(await promessa).toBe('morto');
    expect(filhos[0]?.sinais).toContain('SIGKILL');
    vi.useRealTimers();
  });
});

describe('lerPortaDaSaida', () => {
  it('le a linha estruturada, que e o caminho oficial', () => {
    const linha = JSON.stringify({ streamKit: 'ready', port: 7373, panel: 'x' });
    expect(lerPortaDaSaida(linha)).toBe(7373);
  });

  it('acha a linha estruturada no meio de outras', () => {
    const pedaco = `ruido\n${JSON.stringify({ streamKit: 'ready', port: 8080 })}\nmais ruido`;
    expect(lerPortaDaSaida(pedaco)).toBe(8080);
  });

  it('JSON de outra coisa e ignorado', () => {
    expect(lerPortaDaSaida('{"outro":"programa","port":9999}')).toBeUndefined();
  });

  it('JSON pela metade nao quebra', () => {
    expect(lerPortaDaSaida('{"streamKit":"rea')).toBeUndefined();
  });

  it('cai no texto humano como rede de seguranca', () => {
    expect(lerPortaDaSaida('  Painel: http://localhost:7373/')).toBe(7373);
  });

  it('linha sem porta devolve indefinido', () => {
    expect(lerPortaDaSaida('Stream Kit no ar')).toBeUndefined();
    expect(lerPortaDaSaida('')).toBeUndefined();
  });

  it('porta absurda e recusada', () => {
    expect(lerPortaDaSaida('http://localhost:99999/')).toBeUndefined();
    expect(
      lerPortaDaSaida(JSON.stringify({ streamKit: 'ready', port: 0 })),
    ).toBeUndefined();
  });
});
