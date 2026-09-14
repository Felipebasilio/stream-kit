/**
 * Onde mora o state.json.
 *
 * Descoberto por um teste de paridade: o CLI resolvia o caminho a partir da
 * pasta do proprio codigo. Dentro de um `.app` do macOS isso e SOMENTE
 * LEITURA — o app subiria e nao conseguiria salvar nada.
 *
 * Ordem de precedencia:
 *   1. `--state <caminho>`
 *   2. variavel STREAM_KIT_STATE
 *   3. pasta de dados do usuario, por sistema
 */

import { homedir } from 'node:os';
import { join } from 'node:path';

export interface ResolveStateOptions {
  readonly argv?: readonly string[];
  readonly env?: Record<string, string | undefined>;
  readonly platform?: NodeJS.Platform;
  readonly home?: string;
}

export const APP_DIR_NAME = 'StreamKit';

export function userDataDir(
  platform: NodeJS.Platform,
  home: string,
  env: Record<string, string | undefined> = {},
): string {
  if (platform === 'darwin') {
    return join(home, 'Library', 'Application Support', APP_DIR_NAME);
  }
  if (platform === 'win32') {
    return join(env['APPDATA'] ?? join(home, 'AppData', 'Roaming'), APP_DIR_NAME);
  }
  return join(
    env['XDG_CONFIG_HOME'] ?? join(home, '.config'),
    APP_DIR_NAME.toLowerCase(),
  );
}

export function resolveStatePath(options: ResolveStateOptions = {}): string {
  const argv = options.argv ?? [];
  const env = options.env ?? {};
  const platform = options.platform ?? process.platform;
  const home = options.home ?? homedir();

  const indice = argv.indexOf('--state');
  const doArgumento = indice >= 0 ? argv[indice + 1] : undefined;
  if (doArgumento !== undefined && doArgumento.length > 0) return doArgumento;

  const doAmbiente = env['STREAM_KIT_STATE'];
  if (doAmbiente !== undefined && doAmbiente.length > 0) return doAmbiente;

  return join(userDataDir(platform, home, env), 'state.json');
}

export function resolvePort(argv: readonly string[], padrao: number): number {
  const indice = argv.indexOf('--port');
  if (indice < 0) return padrao;
  const bruto = Number(argv[indice + 1]);
  if (!Number.isInteger(bruto) || bruto < 1 || bruto > 65535) return padrao;
  return bruto;
}
