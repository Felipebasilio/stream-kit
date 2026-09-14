/** A implementacao real de FileSystemLike, usada fora dos testes. */

import { rename, readFile, writeFile } from 'node:fs/promises';

import type { FileSystemLike } from './state-store.js';

export const nodeFs: FileSystemLike = {
  readFile: (path, encoding) => readFile(path, encoding),
  writeFile: (path, data, encoding) => writeFile(path, data, encoding),
  rename: (oldPath, newPath) => rename(oldPath, newPath),
};
