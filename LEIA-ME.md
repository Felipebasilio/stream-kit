# Stream Kit Local

Overlays de live 100% offline, no seu Mac, editáveis ao vivo.
Zero dependência de plataforma online, zero mensalidade, tudo em português.

---

## 1. Ligar

Descompacte a pasta em algum lugar fixo (ex.: `~/Documentos/stream-kit`) e:

**Jeito fácil:** clique duas vezes em `iniciar.command`.
(Na primeira vez o macOS pode bloquear — clique com o botão direito → *Abrir* → *Abrir*.)

**Pelo Terminal:**

```bash
cd ~/Documentos/stream-kit
chmod +x iniciar.command      # só na primeira vez
python3 server.py
```

O painel abre em `http://localhost:7373/`. Deixe essa janela do Terminal aberta
enquanto estiver ao vivo — é ela que serve as cenas pro OBS.

Não precisa instalar nada: o Python 3 já vem no macOS e o kit não usa
nenhuma biblioteca externa.

---

## 2. Colocar no OBS

### Opção A — importar tudo pronto

```bash
python3 gerar_cenas_obs.py
```

Isso cria `Stream Kit Local.json`. No OBS: **Coleção de Cenas → Importar** →
escolha o arquivo. Ele cria uma coleção NOVA; a sua atual não é mexida.

Depois, dentro das cenas *Jogando* e *Papo*, adicione a sua webcam e a captura
de tela/jogo **abaixo** da camada do Stream Kit na lista de Fontes.

### Opção B — manual, uma fonte por vez

No OBS: **+ → Navegador**, e preencha:

| Campo | Valor |
|---|---|
| URL | copie do painel (botão "copiar") |
| Largura | 1920 |
| Altura | 1080 |
| Desligar a fonte quando não estiver visível | ✅ marque |
| Atualizar o navegador quando a cena ficar ativa | deixe desmarcado |

URLs:

```
http://localhost:7373/overlay/fullscreen.html?scene=starting
http://localhost:7373/overlay/fullscreen.html?scene=brb
http://localhost:7373/overlay/fullscreen.html?scene=ending
http://localhost:7373/overlay/ingame.html
http://localhost:7373/overlay/talking.html
http://localhost:7373/overlay/alerts.html
```

As cenas `ingame`, `talking` e `alerts` têm fundo transparente — o OBS mostra
o que estiver atrás delas.

**Onde posicionar a webcam:**

- `ingame.html` — a moldura fica em x=48, y=678, tamanho 480×270
- `talking.html` — a moldura fica em x=90, y=140, tamanho 1180×664

Coloque a fonte de vídeo nessas coordenadas, **abaixo** do overlay.

---

## 3. Editar ao vivo

Com o painel aberto no navegador, qualquer mudança aparece no OBS na hora —
sem clicar em "Atualizar", sem cortar a transmissão. Dá pra mudar durante a live:

- nome do canal, cores (4 cores + paletas prontas), intensidade da animação
- os textos das três telas cheias
- contagem regressiva (botões de 5/10/15 min)
- redes sociais: ligar, desligar, reordenar no arquivo, trocar @
- letreiro da barra inferior e "jogando agora"
- tópicos da cena de papo
- textos e posição dos alertas

Tudo fica salvo em `state.json`. Apagar esse arquivo volta tudo ao padrão
(`state.default.json`).

---

## 4. Alertas

O botão de teste no painel já mostra como fica. Para disparar de verdade,
qualquer coisa que faça um POST serve:

```bash
curl -X POST http://localhost:7373/api/alert \
  -H 'Content-Type: application/json' \
  -d '{"type":"follow","user":"fulano"}'
```

Tipos: `follow`, `sub`, `donation`, `raid`.
Campos: `user`, `amount`, e opcionalmente `duration` (ms) e `sound`
(caminho de um mp3 dentro da pasta, ex.: `shared/sounds/alerta.mp3`).

Para plugar na Twitch de verdade, o caminho mais curto é o **Streamer.bot**
(gratuito): você cria uma ação para o evento de follow/sub e manda esse
mesmo POST. Se quiser, eu monto essa parte.

---

## 5. Trocar as fontes e os ícones

**Fontes:** o kit vem com Anton (títulos) e Inter (resto), ambas livres
(licença OFL, incluída em `overlay/shared/fonts/`). Para usar outra, coloque o
arquivo `.ttf` nessa pasta e troque o `src` do `@font-face` no começo de
`overlay/shared/base.css`.

**Ícones das redes:** os que vêm no kit são genéricos (um símbolo de "ao vivo",
uma câmera, um balão de chat), porque os logos oficiais são marcas registradas
e cada plataforma tem sua própria regra de uso. Se quiser os logos de verdade,
baixe o SVG na página de imprensa/brand da plataforma, salve em
`overlay/shared/icons/` e no `state.json` adicione o campo `iconFile` na rede:

```json
{ "icon": "twitch", "handle": "seucanal", "show": true,
  "iconFile": "shared/icons/twitch.svg" }
```

---

## 6. Estrutura dos arquivos

```
stream-kit/
├── iniciar.command          clique duplo pra ligar
├── server.py                servidor local (só Python padrão)
├── control.html             painel de controle
├── gerar_cenas_obs.py       gera a coleção de cenas do OBS
├── state.json               suas configurações (criado no primeiro uso)
├── state.default.json       os padrões de fábrica
└── overlay/
    ├── fullscreen.html      Começando / Volto já / Encerrando
    ├── ingame.html          moldura de câmera + barra inferior
    ├── talking.html         cena de papo com painel de tópicos
    ├── alerts.html          alertas
    └── shared/
        ├── base.css         fundo animado, tipografia, redes sociais
        ├── scenes.css       câmera, barra inferior, alertas
        ├── bus.js           conexão ao vivo com o servidor
        ├── icons.js         ícones
        └── fonts/           Anton + Inter (OFL)
```

Todo o visual está em `base.css` e `scenes.css`. Se quiser mudar o formato das
faixas diagonais, o ângulo, o brilho — é tudo CSS, sem build, sem compilar nada.

---

## 7. Problemas comuns

**A cena aparece em branco no OBS.** O servidor não está rodando. Abra o
Terminal e rode `python3 server.py` na pasta.

**A porta 7373 está ocupada.** Rode `python3 server.py --port 7374` e gere as
cenas com `python3 gerar_cenas_obs.py --port 7374`.

**Mudei no painel e o OBS não mexeu.** Clique com o botão direito na fonte →
*Interagir*, ou *Atualizar*. Se persistir, a conexão caiu: a bolinha no topo do
painel fica vermelha quando o servidor está fora do ar.

**O texto some ou fica cortado.** O título se ajusta sozinho até caber em
1920px. Se ainda assim ficar estranho, use menos palavras — a fonte é bem larga.

**CPU alta.** Marque "Desligar a fonte quando não estiver visível" em todas as
fontes de navegador e baixe a "intensidade da animação de fundo" no painel.
