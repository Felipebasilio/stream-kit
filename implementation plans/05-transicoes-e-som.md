# Etapa 05 — Transições e som

**Entrega:** o salto de percepção. É a etapa que o espectador sente.
**Pré-requisito:** etapas 03 e 04.
**Risco:** médio. Muita coisa aqui é julgamento estético, não correção técnica.

Prioridade 1 e 3 da lista do Felipe.

---

## Transições

### O problema

Corte seco entre cenas é o sinal mais barato de amadorismo que existe. Meio
segundo de animação muda a percepção de produção mais que qualquer detalhe de
layout.

### Como funciona no OBS

Uma transição entre cenas do OBS é um *stinger*: um vídeo com canal alfa que
cobre a tela no meio da troca. O OBS suporta isso nativamente — a gente entrega
o arquivo, ele faz a troca.

Duas rotas possíveis:

| Rota | Como | Vantagem | Desvantagem |
|---|---|---|---|
| **Stinger de vídeo** | gerar `.webm` alfa a partir das nossas animações | nativo do OBS, sem custo de CPU | precisa gerar arquivo, não muda ao vivo |
| **Cena de transição** | uma fonte de navegador por cima que anima sob comando | segue as cores do painel ao vivo | exige coordenar com a troca de cena |

**Decisão:** as duas. Stinger de vídeo para a troca de cena do OBS (é o caso
comum e é o mais barato), e animação de entrada/saída dentro das cenas para
elementos individuais.

### Geração do stinger

Um script do projeto renderiza a animação num navegador sem interface, captura
quadro a quadro e monta um `.webm` com alfa (VP9). Como as cores vêm do estado,
o stinger sai na identidade do momento. Regerar é um comando.

Duração alvo: 400–700ms. Mais que isso irrita quem assiste.

### Animações dentro da cena

Entrada e saída de cada elemento, com escalonamento. Já existe no kit atual
(`rise`), mas sem sistema. Aqui vira token: `enter.fast`, `enter.soft`,
`exit.quick`, com curva e duração definidas em um só lugar.

---

## Som

### Por que importa

A pessoa está olhando pro jogo, não pro canto da tela. Alerta sem som é alerta
que não aconteceu.

### Desenho

**Onde toca:** numa fonte de navegador dedicada, com áudio roteado para o OBS.
Não na cena de alerta visual — separar permite controlar volume no mixer do OBS
sem mexer no overlay.

**Fila com o visual:** som e animação disparam juntos e terminam juntos. Dois
alertas em sequência não podem sobrepor áudio.

**Ducking:** quando um alerta toca, a música de fundo abaixa. Isso não é nosso —
é filtro de *sidechain* no OBS. Nossa parte é documentar como configurar, e
emitir o som num canal separado que permita isso.

**Biblioteca:** o app aceita arquivos do usuário em pasta própria. Não vamos
embarcar sons — direitos autorais de áudio são um problema que não queremos.
O LEIA-ME aponta fontes de som livre.

**Volume por tipo de evento**, ajustável no painel, com teste.

---

## Tarefas

- [ ] Tokens de animação centralizados
- [ ] Cena de transição (fonte de navegador) com animação sob comando
- [ ] Script de geração de stinger `.webm` com alfa a partir do estado
- [ ] Documentar no LEIA-ME como instalar o stinger no OBS
- [ ] Canal de áudio dedicado, com fila sincronizada ao visual
- [ ] Pasta de sons do usuário, com seleção no painel
- [ ] Volume por tipo de evento, com botão de teste
- [ ] Documentar a configuração de ducking no OBS

---

## Núcleo a cobrir (≥ 95%)

- Fila de som: dois alertas seguidos, alerta durante alerta, arquivo ausente,
  arquivo corrompido, volume zero
- Sincronização: som e visual começam no mesmo tique, terminam juntos
- Geração de stinger: duração pedida vs duração do arquivo, canal alfa presente

---

## Definição de pronto

- [ ] Stinger gerado, instalado no OBS, trocando cena de verdade
- [ ] Alerta com som, testado numa gravação — não só no monitor
- [ ] Nenhuma sobreposição de áudio em rajada de 5 alertas
- [ ] Felipe aprova esteticamente. Esse critério é subjetivo de propósito
- [ ] Commit: `Transicoes animadas e sistema de som`

---

## Nota honesta

Essa etapa tem mais julgamento que engenharia. O teste automatizado prova que
não sobrepõe áudio e que o arquivo tem alfa — não prova que ficou bom. Conte
com duas ou três rodadas de ajuste depois de ver no ar.
