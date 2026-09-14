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

### Cenas no OBS

Fonte de navegador, com a resolução do canvas escolhido:

```
http://localhost:7373/overlay/?scene=starting&canvas=qhd
http://localhost:7373/overlay/?scene=brb&canvas=qhd
http://localhost:7373/overlay/?scene=ending&canvas=qhd
http://localhost:7373/overlay/?scene=ingame&canvas=qhd
http://localhost:7373/overlay/?scene=talking&canvas=qhd
http://localhost:7373/overlay/?scene=alerts&canvas=qhd
http://localhost:7373/overlay/?scene=audio&canvas=qhd
```

`canvas` aceita `hd` (1920x1080), `qhd` (2560x1440) e `vertical` (1080x1920).
Acrescente `&edit=1` para ver as guias das áreas que o player cobre — nunca
deixe isso ligado na transmissão.

### Som

A cena `audio` não mostra nada — ela só toca. Adicione como fonte de navegador
e deixe numa trilha de áudio própria no OBS.

Sem arquivo escolhido, o app toca um **tom sintetizado**: nada de áudio é
embarcado, para não criar problema de direito autoral, e mesmo assim o alerta
não nasce mudo. Para usar sons seus, coloque os arquivos em:

```
~/Library/Application Support/StreamKit/sons/
```

e recarregue o painel — eles aparecem na lista de cada tipo de evento.

**Abaixar a música quando o alerta toca** (ducking) é filtro do OBS, não nosso:

1. No mixer, clique no engrenagem da fonte de música → _Filtros_
2. Adicione **Compressor**
3. Em _Fonte de cadeia lateral/Ducking_, escolha a fonte de áudio do Stream Kit
4. Proporção 10:1, limiar em torno de −30 dB

### Transição

Dois caminhos, e os dois funcionam:

- **Cena de navegador** (`&hold=0`, o padrão): o painel dispara pelo botão
  _Tocar agora_ e a cortina passa por cima de qualquer cena aberta. Segue as
  cores da identidade ao vivo — coisa que um arquivo de vídeo pronto não faz.
- **Stinger de vídeo**: `pnpm stinger` gera um `.webm` com canal alfa a partir
  da mesma animação. No OBS: _Transições → + → Stinger_. É o caminho nativo
  para a troca de cena, e custa zero CPU durante a live. Precisa de `ffmpeg`
  (`brew install ffmpeg`); regenere depois de mudar as cores.

**Onde posicionar a webcam** (em unidades do canvas, multiplique pela altura/1000):

| Cena    | Orientação | x   | y           | largura | altura |
| ------- | ---------- | --- | ----------- | ------- | ------ |
| ingame  | horizontal | 44u | rodapé 120u | 460u    | 259u   |
| ingame  | vertical   | 30u | 90u         | resto   | 340u   |
| talking | horizontal | 84u | 130u        | 1092u   | 614u   |
| talking | vertical   | 30u | 90u         | resto   | 380u   |

---

## Estrutura

```
apps/
  desktop/  app de macOS (Electron): sobe tudo com um clique
packages/
  types/    contrato compartilhado entre servidor, painel e cenas
  core/     lógica pura: merge, migração, fila de eventos, contagem
  server/   processo Node: estado, WebSocket, API
  overlay/  cenas em React, independentes de resolução
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

## O app de Mac

```bash
pnpm dmg     # gera release/Stream Kit-0.1.0-arm64.dmg
```

Isso só roda **no macOS** — não dá para construir um app de macOS em outro
sistema. Abra o `.dmg` e arraste o Stream Kit para a pasta Aplicativos.

### Na primeira abertura o macOS vai bloquear

O app **não é assinado** (decisão D6: sem conta Apple Developer, US$ 99/ano).
Então:

1. Clique com o **botão direito** no app → **Abrir**
2. Na caixa que aparece, clique em **Abrir** de novo

Uma vez por instalação. Depois, clique duplo normal.

### Atualizações

O app avisa quando há versão nova e abre a página do release; você baixa e
arrasta por cima. **Não** há atualização automática, e isso é deliberado: no
macOS ela exige assinatura, e o substituto caseiro seria um mecanismo que baixa
e executa código na sua máquina — risco que não vale a economia de um arrastar.
Suas configurações ficam fora do app e sobrevivem à troca.

O plano [`06-app-mac.md`](implementation%20plans/06-app-mac.md) documenta os
caminhos B e C, para o dia em que isso incomodar.

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
pnpm cenas          # captura as 18 imagens e verifica legibilidade e áreas seguras
```

O `pnpm cenas` precisa do Chromium do Playwright uma vez:

```bash
pnpm exec playwright install chromium
```

Piso de 95% em linhas, ramos, funções e comandos no núcleo — configurado para
**falhar** o comando abaixo disso, não só reportar.

Cobertura de linha não se aplica a componente de apresentação: as cenas serão
medidas por comparação de imagem, a partir da etapa 03.
