# Como usar o Stream Kit

Guia de operação: ligar, configurar, salvar e recuperar.
Para conectar no OBS, veja [OBS.md](OBS.md).

---

## 1. Ligar

### Pelo app (o jeito normal)

Abra o **Stream Kit** na pasta Aplicativos. Pronto — ele sobe o servidor
sozinho, abre o painel numa janela e coloca um ícone na barra de menus.

Na **primeira abertura** o macOS bloqueia, porque o app não é assinado:

1. Clique com o **botão direito** no app → **Abrir**
2. Na caixa que aparece, clique em **Abrir** de novo

Uma vez por instalação. Depois, clique duplo normal.

### Pelo terminal (para desenvolver)

```bash
cd ~/Documents/Projetos/stream-kit
pnpm install      # só na primeira vez
pnpm dev:server
```

O painel fica em `http://localhost:7373/`.

> **Se a porta 7373 estiver ocupada**, o servidor procura a próxima livre e
> anuncia qual escolheu. As URLs do OBS mudam junto — é por isso que o painel
> tem o botão de copiar em vez de você decorar o endereço.

---

## 2. O modelo mental

```
  PAINEL  ──WebSocket──▶  SERVIDOR  ──WebSocket──▶  CENAS  ──▶  OBS
(navegador)               (Node)                   (React)   (Browser Source)
                              │
                          state.json
```

Três peças, uma responsabilidade cada:

- **O servidor** é o dono da verdade. Guarda o estado num arquivo e avisa todo
  mundo quando algo muda.
- **As cenas** não sabem de nada. Ficam escutando e redesenham quando o
  servidor manda. É por isso que a mudança é instantânea e não precisa de
  "Atualizar" no OBS.
- **O painel** só manda alterações para o servidor. Ele nunca fala com o OBS.

---

## 3. Onde ficam as suas coisas

```
~/Library/Application Support/StreamKit/
├── state.json      todas as suas configurações
├── sons/           seus arquivos de áudio para os alertas
└── icones/         seus ícones de rede social
```

**Fora do app, de propósito.** Trocar a versão do Stream Kit não mexe em nada
disso. Para fazer backup, copie essa pasta. Para recomeçar do zero, apague o
`state.json` — ele volta ao padrão de fábrica na próxima abertura.

Para usar outro arquivo de estado (útil para testar sem mexer no seu):

```bash
pnpm dev:server -- --state /tmp/teste.json
# ou
STREAM_KIT_STATE=/tmp/teste.json pnpm dev:server
```

---

## 4. Como salvar

**Você não salva. Já está salvo.**

Toda alteração no painel vai para o servidor e é gravada em disco em menos de
um segundo. Não existe botão de salvar porque não existe estado não-salvo.

Três garantias que valem saber, porque foram testadas:

- **Fechar o app grava o que estava pendente.** O app espera o servidor
  terminar de gravar antes de sair.
- **Matar o processo no meio de uma gravação não corrompe o arquivo.** A
  escrita é atômica: grava num temporário e renomeia por cima.
- **Duas alterações rápidas seguidas chegam as duas.** Elas se acumulam num
  pacote só em vez de uma cancelar a outra.

---

## 5. O painel, seção por seção

### Identidade

Nome do canal, quatro cores e a intensidade da animação de fundo.

As **paletas prontas** trocam as quatro cores de uma vez. A paleta **Preto** é
um tema escuro neutro, sem cor dominante.

**Salvar esta identidade como…** guarda o conjunto inteiro com um nome. Serve
para trocar entre "live de código" e "live de jogo" num clique, em vez de
reeditar cor por cor no meio da transmissão.

### Textos das telas cheias

Os três textos de cada cena: a linha pequena de cima, o título grande e o
recado. O título **se ajusta sozinho** para caber na largura — em português as
palavras são longas ("COMEÇANDO" contra "STARTING") e isso estourava no pack
original.

### Contagem regressiva

Começa do instante do fim, não de um contador. Uma cena aberta no meio já
acerta o número, e as cenas nunca dessincronizam entre si.

### Redes sociais

A caixinha liga e desliga cada rede, o `@` é o texto que aparece, e a última
coluna escolhe o ícone.

Os ícones que acompanham o app são **genéricos** — o do TikTok é uma nota
musical, não o logo. Isso é decisão de projeto: os logos oficiais são marca
registrada, cada plataforma tem sua regra de uso, e um app que distribui isso
embutido cria um problema que não precisa existir.

Para usar o logo de verdade:

