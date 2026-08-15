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
  // Inline `display:flex` beats the HTML `hidden` attribute's UA `display:none`,
  // so the toast stayed visible forever after add. Hide via display explicitly.
  host.hidden = true;
  host.style.display = 'none';
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

  host.style.cssText = [
    'position:fixed',
    'left:50%',
    'bottom:1.25rem',
    'transform:translateX(-50%)',
    'z-index:99999',
    'max-width:min(18rem,calc(100vw - 2rem))',
    'padding:0.55rem 0.75rem',
    'border-radius:9999px',
    'background:#064e3b',
    'color:#fff',
    'font:600 13px/1.3 system-ui,sans-serif',
    'box-shadow:0 8px 24px rgba(0,0,0,.18)',
    'text-align:center',
    'display:flex',
    'align-items:center',
    'gap:0.45rem',
    showClear ? 'pointer-events:auto' : 'pointer-events:none',
  ].join(';');

  host.replaceChildren();

  const label = document.createElement('span');
  label.textContent = text;
  label.style.cssText = 'min-width:0;flex:1;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
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
  scheduleHide(host, showClear ? HIDE_MS : HIDE_MS_PLAIN);
}
