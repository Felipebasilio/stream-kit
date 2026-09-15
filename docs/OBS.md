# Conectando ao OBS

Como colocar as cenas no OBS, ver as mudanças acontecendo ao vivo e encaixar
os overlays nas cenas que você já tem.

Para operar o painel, veja [COMO-USAR.md](COMO-USAR.md).

---

## O que o OBS está fazendo, na verdade

Uma **fonte de navegador** é um mini-Chrome dentro do OBS. Ele abre uma URL e
captura o resultado como se fosse uma câmera.

Nossas cenas são páginas que ficam ouvindo o servidor. Quando você muda algo no
painel, o servidor empurra a mudança e a página se redesenha — dentro do OBS,
enquanto você transmite. Não existe passo de "exportar" nem de "atualizar".

É a mesma técnica que as plataformas pagas usam. A diferença é que aqui o
servidor é o seu Mac.

---



## 1. Uma fonte, passo a passo

Com o Stream Kit aberto:

1. No painel, escolha a resolução na barra de abas da prévia (**1920x1080**,
  **2560x1440** ou **1080x1920**)
2. Clique em **copiar** na linha da cena que você quer
3. No OBS: **Fontes → + → Navegador**
4. Dê um nome (ex.: `Stream Kit — Começando`) e confirme
5. Preencha:


| Campo                                           | Valor                       |
| ----------------------------------------------- | --------------------------- |
| URL                                             | cole a que você copiou      |
| Largura                                         | a mesma do canvas escolhido |
| Altura                                          | a mesma do canvas escolhido |
| FPS personalizado                               | deixe desmarcado            |
| Desligar a fonte quando não estiver visível     | ✅ **marque**                |
| Atualizar o navegador quando a cena ficar ativa | ⬜ deixe desmarcado          |


**Por que marcar "desligar quando não estiver visível":** cada fonte de
navegador é um Chromium animando CSS sem parar. Uma cena que não está no ar não
precisa gastar CPU. Com várias cenas em 2560x1440 isso é a diferença entre
transmitir liso e derrubar quadro.

**Por que NÃO marcar "atualizar quando a cena ficar ativa":** a cena já se
mantém atualizada sozinha pelo servidor. Recarregar a cada troca de cena
reinicia as animações de entrada sem necessidade.

### As URLs

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
A cena `ingame` aceita também `&cam=` para fixar o canto da câmera — é o que
faz a troca de layout pelo Stream Deck. Ver a seção 3.

> Sempre copie do painel em vez de digitar. Se a porta 7373 estiver ocupada, o
> servidor usa outra e as URLs mudam junto.

---



## 2. Ver a mudança acontecendo

Vale fazer uma vez, porque é o que convence:

1. Deixe o OBS numa cena com o overlay, e o painel aberto ao lado
2. No painel, digite no campo **Nome do canal**

A marca d'água muda no OBS **enquanto você digita**. Sem salvar, sem
recarregar, sem tocar no OBS.

Funciona igual para cores, textos, @s e tópicos. Clique numa paleta e todas as
cenas trocam de cor de uma vez.

---



## 3. Encaixando nas cenas que você já tem

Você **não precisa** refazer suas cenas. O overlay é uma camada.

### Cena de jogo

Na sua cena atual de gameplay, adicione a fonte de navegador do
`scene=ingame` e **arraste-a para o topo** da lista de Fontes. O que estiver
abaixo aparece por trás — captura de jogo, webcam, o que for.

A moldura de câmera é um retângulo vazio: ela desenha a borda, você posiciona a
sua webcam atrás dela.

**A moldura tem a proporção do seu recorte, não 16:9.** Sua webcam entrega
1920x1080, mas você recorta para 280x260 para se centralizar. A moldura segue
essa proporção — assim a imagem recortada preenche o quadro sem esticar e sem
faixa preta dos lados.

#### Onde colocar a webcam, em pixels

