import { createDefaultState } from '@stream-kit/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StateStore, type FileSystemLike } from './state-store.js';

class FsFalso implements FileSystemLike {
  arquivos = new Map<string, string>();
  gravacoes: string[] = [];
  falharEscrita = false;
  leituraErro = false;

  readFile(path: string): Promise<string> {
    const conteudo = this.arquivos.get(path);
    if (this.leituraErro || conteudo === undefined) {
      return Promise.reject(new Error('ENOENT'));
    }
    return Promise.resolve(conteudo);
  }
  writeFile(path: string, data: string): Promise<void> {
    if (this.falharEscrita) return Promise.reject(new Error('disco cheio'));
    this.arquivos.set(path, data);
    return Promise.resolve();
  }
  rename(oldPath: string, newPath: string): Promise<void> {
    const conteudo = this.arquivos.get(oldPath);
    if (conteudo === undefined) return Promise.reject(new Error('ENOENT'));
    this.arquivos.delete(oldPath);
    this.arquivos.set(newPath, conteudo);
    this.gravacoes.push(newPath);
    return Promise.resolve();
  }
}

const CAMINHO = '/dados/state.json';

function criar(fs: FsFalso, avisos: string[] = []): StateStore {
  return new StateStore({
    filePath: CAMINHO,
    fs,
    writeDelayMs: 5,
    onWarning: (m) => avisos.push(m),
  });
}

let fs: FsFalso;
beforeEach(() => {
  fs = new FsFalso();
  vi.useRealTimers();
});

describe('load', () => {
  it('arquivo ausente vira padrao de fabrica', async () => {
    const store = criar(fs);
    await store.load();
    expect(store.get()).toEqual(createDefaultState());
  });

  it('arquivo corrompido nao derruba e avisa', async () => {
    const avisos: string[] = [];
    fs.arquivos.set(CAMINHO, '{ quebrado');
    const store = criar(fs, avisos);
    await store.load();
    expect(store.get()).toEqual(createDefaultState());
    expect(avisos.join(' ')).toContain('corrompido');
  });

  it('migra um estado v0 do Python preservando o que havia', async () => {
    const avisos: string[] = [];
    fs.arquivos.set(
      CAMINHO,
      JSON.stringify({ brand: { name: 'BASA', textFont: 'Anton' } }),
    );
    const store = criar(fs, avisos);
    await store.load();
    expect(store.get().brand.name).toBe('BASA');
    expect(store.get().brand.titleFont).toBe('Anton');
    expect(avisos.join(' ')).toContain('titleFont');
  });
});

describe('apply', () => {
  it('aplica e avisa os assinantes', async () => {
    const store = criar(fs);
    await store.load();
    const vistos: string[] = [];
    store.subscribe((s) => vistos.push(s.brand.name));
    expect(store.apply({ brand: { name: 'NOVO' } })).toBe(true);
    expect(store.get().brand.name).toBe('NOVO');
    expect(vistos).toEqual(['NOVO']);
  });

  it('patch que nao muda nada devolve false e nao avisa ninguem', async () => {
    const store = criar(fs);
    await store.load();
    let chamadas = 0;
    store.subscribe(() => (chamadas += 1));
    expect(store.apply({ brand: { name: 'SEU CANAL' } })).toBe(false);
    expect(chamadas).toBe(0);
  });

  it('desassinar para de receber', async () => {
    const store = criar(fs);
    await store.load();
    let chamadas = 0;
    const cancelar = store.subscribe(() => (chamadas += 1));
    store.apply({ brand: { name: 'A' } });
    cancelar();
    store.apply({ brand: { name: 'B' } });
    expect(chamadas).toBe(1);
  });

  it('depois de fechado nao aceita mais nada', async () => {
    const store = criar(fs);
    await store.load();
    await store.close();
    expect(store.apply({ brand: { name: 'X' } })).toBe(false);
  });
});

describe('persistencia', () => {
  it('grava de forma atomica: escreve em .tmp e renomeia', async () => {
    const store = criar(fs);
    await store.load();
    store.apply({ brand: { name: 'ATOMICO' } });
    await store.flush();
    expect(fs.gravacoes).toEqual([CAMINHO]);
    expect(fs.arquivos.has(`${CAMINHO}.tmp`)).toBe(false);
    const salvo = JSON.parse(fs.arquivos.get(CAMINHO) ?? '{}') as {
      brand: { name: string };
    };
    expect(salvo.brand.name).toBe('ATOMICO');
  });

  it('agrupa alteracoes seguidas numa gravacao so, sem perder a ultima', async () => {
    const store = criar(fs);
    await store.load();
    store.apply({ brand: { name: 'A' } });
    store.apply({ brand: { name: 'B' } });
    store.apply({ scenes: { starting: { title: 'C' } } });
    await store.flush();
    expect(fs.gravacoes).toHaveLength(1);
    const salvo = JSON.parse(fs.arquivos.get(CAMINHO) ?? '{}') as {
      brand: { name: string };
      scenes: { starting: { title: string } };
    };
    // As duas alteracoes sobrevivem: agrupar nao pode significar descartar.
    expect(salvo.brand.name).toBe('B');
    expect(salvo.scenes.starting.title).toBe('C');
  });

  it('flush sem nada pendente nao grava', async () => {
    const store = criar(fs);
    await store.load();
    await store.flush();
    expect(fs.gravacoes).toHaveLength(0);
  });

  it('grava sozinho depois do atraso, sem precisar de flush', async () => {
    const store = criar(fs);
    await store.load();
    store.apply({ brand: { name: 'SOZINHO' } });
    await new Promise((r) => setTimeout(r, 40));
    expect(fs.gravacoes).toHaveLength(1);
  });

  it('falha de escrita avisa e mantem pendente para tentar de novo', async () => {
    const avisos: string[] = [];
    const store = criar(fs, avisos);
    await store.load();
    fs.falharEscrita = true;
    store.apply({ brand: { name: 'X' } });
    await store.flush();
    expect(avisos.join(' ')).toContain('nao consegui gravar');
    fs.falharEscrita = false;
    await store.flush();
    expect(fs.gravacoes).toHaveLength(1);
  });

  it('close grava o que estava pendente', async () => {
    const store = criar(fs);
    await store.load();
    store.apply({ brand: { name: 'FECHANDO' } });
    await store.close();
    expect(fs.gravacoes).toHaveLength(1);
  });

  it('usa o atraso padrao quando nenhum e informado', async () => {
    const store = new StateStore({ filePath: CAMINHO, fs });
    await store.load();
    store.apply({ brand: { name: 'PADRAO' } });
    await store.flush();
    expect(fs.gravacoes).toHaveLength(1);
  });

  it('aviso padrao nao quebra quando nenhum tratador e passado', async () => {
    const store = new StateStore({ filePath: CAMINHO, fs, writeDelayMs: 1 });
    fs.arquivos.set(CAMINHO, '{ quebrado');
    await expect(store.load()).resolves.toBeUndefined();
  });
});
