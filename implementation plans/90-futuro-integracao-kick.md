# Plano 90 — Integração com a Kick (PARQUEADO)

**Status:** adiado por decisão do Felipe (D4), em 2026-09-14.
**Motivo:** começar a transmitir já. O chat é acompanhado no monitor extra.
**Quando retomar:** quando o volume de interação justificar — quando você
deixar de conseguir acompanhar o chat no monitor sem perder o fio.

Este documento existe para não relitigarmos o que já foi decidido.

---

## O que já está resolvido

**A Kick tem API oficial.** OAuth com refresh, eventos de chat, follows,
subscriptions, `kicks.gifted`, moderação. Cobertura boa.
Documentação: https://github.com/KickEngineering/KickDevDocs

**Entrega só por webhook.** Não há WebSocket. Existe pedido aberto desde
fevereiro de 2025, marcado como planejado, sem data:
https://github.com/KickEngineering/KickDevDocs/issues/20
**Conferir esse issue antes de retomar** — se tiver saído, o plano encolhe pela
metade e some a necessidade de URL pública.

**Transporte escolhido (D5): túnel + ouvinte dedicado.**
`cloudflared` apontando para um processo separado, em porta própria, que faz
uma coisa só: aceitar POST num caminho, conferir a assinatura da Kick, recusar
todo o resto. Cerca de 40 linhas auditáveis.

O painel e os overlays ficam noutra porta, que o túnel nunca alcança. Isso é
essencial: hoje o servidor serve o painel na raiz, e expor isso significaria
qualquer um editando seu overlay ao vivo.

**Relay hospedado foi avaliado e descartado** para o caso atual: na Vercel
grátis a conexão cai a cada 5 minutos e quem recebe o webhook não é quem segura
o WebSocket, o que obrigaria a acrescentar um Redis. Complexidade grande para
um trabalho que o túnel faz direto.

---

## O que já existe pronto quando retomarmos

Da etapa 01, sem custo adicional:

- `StreamEvent` — o modelo normalizado, já usado pelos alertas manuais
- `EventQueue` — fila com deduplicação por `id`, limite e agrupamento
- O caminho evento → alerta na tela, testado e em uso

Falta só o adaptador: traduzir o corpo do webhook da Kick para `StreamEvent`.

---

## O que fazer quando retomar

- [ ] Reconferir o issue 20 — talvez WebSocket já exista e o túnel seja desnecessário
- [ ] App registrado no portal da Kick, OAuth com PKCE
- [ ] Token no Keychain do macOS, **nunca** em arquivo na pasta
- [ ] Ouvinte dedicado de webhook, em porta separada, sem nada além da rota
- [ ] Verificação obrigatória da assinatura da Kick — sem isso qualquer um
      dispara alerta falso na sua live
- [ ] Segredo compartilhado entre o ouvinte e o servidor principal
- [ ] `cloudflared` subindo junto com o app, com URL estável
- [ ] Re-registro automático da URL de callback ao subir, se a API permitir
- [ ] Adaptador Kick → `StreamEvent`
- [ ] Chat na tela (era a prioridade 3 da lista original)
- [ ] Metas automáticas e memória de eventos (prioridade 4)
- [ ] Teste de rajada: 200 eventos em 10 segundos não pode travar nem duplicar

---

## Riscos a lembrar

- **Webhook reentregue** gera alerta duplicado. A deduplicação por `id` já
  resolve, mas precisa de teste com reentrega real.
- **Raid** manda uma rajada. O agrupamento ("+12 seguidores") já está previsto
  na fila, mas nunca foi exercitado com volume.
- **A URL nunca é secreta.** Varredores acham subdomínio aleatório e domínio
  nomeado aparece em log público de certificado. Segurança é a assinatura,
  jamais o sigilo do endereço.
