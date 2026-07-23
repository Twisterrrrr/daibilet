'use client';

import { useEffect } from 'react';

const RELOAD_FLAG = 'daibilet-chunk-reload';
const CLEAR_AFTER_MS = 15_000;

function isChunkLoadFailure(message: string): boolean {
  return /ChunkLoadError|Loading chunk [\d]+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(
    message,
  );
}

function reloadOnce(): void {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG) === '1') return;
    sessionStorage.setItem(RELOAD_FLAG, '1');
  } catch {
    // sessionStorage unavailable - still attempt one reload
  }
  window.location.reload();
}

/**
 * After Next redeploy, open tabs keep old chunk hashes -> 404/400 / ChunkLoadError.
 * One soft reload usually picks up the new HTML + manifests.
 *
 * Important: do NOT treat every error whose stack points at `/_next/static/chunks/`
 * as a chunk-load failure (hydration mismatches etc. live in those files too) —
 * that plus clearing the flag on mount caused infinite full-page reloads.
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    // Clear the one-shot flag only after the page stayed healthy for a bit.
    const clearTimer = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(RELOAD_FLAG);
      } catch {
        /* ignore */
      }
    }, CLEAR_AFTER_MS);

    const onError = (event: ErrorEvent) => {
      // Failed <script src="/_next/static/chunks/..."> load after deploy.
      const target = event.target;
      if (target instanceof HTMLScriptElement) {
        const src = target.src || '';
        if (/\/_next\/static\/chunks\//.test(src)) {
          reloadOnce();
          return;
        }
      }

      const msg = [event.message, event.error?.message].filter(Boolean).join(' ');
      if (isChunkLoadFailure(msg)) reloadOnce();
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg =
        typeof reason === 'string'
          ? reason
          : reason instanceof Error
            ? reason.message
            : String(reason ?? '');
      if (isChunkLoadFailure(msg)) reloadOnce();
    };

    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.clearTimeout(clearTimer);
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
