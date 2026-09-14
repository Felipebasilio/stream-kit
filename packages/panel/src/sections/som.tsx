import { EVENT_KINDS, type EventKind } from '@stream-kit/types';
import { useEffect, useState, type JSX } from 'react';

import type { PainelApi } from '../state/use-panel.hooks.js';
import { Cartao, Marcar } from './campos.js';

const ROTULO: Record<EventKind, string> = {
  follow: 'Follow',
  sub: 'Assinatura',
  donation: 'Doação',
  raid: 'Raid',
  chat: 'Chat',
};

export function Som({ api }: { api: PainelApi }): JSX.Element {
  const a = api.state.alerts;
  const [arquivos, setArquivos] = useState<string[]>([]);

  useEffect(() => {
    void fetch('/api/sounds')
      .then((r) => r.json() as Promise<{ sounds: string[] }>)
      .then((d) => {
        setArquivos(d.sounds);
      })
      .catch(() => {
        setArquivos([]);
      });
  }, []);

  return (
    <Cartao titulo="Som dos alertas">
      <div className="linha">
        <Marcar
          id="som-ligado"
          rotulo="tocar som nos alertas"
          valor={a.soundEnabled}
          aoMudar={(v) => {
            api.alterar({ alerts: { soundEnabled: v } });
          }}
        />
      </div>

      {EVENT_KINDS.map((kind) => (
        <div className="linha tres" key={kind}>
          <div>
            <label htmlFor={`som-${kind}`}>{ROTULO[kind]} — arquivo</label>
            <select
              id={`som-${kind}`}
              value={a.sounds[kind].file}
              onChange={(e) => {
                api.alterar({ alerts: { sounds: { [kind]: { file: e.target.value } } } });
              }}
            >
              <option value="">tom sintetizado (padrão)</option>
              {arquivos.map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`vol-${kind}`}>
              Volume: {Math.round(a.sounds[kind].volume * 100)}%
            </label>
            <input
              id={`vol-${kind}`}
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={a.sounds[kind].volume}
              onChange={(e) => {
                api.alterar({
                  alerts: { sounds: { [kind]: { volume: Number(e.target.value) } } },
                });
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={() => {
                api.disparar({ kind, user: 'teste', amount: 'R$ 10,00' });
              }}
            >
              Testar
            </button>
          </div>
        </div>
      ))}

      <p className="dica">
        Sem arquivo escolhido, o app toca um tom sintetizado — nada é embarcado, para não
        criar problema de direito autoral. Para usar sons seus, coloque os arquivos em{' '}
        <code>~/Library/Application Support/StreamKit/sons/</code> e recarregue o painel.
        <br />
        Abra a cena <b>Som</b> como fonte de navegador no OBS para o áudio sair na
        transmissão. Deixe ela numa trilha de áudio separada se quiser abaixar a música
        automaticamente (filtro de sidechain no OBS).
      </p>
    </Cartao>
  );
}
