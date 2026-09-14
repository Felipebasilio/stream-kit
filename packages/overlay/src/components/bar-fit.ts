/**
 * Quem cede espaco na barra inferior do canvas vertical.
 *
 * Em 1080px de largura, um @ longo — uma URL de convite do Discord, por
 * exemplo — e o relogio nao cabem juntos. O texto ja esta no piso de
 * legibilidade (22u), entao encolher a fonte nao e opcao: ou o @ e cortado no
 * meio, ou alguem sai.
 *
 * Sai o relogio. Quem assiste no celular ja tem a hora na propria tela do
 * telefone, tres centimetros acima; o @ e a unica peca da barra que existe
 * para ganhar seguidor. Cortar o @ pela metade nao informa nem a hora nem o
 * endereco.
 *
 * No horizontal cabem os dois, e nada disso se aplica.
 */

export const LIMITE_ARROBA_VERTICAL = 18;

export function mostrarRelogio({
  showClock,
  orientation,
  handles,
}: {
  readonly showClock: boolean;
  readonly orientation: string;
  readonly handles: readonly string[];
}): boolean {
  if (!showClock) return false;
  if (orientation !== 'vertical') return true;
  const maior = handles.reduce((max, h) => Math.max(max, h.length), 0);
  return maior <= LIMITE_ARROBA_VERTICAL;
}
