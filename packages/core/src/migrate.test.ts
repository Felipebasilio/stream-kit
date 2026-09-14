import { CURRENT_SCHEMA_VERSION, createDefaultState } from '@stream-kit/types';
import { describe, expect, it } from 'vitest';

import { migrate, migrateFromJson } from './migrate.js';

/** Recorte fiel do state.json que o kit em Python gera. */
const ESTADO_V0 = {
  brand: {
    name: 'CANAL DO FELIPE',
    accent: '#8b5cf6',
    accent2: '#c4b5fd',
    bg1: '#0a0614',
    bg2: '#3b1a6b',
    textFont: 'Anton',
    intensity: 0.8,
  },
  scenes: {
    starting: { kicker: 'A LIVE ESTÁ', title: 'COMEÇANDO', note: 'Já já' },
    brb: { kicker: 'VOLTO EM', title: 'INSTANTES', note: '' },
    ending: { kicker: 'A LIVE ESTÁ', title: 'ACABANDO', note: '' },
  },
  socialsLabel: 'ME SEGUE LÁ',
  socials: [{ icon: 'twitch', handle: 'felipe', show: true }],
  countdown: { enabled: false, endsAt: 0, label: 'COMEÇA EM' },
};

describe('migrate v0 (Python) para v1', () => {
  it('preserva o que o usuario ja tinha configurado', () => {
    const { state } = migrate(ESTADO_V0);
    expect(state.brand.name).toBe('CANAL DO FELIPE');
    expect(state.brand.accent).toBe('#8b5cf6');
    expect(state.brand.intensity).toBe(0.8);
    expect(state.scenes.starting.title).toBe('COMEÇANDO');
    expect(state.socials).toHaveLength(1);
  });

  it('renomeia textFont para titleFont e avisa', () => {
    const { state, warnings } = migrate(ESTADO_V0);
    expect(state.brand.titleFont).toBe('Anton');
    expect(state.brand).not.toHaveProperty('textFont');
    expect(warnings.join(' ')).toContain('titleFont');
  });

  it('completa campos que o v0 nao tinha', () => {
    const { state } = migrate(ESTADO_V0);
    expect(state.alerts.messages.chat).toBeTruthy();
    expect(state.previewCanvas).toBe('qhd');
    expect(state.ingame.camLabel).toBeTruthy();
  });

  it('marca a versao de origem e de destino', () => {
    const { from, to } = migrate(ESTADO_V0);
    expect(from).toBe(0);
    expect(to).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('sobrevive a um v0 sem a chave brand', () => {
    const { state, warnings } = migrate({ socialsLabel: 'OI' });
    expect(state.socialsLabel).toBe('OI');
    expect(state.brand.name).toBe('SEU CANAL');
    expect(warnings).toEqual([]);
  });

  it('nao renomeia se titleFont ja existir', () => {
    const { state } = migrate({
      brand: { textFont: 'Antigo', titleFont: 'Novo' },
    });
    expect(state.brand.titleFont).toBe('Novo');
  });
});

describe('migrate de estados ja versionados', () => {
  it('v1 passa intacto', () => {
    const atual = createDefaultState();
    const { state, from, warnings } = migrate(atual);
    expect(from).toBe(CURRENT_SCHEMA_VERSION);
    expect(state).toEqual(atual);
    expect(warnings).toEqual([]);
  });

  it('v1 incompleto ganha os campos que faltam', () => {
    const { state } = migrate({ schemaVersion: 1, brand: { name: 'X' } });
    expect(state.brand.name).toBe('X');
    expect(state.alerts.duration).toBe(5000);
  });

  it('versao do futuro volta ao padrao com aviso, em vez de quebrar', () => {
    const { state, warnings } = migrate({ schemaVersion: 99, brand: { name: 'X' } });
    expect(state.brand.name).toBe('SEU CANAL');
    expect(warnings.join(' ')).toContain('mais novo');
  });
});

describe('migrate com entrada ruim', () => {
  it.each([
    ['null', null],
    ['numero', 42],
    ['texto', 'nada disso'],
    ['indefinido', undefined],
  ])('%s volta ao padrao com aviso', (_nome, entrada) => {
    const { state, from, warnings } = migrate(entrada);
    expect(from).toBe(-1);
    expect(state).toEqual(createDefaultState());
    expect(warnings).toHaveLength(1);
  });

  it('schemaVersion nao numerico e tratado como v0', () => {
    const { from } = migrate({ schemaVersion: 'um', brand: { name: 'X' } });
    expect(from).toBe(0);
  });

  it('schemaVersion NaN e tratado como v0', () => {
    const { from } = migrate({ schemaVersion: Number.NaN });
    expect(from).toBe(0);
  });
});

describe('migrateFromJson', () => {
  it('le um arquivo valido', () => {
    const { state } = migrateFromJson(JSON.stringify(ESTADO_V0));
    expect(state.brand.name).toBe('CANAL DO FELIPE');
  });

  it('arquivo corrompido nao lanca excecao', () => {
    const { state, warnings } = migrateFromJson('{ isso nao e json');
    expect(state).toEqual(createDefaultState());
    expect(warnings.join(' ')).toContain('corrompido');
  });

  it('arquivo vazio volta ao padrao', () => {
    const { state } = migrateFromJson('');
    expect(state).toEqual(createDefaultState());
  });
});
