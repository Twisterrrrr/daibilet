/**
 * Lightweight DOM toast for day-route add/remove feedback.
 * No React tree required - works even if badge/button stores desync.
 */

import { clearDayRoute } from '@/lib/day-route';

const TOAST_ID = 'daibilet-day-route-toast';
const HIDE_MS = 4200;
const HIDE_MS_PLAIN = 2400;

export type DayRouteFeedbackOptions = {
  /** Trash control to wipe the whole guest day route (hub «Добавлено в маршрут»). */
  showClear?: boolean;
};

function trashSvg(): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" ' +
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
    'aria-hidden="true">' +
    '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>' +
    '<path d="M10 11v6"/><path d="M14 11v6"/>' +
    '</svg>'
  );
}

function ensureHost(): HTMLDivElement {
  let host = document.getElementById(TOAST_ID) as HTMLDivElement | null;
  if (!host) {
    host = document.createElement('div');
    host.id = TOAST_ID;
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  return host;
}

function hideToast(host: HTMLDivElement) {
  host.style.opacity = '0';
  host.style.transform = 'translate(-50%, 16px)';
  window.setTimeout(() => {
    if (host.style.opacity === '0') {
      host.hidden = true;
      host.style.display = 'none';
    }
  }, 240);
}

function scheduleHide(host: HTMLDivElement, ms: number) {
  const prev = Number(host.dataset.hideTimer || 0);
  if (prev) window.clearTimeout(prev);
  const timer = window.setTimeout(() => {
    hideToast(host);
  }, ms);
  host.dataset.hideTimer = String(timer);
}

export function flashDayRouteFeedback(message: string, options: DayRouteFeedbackOptions = {}) {
  if (typeof document === 'undefined') return;
  const text = String(message || '').trim();
  if (!text) return;

  const host = ensureHost();
  const showClear = Boolean(options.showClear);
  const bottomOffset = window.matchMedia('(min-width: 1024px)').matches
    ? '28px'
    : 'calc(84px + env(safe-area-inset-bottom, 0px))';

  host.style.cssText = [
    'position:fixed',
    'left:50%',
    `bottom:${bottomOffset}`,
    'transform:translate(-50%,16px)',
    'z-index:1000',
    'max-width:min(90vw,460px)',
    'padding:10px 18px',
    'border-radius:9999px',
    'background:#0F1B2D',
    'color:#fff',
    'font:500 12.5px/1.3 system-ui,sans-serif',
    'box-shadow:0 18px 40px -18px rgba(15,27,45,.9)',
    'text-align:center',
    'display:flex',
    'align-items:center',
    'gap:10px',
    'opacity:0',
    'transition:opacity .22s ease,transform .22s ease',
    showClear ? 'pointer-events:auto' : 'pointer-events:none',
  ].join(';');

  host.replaceChildren();

  const label = document.createElement('span');
  label.textContent = text;
  label.style.cssText = 'min-width:0;flex:1;text-align:center';
  host.appendChild(label);

  if (showClear) {
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.setAttribute('aria-label', 'Очистить маршрут');
    clearBtn.title = 'Очистить маршрут';
    clearBtn.dataset.dayRouteToastClear = '1';
    clearBtn.innerHTML = trashSvg();
    clearBtn.style.cssText = [
      'flex-shrink:0',
      'display:inline-flex',
      'align-items:center',
      'justify-content:center',
      'width:2rem',
      'height:2rem',
      'min-height:0',
      'border-radius:9999px',
      'border:1px solid rgba(255,255,255,0.35)',
      'background:rgba(255,255,255,0.12)',
      'color:#fff',
      'cursor:pointer',
      'padding:0',
    ].join(';');
    clearBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      clearDayRoute();
      flashDayRouteFeedback('Маршрут очищен');
    });
    host.appendChild(clearBtn);
  }

  host.hidden = false;
  host.style.display = 'flex';
  window.requestAnimationFrame(() => {
    host.style.opacity = '1';
    host.style.transform = 'translate(-50%,0)';
  });
  scheduleHide(host, showClear ? HIDE_MS : HIDE_MS_PLAIN);
}
