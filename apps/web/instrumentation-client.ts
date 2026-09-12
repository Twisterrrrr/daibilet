/**
 * Runs before hydration. Catches stale /_next/static chunks after a deploy
 * earlier than ChunkLoadRecovery in the React tree (which may already be dead).
 */
import { attachChunkLoadRecovery } from './src/lib/chunk-load-recovery';

attachChunkLoadRecovery();