Números da **área interna** da moldura, já descontada a borda. Ponha esses
valores em **botão direito na webcam → Transformar → Editar transformação**,
nos campos *Posição* e *Tamanho da caixa delimitadora*, com o tipo
**"Ajustar aos limites internos"** — assim o OBS respeita a proporção sozinho.

**1920x1080**


| Layout             | Posição X | Posição Y | Tamanho |
| ------------------ | --------- | --------- | ------- |
| ↖ esquerda em cima | 50        | 99        | 298x277 |
| ↗ direita em cima  | 1572      | 99        | 298x277 |
| ↙ esquerda embaixo | 50        | 672       | 298x277 |
| ↘ direita embaixo  | 1572      | 672       | 298x277 |


**2560x1440**


| Layout             | Posição X | Posição Y | Tamanho |
| ------------------ | --------- | --------- | ------- |
| ↖ esquerda em cima | 66        | 133       | 397x368 |
| ↗ direita em cima  | 2096      | 133       | 397x368 |
| ↙ esquerda embaixo | 66        | 896       | 397x368 |
| ↘ direita embaixo  | 2096      | 896       | 397x368 |


**1080x1920 (vertical)**


| Layout             | Posição X | Posição Y | Tamanho |
| ------------------ | --------- | --------- | ------- |
| ↖ esquerda em cima | 62        | 196       | 530x491 |
| ↗ direita em cima  | 346       | 196       | 530x491 |
| ↙ esquerda embaixo | 62        | 1137      | 530x491 |
| ↘ direita embaixo  | 346       | 1137      | 530x491 |


> No vertical a moldura da direita **não** encosta na borda: os 15% da direita
> são onde o celular desenha os botões de curtir e comentar. Meio rosto
> sumiria justamente para quem assiste no telefone.

Se preferir no olho: ligue as **Guias** na prévia do painel, ou abra a cena com
`&edit=1`, e arraste a webcam até encaixar. Depois tire o `&edit=1`.

Na cena de **papo** a moldura é maior e fica em x=121, y=190, 949x881 (em
2560x1440), com a mesma proporção.

### Cinco layouts, um botão no Stream Deck

O problema real não é mover a moldura — é que a **webcam** também precisa se
mover junto, e isso o overlay não consegue fazer: a webcam é uma fonte do OBS.

A solução é deixar cada combinação pronta numa cena do OBS. Trocar de cena
move a moldura e a webcam ao mesmo tempo, porque as duas já estão no lugar
certo naquela cena.

#### O parâmetro que amarra as duas

Toda URL de cena aceita `&cam=`:

```
http://localhost:7373/overlay/?scene=ingame&canvas=qhd&cam=left-top
http://localhost:7373/overlay/?scene=ingame&canvas=qhd&cam=right-top
http://localhost:7373/overlay/?scene=ingame&canvas=qhd&cam=left-bottom
http://localhost:7373/overlay/?scene=ingame&canvas=qhd&cam=right-bottom
http://localhost:7373/overlay/?scene=ingame&canvas=qhd&cam=off
```

`cam=` **manda mais que o painel**. É de propósito: uma cena do OBS que pede
`left-top` precisa desenhar em `left-top`, mesmo que o painel esteja em outro
canto — senão a moldura brigaria com a webcam bem no meio da live. E `cam=off`
é o layout sem câmera sem depender de achar a caixinha "mostrar câmera".

#### Montando as cinco cenas

Faça uma vez, use para sempre:

1. Duplique sua cena de jogo cinco vezes. Sugestão de nome:
  `Jogo ↖`, `Jogo ↗`, `Jogo ↙`, `Jogo ↘`, `Jogo sem câmera`
2. Em cada uma, na fonte de navegador do overlay, acrescente o `&cam=` daquele
  layout na URL
3. Em cada uma, posicione a webcam com a tabela acima
4. Na `Jogo sem câmera`, use `&cam=off` e **desmarque o olho** da webcam

