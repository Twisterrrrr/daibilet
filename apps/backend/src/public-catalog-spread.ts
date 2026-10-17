/** Normalize cover URL so resized variants of the same asset share one key. */
export function normalizePublicSessionImageKey(imageUrl?: string | null): string | null {
  const raw = String(imageUrl || '').trim();
  if (!raw) return null;

  if (raw.includes('/_next/image') && /[?&]url=/.test(raw)) {
    try {
      const proxy = new URL(raw.replace(/&amp;/g, '&'), 'https://daibilet.ru');
      const inner = proxy.searchParams.get('url');
      if (inner) return normalizePublicSessionImageKey(inner);
    } catch {
      // fall through
    }
  }

  let pathname = raw;
  let search = '';
  try {
    const parsed = new URL(raw.replace(/&amp;/g, '&'), 'https://daibilet.ru');
    if (parsed.port === '443' || parsed.port === '80') parsed.port = '';
    pathname = parsed.pathname;
    search = parsed.search || '';
  } catch {
    const bare = raw.split('#')[0] || raw;
    const q = bare.indexOf('?');
    pathname = q >= 0 ? bare.slice(0, q) : bare;
    search = q >= 0 ? bare.slice(q) : '';
  }

  const normalizedPath = pathname.replace(/\/$/, '').toLowerCase();
  const file = decodeURIComponent(normalizedPath.split('/').filter(Boolean).pop() || '').toLowerCase();
  const sizeSuffixRe =
    /(?:[-_](?:\d{2,4}x\d{2,4}|w\d{2,4}|h\d{2,4}|q\d{2,3}|thumb|small|medium|large|cover|card|preview|resized?))+(?=\.[a-z0-9]+$)/i;

  if (search) {
    try {
      const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
      const dirtyAlias = params.get('dirtyAlias') || params.get('dirty_alias');
      if (dirtyAlias?.trim()) {
        const aliasFile = decodeURIComponent(dirtyAlias.trim()).toLowerCase().split('/').pop() || '';
        if (aliasFile) {
          const stripped = aliasFile.replace(sizeSuffixRe, '');
          return `img:${stripped}`;
        }
      }
    } catch {
      // fall through
    }
  }

  if (file && /\.(jpe?g|png|webp|gif|avif|bmp|svg)$/i.test(file)) {
    const stripped = file.replace(sizeSuffixRe, '');
    const oid = stripped.match(/^([a-f0-9]{24})\.(jpe?g|png|webp|gif|avif)$/i);
    if (oid?.[1]) return `tc-asset:${oid[1].toLowerCase()}`;
    const teploVariant = stripped.match(/^([a-f0-9]{8,})-\d+\.(jpe?g|png|webp|gif|avif|bmp|svg)$/i);
    if (teploVariant?.[1]) return `stem:${teploVariant[1].toLowerCase()}`;
    return `img:${stripped}`;
  }

  if (search) {
    try {
      const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
      const item = params.get('item') || params.get('id') || params.get('key');
      if (item?.trim()) return `img:q:${item.trim().toLowerCase()}`;
    } catch {
      // fall through
    }
  }

  return normalizedPath || null;
}

type SpreadSession = { imageUrl?: string | null; id: string; title?: string };

function spreadKey(session: SpreadSession): string {
  return normalizePublicSessionImageKey(session.imageUrl) ?? `__id:${session.id}`;
}

export const CATALOG_TITLE_NEAR_DUP_THRESHOLD = 0.66;

/** Lowercase, ё→е, strip punctuation — for soft title matching. */
export function normalizeCatalogTitleForSimilarity(title?: string | null): string {
  return String(title || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"'„“”`]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bigramCounts(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  if (text.length < 2) {
    if (text) counts.set(text, 1);
    return counts;
  }
  for (let i = 0; i < text.length - 1; i += 1) {
    const gram = text.slice(i, i + 2);
    counts.set(gram, (counts.get(gram) || 0) + 1);
  }
  return counts;
}

/** Sørensen–Dice on character bigrams (0..1). */
export function catalogTitleSimilarity(left?: string | null, right?: string | null): number {
  const a = normalizeCatalogTitleForSimilarity(left);
  const b = normalizeCatalogTitleForSimilarity(right);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const leftGrams = bigramCounts(a);
  const rightGrams = bigramCounts(b);
  let intersection = 0;
  let leftTotal = 0;
  let rightTotal = 0;
  for (const count of leftGrams.values()) leftTotal += count;
  for (const count of rightGrams.values()) rightTotal += count;
  if (!leftTotal || !rightTotal) return 0;

  for (const [gram, leftCount] of leftGrams) {
    const rightCount = rightGrams.get(gram);
    if (rightCount) intersection += Math.min(leftCount, rightCount);
  }
  return (2 * intersection) / (leftTotal + rightTotal);
}

