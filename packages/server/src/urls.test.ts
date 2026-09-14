import { describe, expect, it } from 'vitest';

import { buildUrl, listOverlayUrls, OVERLAY_PATHS } from './urls.js';

describe('buildUrl', () => {
  it('acrescenta o canvas com & quando ja ha query', () => {
    expect(buildUrl('http://x', '/overlay/?scene=brb', 'hd')).toBe(
      'http://x/overlay/?scene=brb&canvas=hd',
    );
  });

  it('acrescenta com ? quando nao ha query', () => {
    expect(buildUrl('http://x', '/overlay/', 'vertical')).toBe(
      'http://x/overlay/?canvas=vertical',
    );
  });
});

describe('listOverlayUrls', () => {
  it('traz uma entrada por cena, com o tamanho do canvas', () => {
    const lista = listOverlayUrls('http://localhost:7373', 'qhd');
    expect(lista).toHaveLength(OVERLAY_PATHS.length);
    for (const item of lista) {
      expect(item.width).toBe(2560);
      expect(item.height).toBe(1440);
      expect(item.url).toContain('canvas=qhd');
    }
  });

  it('vertical inverte as dimensoes', () => {
    const [primeiro] = listOverlayUrls('http://x', 'vertical');
    expect(primeiro?.width).toBe(1080);
    expect(primeiro?.height).toBe(1920);
  });
});
