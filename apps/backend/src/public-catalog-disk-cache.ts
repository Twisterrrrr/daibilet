/**
 * Shared on-disk snapshot of public catalog DTO sessions.
 * Lets Next serve stale instantly while rebuild runs in a child/cron process
 * (INC.504.4: never block the web event loop on ~2.6k session rebuild).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PublicSessionDto } from './types/public.js';

export interface PublicCatalogDiskSnapshot {
  version: 1;
  builtAt: number;
  expiresAt: number;
  staleUntil: number;
  sessions: PublicSessionDto[];
}

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

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
    if (parsed?.version !== 1 || !Array.isArray(parsed.sessions) || !parsed.builtAt) return null;
    return parsed;
  } catch (error) {
    console.warn(
      `Public catalog disk cache read failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

export function writePublicCatalogDiskCache(snapshot: PublicCatalogDiskSnapshot): void {
  const filePath = resolvePublicCatalogDiskCachePath();
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  try {
    fs.writeFileSync(tmp, JSON.stringify(snapshot));
    fs.renameSync(tmp, filePath);
  } catch (error) {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    console.warn(
      `Public catalog disk cache write failed: ${error instanceof Error ? error.message : String(error)}`,
    );
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