/** True when titles share the same leading phrase (artist / series variants). */
export function catalogTitlesShareLeadingTokens(
  left?: string | null,
  right?: string | null,
  tokenCount = 3,
): boolean {
  const a = normalizeCatalogTitleForSimilarity(left).split(' ').filter(Boolean);
  const b = normalizeCatalogTitleForSimilarity(right).split(' ').filter(Boolean);
  if (a.length < tokenCount || b.length < tokenCount) return false;
  for (let i = 0; i < tokenCount; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function isCatalogTitleNearDuplicate(
  left?: string | null,
  right?: string | null,
  threshold = CATALOG_TITLE_NEAR_DUP_THRESHOLD,
): boolean {
  if (catalogTitlesShareLeadingTokens(left, right, 3)) return true;
  return catalogTitleSimilarity(left, right) >= threshold;
}

/**
 * Default catalog feed: keep one card per cover + drop near-duplicate titles (≥66% Dice).
 * Preserves input order (first wins after shuffle).
 * Title compares are blocked by the first two significant words for O(n) average cost.
 */
export function dedupeCatalogNearDuplicates<T extends SpreadSession>(
  sessions: T[],
  threshold = CATALOG_TITLE_NEAR_DUP_THRESHOLD,
): T[] {
  if (!Array.isArray(sessions) || sessions.length <= 1) return [...sessions];

  const kept: T[] = [];
  const seenImageKeys = new Set<string>();
  const keptByTitleBlock = new Map<string, string[]>();

  for (const session of sessions) {
    const imageKey = normalizePublicSessionImageKey(session.imageUrl);
    if (imageKey && seenImageKeys.has(imageKey)) continue;

    const title = normalizeCatalogTitleForSimilarity(session.title);
    if (title) {
      const block = titleBlockKey(title);
      const peers = keptByTitleBlock.get(block) || [];
      let nearDup = false;
      for (const prev of peers) {
        if (isCatalogTitleNearDuplicate(title, prev, threshold)) {
          nearDup = true;
          break;
        }
      }
      if (nearDup) continue;
      peers.push(title);
      keptByTitleBlock.set(block, peers);
    }

    if (imageKey) seenImageKeys.add(imageKey);
    kept.push(session);
  }

  return kept;
}

function titleBlockKey(normalizedTitle: string): string {
  const words = normalizedTitle.split(' ').filter(Boolean).slice(0, 2);
  return words.join(' ') || normalizedTitle.slice(0, 16);
}

export function seededShuffleSessions<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let state = seed >>> 0;
  for (let i = arr.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** Default «random»: shuffle near dates first; far dates only if hit/blockbuster or after near pool. */
export const CATALOG_RANDOM_NEAR_DAYS = 21;

export function isCatalogOpenDateSession(session: {
  kind?: string | null;
  sourceStatus?: string | null;
}): boolean {
  return (
    String(session.kind || '').toUpperCase() === 'OPEN_DATE' ||
    String(session.sourceStatus || '').toLowerCase() === 'open_date'
  );
}

export function isCatalogBlockbusterSession(session: {
  sessionCount?: number | null;
  landingSlugs?: string[] | null;
}): boolean {
  return (session.sessionCount || 0) >= 4 || (session.landingSlugs?.length || 0) > 0;
}

function catalogDaysUntilStart(startsAt: string | null | undefined, now: Date): number | null {
  if (!startsAt) return null;
  const ts = new Date(startsAt).getTime();
  if (!Number.isFinite(ts)) return null;
  const start = new Date(ts);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  return Math.round((eventDay.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Near-biased catalog shuffle:
 * - next {@link CATALOG_RANDOM_NEAR_DAYS} days (+ open-date) shuffle in front
 * - later dates stay in the tail, except blockbusters («Хит») which mix into the front pool
 */
export function seededNearBiasedShuffleSessions<
  T extends {
    startsAt?: string | null;
    kind?: string | null;
    sourceStatus?: string | null;
    sessionCount?: number | null;
    landingSlugs?: string[] | null;
  },
>(items: T[], seed: number, now = new Date(), nearDays = CATALOG_RANDOM_NEAR_DAYS): T[] {
  if (items.length <= 1) return [...items];

  const near: T[] = [];
  const farHits: T[] = [];
  const far: T[] = [];

  for (const session of items) {
    if (isCatalogOpenDateSession(session)) {
      near.push(session);
      continue;
    }
    const days = catalogDaysUntilStart(session.startsAt, now);
    if (days == null || days <= nearDays) {
      near.push(session);
      continue;
    }
    if (isCatalogBlockbusterSession(session)) farHits.push(session);
    else far.push(session);
  }

  return [
    ...seededShuffleSessions([...near, ...farHits], seed),
    ...seededShuffleSessions(far, seed ^ 0x9e3779b9),
  ];
}

/**
 * Interleave catalog rows so cards with the same cover never sit side-by-side when alternatives exist.
 */
export function spreadCatalogSessionsByCoverImage<T extends SpreadSession>(sessions: T[]): T[] {
  if (!Array.isArray(sessions) || sessions.length <= 1) return [...sessions];

  const buckets = new Map<string, T[]>();
  for (const session of sessions) {
    const key = spreadKey(session);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(session);
    else buckets.set(key, [session]);
  }

  if (buckets.size <= 1) return [...sessions];

  const queues = [...buckets.values()].sort((left, right) => right.length - left.length);
  const result: T[] = [];

  while (result.length < sessions.length) {
    const lastKey = result.length ? spreadKey(result[result.length - 1]!) : null;
    let picked = false;

    for (const queue of queues) {
      if (!queue.length) continue;
      const headKey = spreadKey(queue[0]!);
      if (lastKey && headKey === lastKey) continue;
      result.push(queue.shift()!);
      picked = true;
      break;
    }

    if (!picked) {
      const queue = queues.find((entry) => entry.length > 0);
      if (!queue) break;
      result.push(queue.shift()!);
    }
  }

  return result;
}
