/**
 * Amarracao do React. A logica esta em queue.ts, history.ts e presets.ts,
 * cada um com teste proprio. Fora da cobertura de linha (decisao D9).
 */

import { deepMerge } from '@stream-kit/core';
import {
  createDefaultState,
  type ClientMessage,
  type ServerMessage,
  type StatePatch,
  type StreamEvent,
  type StreamKitState,
} from '@stream-kit/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { History } from './history.js';
import { SendQueue } from './queue.js';

export interface PainelApi {
  readonly state: StreamKitState;
  readonly conectado: boolean;
  readonly podeDesfazer: boolean;
  readonly podeRefazer: boolean;
  alterar(patch: StatePatch): void;
  substituir(estado: StreamKitState): void;
  desfazer(): void;
  refazer(): void;
  disparar(evento: Omit<StreamEvent, 'id' | 'at' | 'platform'>): void;
  contagem(minutos: number): void;
  transicao(): void;
}

function url(caminho: string): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}${caminho}`;
}

export function usePainel(): PainelApi {
  const [state, setState] = useState<StreamKitState>(createDefaultState);
  const [conectado, setConectado] = useState(false);
  const [versao, setVersao] = useState(0);

  const estadoRef = useRef(state);
  estadoRef.current = state;
  const historico = useMemo(() => new History(), []);
  const socket = useRef<WebSocket | undefined>(undefined);
  /** Ecos do proprio painel nao podem virar entradas de desfazer. */
  const proprio = useRef(false);

  const fila = useMemo(
    () =>
      new SendQueue({
        send: (patch, id) => {
          const mensagem: ClientMessage = { type: 'patch', id, patch };
          socket.current?.send(JSON.stringify(mensagem));
        },
      }),
    [],
  );

  useEffect(() => {
    let vivo = true;
    let tentativa: ReturnType<typeof setTimeout> | undefined;
    let atraso = 500;

    const abrir = (): void => {
      const ws = new WebSocket(url('/ws?role=panel'));
      socket.current = ws;
      ws.addEventListener('open', () => {
        atraso = 500;
        setConectado(true);
      });
      ws.addEventListener('message', (ev) => {
        const msg = JSON.parse(String(ev.data)) as ServerMessage;
        if (msg.type !== 'state') return;
        if (proprio.current) {
          proprio.current = false;
          setState(msg.state);
          return;
        }
        setState(msg.state);
      });
      const cair = (): void => {
        if (!vivo) return;
        setConectado(false);
        tentativa = setTimeout(abrir, atraso);
        atraso = Math.min(atraso * 2, 8000);
      };
      ws.addEventListener('close', cair);
      ws.addEventListener('error', cair);
    };
    abrir();

    return () => {
      vivo = false;
      if (tentativa !== undefined) clearTimeout(tentativa);
      fila.flush();
      socket.current?.close();
    };
  }, [fila]);

  const alterar = useCallback(
    (patch: StatePatch) => {
      historico.registrar(estadoRef.current);
      proprio.current = true;
      setState((atual) => deepMerge(atual, patch));
      fila.push(patch);
      setVersao((v) => v + 1);
    },
    [fila, historico],
  );

  const substituir = useCallback(
    (estado: StreamKitState) => {
      historico.registrar(estadoRef.current);
      proprio.current = true;
      setState(estado);
      fila.push(estado as StatePatch);
      setVersao((v) => v + 1);
    },
    [fila, historico],
  );

  const aplicarSemHistorico = useCallback(
    (estado: StreamKitState) => {
      proprio.current = true;
      setState(estado);
      fila.push(estado as StatePatch);
      fila.flush();
      setVersao((v) => v + 1);
    },
    [fila],
  );

  const desfazer = useCallback(() => {
    const anterior = historico.desfazer(estadoRef.current);
    if (anterior !== undefined) aplicarSemHistorico(anterior);
  }, [historico, aplicarSemHistorico]);

  const refazer = useCallback(() => {
    const proximo = historico.refazer(estadoRef.current);
    if (proximo !== undefined) aplicarSemHistorico(proximo);
  }, [historico, aplicarSemHistorico]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent): void => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      if (e.shiftKey) refazer();
      else desfazer();
    };
    window.addEventListener('keydown', aoTeclar);
    return () => {
      window.removeEventListener('keydown', aoTeclar);
    };
  }, [desfazer, refazer]);

  const disparar = useCallback((evento: Omit<StreamEvent, 'id' | 'at' | 'platform'>) => {
    void fetch('/api/event', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...evento, platform: 'manual' }),
    });
  }, []);

  const contagem = useCallback((minutos: number) => {
    void fetch('/api/countdown', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ minutes: minutos }),
    });
  }, []);

  const transicao = useCallback(() => {
    void fetch('/api/transition', { method: 'POST' });
  }, []);

  return {
    state,
    conectado,
    podeDesfazer: historico.podeDesfazer && versao >= 0,
    podeRefazer: historico.podeRefazer && versao >= 0,
    alterar,
    substituir,
    desfazer,
    refazer,
    disparar,
    contagem,
    transicao,
  };
}
