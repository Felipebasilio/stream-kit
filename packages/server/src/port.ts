/**
 * Escolha de porta.
 *
 * O kit em Python morria se a 7373 estivesse ocupada. O app de Mac nao pode
 * fazer isso: ele tem que subir, achar uma porta livre e ANUNCIAR qual foi,
 * porque as URLs do OBS dependem disso.
 */

export interface PortProbe {
  /** Resolve `true` se der para escutar nessa porta. */
  (port: number, host: string): Promise<boolean>;
}

export const DEFAULT_PORT = 7373;
const TENTATIVAS = 20;

export async function findFreePort(
  probe: PortProbe,
  start: number = DEFAULT_PORT,
  host = '127.0.0.1',
): Promise<number> {
  for (let offset = 0; offset < TENTATIVAS; offset++) {
    const port = start + offset;
    if (await probe(port, host)) return port;
  }
  throw new Error(
    `nenhuma porta livre entre ${String(start)} e ${String(start + TENTATIVAS - 1)}`,
  );
}

/** Teste real: tenta escutar e solta em seguida. */
export async function canListen(port: number, host: string): Promise<boolean> {
  const { createServer } = await import('node:net');
  return new Promise<boolean>((resolve) => {
    const server = createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });
    server.listen(port, host);
  });
}
