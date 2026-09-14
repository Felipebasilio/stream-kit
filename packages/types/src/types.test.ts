import { describe, expect, it } from 'vitest';

import {
  CANVASES,
  CANVAS_IDS,
  DEFAULT_CANVAS_ID,
  MIN_READABLE_UNITS,
  TYPE_SCALE,
  baseUnit,
  isCanvasId,
  resolveCanvas,
} from './canvas.js';
import { createDefaultState } from './defaults.js';
import { EVENT_KINDS, isEventKind } from './events.js';
import { isClientRole } from './protocol.js';
import { CURRENT_SCHEMA_VERSION, SCENE_IDS } from './state.js';

describe('canvas', () => {
  it('todo canvas declarado tem dimensoes coerentes com a orientacao', () => {
    for (const id of CANVAS_IDS) {
      const c = CANVASES[id];
      expect(c.id).toBe(id);
      const esperada = c.width >= c.height ? 'horizontal' : 'vertical';
      expect(c.orientation).toBe(esperada);
    }
  });

  it('o padrao e 1440p, que e o que o YouTube premia com bitrate maior', () => {
    expect(DEFAULT_CANVAS_ID).toBe('qhd');
    expect(CANVASES[DEFAULT_CANVAS_ID].height).toBe(1440);
  });

  it('isCanvasId aceita so o que existe', () => {
    expect(isCanvasId('qhd')).toBe(true);
    expect(isCanvasId('4k')).toBe(false);
    expect(isCanvasId(null)).toBe(false);
    expect(isCanvasId(42)).toBe(false);
  });

  it('resolveCanvas cai no padrao em vez de quebrar a cena no ar', () => {
    expect(resolveCanvas('vertical').id).toBe('vertical');
    expect(resolveCanvas('inventado').id).toBe(DEFAULT_CANVAS_ID);
    expect(resolveCanvas(undefined).id).toBe(DEFAULT_CANVAS_ID);
  });

  it('baseUnit escala junto com a altura', () => {
    expect(baseUnit(CANVASES.hd)).toBeCloseTo(1.08);
    expect(baseUnit(CANVASES.qhd)).toBeCloseTo(1.44);
    // 1440p tem exatamente 4/3 do tamanho de 1080p: o desenho e o mesmo.
    expect(baseUnit(CANVASES.qhd) / baseUnit(CANVASES.hd)).toBeCloseTo(4 / 3);
  });
});

describe('events', () => {
  it('isEventKind aceita so o que existe', () => {
    for (const kind of EVENT_KINDS) expect(isEventKind(kind)).toBe(true);
    expect(isEventKind('boost')).toBe(false);
    expect(isEventKind(undefined)).toBe(false);
  });
});

describe('protocol', () => {
  it('isClientRole aceita so overlay e panel', () => {
    expect(isClientRole('overlay')).toBe(true);
    expect(isClientRole('panel')).toBe(true);
    expect(isClientRole('admin')).toBe(false);
    expect(isClientRole(null)).toBe(false);
  });
});

describe('estado padrao', () => {
  it('nasce na versao atual do formato', () => {
    expect(createDefaultState().schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('traz texto para todas as cenas declaradas', () => {
    const { scenes } = createDefaultState();
    for (const id of SCENE_IDS) {
      expect(scenes[id].title.length).toBeGreaterThan(0);
    }
  });

  it('traz modelo de mensagem para todo tipo de evento', () => {
    const { messages } = createDefaultState().alerts;
    for (const kind of EVENT_KINDS) {
      expect(messages[kind]).toContain('{user}');
    }
  });

  it('devolve uma instancia nova a cada chamada', () => {
    const a = createDefaultState();
    const b = createDefaultState();
    a.brand.name = 'MUDOU';
    expect(b.brand.name).toBe('SEU CANAL');
  });

  it('o canvas de previa e um canvas valido', () => {
    expect(isCanvasId(createDefaultState().previewCanvas)).toBe(true);
  });
});

describe('escala tipografica', () => {
  it('nenhum tamanho da escala fica abaixo do piso de legibilidade', () => {
    for (const [nome, unidades] of Object.entries(TYPE_SCALE)) {
      expect(unidades, `${nome} abaixo do piso`).toBeGreaterThanOrEqual(
        MIN_READABLE_UNITS,
      );
    }
  });

  it('o piso em pixels e razoavel em cada canvas', () => {
    const piso = (id: 'hd' | 'qhd' | 'vertical'): number =>
      MIN_READABLE_UNITS * baseUnit(CANVASES[id]);
    expect(piso('hd')).toBeCloseTo(23.76);
    expect(piso('qhd')).toBeCloseTo(31.68);
    // No vertical a altura e maior, entao o piso em pixels sobe junto — e certo:
    // o quadro vertical tambem chega maior no celular.
    expect(piso('vertical')).toBeCloseTo(42.24);
  });
});
