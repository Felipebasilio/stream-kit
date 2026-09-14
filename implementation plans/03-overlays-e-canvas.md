# Etapa 03 — Overlays em React e sistema de canvas

**Entrega:** as cenas rodando em 1920x1080, 2560x1440 e 1080x1920, legíveis no
celular, com áreas seguras respeitadas.
**Pré-requisito:** etapas 01 e 02.
**Risco:** alto. É a etapa que define se o projeto sustenta crescimento ou vira
um pântano de layouts duplicados.

Essa é a etapa mais importante do projeto inteiro.

---

## O problema central

O kit atual tem pixels cravados: `left: 48px`, `width: 480px`, `font-size: 26px`.
Em 2560x1440 tudo fica pequeno demais e no lugar errado. A saída errada é
manter três folhas de estilo. A saída certa:

### Unidade relativa à altura

```css
:root { --u: calc(var(--canvas-height) / 1000); }
```

Todo tamanho vira múltiplo de `--u`. Um título de `120u` mede 120px em 1080p e
160px em 1440p — proporcionalmente idêntico. Uma cena, N resoluções.

### Orientação, não resolução

Horizontal e vertical são **layouts diferentes**, não escalas diferentes. Mesmo
componente, mesmos dados, arranjo distinto. A resolução dentro de cada
orientação é só escala.

```
OverlayScene
├── layout horizontal  → 1920x1080, 2560x1440
└── layout vertical    → 1080x1920
```

---

## Legibilidade no celular

**O piso:** nenhum texto abaixo de `18u`. Em 1440p isso é 26px, o que reduzido
para a largura de um celular ainda se lê.

**O teste que prova:** cada screenshot de cena é reamostrado para 360px de
largura e comparado. Se o texto não se lê a 360px, não se lê no celular de
ninguém. Isso vira teste automatizado, não avaliação no olho.

**Contraste:** todo texto sobre fundo variável precisa de sombra ou plano de
fundo próprio. Gameplay claro atrás de texto branco é o modo mais comum de
tornar um overlay inútil.

---

## Áreas seguras

Os players cobrem partes do seu vídeo. Guias visíveis no modo de edição,
invisíveis na transmissão:

| Região | Quem cobre | Margem sugerida |
|---|---|---|
| Rodapé | controles do player | 8% da altura |
| Topo direito | título e opções | 6% |
| Lateral direita (vertical) | botões de interação | 15% da largura |

Nada essencial dentro dessas faixas. O sistema avisa em tempo de
desenvolvimento quando um elemento invade.

---

## O overlay nunca fica preto

Ao receber estado, o overlay grava uma cópia em `localStorage`. Ao abrir, pinta
imediatamente a cópia e só então conecta. Se o servidor estiver fora, a cena
continua desenhando o último estado bom.

Indicador de desconexão? **Não na transmissão.** Só no modo de edição.
O espectador nunca deve ver um aviso de erro nosso.

---

## Orçamento de desempenho

Cada cena tem teto medido, não estimado:

| Métrica | Teto |
|---|---|
| Tempo de script por frame | < 2ms |
| Elementos animados simultâneos | ≤ 20 |
| Propriedades animadas | só `transform` e `opacity` |
| Repaint por segundo em repouso | 0 fora das animações |

Animar `left`, `width`, `box-shadow` ou `filter` está proibido: força layout ou
paint a cada frame. Medido com o painel de desempenho, registrado no plano.

---

## Tarefas

- [ ] `packages/overlay` com Vite + React + TS
- [ ] Sistema de unidade `--u` e provedor de canvas via query (`?canvas=qhd`)
- [ ] Tokens de design lidos do estado, aplicados como variáveis CSS
- [ ] Cenas portadas: `fullscreen` (3 variações), `ingame`, `talking`, `alerts`
- [ ] Layout vertical de cada cena
- [ ] Guias de área segura no modo de edição
- [ ] Cache local do último estado
- [ ] Linter de CSS proibindo animar propriedade que causa layout
- [ ] Suíte de screenshot: 6 cenas x 3 canvas = 18 imagens de referência
- [ ] Suíte de legibilidade: as mesmas 18 reduzidas a 360px

---

## Definição de pronto

- [ ] As 18 imagens de referência aprovadas visualmente por Felipe
- [ ] Nenhum texto ilegível na versão de 360px
- [ ] Nenhum elemento essencial dentro de área insegura
- [ ] Servidor desligado no meio: a cena continua desenhando
- [ ] Orçamento de desempenho medido e dentro do teto, nas três resoluções
- [ ] Testado no OBS de verdade, nas três resoluções
- [ ] Commit: `Overlays em React independentes de resolucao`

---

## Armadilhas conhecidas

- **Escalar o vertical a partir do horizontal.** Tentador e sempre feio. São
  layouts diferentes.
- **`vh`/`vw` no OBS.** A fonte de navegador define o viewport, então até
  funciona — mas quebra na hora de testar em janela de tamanho diferente.
  A unidade `--u` derivada de prop explícita é previsível.
- **Fonte carregando depois do primeiro quadro.** Provoca salto de layout no ar.
  `font-display: block` e medir só depois de `document.fonts.ready`.
