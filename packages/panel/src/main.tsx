import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app.js';
import './styles.css';

const raiz = document.getElementById('raiz');
if (raiz === null) throw new Error('elemento #raiz nao encontrado');

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