**O detalhe que economiza trabalho:** ao adicionar a webcam e a captura de jogo
nas outras cenas, use **Fontes → + → escolha "Adicionar existente"** em vez de
criar uma fonte nova. É a mesma fonte, uma captura só do dispositivo — mas o
OBS guarda **a transformação separada por cena**. É exatamente o que a gente
quer: uma webcam, cinco posições. Criar cinco capturas da mesma câmera
funcionaria, mas gastaria CPU à toa e o macOS às vezes reclama.

Marque **"Desligar a fonte quando não estiver visível"** nas cinco fontes de
navegador. Só a cena no ar consome CPU.

#### O botão do Stream Deck

Agora cada layout é **uma troca de cena**, e trocar de cena é a coisa mais
básica que qualquer Stream Deck faz. Dois caminhos:

**Se o software do seu deck tem integração com OBS:** ação "Trocar de cena" →
escolha a cena. Um botão por layout, pronto.

**Se não tem (vale para qualquer deck, inclusive os que só mandam tecla):** use
atalho do OBS.

1. OBS → **Configurações → Atalhos**
2. Procure cada cena na lista. Cada uma tem a linha **"Mudar para a cena"**
3. Clique no campo e aperte a combinação, ex.: `Ctrl+Alt+1` até `Ctrl+Alt+5`
4. No software do deck, use a ação de **atalho de teclado** com a mesma
  combinação

Use combinações que nenhum jogo usa. `Ctrl+Alt+número` é seguro; `F13` a `F19`
é mais seguro ainda, porque teclado nenhum tem essas teclas e jogo nenhum
escuta.

#### A transição continua

A transição entre cenas é a do OBS, e vale para os cinco botões de uma vez:
**Transições → Fade**, 200–300ms. Se quiser a cortina do Stream Kit, gere o
stinger com `pnpm stinger` e escolha ele — aí a troca de layout usa a mesma
animação das outras trocas.

#### E o painel?

Continua funcionando, e é o jeito de **experimentar**: na seção *Overlay
in-game* tem os quatro cantos em cruz. Ali a moldura desliza de um canto ao
outro, animada, ao vivo.

A diferença: pelo painel só a moldura se move, não a webcam. Use o painel para
decidir qual canto fica melhor num jogo, e as cenas do OBS para usar isso ao
vivo com um botão.

### Cenas de tela cheia

`starting`, `brb` e `ending` pintam o fundo inteiro. Elas substituem a cena —
não precisa de mais nada embaixo, a não ser uma música.

### Alertas e som — as duas cenas que parecem vazias

Elas **são** vazias, e isso é o certo. As duas reagem a eventos: só existe algo
para mostrar ou tocar quando um evento acontece.

Na prévia do painel elas aparecem em branco porque nada está acontecendo. Clique
em **Testar doação** na seção Alertas e o alerta aparece na hora, inclusive
dentro do OBS.

**Alertas** (`scene=alerts`) é uma camada transparente. Adicione em todas as
cenas onde o alerta pode aparecer, sempre no topo da lista.

> Dica: crie no OBS uma cena chamada `Alertas` com só essa fonte e use
> **Fontes → + → Cena** para inseri-la nas outras. Uma cópia só, e mexer nela
> conserta todas.

**Som** (`scene=audio`) não desenha absolutamente nada — só toca. Adicione uma
vez, na cena principal, e deixe numa trilha de áudio própria para conseguir
aplicar o sidechain.

**De onde vêm os eventos hoje:** só dos botões de teste do painel. A integração
com a Kick está parqueada (veja o plano 90). Enquanto isso, essas duas cenas
servem para você deixar tudo montado e testado — e para agradecer manualmente
quem mandou algo por fora, como um PIX.

---



## 4. Transição

Dois caminhos, e os dois funcionam.

### Cena de navegador (segue as cores ao vivo)

