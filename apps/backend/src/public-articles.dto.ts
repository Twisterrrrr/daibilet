import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPublicArticlePage, buildPublicArticlesList } from './dto.js';
import { createDb } from './db.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ARTICLES_CACHE_MS = 5 * 60 * 1000;

interface CachedPayload<T> {
  expiresAt: number;
  payload: T;
}

const listCache = new Map<string, CachedPayload<Awaited<ReturnType<typeof buildPublicArticlesList>>>>();
const pageCache = new Map<string, CachedPayload<Awaited<ReturnType<typeof buildPublicArticlePage>>>>();

let legacyDb: ReturnType<typeof createDb> | null = null;

function getLegacyDb() {
  if (!legacyDb) legacyDb = createDb(projectRoot);
  return legacyDb;
}

export function clearPublicArticlesDtoCache(): void {
  listCache.clear();
  pageCache.clear();
}

export async function buildPublicArticlesListDto(forceRefresh = false) {
  const cacheKey = 'list';
  const cached = listCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.payload;

  const payload = await buildPublicArticlesList(getLegacyDb());
  listCache.set(cacheKey, { expiresAt: Date.now() + ARTICLES_CACHE_MS, payload });
  return payload;
}

export async function buildPublicArticlePageDto(slug: string, forceRefresh = false) {
  const cacheKey = String(slug || '').trim().toLowerCase();
  const cached = pageCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.payload;

  const payload = await buildPublicArticlePage(getLegacyDb(), cacheKey);
  pageCache.set(cacheKey, { expiresAt: Date.now() + ARTICLES_CACHE_MS, payload });
  return payload;
}
