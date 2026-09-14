/**
 * Mesclagem profunda de patch no estado.
 *
 * Duas regras que parecem detalhe e nao sao:
 *
 * 1. ARRAY E SUBSTITUIDO POR INTEIRO. Mesclar array por indice faz o item
 *    removido "sobreviver" no fim da lista. Foi assim que a lista de redes
 *    sociais poderia ganhar fantasmas ao apagar uma linha.
 *
 * 2. NAO MUTA A ENTRADA. O estado antigo continua valido, o que permite
 *    desfazer no painel sem copiar a arvore inteira a cada tecla.
 */

/**
 * Chaves que nunca podem ser escritas a partir de um patch vindo da rede.
 *
 * `JSON.parse('{"__proto__":{...}}')` cria `__proto__` como propriedade
 * PROPRIA, entao ela aparece em `Object.keys`. Atribuir essa chave num objeto
 * comum dispara o setter e TROCA O PROTOTIPO do objeto, fazendo o estado
 * herdar propriedades que ninguem declarou. O painel fala com o servidor por
 * HTTP, logo isso e superficie de ataque real, nao teoria.
 */
const CHAVES_PROIBIDAS = new Set(['__proto__', 'constructor', 'prototype']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  if (Array.isArray(value)) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Devolve uma copia de `base` com `patch` aplicado por cima.
 * `undefined` no patch significa "nao mexe"; para apagar, use `null`.
 */
export function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === undefined) return base;
  if (!isPlainObject(patch) || !isPlainObject(base)) {
    return patch as T;
  }

  const result: Record<string, unknown> = { ...base };
  for (const key of Object.keys(patch)) {
    if (CHAVES_PROIBIDAS.has(key)) continue;
    const next = patch[key];
    if (next === undefined) continue;
    const current = result[key];
    result[key] =
      isPlainObject(next) && isPlainObject(current) ? deepMerge(current, next) : next;
  }
  return result as T;
}

/**
 * Junta varios patches num so, preservando a ordem.
 *
 * Existe por causa de um bug real: o painel antigo agendava o envio e cada
 * mudanca nova CANCELAVA a anterior que ainda nao tinha saido. Mexer em dois
 * campos dentro da mesma janela perdia o primeiro em silencio — a tela
 * mostrava o valor certo e o servidor nunca recebia.
 */
export function mergePatches<T extends object>(patches: readonly unknown[]): T {
  return patches.reduce<T>((acc, patch) => deepMerge(acc, patch), {} as T);
}

/** Comparacao estrutural, para o painel nao enviar patch que nao muda nada. */
export function isDeepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => isDeepEqual(item, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((k) => Object.hasOwn(b, k) && isDeepEqual(a[k], b[k]));
  }
  return false;
}
