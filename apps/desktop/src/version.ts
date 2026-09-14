/**
 * Comparacao de versoes e verificacao de atualizacao.
 *
 * O app NAO se atualiza sozinho (decisao D6): sem conta Apple Developer, a
 * atualizacao automatica do macOS nao funciona, porque o mecanismo valida a
 * assinatura antes de aplicar. Em vez de escrever um substituto caseiro que
 * baixa e executa codigo — o que seria execucao remota de codigo na maquina do
 * usuario por uma conveniencia — o app apenas AVISA que ha versao nova e abre
 * a pagina do release.
 */

export interface Versao {
  readonly maior: number;
  readonly menor: number;
  readonly correcao: number;
}

export function analisarVersao(texto: string): Versao | undefined {
  const limpo = texto.trim().replace(/^v/i, '');
  const partes = limpo.split('.');
  if (partes.length < 2 || partes.length > 3) return undefined;
  const [maior, menor, correcao = 0] = partes.map((p) => Number(p)) as [
    number,
    number,
    number?,
  ];
  if ([maior, menor, correcao].some((n) => !Number.isInteger(n) || n < 0)) {
    return undefined;
  }
  return { maior, menor, correcao };
}

/** Negativo se `a` for mais antiga, zero se iguais, positivo se mais nova. */
export function compararVersoes(a: Versao, b: Versao): number {
  if (a.maior !== b.maior) return a.maior - b.maior;
  if (a.menor !== b.menor) return a.menor - b.menor;
  return a.correcao - b.correcao;
}

export interface ResultadoDeAtualizacao {
  readonly temNova: boolean;
  readonly versaoAtual: string;
  readonly versaoNova?: string;
  readonly url?: string;
  readonly erro?: string;
}

export interface RespostaGitHub {
  tag_name?: unknown;
  html_url?: unknown;
  draft?: unknown;
  prerelease?: unknown;
}

export function avaliarRelease(
  atual: string,
  resposta: RespostaGitHub | undefined,
): ResultadoDeAtualizacao {
  if (resposta === undefined) {
    return { temNova: false, versaoAtual: atual, erro: 'sem resposta do GitHub' };
  }
  if (resposta.draft === true || resposta.prerelease === true) {
    return { temNova: false, versaoAtual: atual };
  }
  const tag = typeof resposta.tag_name === 'string' ? resposta.tag_name : '';
  const nova = analisarVersao(tag);
  const daqui = analisarVersao(atual);
  if (nova === undefined || daqui === undefined) {
    return { temNova: false, versaoAtual: atual, erro: `versao ilegivel: ${tag}` };
  }
  if (compararVersoes(nova, daqui) <= 0) {
    return { temNova: false, versaoAtual: atual };
  }
  return {
    temNova: true,
    versaoAtual: atual,
    versaoNova: tag,
    ...(typeof resposta.html_url === 'string' ? { url: resposta.html_url } : {}),
  };
}

export type Buscador = (url: string) => Promise<RespostaGitHub | undefined>;

export const URL_RELEASES =
  'https://api.github.com/repos/Felipebasilio/stream-kit/releases/latest';

export async function verificarAtualizacao(
  atual: string,
  buscar: Buscador,
  url = URL_RELEASES,
): Promise<ResultadoDeAtualizacao> {
  try {
    return avaliarRelease(atual, await buscar(url));
  } catch (erro) {
    // Sem internet, GitHub fora, limite de requisicao: nada disso pode
    // atrapalhar quem so quer abrir o app e transmitir.
    return { temNova: false, versaoAtual: atual, erro: String(erro) };
  }
}
