# Etapa 06 — App de Mac

**Entrega:** ícone na pasta Aplicativos, clicar e tudo sobe. Sem terminal.
**Pré-requisito:** etapas 02, 03 e 04.
**Risco:** médio, e o risco está quase todo na atualização — não no empacotamento.

---

## O que o app precisa fazer

1. Aparecer em `/Aplicativos` e abrir com um clique
2. Subir o servidor Node sozinho, escolhendo porta livre
3. Mostrar o painel numa janela
4. Ficar na barra de menus com as URLs para copiar e um botão de sair
5. Encerrar limpo, sem deixar processo órfão nem perder a última edição
6. Aceitar melhorias nossas ao longo do tempo

---

## A descoberta que muda o plano

Verifiquei a documentação e o resultado é decisivo para a decisão D6
(app não assinado):

> **electron-builder:** "macOS application must be signed in order for auto
> updating to work."

Ou seja: **com Electron e sem conta Apple, a atualização automática não
funciona.** Não é difícil, é impossível pelo caminho padrão — o Squirrel valida
a assinatura antes de aplicar.

O Tauri é diferente: o atualizador dele usa **chave própria** (esquema
minisign), não a assinatura da Apple. Baixa um `.tar.gz` do bundle, confere
contra a chave pública embutida e substitui. Não depende da Apple.

---

## Três caminhos

| | A. Electron + aviso | B. Tauri + atualizador próprio | C. Electron + assinatura |
|---|---|---|---|
| Atualização | manual, com aviso no app | automática | automática |
| Custo | zero | zero | US$ 99/ano |
| Node embutido | sim, nativo | não — precisa de *sidecar* | sim |
| Complexidade de build | baixa | média (Rust + sidecar) | baixa |
| Código sensível nosso | nenhum | nenhum | nenhum |
| Gatekeeper na instalação | avisa | avisa | não avisa |

### Recomendação: comece pelo A

O raciocínio é desconfortável mas honesto: **esse app tem um usuário.** Montar
atualização automática para uma pessoa é resolver um problema de distribuição
que você não tem. E o caminho que parece esperto — a gente mesmo baixar e
trocar arquivos de código — significa eu escrever, do zero, um mecanismo que
executa código baixado da internet na sua máquina. Errar ali é execução remota
de código no seu Mac. Não vale o risco para economizar um arrastar de ícone.

Então: o app **verifica** se há versão nova, avisa na barra de menus, e abre a
página do release. Você arrasta o novo app. Trinta segundos, algumas vezes por
mês.

**Quando migrar para o B ou C:** se a frequência de atualização incomodar, ou
se outra pessoa começar a usar o app. Aí o custo se justifica. O plano fica
escrito aqui para quando esse dia chegar.

---

## Quem constrói

Um app de macOS só se constrói no macOS. Meus dois shells são Linux — **eu não
consigo gerar o `.app`.** Duas saídas:

1. **Felipe roda `pnpm package` no Mac.** Um comando, saída em `dist/`.
2. **GitHub Actions com runner macOS** constrói e publica no Releases.
   Grátis em repositório público; em repositório privado consome minutos de
   macOS, que são caros. Vale checar antes de ligar.

Começamos pelo 1. O 2 entra junto com o B ou C, se chegarmos lá.

---

## Sobre o Gatekeeper

App não assinado: na primeira abertura o macOS bloqueia. O contorno é clicar
com o botão direito no app e escolher *Abrir*, e depois confirmar. Uma vez por
instalação.

Isso vai no LEIA-ME com print. É a parte feia da decisão D6 e é melhor você
saber antes de estranhar.

---

## Tarefas

- [ ] `apps/desktop` com Electron + TypeScript
- [ ] Processo principal sobe o servidor Node como filho e gerencia o ciclo
- [ ] Seleção de porta livre, repassada para a janela e para o menu
- [ ] Janela do painel
- [ ] Item na barra de menus: URLs com copiar, abrir painel, sair
- [ ] Encerramento: mata o filho, faz flush do estado, sem órfão
- [ ] Abrir ao fazer login (opcional, ligável nas preferências)
- [ ] Verificação de versão nova contra a API do GitHub, com aviso
- [ ] `pnpm package` gerando `.dmg`
- [ ] LEIA-ME com o passo do Gatekeeper

---

## Núcleo a cobrir (≥ 95%)

- Ciclo do processo filho: sobe, cai sozinho, é morto, porta ocupada
- Encerramento: com edição pendente, com servidor travado, com janela fechada
- Verificação de versão: versão igual, maior, menor, API fora do ar,
  resposta malformada

---

## Definição de pronto

- [ ] `.dmg` instalado em `/Aplicativos` numa conta limpa do Mac
- [ ] Abrir, usar, fechar, reabrir — estado preservado
- [ ] Nenhum processo Node sobrando depois de fechar (conferir no Monitor de Atividade)
- [ ] Fechar o app durante uma edição não perde a edição
- [ ] Aviso de versão nova aparece quando há release mais recente
- [ ] Commit: `App de Mac com servidor embutido`

---

## Armadilhas conhecidas

- **Processo órfão.** Electron fechando sem matar o filho deixa o Node rodando
  e a porta presa. Na reabertura, porta ocupada e confusão. Testar de verdade.
- **Caminho dos recursos.** Dentro do `.app` os caminhos mudam. `__dirname`
  aponta para dentro do `asar`. Os arquivos estáticos precisam ficar fora.
- **Sono do Mac.** Fechar a tampa no meio da live e reabrir: o servidor
  sobrevive, mas as conexões WebSocket caem. O overlay precisa reconectar
  sozinho — isso já é requisito da etapa 03.
