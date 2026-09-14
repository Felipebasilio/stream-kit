/**
 * Identidades salvas.
 *
 * Trocar de "live de codigo" para "live de jogo" e uma coisa que acontece
 * entre uma transmissao e outra. Reeditar quatro cores toda vez e o tipo de
 * atrito que faz a pessoa desistir de personalizar.
 */

import type { Brand, Preset } from '@stream-kit/types';

export function criarPreset(nome: string, brand: Brand, id?: string): Preset {
  return {
    id: id ?? `preset-${String(Date.now())}-${Math.random().toString(36).slice(2, 7)}`,
    name: nome.trim(),
    brand: { ...brand },
  };
}

/** Salva ou substitui pelo nome. Nome repetido atualiza em vez de duplicar. */
export function salvarPreset(
  lista: readonly Preset[],
  nome: string,
  brand: Brand,
): Preset[] {
  const limpo = nome.trim();
  if (limpo.length === 0) return [...lista];
  const existente = lista.find((p) => p.name.toLowerCase() === limpo.toLowerCase());
  if (existente !== undefined) {
    return lista.map((p) =>
      p.id === existente.id ? criarPreset(limpo, brand, p.id) : p,
    );
  }
  return [...lista, criarPreset(limpo, brand)];
}

export function removerPreset(lista: readonly Preset[], id: string): Preset[] {
  return lista.filter((p) => p.id !== id);
}

export function aplicarPreset(lista: readonly Preset[], id: string): Brand | undefined {
  return lista.find((p) => p.id === id)?.brand;
}