A transição já toca por cima de qualquer cena do Stream Kit que estiver aberta.
Basta clicar em **Tocar agora** no painel. Como as cores vêm do estado, ela
sempre está na identidade do momento.

### Stinger de vídeo (o caminho nativo do OBS)

Para a troca de cena do próprio OBS:

```bash
pnpm stinger      # precisa de ffmpeg: brew install ffmpeg
```

Gera `capturas/stinger.webm` com canal alfa. No OBS:

1. **Transições → + → Stinger**
2. Escolha o arquivo
3. Ponto de transição: por volta de **50%** da duração

Custa zero CPU durante a live. Regenere depois de mudar as cores.

---



## 5. Vertical e horizontal ao mesmo tempo

Nossos overlays são só URLs, então qualquer mecanismo do OBS consome.

- **Lives separadas:** mesma instância do OBS, outra coleção de cenas, canvas
em 1080x1920, apontando para as URLs com `canvas=vertical`. Zero plugin.
- **Simultâneas:** o OBS tem múltiplos canvas desde a 31.1, mas amarrados ao
Multitrack Video, que não serve para Kick/YouTube. As opções são o plugin
**Aitum Vertical** ou uma **segunda instância do OBS** com canvas vertical
próprio. A segunda instância é mais robusta e dobra o custo de codificação.

Nenhuma dessas escolhas encosta no nosso código. Dá para trocar quando quiser.

---



## 6. Orçamento de CPU

Cada fonte de navegador é um Chromium animando. Em 2560x1440, com vertical
junto, isso soma.

Se começar a perder quadro:

1. **Marque "desligar quando não estiver visível"** em todas as fontes. É o de
  maior efeito, de longe.
2. **Baixe a intensidade** da animação de fundo no painel. Em zero, o fundo
  fica estático e o custo cai bastante.
3. **Use uma cena de alertas só**, inserida nas outras, em vez de uma cópia por
  cena.
4. **Prefira o stinger de vídeo** à transição por navegador.

Quadro perdido estraga a experiência de quem assiste muito mais do que qualquer
overlay bonito conserta.

---



## 7. Áreas seguras

O player cobre partes do seu vídeo — controles embaixo, título em cima e, no
vertical, os botões de interação na direita. O que estiver ali some para quem
assiste no celular.

O projeto respeita essas faixas em tudo que é essencial. **Uma exceção consciente:** a barra inferior encosta no rodapé, por decisão de projeto. Ela fica parcialmente coberta quando o espectador toca na tela — em troca, a distribuição da cena fica equilibrada.

Ligue as **Guias** para ver as faixas enquanto posiciona suas próprias fontes.

---



## 8. Problemas comuns

**Cena branca ou preta no OBS.**
O servidor não está rodando, ou a porta mudou. Copie a URL de novo pelo painel.

**Aparece uma barra de rolagem na cena.**
A largura ou a altura da fonte não bate com o `canvas` da URL. Os dois números
precisam ser iguais aos do canvas escolhido.

**O overlay está pequeno ou cortado.**
Mesma causa. Se você redimensionou a fonte na tela do OBS, clique com o botão
direito → **Transformar → Redefinir transformação**.

**A cena não atualiza quando mexo no painel.**
Botão direito na fonte → **Interagir**, e veja se a página está viva. Se
continuar, botão direito → **Atualizar**. Se resolveu com o Atualizar, o
servidor tinha caído e voltado.

**O alerta aparece mas não sai som.**
A cena `audio` precisa estar adicionada e com áudio roteado. No mixer do OBS,
confira se a fonte aparece e se não está mutada.

**Quero abaixar a música quando o alerta toca.**
Isso é filtro do OBS: no mixer, engrenagem da música → **Filtros** →
**Compressor** → em *Fonte de cadeia lateral*, escolha a fonte de áudio do
Stream Kit. Proporção 10:1, limiar por volta de −30 dB.