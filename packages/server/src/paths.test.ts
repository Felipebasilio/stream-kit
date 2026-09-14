import { describe, expect, it } from 'vitest';

import { APP_DIR_NAME, resolvePort, resolveStatePath, userDataDir } from './paths.js';

describe('userDataDir', () => {
  it('no macOS usa Application Support', () => {
    expect(userDataDir('darwin', '/Users/felipe')).toBe(
      `/Users/felipe/Library/Application Support/${APP_DIR_NAME}`,
    );
  });

  it('no Windows usa APPDATA quando existe', () => {
    expect(userDataDir('win32', 'C:\\Users\\f', { APPDATA: 'C:\\Roaming' })).toContain(
      'C:\\Roaming',
    );
  });

  it('no Windows cai em AppData\\Roaming sem a variavel', () => {
    expect(userDataDir('win32', '/home/f', {})).toContain('AppData');
  });

  it('no Linux respeita XDG_CONFIG_HOME', () => {
    expect(userDataDir('linux', '/home/f', { XDG_CONFIG_HOME: '/cfg' })).toBe(
      '/cfg/streamkit',
    );
  });

  it('no Linux cai em ~/.config sem XDG', () => {
    expect(userDataDir('linux', '/home/f', {})).toBe('/home/f/.config/streamkit');
  });
});

describe('resolveStatePath', () => {
  const base = { platform: 'darwin' as NodeJS.Platform, home: '/Users/f' };

  it('o argumento tem prioridade sobre tudo', () => {
    expect(
      resolveStatePath({
        ...base,
        argv: ['node', 'cli.js', '--state', '/tmp/x.json'],
        env: { STREAM_KIT_STATE: '/env.json' },
      }),
    ).toBe('/tmp/x.json');
  });

  it('a variavel de ambiente vem depois do argumento', () => {
    expect(resolveStatePath({ ...base, env: { STREAM_KIT_STATE: '/env.json' } })).toBe(
      '/env.json',
    );
  });

  it('sem nada, usa a pasta de dados do usuario', () => {
    // Nunca dentro do proprio app: no macOS o bundle e somente leitura.
    expect(resolveStatePath(base)).toBe(
      `/Users/f/Library/Application Support/${APP_DIR_NAME}/state.json`,
    );
  });

  it('--state sem valor e ignorado', () => {
    expect(resolveStatePath({ ...base, argv: ['node', 'cli.js', '--state'] })).toContain(
      'Application Support',
    );
  });

  it('variavel vazia e ignorada', () => {
    expect(resolveStatePath({ ...base, env: { STREAM_KIT_STATE: '' } })).toContain(
      'Application Support',
    );
  });

  it('funciona sem nenhuma opcao', () => {
    expect(resolveStatePath()).toContain('state.json');
  });
});

describe('resolvePort', () => {
  it('le --port', () => {
    expect(resolvePort(['node', 'cli.js', '--port', '8080'], 7373)).toBe(8080);
  });

  it.each([
    ['ausente', ['node', 'cli.js']],
    ['sem valor', ['node', 'cli.js', '--port']],
    ['nao numerico', ['node', 'cli.js', '--port', 'abc']],
    ['fracionario', ['node', 'cli.js', '--port', '80.5']],
    ['zero', ['node', 'cli.js', '--port', '0']],
    ['acima do maximo', ['node', 'cli.js', '--port', '70000']],
  ])('%s cai no padrao', (_nome, argv) => {
    expect(resolvePort(argv, 7373)).toBe(7373);
  });
});
