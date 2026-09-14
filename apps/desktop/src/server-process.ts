/**
 * Ciclo de vida do servidor dentro do app.
 *
 * O que nao pode acontecer, em ordem de gravidade:
 *  1. Fechar o app e deixar o Node rodando. Na proxima abertura a porta esta
 *     presa e o usuario nao entende por que "nao abre".
 *  2. Perder a ultima edicao ao fechar. O servidor grava no SIGTERM, entao o
 *     app precisa ESPERAR ele sair, e nao matar na marra.
 *  3. Ficar preso para sempre esperando um processo travado.
 */

export interface ProcessoFilho {
  readonly pid?: number | undefined;
  kill(sinal?: NodeJS.Signals): boolean;
  on(evento: 'exit', ouvinte: (codigo: number | null) => void): void;
  on(evento: 'error', ouvinte: (erro: Error) => void): void;
  stdout?: { on(evento: 'data', ouvinte: (pedaco: unknown) => void): void } | null;
}

export interface OpcoesDoServidor {
  readonly spawn: (comando: string, args: readonly string[]) => ProcessoFilho;
  readonly executavel: string;
  readonly args: readonly string[];
  /** Quanto esperar o encerramento educado antes de matar na marra. */
  readonly prazoDeSaidaMs?: number;
  readonly schedule?: (fn: () => void, ms: number) => unknown;
  readonly cancel?: (h: unknown) => void;
  readonly aoSair?: (codigo: number | null) => void;
  readonly aoFalhar?: (erro: Error) => void;
  readonly aoImprimir?: (linha: string) => void;
}

export class ServidorEmbutido {
  private filho: ProcessoFilho | undefined;
  /** Sempre uma promessa: comeca resolvida para nao precisar de guarda. */
  private saida: Promise<void> = Promise.resolve();
  private encerrando = false;

  constructor(private readonly opcoes: OpcoesDoServidor) {}

  get rodando(): boolean {
    return this.filho !== undefined;
  }

  get pid(): number | undefined {
    return this.filho?.pid;
  }

  iniciar(): void {
    if (this.filho !== undefined) return;
    const filho = this.opcoes.spawn(this.opcoes.executavel, this.opcoes.args);
    this.filho = filho;

    // O ouvinte de saida precisa existir antes de o processo poder morrer.
    this.saida = new Promise<void>((resolve) => {
      filho.on('exit', (codigo) => {
        this.filho = undefined;
        this.opcoes.aoSair?.(codigo);
        resolve();
      });
    });

    filho.on('error', (erro) => {
      this.filho = undefined;
      this.opcoes.aoFalhar?.(erro);
    });

    filho.stdout?.on('data', (pedaco) => {
      this.opcoes.aoImprimir?.(String(pedaco));
    });
  }

  /**
   * Pede para sair com educacao e espera. Se passar do prazo, mata na marra —
   * melhor perder a ultima edicao do que deixar processo orfao.
   */
  async parar(): Promise<'saiu' | 'morto' | 'nao-rodava'> {
    if (this.filho === undefined) return 'nao-rodava';
    if (this.encerrando) {
      await this.saida;
      return 'saiu';
    }
    this.encerrando = true;

    const filho = this.filho;
    const espera = this.saida;
    filho.kill('SIGTERM');

    const prazo = this.opcoes.prazoDeSaidaMs ?? 4000;
    const schedule = this.opcoes.schedule ?? ((fn, ms) => setTimeout(fn, ms));
    const cancel =
      this.opcoes.cancel ??
      ((h): void => {
        clearTimeout(h as ReturnType<typeof setTimeout>);
      });

    let handle: unknown;
    const estouro = new Promise<'morto'>((resolve) => {
      handle = schedule(() => {
        filho.kill('SIGKILL');
        resolve('morto');
      }, prazo);
    });

    const resultado = await Promise.race([espera.then((): 'saiu' => 'saiu'), estouro]);

    if (handle !== undefined) cancel(handle);
    this.encerrando = false;
    return resultado;
  }
}

function portaValida(valor: unknown): number | undefined {
  const porta = Number(valor);
  return Number.isInteger(porta) && porta > 0 && porta < 65536 ? porta : undefined;
}

/**
 * Descobre em que porta o servidor ficou.
 *
 * O caminho bom e a linha estruturada que o servidor escreve em stdout ao
 * subir. A busca por texto existe so como rede de seguranca: raspar mensagem
 * humana quebra na primeira vez que alguem melhora a redacao dela.
 */
export function lerPortaDaSaida(pedaco: string): number | undefined {
  for (const linha of pedaco.split('\n')) {
    const limpa = linha.trim();
    if (limpa.startsWith('{')) {
      try {
        const dados = JSON.parse(limpa) as { streamKit?: unknown; port?: unknown };
        if (dados.streamKit === 'ready') {
          const porta = portaValida(dados.port);
          if (porta !== undefined) return porta;
        }
      } catch {
        // linha parcial ou JSON de outra coisa: segue procurando
      }
    }
    const achado = /localhost:(\d{2,5})/.exec(limpa);
    if (achado !== null) {
      const porta = portaValida(achado[1]);
      if (porta !== undefined) return porta;
    }
  }
  return undefined;
}
