/**
 * Sons do usuario.
 *
 * O app nao embarca nenhum arquivo de audio: direitos autorais de som sao um
 * problema que nao precisamos ter, e o tom sintetizado ja resolve o basico.
 * Quem quiser som proprio joga os arquivos nesta pasta.
 */

import { extname } from 'node:path';

export const EXTENSOES = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac']);

export function ehArquivoDeSom(nome: string): boolean {
  return EXTENSOES.has(extname(nome).toLowerCase());
}

export function listarSons(entradas: readonly string[]): string[] {
  return entradas
    .filter((nome) => !nome.startsWith('.'))
    .filter(ehArquivoDeSom)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
