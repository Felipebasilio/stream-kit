# Stream Kit — Visão Geral

Documento guarda-chuva. Registra as decisões tomadas, os princípios que valem
para todas as etapas e o critério do que conta como "pronto".

Última atualização: 2026-09-14

---

## Objetivo

Um app de Mac que entrega overlays de live para o OBS com edição ao vivo,
identidade visual personalizável e qualidade de produção que o espectador
percebe — sem depender de plataforma online, assinatura ou internet.

O critério final não é técnico: **o espectador tem que gostar de assistir.**
Toda decisão de escopo passa por essa pergunta.

---

## Decisões tomadas

| #   | Decisão                  | Escolha                                 | Motivo                                                                     |
| --- | ------------------------ | --------------------------------------- | -------------------------------------------------------------------------- |
| D1  | Linguagem                | Node + TypeScript                       | Ecossistema de streaming, tipos compartilhados entre as três pontas        |
| D2  | Framework de UI          | React + Vite                            | Painel tem muito estado de formulário; Vite dá hot reload no overlay       |
| D3  | Next.js                  | Descartado                              | SSR não ajuda: o overlay carrega uma vez e vive horas. Custo sem ganho     |
| D4  | Integração de plataforma | **Adiada**                              | Começar a transmitir já. Kick entra quando a audiência justificar          |
| D5  | Túnel vs relay           | **Não se aplica agora**                 | Consequência de D4. Quando voltar: túnel + ouvinte dedicado (ver plano 90) |
| D6  | Assinatura do app        | Não assinado                            | Sem conta Apple Developer. Custo: aviso do Gatekeeper na instalação        |
| D7  | Canvas vertical no OBS   | Aitum, por ora                          | Decisão do Felipe, reversível. Não é dependência do nosso código           |
| D8  | Resolução                | Múltipla, sem layout duplicado          | 2560x1440 e 1920x1080 horizontais, 1080x1920 vertical                      |
| D9  | Métrica de teste         | 95% no núcleo + screenshot nos overlays | Cobertura de linha em JSX de overlay não pega os bugs que doem             |
| D10 | Modelo de evento         | Entra na fundação, sem adaptadores      | Barato agora, caro de retrofitar depois                                    |

---

## Escopo

**Dentro, agora:**
monorepo TypeScript, servidor Node, overlays em React independentes de
resolução, painel de controle ao vivo, transições animadas, legibilidade em
celular, som, áreas seguras, templates vertical e horizontal, app de Mac com
auto-atualização.

**Fora, por ora:**
integração com Kick/YouTube/TikTok, chat na tela, metas automáticas,
alertas disparados por plataforma, obs-websocket, atalhos globais.

**Nunca:**
telemetria, conta na nuvem, dependência de servidor externo para o overlay
funcionar.

---

## Princípios de arquitetura

1. **O overlay nunca pode ficar preto.** Se o servidor cair no meio da live, a
   cena continua desenhando o último estado conhecido, do cache local. Isso é
   requisito, não melhoria.

2. **Uma fonte de verdade para os tipos.** `packages/types` é importado pelo
   backend, pelo painel e pelos overlays. Mudança de formato quebra a
   compilação, não a live.

3. **Um desenho, N resoluções.** Nada de layout duplicado por resolução.
   Tamanhos em unidade relativa à altura do canvas; variação só entre
   orientações (horizontal e vertical), não entre resoluções.

4. **Animação é CSS, nunca estado do React.** Re-render dirigindo animação
   engasga, e engasgo aparece na gravação.

5. **Orçamento de desempenho é requisito.** Cada cena tem um teto de custo por
   frame. Medido, não estimado. Frame derrubado estraga a experiência mais do
   que qualquer overlay bonito conserta.

6. **O que é do usuário fica com o usuário.** Estado, identidade visual e
   assets em pasta local dele. Segredos, quando existirem, no Keychain.

---

## Definição de pronto

Uma etapa só está pronta quando **todos** os itens valem:

- [ ] Funciona no OBS de verdade, não só no navegador
- [ ] Cobertura do núcleo daquela etapa em 95% ou mais
- [ ] Testes de screenshot passando nas três resoluções alvo
- [ ] Nenhum erro de tipo, nenhum aviso de lint
- [ ] Documentado no LEIA-ME se muda algo para o usuário
- [ ] Commit feito

---

## Qualidade: as três camadas

| Camada        | O que cobre                                            | Ferramenta            | Alvo                        |
| ------------- | ------------------------------------------------------ | --------------------- | --------------------------- |
| Unitário      | tipos, store, fila de eventos, normalização, reconexão | Vitest                | ≥ 95% linha e branch        |
| Visual        | cada cena, em cada resolução, em cada orientação       | Playwright screenshot | zero diferença não aprovada |
| Ponta a ponta | painel muda → overlay reflete                          | Playwright            | fluxos principais           |

Cobertura de linha **não** se aplica a componente de apresentação. Overlay se
mede por imagem.

---

## Fluxo de trabalho

1. Uma etapa por vez, na ordem dos planos.
2. Ao fim da etapa: Claude faz o commit, Felipe faz o push.
   ```bash
   cd ~/Documents/Projetos/stream-kit && git push
   ```
   (Claude não tem chave SSH na máquina — de propósito.)
3. Felipe valida no OBS antes de seguir para a próxima.

---

## Ordem das etapas e o que cada uma entrega

| Plano | Etapa              | O que você ganha ao terminar                     |
| ----- | ------------------ | ------------------------------------------------ |
| 01    | Fundação           | Nada visível. Base tipada e testável             |
| 02    | Núcleo do servidor | Paridade com o Python, em Node                   |
| 03    | Overlays e canvas  | Cenas em 1440p e vertical, legíveis no celular   |
| 04    | Painel             | Edição ao vivo com preview de verdade            |
| 05    | Transições e som   | O salto de percepção de qualidade                |
| 06    | App de Mac         | Clicar e abrir, sem terminal, com atualização    |
| 90    | Integração Kick    | Parqueado. Retomar quando a audiência justificar |

**O kit Python continua funcionando durante toda a migração.** Use nas lives.
Ele só sai de cena quando a etapa 03 estiver validada por você no OBS.
