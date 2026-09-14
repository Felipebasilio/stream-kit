/* =========================================================================
   bus.js - conecta a cena ao servidor local.

   - abre um EventSource em /api/stream
   - recebe o estado inteiro sempre que algo muda no painel
   - aplica marca/cores automaticamente
   - chama o render() da cena
   - reconecta sozinho se o servidor cair

   Cada cena faz:
       import { connect } from './shared/bus.js';
       connect(state => { ...desenha... });
   ========================================================================= */

import { iconSvg } from './icons.js';

let currentState = {};
const listeners = [];
const alertListeners = [];

/* ---- aplica a identidade visual em variáveis CSS --------------------- */

function applyBrand(state) {
  const b = state.brand || {};
  const root = document.documentElement.style;
  if (b.accent) root.setProperty('--accent', b.accent);
  if (b.accent2) root.setProperty('--accent-2', b.accent2);
  if (b.bg1) root.setProperty('--bg-1', b.bg1);
  if (b.bg2) root.setProperty('--bg-2', b.bg2);
  if (b.intensity != null) root.setProperty('--intensity', String(b.intensity));

  document.querySelectorAll('[data-brand-name]').forEach(el => {
    el.textContent = b.name || '';
    el.classList.toggle('hidden', !b.name);
  });
}

/* ---- barra de redes sociais ------------------------------------------ */

export function renderSocials(container, state) {
  if (!container) return;
  const list = (state.socials || []).filter(s => s.show !== false && s.handle);
  container.innerHTML = list.map(s => {
    const icon = s.iconFile
      ? `<img src="${escapeAttr(s.iconFile)}" alt="">`
      : iconSvg(s.icon || 'link');
    return `<div class="social">
        <div class="social__icon">${icon}</div>
        <div class="social__handle">${escapeHtml(s.handle)}</div>
      </div>`;
  }).join('');

  const label = document.querySelector('[data-socials-label]');
  if (label) {
    label.textContent = state.socialsLabel || '';
    label.classList.toggle('hidden', !state.socialsLabel);
  }
}

/* ---- contagem regressiva --------------------------------------------- */

export function startCountdown(box, valueEl, labelEl) {
  function tick() {
    const cd = (currentState.countdown) || {};
    const on = cd.enabled && cd.endsAt > 0;
    if (box) box.classList.toggle('on', !!on);
    if (!on) return;
    const left = Math.max(0, cd.endsAt - Date.now());
    const total = Math.round(left / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = n => String(n).padStart(2, '0');
    if (valueEl) valueEl.textContent = h > 0
      ? `${pad(h)}:${pad(m)}:${pad(s)}`
      : `${pad(m)}:${pad(s)}`;
    if (labelEl) labelEl.textContent = cd.label || '';
  }
  tick();
  setInterval(tick, 250);
}

/* ---- conexão ---------------------------------------------------------- */

function emit(state) {
  currentState = state;
  applyBrand(state);
  listeners.forEach(fn => {
    try { fn(state); } catch (err) { console.error('[streamkit]', err); }
  });
}

function open() {
  const es = new EventSource('/api/stream');

  es.addEventListener('state', ev => {
    try { emit(JSON.parse(ev.data)); } catch (err) { console.error(err); }
  });

  es.addEventListener('alert', ev => {
    try {
      const payload = JSON.parse(ev.data);
      alertListeners.forEach(fn => fn(payload));
    } catch (err) { console.error(err); }
  });

  es.onerror = () => {
    es.close();
    setTimeout(open, 1500); // servidor reiniciou? tenta de novo
  };
}

export function connect(render) {
  if (render) listeners.push(render);
  if (listeners.length === 1) {
    // primeiro assinante abre a conexão; um GET inicial evita tela vazia
    fetch('/api/state')
      .then(r => r.json())
      .then(emit)
      .catch(() => {});
    open();
  } else if (Object.keys(currentState).length) {
    render(currentState);
  }
}

export function onAlert(fn) { alertListeners.push(fn); }

export function getState() { return currentState; }

/* ---- helpers ---------------------------------------------------------- */

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
export function escapeAttr(str) { return escapeHtml(str); }

/* ---- fundo animado ---------------------------------------------------- */

export function buildBackground(host, count = 14) {
  if (!host) return;
  const streaks = document.createElement('div');
  streaks.className = 'streaks';
  let html = '';
  for (let i = 0; i < count; i++) {
    const left = (i / count) * 130 - 15 + (Math.random() * 6 - 3);
    const width = 3 + Math.random() * 34;
    const opacity = 0.08 + Math.random() * 0.42;
    const dur = 14 + Math.random() * 22;
    const delay = -Math.random() * dur;
    html += `<div class="streak" style="
      left:${left.toFixed(2)}%;
      width:${width.toFixed(1)}px;
      opacity:${opacity.toFixed(2)};
      animation-duration:${dur.toFixed(1)}s;
      animation-delay:${delay.toFixed(1)}s;
      animation-direction:${i % 2 ? 'alternate' : 'alternate-reverse'};"></div>`;
  }
  streaks.innerHTML = html + '<div class="beam"></div>';
  host.appendChild(streaks);
}
