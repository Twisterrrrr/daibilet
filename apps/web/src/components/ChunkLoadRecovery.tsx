'use client';

import { useEffect } from 'react';

const RELOAD_FLAG = 'daibilet-chunk-reload';

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
    // sessionStorage unavailable — still attempt one reload
  }
  window.location.reload();
}

/**
 * After Next redeploy, open tabs keep old chunk hashes → 404 / ChunkLoadError.
 * One soft reload usually picks up the new HTML + manifests.
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    try {
      sessionStorage.removeItem(RELOAD_FLAG);
    } catch {
      /* ignore */
    }

    const onError = (event: ErrorEvent) => {
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

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
