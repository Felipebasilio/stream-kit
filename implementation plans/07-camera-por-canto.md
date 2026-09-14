# 07 — Câmera por canto, layout sem câmera e barra limpa

Status: **implementado**

## O que motivou

Pedido do Felipe, depois das primeiras lives:

1. A moldura da câmera só existia no canto inferior esquerdo. Cada jogo põe
   informação importante num canto diferente.
2. O layout sem câmera já era possível pela caixinha "mostrar câmera", mas
   achar uma caixinha no painel no meio da live não é operável. Ele usa um
   Stream Deck da Fifine.
3. A barra inferior tinha uma faixa em degradê da largura inteira, que comia um
   pedaço do jogo mesmo quando não havia nada escrito.
4. A pílula de redes cortava `@` longo (a URL do Discord) e o ícone não tinha
   respiro.
5. A moldura era 16:9, mas ele recorta a webcam para **280x260** para se
   centralizar.

## Decisões

### A posição é do contrato, não da URL apenas

`ingame.camPosition` entra no `StreamKitState`, com quatro valores. O painel
edita, e a moldura desliza de um canto a outro — `left`/`top` sempre, nunca
`right`/`bottom`, porque `auto` não anima e a transição era um pedido explícito.

### Mas a URL vence o painel

`&cam=` na fonte de navegador fixa a posição, e `&cam=off` esconde.

Isso existe por um motivo específico: **o overlay não consegue mover a webcam**.
A webcam é uma fonte do OBS. Se o único jeito de trocar de layout fosse o
painel, a moldura andaria e a webcam ficaria, o que é pior que não ter a opção.

Com `&cam=`, cada cena do OBS tem a sua moldura e a sua transformação de
webcam. Trocar de cena move as duas juntas, e trocar de cena é a operação que
qualquer Stream Deck sabe fazer — inclusive os que só mandam tecla, via os
atalhos do OBS. Nenhuma linha de servidor precisou existir para isso.

Se o painel pudesse vetar o `cam=`, uma cena pedida ficaria vazia sem
explicação no ar. Por isso `cam=` liga a câmera mesmo com `showCam: false`.

### A proporção da moldura é a do recorte dele

`CAM_ASPECT = 280x260`. Não é um número escolhido por estética: é o recorte que
ele faz na webcam. Uma moldura 16:9 em volta disso obrigaria a esticar o rosto
ou a deixar faixa preta dos dois lados.

A cena de papo segue a mesma proporção, pelo mesmo motivo.

### A faixa da barra sai; a sombra fica

O degradê fazia uma coisa útil — segurar o texto branco sobre um jogo claro — e
uma coisa ruim: cobrir a largura inteira o tempo todo. As duas se separam:
cada peça agora carrega o próprio fundo (a marca tem o chip, os `@` têm a
pílula) e o que é só texto ganha `text-shadow`.

### No vertical, quem cede é o relógio

Um `@` longo e o relógio não cabem juntos em 1080px. A fonte já está no piso de
legibilidade (22u), então encolher não é opção.

Sai o relógio: quem assiste no celular já tem a hora na própria tela, três
centímetros acima. O `@` é a única peça da barra que existe para ganhar
seguidor. A regra virou `bar-fit.ts`, com teste.

## O que mudou

| Arquivo                     | O quê                                              |
| --------------------------- | -------------------------------------------------- |
| `types/state.ts`            | `CamPosition`, `CAM_POSITIONS`, `CAM_ASPECT`        |
| `overlay/canvas/camera.ts`  | quem ganha entre painel e URL                       |
| `overlay/canvas/url.ts`     | `readCamFromUrl`                                    |
| `overlay/components/bar-fit.ts` | quando o relógio cede o lugar                   |
| `overlay/styles/scenes.css` | 4 posições × 2 orientações, barra sem faixa, pílula adaptativa |
| `panel/sections/jogo.tsx`   | os quatro cantos em cruz                            |
| `scripts/camera.mjs`        | a verificação                                       |
| `docs/OBS.md`               | as cinco cenas e os números de transformação        |

## Como isso é verificado

`pnpm camera` sobe o servidor de verdade e mede no navegador, nas três
resoluções:

- a proporção da moldura bate com o recorte da webcam
- cada posição cai no lado e na altura certos **da área visível** — no vertical
  os 15% da direita são dos botões de interação do celular, então "direita" ali
  não é a direita do arquivo
- nada invade o que o player cobre, nem encosta na barra
- `cam=off` some com a moldura e mantém a barra
- `cam=` ignora o painel desligado; sem `cam=`, o painel manda e a moldura
  desliza ao vivo, animada
- o `@` longo aparece inteiro e o ícone tem respiro
- a barra não tem mais `background-image`

## O que ficou de fora

Endpoint HTTP para o Stream Deck chamar. Foi considerado e descartado: o botão
precisaria abrir uma janela de navegador a cada toque, e não resolveria a
webcam — que era o problema de verdade. A troca de cena do OBS resolve os dois
sem código novo no servidor.
