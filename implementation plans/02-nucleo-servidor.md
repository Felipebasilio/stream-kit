# Etapa 02 — Núcleo do servidor em Node

**Entrega:** paridade funcional com o `server.py`, em TypeScript.
**Pré-requisito:** etapa 01.
**Risco:** baixo. O Python continua de pé em paralelo.

---

## Escolhas

| Item         | Escolha                        | Alternativa descartada                               |
| ------------ | ------------------------------ | ---------------------------------------------------- |
| HTTP         | Fastify                        | `node:http` puro — testável demais na mão            |
| Tempo real   | WebSocket (`ws`)               | SSE — unidirecional, e o painel vai precisar receber |
| Persistência | JSON em disco, escrita atômica | SQLite — peso desnecessário para um objeto           |

### Por que WebSocket e não SSE

O SSE de hoje resolve bem "servidor empurra". Mas o painel vai precisar
receber de volta: confirmação de gravação, estado de conexão, e no futuro
eventos de plataforma. Bidirecional agora evita reescrever depois.

---

## Componentes

**`StateStore`** — dono do estado.
Aplica patch, persiste com escrita atômica (`tmp` + `rename`), emite para os
assinantes. Grava com _debounce_ para não escrever em disco a cada tecla.
Nunca perde a última escrita: ao encerrar, faz _flush_.

**`Hub`** — registro de conexões.
Assinantes tipados por papel (`overlay` ou `panel`). Envio com backpressure:
cliente lento não pode segurar o processo. Cliente que não responde a ping sai.

**`EventBus`** — a fila de eventos.
Já existe em `core` desde a etapa 01. Aqui ela ganha a ponte com o Hub.
Sem adaptador de plataforma: a única fonte por enquanto é o painel.

**`clock`** — tempo injetável.
Contagem regressiva usa `endsAt` absoluto, nunca `setInterval` acumulado.
Injetável para o teste não depender de esperar de verdade.

---

## API

```
GET  /api/state              estado atual
POST /api/state              patch parcial
POST /api/event              dispara um evento (manual, por ora)
POST /api/countdown          inicia ou para
WS   /ws?role=overlay|panel  canal em tempo real
GET  /health                 vivo?
```

Todas as entradas validadas contra o tipo antes de tocar no estado. Entrada
malformada devolve 400 com o motivo — não 500, e nunca aceita silenciosamente.

---

## O que precisa ser melhor que o Python

1. **Debounce acumulativo no servidor também.** O bug que corrigimos no painel
   (patch cancelando patch) tem o mesmo formato do lado do servidor se a
   gravação for otimizada sem cuidado. Teste explícito para isso.
2. **Backpressure.** Hoje uma fila cheia derruba o cliente silenciosamente.
   Deve fechar com código e motivo, e o cliente reconecta.
3. **Encerramento limpo.** `SIGTERM` e `SIGINT`: para de aceitar, faz flush do
   estado, fecha as conexões com código normal. Sem isso o app de Mac perde a
   última edição ao fechar.
4. **Porta ocupada.** Procurar a próxima livre e **anunciar qual escolheu**, em
   vez de morrer. O app de Mac depende disso.

---

## Tarefas

- [ ] `StateStore` com escrita atômica, debounce e flush no encerramento
- [ ] `Hub` com papéis, ping/pong e backpressure
- [ ] Rotas Fastify com validação de entrada
- [ ] Servidor de arquivos estáticos para os builds de overlay e painel
- [ ] Seleção automática de porta livre, com anúncio
- [ ] Encerramento gracioso
- [ ] Script de paridade: roda os dois servidores e compara as respostas

---

## Núcleo a cobrir (≥ 95%)

- `StateStore`: patch aplicado, debounce agrupando, flush ao encerrar,
  disco cheio, JSON corrompido na leitura, escrita concorrente
- `Hub`: assina, desassina, cliente lento, cliente morto, broadcast só para o
  papel certo
- Rotas: entrada válida, entrada malformada, corpo vazio, corpo gigante
- `countdown`: início, parada, término natural, mudança de relógio do sistema
- Porta: livre, ocupada, várias ocupadas em sequência

---

## Definição de pronto

- [ ] Cobertura ≥ 95% em `packages/server`
- [ ] Os overlays antigos (HTML do Python) funcionam contra o servidor Node
      com um adaptador mínimo — prova de paridade
- [ ] Encerrar com Ctrl+C não perde a última edição
- [ ] Matar o processo no meio de uma escrita não corrompe o `state.json`
- [ ] Commit: `Servidor Node com paridade funcional`
