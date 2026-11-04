'use client';

import { useEffect } from 'react';

import { attachChunkLoadRecovery } from '@/lib/chunk-load-recovery';

/**
 * After Next redeploy, open tabs keep old chunk hashes -> 404/400 / ChunkLoadError.
 * One soft reload usually picks up the new HTML + manifests.
 *
 * instrumentation-client.ts attaches the same listener before hydration;
 * this copy covers pages where that file is not in the graph yet.
 *
 * Important: do NOT treat every error whose stack points at `/_next/static/chunks/`
 * as a chunk-load failure (hydration mismatches etc. live in those files too).
 */
export function ChunkLoadRecovery() {
  useEffect(() => attachChunkLoadRecovery(), []);
  return null;
}
