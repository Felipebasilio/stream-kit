/**
 * Onde mora o icone que o usuario escolheu.
 *
 * No estado guardamos so o nome do arquivo, igual aos sons: o servidor e quem
 * sabe onde a pasta fica no disco, e isso muda entre o app instalado e o
 * monorepo. Mas o campo existe desde antes de existir a pasta servida, e a
 * documentacao antiga mandava escrever um caminho a mao no `state.json` — quem
 * fez isso continua funcionando.
 */

export function resolverIcone(arquivo: string): string {
  const nome = arquivo.trim();
  if (nome.length === 0) return '';
  // Ja e um caminho ou uma URL: respeita o que o usuario escreveu.
  if (nome.startsWith('/') || nome.startsWith('.') || /^[a-z][a-z0-9+.-]*:/i.test(nome)) {
    return nome;
  }
  return `/icones/${encodeURIComponent(nome)}`;
}
