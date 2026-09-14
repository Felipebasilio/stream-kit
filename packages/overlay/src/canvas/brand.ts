/**
 * Aplica a identidade visual como variaveis CSS.
 *
 * Peca que faltava e que o teste de ponta a ponta do painel encontrou: as
 * cenas usavam `var(--accent)` mas ninguem preenchia essas variaveis a partir
 * do estado. Como o padrao do CSS era igual ao padrao do estado, TUDO PARECIA
 * FUNCIONAR — inclusive nas imagens de referencia. Trocar a cor no painel
 * simplesmente nao tinha efeito nenhum na cena.
 */

import type { Brand } from '@stream-kit/types';

export interface EstiloAlvo {
  setProperty(nome: string, valor: string): void;
}

export function applyBrand(alvo: EstiloAlvo, brand: Brand): void {
  alvo.setProperty('--accent', brand.accent);
  alvo.setProperty('--accent-2', brand.accent2);
  alvo.setProperty('--bg-1', brand.bg1);
  alvo.setProperty('--bg-2', brand.bg2);
  alvo.setProperty('--intensity', String(brand.intensity));
  alvo.setProperty('--title-font', `'${brand.titleFont}', 'Impact', sans-serif`);
}
