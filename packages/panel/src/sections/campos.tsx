import type { JSX, ReactNode } from 'react';

export function Cartao({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="cartao">
      <h2>{titulo}</h2>
      {children}
    </section>
  );
}

export function Texto({
  rotulo,
  valor,
  aoMudar,
  id,
  placeholder,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  id?: string;
  placeholder?: string;
}): JSX.Element {
  return (
    <div>
      <label htmlFor={id}>{rotulo}</label>
      <input
        id={id}
        type="text"
        value={valor}
        placeholder={placeholder}
        onChange={(e) => {
          aoMudar(e.target.value);
        }}
      />
    </div>
  );
}

export function Cor({
  rotulo,
  valor,
  aoMudar,
  id,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  id?: string;
}): JSX.Element {
  return (
    <div>
      <label htmlFor={id}>{rotulo}</label>
      <input
        id={id}
        type="color"
        value={valor}
        onChange={(e) => {
          aoMudar(e.target.value);
        }}
      />
    </div>
  );
}

export function Marcar({
  rotulo,
  valor,
  aoMudar,
  id,
}: {
  rotulo: string;
  valor: boolean;
  aoMudar: (v: boolean) => void;
  id?: string;
}): JSX.Element {
  return (
    <label className="apagado" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        id={id}
        type="checkbox"
        checked={valor}
        onChange={(e) => {
          aoMudar(e.target.checked);
        }}
      />
      {rotulo}
    </label>
  );
}
