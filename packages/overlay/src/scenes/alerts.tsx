import { EventQueue, formatAlertMessage } from '@stream-kit/core';
import type {
  EventKind,
  QueuedEvent,
  StreamEvent,
  StreamKitState,
} from '@stream-kit/types';
import { useEffect, useRef, useState, type JSX } from 'react';

import { IconeEvento } from '../components/icons.js';

const ROTULO: Record<EventKind, string> = {
  follow: 'NOVO SEGUIDOR',
  sub: 'NOVA ASSINATURA',
  donation: 'DOAÇÃO',
  raid: 'RAID',
  chat: 'CHAT',
};

const SAIDA_MS = 450;

/**
 * Monta o texto com o nome em destaque.
 *
 * Sem `dangerouslySetInnerHTML`: o nome vem de fora e o modelo e configuravel.
 * Injetar HTML aqui seria abrir uma porta na cena que vai ao ar.
 */
function Texto({ modelo, evento }: { modelo: string; evento: QueuedEvent }): JSX.Element {
  const pronto = formatAlertMessage(modelo, evento);
  const nome = evento.user;
  const corte = pronto.indexOf(nome);
  if (corte < 0 || nome.length === 0) return <>{pronto}</>;
  return (
    <>
      {pronto.slice(0, corte)}
      <b>{nome}</b>
      {pronto.slice(corte + nome.length)}
    </>
  );
}

export function Alertas({
  state,
  evento,
}: {
  state: StreamKitState;
  evento: StreamEvent | undefined;
}): JSX.Element {
  const fila = useRef(new EventQueue());
  const [atual, setAtual] = useState<QueuedEvent | undefined>(undefined);
  const [saindo, setSaindo] = useState(false);
  const ocupado = useRef(false);

  // Entrada: cada evento novo entra na fila com deduplicacao por id.
  useEffect(() => {
    if (evento === undefined) return;
    fila.current.push(evento);
    bombear();
  }, [evento]);

  function bombear(): void {
    if (ocupado.current) return;
    const proximo = fila.current.shift();
    if (proximo === undefined) return;
    ocupado.current = true;
    setSaindo(false);
    setAtual(proximo);

    const duracao = state.alerts.duration;
    setTimeout(() => {
      setSaindo(true);
      setTimeout(() => {
        setAtual(undefined);
        ocupado.current = false;
        bombear();
      }, SAIDA_MS);
    }, duracao);
  }

  return (
    <div className="cena">
      <div className="alertas" data-pos={state.alerts.position}>
        {atual !== undefined && (
          <div className={saindo ? 'alerta alerta--saindo' : 'alerta'}>
            <div className="alerta__icone">
              <IconeEvento tipo={atual.kind} />
            </div>
            <div className="alerta__texto">
              <span className="alerta__tipo">
                {ROTULO[atual.kind]}
                {atual.count > 1 ? ` ×${String(atual.count)}` : ''}
              </span>
              <Texto modelo={state.alerts.messages[atual.kind]} evento={atual} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
