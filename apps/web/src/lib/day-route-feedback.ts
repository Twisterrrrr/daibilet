/**
 * Lightweight DOM toast for day-route add/remove feedback.
 * No React tree required - works even if badge/button stores desync.
 */

const TOAST_ID = 'daibilet-day-route-toast';
const HIDE_MS = 2400;

export function flashDayRouteFeedback(message: string) {
  if (typeof document === 'undefined') return;
  const text = String(message || '').trim();
  if (!text) return;

  let host = document.getElementById(TOAST_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = TOAST_ID;
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    host.style.cssText = [
      'position:fixed',
      'left:50%',
      'bottom:1.25rem',
      'transform:translateX(-50%)',
      'z-index:99999',
      'max-width:min(22rem,calc(100vw - 2rem))',
      'padding:0.65rem 1rem',
      'border-radius:9999px',
      'background:#064e3b',
      'color:#fff',
      'font:600 13px/1.35 system-ui,sans-serif',
      'box-shadow:0 8px 24px rgba(0,0,0,.18)',
      'pointer-events:none',
      'text-align:center',
    ].join(';');
    document.body.appendChild(host);
  }

  host.textContent = text;
  host.hidden = false;
  const prev = Number(host.dataset.hideTimer || 0);
  if (prev) window.clearTimeout(prev);
  const timer = window.setTimeout(() => {
    host!.hidden = true;
  }, HIDE_MS);
  host.dataset.hideTimer = String(timer);
}