1. Baixe o SVG (ou PNG) na página de imprensa da plataforma — as marcas
   grandes têm uma: procure por "brand assets" ou "kit de imprensa"
2. Copie o arquivo para `~/Library/Application Support/StreamKit/icones/`
3. Recarregue o painel
4. Na linha da rede, escolha o arquivo na coluna do ícone

Vale saber: o arquivo é desenhado **do jeito que ele é**. Os ícones embutidos
ficam brancos porque o app pinta; um SVG seu chega com as cores dele. Como a
barra é escura, prefira uma versão clara, quadrada e com fundo transparente —
a versão "monocromática branca" do kit de imprensa costuma ser exatamente essa.

### Overlay in-game

Etiqueta da câmera, letreiro e "jogando agora".

> No canvas **vertical** o nome do canal sai da barra inferior. Em 1080px de
> largura não cabem marca, jogando, @ e relógio sem truncar tudo — e o @ já
> identifica o canal, com a vantagem de dizer onde seguir.

### Cena de papo

Título e tópicos, um por linha. No vertical a lista corta com esmaecimento se
não couber, em vez de vazar por cima da barra.

### Alertas e Som

Textos, duração, posição e volume por tipo de evento.

As cenas de **Alertas** e **Som** aparecem vazias na prévia porque só reagem a
eventos. Clique num botão **Testar** e o alerta aparece — na prévia e no OBS.
Hoje a única fonte de eventos são esses botões: a integração com a Kick está
parqueada.

Sem arquivo escolhido, o app toca um **tom sintetizado**: nada de áudio é
embarcado, para não criar problema de direito autoral, e mesmo assim o alerta
não nasce mudo. Para usar sons seus, ponha os arquivos em
`~/Library/Application Support/StreamKit/sons/` e recarregue o painel.

### Transição

Três estilos, duração ajustável e o botão **Tocar agora**. Acima de 700ms
começa a irritar quem assiste — o painel avisa.

---

## 6. Desfazer

`Cmd+Z` desfaz, `Cmd+Shift+Z` refaz. Cinquenta passos de histórico.

Serve exatamente para o que você pensou: errou a digitação ao vivo, volta.

---

## 7. A régua de 360px

No topo da prévia, o botão **Régua 360px** mostra a cena no tamanho que ela
tem num celular.

Use. A maioria assiste no telefone, e um texto que fica lindo no monitor pode
virar um borrão lá. O projeto tem um piso de tamanho de fonte justamente por
isso, mas a régua é o jeito de conferir na hora.

O botão **Guias** liga as faixas vermelhas que marcam onde o player da
plataforma cobre o seu vídeo. **Nunca deixe as guias ligadas transmitindo** —
elas só aparecem com `&edit=1` na URL, então basta não usar esse parâmetro nas
fontes do OBS.

---

## 8. Quando algo dá errado

**A cena aparece em branco no OBS.**
O servidor não está rodando. Abra o app, ou `pnpm dev:server`.

**Mudei no painel e a cena não mexeu.**
Olhe a bolinha no canto superior esquerdo do painel: vermelha significa que
ele perdeu a conexão. Ele reconecta sozinho em alguns segundos.

**O servidor caiu no meio da live.**
A cena continua desenhando o último estado que recebeu. O espectador não vê
nada de errado — você tem tempo de reabrir com calma.

**Quero voltar tudo ao padrão.**
Feche o app, apague `~/Library/Application Support/StreamKit/state.json`,
abra de novo.

**Preciso do kit antigo.**
`legacy-python/` continua lá e funcionando: `cd legacy-python && python3 server.py`.

---

## 9. Para quem for mexer no código

```bash
pnpm check           # tipos + lint + testes com cobertura
pnpm empacotamento   # prova que o .app abre e que o servidor embutido sobe
pnpm verificar       # tudo acima + as verificações visuais e de ponta a ponta
```

> **Sobre o `pnpm empacotamento`:** ele existe porque um bug passou por tipos,
> testes e lint e só apareceu depois de instalar o app. O Node 22 do seu
> terminal aceita `require()` de um módulo ESM; o Node 20 embutido no Electron
> não aceita. A verificação roda com `--no-experimental-require-module` para
> reproduzir aqui o comportamento de lá.

O piso de cobertura é 95% e **falha o comando** abaixo disso. As cenas não são
medidas por cobertura de linha: são medidas por comparação de imagem, com
`pnpm cenas`, que também verifica legibilidade e áreas seguras nas três
resoluções.
