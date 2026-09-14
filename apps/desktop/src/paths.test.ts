import { describe, expect, it } from 'vitest';

import { localizar } from './paths.js';

describe('localizar', () => {
  it('empacotado busca em Contents/Resources', () => {
    // Dentro do .app o codigo roda de um pacote asar; __dirname aponta para
    // dentro dele e nao serve para achar os arquivos servidos.
    const l = localizar({
      empacotado: true,
      resourcesPath: '/Applications/Stream Kit.app/Contents/Resources',
      dirname: '/Applications/Stream Kit.app/Contents/Resources/app.asar/dist',
    });
    expect(l.servidor).toBe(
      '/Applications/Stream Kit.app/Contents/Resources/server/cli.js',
    );
    expect(l.overlay).toContain('Resources/overlay');
    expect(l.painel).toContain('Resources/panel');
    expect(l.servidor).not.toContain('asar');
  });

  it('em desenvolvimento busca nos pacotes do monorepo', () => {
    const l = localizar({ empacotado: false, dirname: '/repo/apps/desktop/dist' });
    expect(l.servidor).toBe('/repo/packages/server/dist/cli.js');
    expect(l.overlay).toBe('/repo/packages/overlay/dist');
  });

  it('empacotado sem resourcesPath cai no caminho de desenvolvimento', () => {
    const l = localizar({ empacotado: true, dirname: '/repo/apps/desktop/dist' });
    expect(l.servidor).toContain('packages/server');
  });
});
