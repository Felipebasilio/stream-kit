# Etapa 04 — Painel de controle em React

**Entrega:** o painel atual, reescrito, com preview fiel e sem os defeitos que
já conhecemos.
**Pré-requisito:** etapas 01, 02 e 03.
**Risco:** médio. É a peça que você usa ao vivo, com uma mão.

---

## O que muda em relação ao painel de hoje

O painel atual funciona, mas tem três problemas estruturais:

1. **Preview em `iframe` escalado** mostra o canvas de 1920 reduzido. Com três
   resoluções, isso precisa virar seletor de canvas de verdade.
2. **Sem desfazer.** Errou o texto ao vivo, digitou de novo na pressa.
3. **Sem presets.** Trocar de identidade entre "live de código" e "live de jogo"
   hoje é editar campo por campo.

---

## Estrutura

```
panel/
├── state/        conexão WS, patch otimista, fila de envio
├── sections/     identidade, cenas, redes, contagem, alertas
├── preview/      canvas selecionável com guias de área segura
└── presets/      salvar, carregar, duplicar identidade
```

**Patch otimista com reconciliação:** a mudança aparece na hora no preview e é
enviada em pacote acumulado. Se o servidor recusar, reverte e avisa. O bug de
patch cancelando patch, que corrigimos no Python, aqui não pode renascer —
tem teste dedicado.

---

## Funcionalidades

| Seção | O que faz |
|---|---|
| Identidade | nome, 4 cores, paletas prontas, intensidade, fonte |
| Cenas | textos das telas cheias, por cena |
| Contagem | rótulo, minutos, atalhos de 5/10/15, parar |
| Redes | ligar, desligar, reordenar por arrastar, trocar @ |
| In-game | etiqueta, jogando agora, letreiro, o que mostrar |
| Papo | título e tópicos |
| Alertas | textos, duração, posição, disparo manual |
| Presets | salvar identidade inteira com nome, trocar num clique |
| Preview | seletor de canvas, guias de área segura, régua de 360px |

**Desfazer e refazer** com `Cmd+Z` / `Cmd+Shift+Z`, com histórico de 50 passos.

**Régua de 360px:** um botão que mostra o preview no tamanho de um celular.
Não é enfeite — é o jeito de você conferir legibilidade sem esperar o teste.

---

## Ergonomia ao vivo

O painel é usado com atenção dividida. Então:

- Ações destrutivas (restaurar padrões, apagar preset) pedem confirmação
- O estado de conexão é visível sem precisar procurar
- Disparo de alerta manual tem confirmação visual de que saiu
- Nada de modal que bloqueia enquanto você está ao vivo

---

## Tarefas

- [ ] `packages/panel` com Vite + React + TS
- [ ] Camada de estado com patch otimista e fila acumulativa
- [ ] Todas as seções acima
- [ ] Desfazer e refazer
- [ ] Presets de identidade, persistidos no estado
- [ ] Preview com seletor de canvas e guias
- [ ] Régua de 360px
- [ ] Testes E2E: mudar campo, ver overlay refletir, desfazer, ver voltar

---

## Núcleo a cobrir (≥ 95%)

- Fila de envio: dois campos na mesma janela, campo repetido, servidor fora,
  reconexão com fila pendente
- Histórico de desfazer: limite, ramificação após desfazer, desfazer de um
  patch que veio do servidor
- Presets: salvar, aplicar, apagar, nome duplicado, preset corrompido

---

## Definição de pronto

- [ ] Cobertura ≥ 95% na camada de estado do painel
- [ ] E2E cobrindo mudar, desfazer, trocar preset
- [ ] Usado por Felipe numa live real antes de considerar fechado
- [ ] Commit: `Painel de controle em React`
