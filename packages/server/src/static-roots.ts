/**
 * Conferencia das pastas de arquivos estaticos antes de o servidor subir.
 *
 * Isto existe por causa de um bug real, e a forma dele importa: o app abriu,
 * o servidor subiu, `/health` respondeu `{"ok":true}` — e a janela do painel
 * mostrou `{"message":"Route GET:/ not found"}`. Nada tinha "quebrado". O
 * servidor simplesmente nao registrou a pasta do painel porque ela nao
 * existia no caminho que ele imaginou, e seguiu a vida servindo 404.
 *
 * Um servidor que sobe pela metade e pior que um que nao sobe: quem esta ao
 * vivo precisa saber na hora o que fazer, e "Route GET:/ not found" nao diz.
 *
 * A distincao entre pedido EXPLICITO e palpite e o ponto:
 *
 *  - explicito ("me sirva ESTA pasta") e um contrato. Quem passou o caminho
 *    sabia o que estava fazendo; se a pasta nao esta la, o empacotamento esta
 *    errado e o servidor tem que recusar subir.
 *  - palpite (o padrao relativo ao diretorio de trabalho, em desenvolvimento)
 *    e conveniencia. `pnpm dev:server` antes do primeiro build cai aqui, e
 *    ali um aviso basta — ninguem esta ao vivo.
 */

export interface RaizPedida {
  /** Como aparece para quem le o erro: "painel", "cenas". */
  readonly nome: string;
  readonly caminho: string;
  /** Veio de um argumento de linha de comando, nao do palpite padrao. */
  readonly explicito: boolean;
}

export interface ConferenciaDeRaizes {
  /** Impedem o servidor de subir: foram pedidas por nome e nao existem. */
  readonly faltando: readonly RaizPedida[];
  /** So merecem aviso: o palpite de desenvolvimento nao acertou. */
  readonly avisos: readonly RaizPedida[];
}

export function conferirRaizes(
  raizes: readonly RaizPedida[],
  existe: (caminho: string) => boolean,
): ConferenciaDeRaizes {
  const ausentes = raizes.filter((raiz) => !existe(raiz.caminho));
  return {
    faltando: ausentes.filter((raiz) => raiz.explicito),
    avisos: ausentes.filter((raiz) => !raiz.explicito),
  };
}

/** A mensagem que a pessoa vai ler quando o app nao abrir. */
export function explicarRaizFaltando(raiz: RaizPedida): string {
  return (
    `a pasta ${raiz.nome} nao existe em ${raiz.caminho} — ` +
    'o app foi empacotado sem ela, ou foi movido. Reinstale o Stream Kit.'
  );
}
