/**
 * Icones do usuario.
 *
 * O app so embarca glifos genericos: os logotipos oficiais sao marca
 * registrada e cada plataforma tem sua propria regra de uso. Quem quiser o
 * logo de verdade baixa o SVG na pagina de imprensa da plataforma e joga
 * nesta pasta — mesma ideia da pasta de sons.
 */

import { extname } from 'node:path';

export const EXTENSOES_ICONE = new Set(['.svg', '.png', '.webp']);

export function ehArquivoDeIcone(nome: string): boolean {
  return EXTENSOES_ICONE.has(extname(nome).toLowerCase());
}

export function listarIcones(entradas: readonly string[]): string[] {
  return entradas
    .filter((nome) => !nome.startsWith('.'))
    .filter(ehArquivoDeIcone)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
