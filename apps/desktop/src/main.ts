/**
 * Processo principal do app.
 *
 * Amarracao do Electron: sobe o servidor como processo filho, descobre em que
 * porta ele ficou, abre o painel numa janela e poe um item na barra de menus
 * com as URLs prontas para colar no OBS.
 *
 * Fora da medicao de cobertura (decisao D9): o que ha de logica aqui mora em
 * server-process.ts, version.ts, menu.ts e paths.ts, todos com teste proprio.
 */

import { spawn } from 'node:child_process';

import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  Menu,
  nativeImage,
  shell,
  Tray,
} from 'electron';

import { montarItens, urlDoPainel } from './menu.js';
import { localizar } from './paths.js';
import { lerPortaDaSaida, ServidorEmbutido } from './server-process.js';
import { verificarAtualizacao, type RespostaGitHub } from './version.js';

const local = localizar({
  empacotado: app.isPackaged,
  resourcesPath: process.resourcesPath,
  dirname: __dirname,
});

let janela: BrowserWindow | undefined;
let bandeja: Tray | undefined;
let porta: number | undefined;

const servidor = new ServidorEmbutido({
  spawn: (comando, args) =>
    spawn(comando, [...args], {
      stdio: ['ignore', 'pipe', 'inherit'],
      // ELECTRON_RUN_AS_NODE faz o binario do Electron rodar como Node puro,
      // o que evita embarcar uma segunda copia do Node dentro do app.
      // Vai so para o filho: mexer no process.env do app teria efeito em
      // qualquer outro processo que ele viesse a abrir.
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    }),
  executavel: process.execPath,
  args: [local.servidor],
  aoImprimir: (linha) => {
    process.stdout.write(linha);
    if (porta !== undefined) return;
    const achada = lerPortaDaSaida(linha);
    if (achada === undefined) return;
    porta = achada;
    abrirPainel(achada);
    montarBandeja(achada);
  },
  aoSair: (codigo) => {
    if (codigo !== 0 && !encerrando) {
      dialog.showErrorBox(
        'O servidor parou',
        'O Stream Kit precisa ser reaberto. As cenas no OBS vão continuar mostrando o último estado até lá.',
      );
    }
  },
  aoFalhar: (erro) => {
    dialog.showErrorBox('Não consegui iniciar o servidor', erro.message);
  },
});

let encerrando = false;

function abrirPainel(portaAtual: number): void {
  if (janela !== undefined && !janela.isDestroyed()) {
    janela.focus();
    return;
  }
  janela = new BrowserWindow({
    width: 1500,
    height: 1000,
    minWidth: 900,
    title: 'Stream Kit',
    backgroundColor: '#0a0f1c',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  void janela.loadURL(urlDoPainel(portaAtual));
  janela.on('closed', () => {
    janela = undefined;
  });
}

function montarBandeja(portaAtual: number): void {
  bandeja ??= new Tray(nativeImage.createEmpty());
  bandeja.setToolTip('Stream Kit');
  atualizarBandeja(portaAtual);
}

function atualizarBandeja(portaAtual: number): void {
  if (bandeja === undefined) return;
  const itens = montarItens(portaAtual, 'qhd');
  bandeja.setContextMenu(
    Menu.buildFromTemplate([
      { label: `Servidor na porta ${String(portaAtual)}`, enabled: false },
      { type: 'separator' },
      {
        label: 'Abrir painel',
        click: () => {
          abrirPainel(portaAtual);
        },
      },
      {
        label: 'Copiar URL da cena',
        submenu: itens.map((item) => ({
          label: item.rotulo,
          click: () => {
            clipboard.writeText(item.copiar);
          },
        })),
      },
      { type: 'separator' },
      {
        label: 'Procurar atualização…',
        click: () => {
          void procurarAtualizacao(true);
        },
      },
      { type: 'separator' },
      {
        label: 'Sair',
        click: () => {
          app.quit();
        },
      },
    ]),
  );
}

async function procurarAtualizacao(manual: boolean): Promise<void> {
  const resultado = await verificarAtualizacao(app.getVersion(), async (url) => {
    const resposta = await fetch(url, {
      headers: { accept: 'application/vnd.github+json' },
    });
    if (!resposta.ok) return undefined;
    return (await resposta.json()) as RespostaGitHub;
  });

  if (resultado.temNova) {
    const escolha = await dialog.showMessageBox({
      type: 'info',
      message: `Versão ${resultado.versaoNova ?? ''} disponível`,
      detail:
        'Baixe o novo app e arraste para a pasta Aplicativos, substituindo o atual. ' +
        'Suas configurações ficam guardadas fora do app e não se perdem.',
      buttons: ['Abrir página', 'Agora não'],
      defaultId: 0,
      cancelId: 1,
    });
    if (escolha.response === 0 && resultado.url !== undefined) {
      await shell.openExternal(resultado.url);
    }
    return;
  }

  if (manual) {
    await dialog.showMessageBox({
      type: 'info',
      message: 'Você está na versão mais recente',
      detail: resultado.erro ?? `Versão ${resultado.versaoAtual}.`,
    });
  }
}

app.on('ready', () => {
  servidor.iniciar();
  // Sem pressa: verificar atualizacao nao pode atrasar a abertura.
  setTimeout(() => {
    void procurarAtualizacao(false);
  }, 8000);
});

app.on('window-all-closed', () => {
  // No macOS o app fica na barra de menus com a janela fechada. E o
  // comportamento esperado: o servidor precisa continuar de pe durante a live.
});

app.on('activate', () => {
  if (porta !== undefined) abrirPainel(porta);
});

app.on('before-quit', (evento) => {
  if (encerrando) return;
  evento.preventDefault();
  encerrando = true;
  void (async (): Promise<void> => {
    // Espera o servidor gravar o estado antes de sair. Fechar o app no meio de
    // uma edicao nao pode perder a edicao.
    await servidor.parar();
    app.exit(0);
  })();
});
