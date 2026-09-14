import type { Brand } from '@stream-kit/types';

export interface Paleta {
  readonly nome: string;
  readonly cores: Pick<Brand, 'accent' | 'accent2' | 'bg1' | 'bg2'>;
}

export const PALETAS: readonly Paleta[] = [
  {
    nome: 'Pure azul',
    cores: { accent: '#2f7dff', accent2: '#6fd2ff', bg1: '#050a16', bg2: '#0d2f6b' },
  },
  {
    nome: 'Roxo',
    cores: { accent: '#8b5cf6', accent2: '#c4b5fd', bg1: '#0a0614', bg2: '#3b1a6b' },
  },
  {
    nome: 'Verde',
    cores: { accent: '#14c27a', accent2: '#7ef0bd', bg1: '#03130d', bg2: '#0a5c3c' },
  },
  {
    nome: 'Vermelho',
    cores: { accent: '#ef3b4e', accent2: '#ff9aa4', bg1: '#140406', bg2: '#6b1420' },
  },
  {
    nome: 'Âmbar',
    cores: { accent: '#f59e0b', accent2: '#fcd34d', bg1: '#140d02', bg2: '#6b4310' },
  },
  {
    nome: 'Ciano',
    cores: { accent: '#06b6d4', accent2: '#67e8f9', bg1: '#031014', bg2: '#0a4c5c' },
  },
];
