/**
 * Shared on-disk snapshot of public catalog DTO sessions (+ optional legacy indexes).
 * Lets API serve stale instantly while rebuild runs in Catalog Worker / child
 * (INC.504.4 / INC.504.5c: never block the API event loop on ~3k session rebuild).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PublicSessionDto } from './types/public.js';

/** Serializable legacy indexes (session id pointers; hydrate to Maps in dto.js). */
export type PublicCatalogDiskIndexes = {
  destinationIndex: Record<string, string[]>;
  venueIndex: Record<string, string[]>;
  slugIndex: Record<string, string>;
  catalogFacets: unknown;
};

export interface PublicCatalogDiskSnapshot {
  /** v1 = sessions only; v2 = sessions + indexes */
  version: 1 | 2;
  builtAt: number;
  expiresAt: number;
  staleUntil: number;
  sessions: PublicSessionDto[];
  indexes?: PublicCatalogDiskIndexes;
  /** Byte length of previous good write (anomaly guard). */
  sessionsBytes?: number;
}

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** Default timer interval for Catalog Worker (systemd OnUnitActiveSec=8min). */
export const PUBLIC_CATALOG_WORKER_INTERVAL_MS = Math.max(
  60_000,
  Number(process.env.DAIBILET_CATALOG_WORKER_INTERVAL_MS || 8 * 60 * 1000),
);

/** P1 if disk builtAt older than this (default 2× worker interval). */
export const PUBLIC_CATALOG_STALE_ALERT_MS = Math.max(
  PUBLIC_CATALOG_WORKER_INTERVAL_MS,
  Number(process.env.DAIBILET_CATALOG_STALE_ALERT_MS || 2 * PUBLIC_CATALOG_WORKER_INTERVAL_MS),
);

export function resolvePublicCatalogDiskCachePath(): string {
  const fromEnv = String(process.env.DAIBILET_PUBLIC_CATALOG_DISK_CACHE || '').trim();
  if (fromEnv) return fromEnv;
  return path.join(PROJECT_ROOT, 'var', 'cache', 'public-catalog-dto.json');
}

export function loadPublicCatalogDiskCache(): PublicCatalogDiskSnapshot | null {
  const filePath = resolvePublicCatalogDiskCachePath();
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as PublicCatalogDiskSnapshot;
    if ((parsed?.version !== 1 && parsed?.version !== 2) || !Array.isArray(parsed.sessions) || !parsed.builtAt) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn(
      `Public catalog disk cache read failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

/**
 * Atomic write with empty / anomaly guards (do not clobber a good cache).
 * Returns false when write was skipped.
 */
export function writePublicCatalogDiskCache(snapshot: PublicCatalogDiskSnapshot): boolean {
  const filePath = resolvePublicCatalogDiskCachePath();
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  if (!Array.isArray(snapshot.sessions) || snapshot.sessions.length === 0) {
    console.error(
      'CRITICAL P1: Public catalog disk write blocked - empty sessions (keeping previous cache)',
    );
    return false;
  }

  const prev = loadPublicCatalogDiskCache();
  if (prev?.sessions?.length) {
    const ratio = snapshot.sessions.length / prev.sessions.length;
    if (ratio < 0.5) {
      console.error(
        `CRITICAL P1: Public catalog disk write blocked - anomaly size ${snapshot.sessions.length} vs prev ${prev.sessions.length} (keeping previous cache)`,
      );
      return false;
    }
  }

  const payload: PublicCatalogDiskSnapshot = {
    ...snapshot,
    version: snapshot.indexes ? 2 : snapshot.version || 1,
    sessionsBytes: Buffer.byteLength(JSON.stringify(snapshot.sessions), 'utf8'),
  };

  const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  try {
    fs.writeFileSync(tmp, JSON.stringify(payload));
    fs.renameSync(tmp, filePath);
    return true;
  } catch (error) {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    console.warn(
      `Public catalog disk cache write failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

export function resolveCatalogRebuildMode(): 'inline' | 'child' | 'off' {
  const raw = String(process.env.DAIBILET_CATALOG_REBUILD_MODE || '').trim().toLowerCase();
  if (raw === 'inline' || raw === 'child' || raw === 'off') return raw;
  // Next public process: never run heavy rebuild on the request event loop.
  if (process.env.DAIBILET_WEB_PORT || process.env.NEXT_RUNTIME) return 'child';
  return 'inline';
}

export function resolveCatalogRebuildLockPath(): string {
  const fromEnv = String(process.env.DAIBILET_CATALOG_REBUILD_LOCK || '').trim();
  if (fromEnv) return fromEnv;
  if (process.platform === 'win32') {
    return path.join(os.tmpdir(), 'daibilet-catalog-dto.lock');
  }
  return '/var/lock/daibilet-catalog-dto.lock';
}

export function resolveCatalogRebuildScriptPath(): string {
  return path.join(PROJECT_ROOT, 'scripts', 'rebuild-public-catalog-dto-cache.mjs');
}

/** Journal P1 when disk catalog is older than 2× worker interval (rate-limited). */
let lastCatalogStalenessLogAt = 0;

export function logCatalogDiskStalenessIfNeeded(now = Date.now()): void {
  const disk = loadPublicCatalogDiskCache();
  if (!disk?.builtAt) {
    if (now - lastCatalogStalenessLogAt > 60_000) {
      lastCatalogStalenessLogAt = now;
      console.error('CRITICAL P1: catalog disk staleness - missing public-catalog-dto.json');
    }
    return;
  }
  const age = now - disk.builtAt;
  if (age > PUBLIC_CATALOG_STALE_ALERT_MS) {
    if (now - lastCatalogStalenessLogAt < 5 * 60_000) return;
    lastCatalogStalenessLogAt = now;
    console.error(
      `CRITICAL P1: catalog disk staleness ageMs=${age} builtAt=${disk.builtAt} thresholdMs=${PUBLIC_CATALOG_STALE_ALERT_MS} sessions=${disk.sessions?.length || 0}`,
    );
  }
}
