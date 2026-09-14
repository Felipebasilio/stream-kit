/**
 * Conteudo do item da barra de menus.
 *
 * Fica separado do Electron para poder ser testado: o que importa e a LISTA
 * certa de URLs, com a resolucao certa, e nao o desenho do menu.
 */

import { CANVASES, type CanvasId } from '@stream-kit/types';

export interface ItemDeMenu {
  readonly rotulo: string;
  readonly url: string;
  /** O que copiar ao clicar. */
  readonly copiar: string;
}

const CENAS: readonly { id: string; rotulo: string }[] = [
  { id: 'starting', rotulo: 'Começando' },
  { id: 'brb', rotulo: 'Volto já' },
  { id: 'ending', rotulo: 'Encerrando' },
  { id: 'ingame', rotulo: 'Jogando' },
  { id: 'talking', rotulo: 'Papo' },
  { id: 'alerts', rotulo: 'Alertas' },
  { id: 'audio', rotulo: 'Som' },
];

export function montarItens(porta: number, canvas: CanvasId): ItemDeMenu[] {
  const spec = CANVASES[canvas];
  const base = `http://localhost:${String(porta)}`;
  return CENAS.map((cena) => {
    const url = `${base}/overlay/?scene=${cena.id}&canvas=${canvas}`;
    return {
      rotulo: `${cena.rotulo} — ${spec.label}`,
      url,
      copiar: url,
    };
  });
}

export function urlDoPainel(porta: number): string {
  return `http://localhost:${String(porta)}/`;
}
