/**
 * Decide QUAL som tocar, com que volume, para um evento.
 *
 * Separado da Web Audio API de proposito: aqui esta a regra, e regra se testa.
 * O barulho em si e amarracao de navegador.
 */

import type { AlertConfig, EventKind, QueuedEvent } from '@stream-kit/types';

/** Tom sintetizado por tipo de evento. Sem arquivo, sem direito autoral. */
export interface Tom {
  /** Frequencias tocadas em sequencia, em hertz. */
  readonly notas: readonly number[];
  /** Duracao de cada nota, em segundos. */
  readonly duracao: number;
  readonly onda: OscillatorType;
}

const TONS: Record<EventKind, Tom> = {
  // Sobe: alguem chegou.
  follow: { notas: [523.25, 783.99], duracao: 0.11, onda: 'sine' },
  // Sobe mais longe: assinatura vale mais que um follow.
  sub: { notas: [523.25, 659.25, 987.77], duracao: 0.12, onda: 'triangle' },
  // Quatro notas, a mais alta no fim: dinheiro merece destaque.
  donation: { notas: [659.25, 783.99, 987.77, 1318.51], duracao: 0.1, onda: 'triangle' },
  // Grave e largo: chegou gente.
  raid: { notas: [329.63, 392.0, 523.25], duracao: 0.15, onda: 'sawtooth' },
  // Curto e discreto: chat nao pode competir com a fala.
  chat: { notas: [880], duracao: 0.05, onda: 'sine' },
};

export interface PlanoDeSom {
  /** Caminho do arquivo, quando o usuario escolheu um. */
  readonly arquivo?: string;
  /** Tom sintetizado, quando nao ha arquivo. */
  readonly tom?: Tom;
  readonly volume: number;
}

export function tomDe(kind: EventKind): Tom {
  return TONS[kind];
}

/**
 * Limita a faixa valida.
 *
 * NaN vira silencio (nao existe valor). Infinito e apenas grampeado, porque ai
 * existe intencao de direcao: +Infinity e "o mais alto", -Infinity e "o mais
 * baixo". Tratar os dois como silencio esconderia um erro de configuracao.
 */
export function normalizarVolume(valor: number): number {
  if (Number.isNaN(valor)) return 0;
  return Math.min(1, Math.max(0, valor));
}

export function planejarSom(
  config: AlertConfig,
  evento: QueuedEvent,
  pastaDeSons = '/sons/',
): PlanoDeSom | undefined {
  if (!config.soundEnabled) return undefined;
  const som = config.sounds[evento.kind];
  const volume = normalizarVolume(som.volume);
  if (volume === 0) return undefined;
  if (som.file.length > 0) {
    return { arquivo: `${pastaDeSons}${encodeURIComponent(som.file)}`, volume };
  }
  return { tom: tomDe(evento.kind), volume };
}
