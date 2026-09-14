import type { AlertPosition, EventKind } from '@stream-kit/types';
import { useState, type JSX } from 'react';

import type { PainelApi } from '../state/use-panel.hooks.js';
import { Cartao, Texto } from './campos.js';

const TESTES: readonly { kind: EventKind; rotulo: string; amount?: string }[] = [
  { kind: 'follow', rotulo: 'follow' },
  { kind: 'sub', rotulo: 'assinatura' },
  { kind: 'donation', rotulo: 'doação', amount: 'R$ 20,00' },
  { kind: 'raid', rotulo: 'raid', amount: '42' },
];

export function Alertas({ api }: { api: PainelApi }): JSX.Element {
  const a = api.state.alerts;
  const [ultimo, setUltimo] = useState<string | undefined>(undefined);

  return (
    <Cartao titulo="Alertas">
      <div className="linha tres">
        <div>
          <label htmlFor="duracao">Duração (ms)</label>
          <input
            id="duracao"
            type="number"
            min={1500}
            max={20000}
            step={500}
            value={a.duration}
            onChange={(e) => {
              api.alterar({ alerts: { duration: Number(e.target.value) } });
            }}
          />
        </div>
        <div>
          <label htmlFor="posicao">Posição</label>
          <select
            id="posicao"
            value={a.position}
            onChange={(e) => {
              api.alterar({ alerts: { position: e.target.value as AlertPosition } });
            }}
          >
            <option value="top">Topo</option>
            <option value="center">Centro</option>
            <option value="bottom">Rodapé</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <span className="apagado">Abra a cena de alertas no OBS para ver o teste</span>
        </div>
      </div>

      <div className="linha duas">
        <Texto
          id="msg-follow"
          rotulo="Texto de follow"
          valor={a.messages.follow}
          aoMudar={(v) => {
            api.alterar({ alerts: { messages: { follow: v } } });
          }}
        />
        <Texto
          id="msg-sub"
          rotulo="Texto de assinatura"
          valor={a.messages.sub}
          aoMudar={(v) => {
            api.alterar({ alerts: { messages: { sub: v } } });
          }}
        />
      </div>
      <div className="linha duas">
        <Texto
          id="msg-donation"
          rotulo="Texto de doação"
          valor={a.messages.donation}
          aoMudar={(v) => {
            api.alterar({ alerts: { messages: { donation: v } } });
          }}
        />
        <Texto
          id="msg-raid"
          rotulo="Texto de raid"
          valor={a.messages.raid}
          aoMudar={(v) => {
            api.alterar({ alerts: { messages: { raid: v } } });
          }}
        />
      </div>

      <div className="botoes">
        {TESTES.map((t) => (
          <button
            key={t.kind}
            onClick={() => {
              api.disparar({
                kind: t.kind,
                user: 'fulano_teste',
                ...(t.amount === undefined ? {} : { amount: t.amount }),
              });
              setUltimo(t.rotulo);
              setTimeout(() => {
                setUltimo(undefined);
              }, 1500);
            }}
          >
            Testar {t.rotulo}
          </button>
        ))}
      </div>
      {ultimo !== undefined && (
        <p className="dica" role="status">
          Disparado: {ultimo}
        </p>
      )}
    </Cartao>
  );
}
