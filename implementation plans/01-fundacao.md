# Etapa 01 — Fundação do monorepo

**Entrega:** base TypeScript tipada e testável. Nada visível para o usuário.
**Pré-requisito:** nenhum.
**Risco:** baixo. Nenhum código em produção é tocado.

---

## Por que essa etapa existe

Hoje o formato do estado existe em três lugares por acordo tácito: escrito no
Python, no painel e no `bus.js`. Errar um nome só aparece ao vivo. Essa etapa
transforma esse acordo em contrato verificado pelo compilador.

---

## Estrutura alvo

```
stream-kit/
├── packages/
│   ├── types/          contrato compartilhado — a peça central
│   ├── core/           lógica pura: store, merge, fila, relógio
│   ├── server/         processo Node (etapa 02)
│   ├── overlay/        cenas React (etapa 03)
│   └── panel/          painel React (etapa 04)
├── apps/
│   └── desktop/        empacotamento Mac (etapa 06)
├── implementation plans/
└── legacy-python/      kit atual, preservado e funcional
```

`core` é separado de `server` de propósito: lógica pura, sem rede e sem
sistema de arquivos, é o que dá para cobrir a 95% sem dor.

---

## Ferramentas

| Papel | Escolha | Por quê |
|---|---|---|
| Workspace | pnpm workspaces | rápido, sem hoisting confuso |
| Linguagem | TypeScript `strict` | `strict` desde o dia zero; ligar depois é penoso |
| Teste | Vitest | mesma configuração do Vite, sem duplicar build |
| Cobertura | `@vitest/coverage-v8` | thresholds que falham o comando |
| Visual e E2E | Playwright | já usado para validar as cenas |
| Lint | ESLint + Prettier | sem discussão de estilo em revisão |

---

## O contrato de tipos

`packages/types` define, entre outros:

- **`StreamKitState`** — a árvore inteira: marca, cenas, redes, contagem,
  configuração de alerta. Versionada com `schemaVersion`.
- **`Canvas`** — `{ width, height, orientation }`. Os alvos nomeados:
  `hd` 1920x1080, `qhd` 2560x1440, `vertical` 1080x1920.
- **`StreamEvent`** — o modelo normalizado que entra agora sem adaptador:
  ```ts
  type StreamEvent = {
    id: string            // idempotência
    platform: Platform    // 'manual' por enquanto
    kind: 'follow' | 'sub' | 'donation' | 'raid' | 'chat'
    user: string
    amount?: string
    message?: string
    at: number
  }
  ```
- **`StatePatch`** — patch parcial profundo, tipado.
- **`ServerMessage` / `ClientMessage`** — o protocolo do WebSocket.

Regra: **nenhum `any` e nenhum campo opcional sem motivo escrito em
comentário.** Opcional demais é como o formato apodrece.

---

## Migração do estado atual

O `state.json` de hoje não tem versão. A migração:

1. Ler o arquivo antigo, sem `schemaVersion`.
2. Tratar como `v0` e aplicar a função `migrate_v0_to_v1`.
3. Gravar já versionado, preservando backup do original.

Toda migração futura segue o mesmo padrão: função pura, testada com o arquivo
real de antes e o esperado de depois.

---

## Tarefas

- [ ] `pnpm-workspace.yaml` e `package.json` raiz com scripts (`build`, `test`,
      `test:coverage`, `lint`, `typecheck`)
- [ ] `tsconfig.base.json` com `strict`, `noUncheckedIndexedAccess`,
      `exactOptionalPropertyTypes`
- [ ] `packages/types` com o contrato completo e nenhuma dependência
- [ ] `packages/core` com: `deepMerge`, `applyPatch`, `migrate`, `EventQueue`
- [ ] Vitest configurado com threshold de 95% falhando o comando
- [ ] ESLint + Prettier, com regra proibindo `any` explícito
- [ ] Mover o kit Python para `legacy-python/`, **mantendo ele funcional**
- [ ] Atualizar o LEIA-ME explicando que o Python segue usável durante a migração

---

## Núcleo a cobrir (≥ 95%)

- `deepMerge` — objetos aninhados, arrays substituindo por inteiro, `null`,
  chave nova, chave removida, profundidade grande
- `applyPatch` — patch vazio, patch que não muda nada, patch conflitante
- `migrate` — v0 sem versão, v1 já migrado, arquivo corrompido, arquivo vazio
- `EventQueue` — ordem, deduplicação por `id`, limite de tamanho,
  agrupamento de repetidos, descarte do mais antigo quando estoura

---

## Definição de pronto

- [ ] `pnpm test:coverage` passa com ≥ 95% em `core` e `types`
- [ ] `pnpm typecheck` sem erro
- [ ] `pnpm lint` sem aviso
- [ ] `cd legacy-python && python3 server.py` ainda sobe e serve as cenas
- [ ] Commit: `Fundacao: monorepo TypeScript com tipos compartilhados`

---

## Armadilhas conhecidas

- **`strict` depois é tarde.** Ligar no fim significa consertar tudo de uma vez.
- **Threshold que não falha não é threshold.** Configurar o Vitest para sair com
  erro abaixo de 95%, não só reportar.
- **Mover o Python sem quebrar.** Os caminhos dentro do `server.py` são
  relativos ao arquivo. Testar depois de mover, não antes.
