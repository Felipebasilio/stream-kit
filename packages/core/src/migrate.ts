/**
 * Migracao de estado entre versoes do formato.
 *
 * O `state.json` do kit em Python nao tem versao nenhuma. Tratamos ausencia
 * de `schemaVersion` como v0 e subimos dali. Toda migracao futura entra como
 * mais uma funcao pura nesta lista.
 */

import {
  CURRENT_SCHEMA_VERSION,
  createDefaultState,
  type StreamKitState,
} from '@stream-kit/types';

import { deepMerge } from './merge.js';

export interface MigrationResult {
  readonly state: StreamKitState;
  /** Versao encontrada no arquivo lido. */
  readonly from: number;
  readonly to: number;
  /** Avisos legiveis: campo desconhecido, valor fora da faixa, arquivo ilegivel. */
  readonly warnings: readonly string[];
}

function detectVersion(raw: unknown): number {
  if (typeof raw !== 'object' || raw === null) return -1;
  const version = (raw as Record<string, unknown>)['schemaVersion'];
  return typeof version === 'number' && Number.isFinite(version) ? version : 0;
}

/**
 * v0 (Python) para v1.
 *
 * O que muda de verdade:
 *  - `brand.textFont` passou a se chamar `brand.titleFont`
 *  - `alerts.messages` ganhou a chave `chat`
 *  - o estado ganhou `previewCanvas`
 *
 * Tudo que o v0 nao tinha vem do padrao, porque o objetivo e nao perder o que
 * o Felipe ja configurou, e nao reproduzir o formato antigo.
 */
function migrateV0ToV1(raw: Record<string, unknown>): {
  state: StreamKitState;
  warnings: string[];
} {
  const warnings: string[] = [];
  const source: Record<string, unknown> = { ...raw };

  const brand = source['brand'];
  if (typeof brand === 'object' && brand !== null) {
    const b: Record<string, unknown> = { ...(brand as Record<string, unknown>) };
    if (typeof b['textFont'] === 'string' && b['titleFont'] === undefined) {
      b['titleFont'] = b['textFont'];
      warnings.push('brand.textFont foi renomeado para brand.titleFont');
    }
    delete b['textFont'];
    source['brand'] = b;
  }

  const state = deepMerge(createDefaultState(), source);
  return { state: { ...state, schemaVersion: 1 }, warnings };
}

/**
 * Leva qualquer estado conhecido ate a versao atual.
 * Entrada ilegivel nao lanca excecao: volta o padrao com um aviso, porque
 * perder a configuracao e ruim, mas o app nao abrir e pior.
 */
export function migrate(raw: unknown): MigrationResult {
  const from = detectVersion(raw);

  if (from === -1) {
    return {
      state: createDefaultState(),
      from,
      to: CURRENT_SCHEMA_VERSION,
      warnings: ['estado ilegivel ou vazio; usando o padrao de fabrica'],
    };
  }

  if (from > CURRENT_SCHEMA_VERSION) {
    return {
      state: createDefaultState(),
      from,
      to: CURRENT_SCHEMA_VERSION,
      warnings: [
        `estado na versao ${String(from)}, mais novo que a suportada ` +
          `(${String(CURRENT_SCHEMA_VERSION)}); usando o padrao de fabrica`,
      ],
    };
  }

  const record = raw as Record<string, unknown>;

  if (from === 0) {
    const { state, warnings } = migrateV0ToV1(record);
    return { state, from, to: CURRENT_SCHEMA_VERSION, warnings };
  }

  // Ja esta na versao atual: so completa campos que faltarem.
  return {
    state: deepMerge(createDefaultState(), record),
    from,
    to: CURRENT_SCHEMA_VERSION,
    warnings: [],
  };
}

/** Le texto de arquivo com tolerancia a JSON quebrado. */
export function migrateFromJson(text: string): MigrationResult {
  try {
    return migrate(JSON.parse(text));
  } catch {
    return {
      state: createDefaultState(),
      from: -1,
      to: CURRENT_SCHEMA_VERSION,
      warnings: ['arquivo de estado corrompido; usando o padrao de fabrica'],
    };
  }
}
