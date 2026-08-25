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
    if (oid) return `tc-asset:${oid[1].toLowerCase()}`;
    const teploVariant = stripped.match(/^([a-f0-9]{8,})-\d+\.(jpe?g|png|webp|gif|avif|bmp|svg)$/i);
    if (teploVariant) return `stem:${teploVariant[1].toLowerCase()}`;
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

type SpreadSession = { imageUrl?: string | null; id: string };

function spreadKey(session: SpreadSession): string {
  return normalizePublicSessionImageKey(session.imageUrl) ?? `__id:${session.id}`;
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
