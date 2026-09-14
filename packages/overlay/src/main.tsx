import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app.js';
import './styles/tokens.css';
import './styles/background.css';
import './styles/scenes.css';

const raiz = document.getElementById('raiz');
if (raiz === null) throw new Error('elemento #raiz nao encontrado');

createRoot(raiz).render(
  <StrictMode>
    <App search={window.location.search} />
  </StrictMode>,
);
