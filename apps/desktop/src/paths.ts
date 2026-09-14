/**
 * Onde estao as coisas, dentro do app empacotado e fora dele.
 *
 * Dentro de um `.app` os arquivos ficam em `Contents/Resources`, e o codigo
 * roda de dentro de um pacote `asar` — `__dirname` aponta para dentro dele.
 * Errar isso e o modo classico de o app funcionar em desenvolvimento e quebrar
 * na primeira instalacao.
 */

import { join } from 'node:path';

export interface LocalizacaoOpcoes {
  /** `process.resourcesPath` quando empacotado. */
  readonly resourcesPath?: string | undefined;
  /** Pasta do arquivo em execucao. */
  readonly dirname: string;
  readonly empacotado: boolean;
}

export interface Localizacao {
  readonly servidor: string;
  readonly overlay: string;
  readonly painel: string;
}

export function localizar(opcoes: LocalizacaoOpcoes): Localizacao {
  if (opcoes.empacotado && opcoes.resourcesPath !== undefined) {
    return {
      servidor: join(opcoes.resourcesPath, 'server', 'cli.js'),
      overlay: join(opcoes.resourcesPath, 'overlay'),
      painel: join(opcoes.resourcesPath, 'panel'),
    };
  }
  // Em desenvolvimento: apps/desktop/dist -> raiz do monorepo
  const raiz = join(opcoes.dirname, '..', '..', '..');
  return {
    servidor: join(raiz, 'packages', 'server', 'dist', 'cli.js'),
    overlay: join(raiz, 'packages', 'overlay', 'dist'),
    painel: join(raiz, 'packages', 'panel', 'dist'),
  };
}
