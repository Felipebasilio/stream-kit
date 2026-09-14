/**
 * Dono do estado. Aplica patch, persiste e avisa quem estiver ouvindo.
 *
 * Tres cuidados que so aparecem em uso real:
 *
 * - ESCRITA ATOMICA: grava num temporario e renomeia. Matar o processo no meio
 *   de uma gravacao nao pode deixar um state.json pela metade, porque o app
 *   nao abriria na proxima vez.
 * - DEBOUNCE ACUMULATIVO: digitar um texto dispara dezenas de patches. Agrupa
 *   antes de tocar o disco, mas NUNCA descartando nenhum — foi assim que o
 *   painel em Python perdia alteracao em silencio.
 * - FLUSH NO FIM: fechar o app tem que gravar o que estava pendente.
 */

import {
  createDefaultState,
  type StatePatch,
  type StreamKitState,
} from '@stream-kit/types';
import { deepMerge, isDeepEqual, migrateFromJson } from '@stream-kit/core';

/** So o que a store usa do sistema de arquivos, para o teste poder fingir. */
export interface FileSystemLike {
  readFile(path: string, encoding: 'utf8'): Promise<string>;
  writeFile(path: string, data: string, encoding: 'utf8'): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
}

export interface StateStoreOptions {
  readonly filePath: string;
  readonly fs: FileSystemLike;
  /** Quanto esperar antes de gravar, agrupando alteracoes seguidas. */
  readonly writeDelayMs?: number;
  readonly onWarning?: (message: string) => void;
}

export type StateListener = (state: StreamKitState) => void;

export class StateStore {
  private state: StreamKitState = createDefaultState();
  private readonly listeners = new Set<StateListener>();

  private timer: ReturnType<typeof setTimeout> | undefined;
  private writing: Promise<void> | undefined;
  private dirty = false;
  private closed = false;

  private readonly filePath: string;
  private readonly fs: FileSystemLike;
  private readonly writeDelayMs: number;
  private readonly onWarning: (message: string) => void;

  constructor(options: StateStoreOptions) {
    this.filePath = options.filePath;
    this.fs = options.fs;
    this.writeDelayMs = options.writeDelayMs ?? 150;
    this.onWarning = options.onWarning ?? ((): void => {});
  }

  /** Le do disco e migra. Arquivo ausente ou quebrado vira o padrao de fabrica. */
  async load(): Promise<void> {
    let text: string;
    try {
      text = await this.fs.readFile(this.filePath, 'utf8');
    } catch {
      this.state = createDefaultState();
      return;
    }
    const { state, warnings } = migrateFromJson(text);
    this.state = state;
    for (const warning of warnings) this.onWarning(warning);
  }

  get(): StreamKitState {
    return this.state;
  }

  /**
   * Aplica um patch. Devolve `false` quando nada mudou, para o servidor nao
   * gastar rede avisando as cenas de uma alteracao que nao existe.
   */
  apply(patch: StatePatch): boolean {
    if (this.closed) return false;
    const next = deepMerge(this.state, patch);
    if (isDeepEqual(next, this.state)) return false;
    this.state = next;
    this.scheduleWrite();
    for (const listener of this.listeners) listener(this.state);
    return true;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private scheduleWrite(): void {
    this.dirty = true;
    if (this.timer !== undefined) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.write();
    }, this.writeDelayMs);
  }

  private async write(): Promise<void> {
    if (!this.dirty) return;
    // Serializa antes de esperar: o que vai pro disco e o estado deste instante.
    const payload = JSON.stringify(this.state, null, 2);
    this.dirty = false;
    const temporario = `${this.filePath}.tmp`;
    const operacao = (async (): Promise<void> => {
      try {
        await this.fs.writeFile(temporario, payload, 'utf8');
        await this.fs.rename(temporario, this.filePath);
      } catch (erro) {
        this.dirty = true;
        this.onWarning(`nao consegui gravar o estado: ${String(erro)}`);
      }
    })();
    this.writing = operacao;
    await operacao;
    if (this.writing === operacao) this.writing = undefined;
  }

  /** Grava agora o que estiver pendente. Chamado ao encerrar. */
  async flush(): Promise<void> {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    await this.writing;
    await this.write();
    await this.writing;
  }

  async close(): Promise<void> {
    await this.flush();
    this.closed = true;
    this.listeners.clear();
  }
}
