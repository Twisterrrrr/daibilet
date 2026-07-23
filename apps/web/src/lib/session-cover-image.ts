import type { PublicSessionDto } from '@daibilet/contracts/public';

type PublicSession = PublicSessionDto;

/** Есть ли у события реальная обложка (не заглушка города / teplohod placeholder). */
export function sessionHasCoverImage(session: Pick<PublicSession, 'imageUrl'>): boolean {
  const url = String(session.imageUrl || '').trim();
  if (!url) return false;
  if (url.startsWith('/images/cities/')) return false;
  if (/placeholder\.gif/i.test(url)) return false;
  if (/api\.teplohod\.info\/v1\/image\?item=&/i.test(url)) return false;
  return true;
}

/** Нормализованный ключ картинки для сравнения дубликатов (strip query → basename). */
export function normalizeSessionImageKey(imageUrl?: string | null): string | null {
  const raw = String(imageUrl || '').trim();
  if (!raw) return null;

  // Next Image proxy: /_next/image?url=...
  if (raw.includes('/_next/image') && /[?&]url=/.test(raw)) {
    try {
      const proxy = new URL(raw, 'https://daibilet.ru');
      const inner = proxy.searchParams.get('url');
      if (inner) return normalizeSessionImageKey(inner);
    } catch {
      // fall through
    }
  }

  let pathname = raw;
  let search = '';
  try {
    const parsed = new URL(raw, 'https://daibilet.ru');
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
  if (file && /\.(jpe?g|png|webp|gif|avif|bmp|svg)$/i.test(file)) {
    return `img:${file}`;
  }

  // teplohod / CDN endpoints without file ext: use stable query token when present
  if (search) {
    try {
      const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
      const item = params.get('item') || params.get('id') || params.get('key');
      if (item && item.trim()) return `img:q:${item.trim().toLowerCase()}`;
    } catch {
      // fall through
    }
  }

  return normalizedPath || null;
}

export function filterSessionsWithCoverImage<T extends Pick<PublicSession, 'imageUrl'>>(sessions: T[]): T[] {
  return sessions.filter(sessionHasCoverImage);
}

/** Не ставит карточки с одинаковой обложкой подряд (сохраняет относительный порядок где возможно). */
export function spreadCatalogSessionsByCoverImage<T extends Pick<PublicSession, 'imageUrl'>>(sessions: T[]): T[] {
  if (sessions.length <= 1) return sessions;

  const pool = [...sessions];
  const result: T[] = [];

  while (pool.length > 0) {
    const lastKey = result.length ? normalizeSessionImageKey(result[result.length - 1]!.imageUrl) : null;
    let pickIndex = 0;

    if (lastKey) {
      const firstKey = normalizeSessionImageKey(pool[0]!.imageUrl);
      if (firstKey && firstKey === lastKey) {
        const alternateIndex = pool.findIndex((session) => {
          const key = normalizeSessionImageKey(session.imageUrl);
          return !key || key !== lastKey;
        });
        if (alternateIndex > 0) pickIndex = alternateIndex;
      }
    }

    result.push(pool.splice(pickIndex, 1)[0]!);
  }

  return result;
}

/** Разносит одинаковые обложки в сетке (соседи по строке и столбцу). */
export function spreadSessionsForGrid<T extends Pick<PublicSession, 'imageUrl'>>(
  sessions: T[],
  columns = 3,
): T[] {
  if (sessions.length <= 1 || columns <= 1) return spreadCatalogSessionsByCoverImage(sessions);

  let result = spreadCatalogSessionsByCoverImage(sessions);
  const maxPasses = result.length * columns;

  for (let pass = 0; pass < maxPasses; pass += 1) {
    let fixed = false;

    for (let i = 0; i < result.length; i += 1) {
      const key = normalizeSessionImageKey(result[i]!.imageUrl);
      if (!key) continue;

      const neighbors = [i + 1, i - 1, i + columns, i - columns].filter(
        (idx) => idx >= 0 && idx < result.length && idx !== i,
      );

      for (const neighborIndex of neighbors) {
        if (Math.abs(neighborIndex - i) === 1 && Math.floor(neighborIndex / columns) !== Math.floor(i / columns)) {
          continue;
        }

        const neighborKey = normalizeSessionImageKey(result[neighborIndex]!.imageUrl);
        if (!neighborKey || neighborKey !== key) continue;

        const swapIndex = result.findIndex((item, idx) => {
          if (idx === i || idx === neighborIndex) return false;
          const swapKey = normalizeSessionImageKey(item.imageUrl);
          if (!swapKey || swapKey === key) return false;
          const wouldConflict = [idx + 1, idx - 1, idx + columns, idx - columns].some((testIdx) => {
            if (testIdx < 0 || testIdx >= result.length || testIdx === idx) return false;
            if (Math.abs(testIdx - idx) === 1 && Math.floor(testIdx / columns) !== Math.floor(idx / columns)) {
              return false;
            }
            return normalizeSessionImageKey(result[testIdx]!.imageUrl) === swapKey;
          });
          return !wouldConflict;
        });

        if (swapIndex === -1) continue;
        [result[i], result[swapIndex]] = [result[swapIndex]!, result[i]!];
        fixed = true;
        break;
      }

      if (fixed) break;
    }

    if (!fixed) break;
  }

  return result;
}

export function arrangeCatalogSessions<T extends Pick<PublicSession, 'imageUrl'>>(
  sessions: T[],
  sort: 'time' | 'price' | 'popular',
): T[] {
  const withCover = filterSessionsWithCoverImage(sessions);
  if (sort === 'price' || sort === 'time') return withCover;
  return spreadCatalogSessionsByCoverImage(withCover);
}
