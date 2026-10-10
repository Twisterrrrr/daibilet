/**
 * After Next redeploy, open tabs keep old chunk hashes → 404 / ChunkLoadError.
 * Shared by instrumentation-client, ChunkLoadRecovery, and public error UI.
 */

export const CHUNK_RELOAD_FLAG = 'daibilet-chunk-reload';
const CLEAR_AFTER_MS = 15_000;

const CHUNK_FAILURE_RE =
  /ChunkLoadError|Loading chunk [\d]+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module|CSS_CHUNK_LOAD_FAILED|Loading CSS chunk|Cannot read properties of undefined \(reading 'call'\)/i;

export function isChunkLoadFailure(message: string): boolean {
  return CHUNK_FAILURE_RE.test(String(message || ''));
}

export function isNextStaticAssetUrl(url: string): boolean {
  return /\/_next\/static\/(chunks|css|media)\//.test(url);
}

function reasonToMessage(reason: unknown): string {
  if (typeof reason === 'string') return reason;
  if (reason instanceof Error) {
    return [reason.name, reason.message].filter(Boolean).join(' ');
  }
  if (reason && typeof reason === 'object') {
    const rec = reason as { name?: unknown; message?: unknown };
    return [rec.name, rec.message].filter(Boolean).join(' ');
  }
  return String(reason ?? '');
}

/** Returns true if a reload was started. */
export function reloadOnceForChunkFailure(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_FLAG) === '1') return false;
    sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1');
  } catch {
    // sessionStorage unavailable - still attempt one reload
  }
  window.location.reload();
  return true;
}

export function attachChunkLoadRecovery(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const clearTimer = window.setTimeout(() => {
    try {
      sessionStorage.removeItem(CHUNK_RELOAD_FLAG);
    } catch {
      /* ignore */
    }
  }, CLEAR_AFTER_MS);

  const onError = (event: ErrorEvent) => {
    const target = event.target;
    if (target instanceof HTMLScriptElement && isNextStaticAssetUrl(target.src || '')) {
      reloadOnceForChunkFailure();
      return;
    }
    if (target instanceof HTMLLinkElement && isNextStaticAssetUrl(target.href || '')) {
      reloadOnceForChunkFailure();
      return;
    }

    const msg = [event.message, reasonToMessage(event.error)].filter(Boolean).join(' ');
    if (isChunkLoadFailure(msg)) reloadOnceForChunkFailure();
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    if (isChunkLoadFailure(reasonToMessage(event.reason))) reloadOnceForChunkFailure();
  };

  window.addEventListener('error', onError, true);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.clearTimeout(clearTimer);
    window.removeEventListener('error', onError, true);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
