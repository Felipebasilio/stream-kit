# Stream Kit

Overlays de live para OBS, 100% locais, com edição ao vivo.
Sem plataforma online, sem mensalidade, sem inglês travado.

---

## Estado atual

O projeto está sendo migrado de Python para Node + TypeScript.
**As duas versões coexistem** — a antiga continua funcionando enquanto a nova
é construída.

|                          | Onde             | Serve para              |
| ------------------------ | ---------------- | ----------------------- |
| **Versão em uso**        | `legacy-python/` | transmitir hoje         |
| **Versão em construção** | `packages/`      | o app de Mac que vem aí |

### Para transmitir agora

```bash
cd legacy-python
python3 server.py
```

O painel abre em `http://localhost:7373/`.
Detalhes em [`legacy-python/LEIA-ME.md`](legacy-python/LEIA-ME.md).

### Para desenvolver a versão nova

```bash
corepack enable pnpm     # só na primeira vez
pnpm install
pnpm check               # tipos + lint + testes com cobertura
pnpm dev:server          # sobe o servidor Node
```

O estado fica em `~/Library/Application Support/StreamKit/state.json`.
Para usar outro arquivo: `--state <caminho>` ou a variável `STREAM_KIT_STATE`.

---

## Estrutura

```
packages/
  types/    contrato compartilhado entre servidor, painel e cenas
  core/     lógica pura: merge, migração, fila de eventos, contagem
  server/   processo Node: estado, WebSocket, API
scripts/
  verificações de paridade e resistência
legacy-python/
  kit em Python, funcional
implementation plans/
  um plano por etapa, com tarefas e critério de pronto
```

O ponto da migração está em `packages/types`: hoje o formato do estado existia
em três lugares por acordo tácito, e errar um nome só aparecia ao vivo. Agora
errar quebra a compilação.

---

## Planos

Comece por [`implementation plans/00-visao-geral.md`](implementation%20plans/00-visao-geral.md),
que registra as decisões tomadas e por quê. As etapas seguem numeradas.

| Etapa                  | Situação  |
| ---------------------- | --------- |
| 01 — Fundação          | concluída |
| 02 — Servidor Node     | a fazer   |
| 03 — Overlays e canvas | a fazer   |
| 04 — Painel            | a fazer   |
| 05 — Transições e som  | a fazer   |
| 06 — App de Mac        | a fazer   |
| 90 — Integração Kick   | parqueada |

---

## Qualidade

```bash
pnpm check          # tipos + lint + testes com cobertura
pnpm paridade       # compara o servidor Node com o Python, campo a campo
pnpm resistencia    # Ctrl+C não perde edição, SIGKILL não corrompe o arquivo
```

Piso de 95% em linhas, ramos, funções e comandos no núcleo — configurado para
**falhar** o comando abaixo disso, não só reportar.

Cobertura de linha não se aplica a componente de apresentação: as cenas serão
medidas por comparação de imagem, a partir da etapa 03.
