/**
 * Ajuste do titulo para caber na largura disponivel.
 *
 * Em portugues as palavras sao mais longas que em ingles ("COMEÇANDO" contra
 * "STARTING"), e o pack original simplesmente estourava. Aqui o titulo reduz
 * sozinho ate caber, em passos previsiveis.
 */

export interface Medivel {
  readonly scrollWidth: number;
  readonly style: { fontSize: string };
}

export function ajustarTitulo(
  elemento: Medivel,
  larguraMaxima: number,
  unidadeBase: number,
  tamanhoInicialUnidades = 200,
  tamanhoMinimoUnidades = 60,
): number {
  let unidades = tamanhoInicialUnidades;
  elemento.style.fontSize = `${String(unidades * unidadeBase)}px`;
  while (elemento.scrollWidth > larguraMaxima && unidades > tamanhoMinimoUnidades) {
    unidades -= 4;
    elemento.style.fontSize = `${String(unidades * unidadeBase)}px`;
  }
  return unidades;
}
