/** Teplohod и другие источники иногда отдают заглушку вместо обложки. */
export function isPlaceholderEventImageUrl(imageUrl?: string | null): boolean {
  const raw = String(imageUrl || '').trim();
  if (!raw) return true;

  const lower = raw.toLowerCase();
  if (lower.includes('placeholder.gif')) return true;
  if (/api\.teplohod\.info\/v1\/image\?item=&/i.test(raw)) return true;
  // Without dirtyAlias upstream returns HTML 400; next/image then fails with "upstream response is invalid".
  if (/api\.teplohod\.info\/v1\/image\?/i.test(raw) && !/dirtyAlias=/i.test(raw)) return true;

  return false;
}

/**
 * Usable catalog cover for Event/Venue tiles (CDN or local events/venues assets).
 * City placeholders are never treated as real covers.
 */
export function isUsableCatalogImageUrl(imageUrl?: string | null): boolean {
  const raw = String(imageUrl || '').trim();
  if (!raw || isPlaceholderEventImageUrl(raw)) return false;
  if (raw.startsWith('/images/cities/')) return false;
  if (/^https?:\/\//i.test(raw)) return true;
  // Local TC overrides + generated covers under /images/events|venues/
  if (/^\/images\/(events|venues)\//i.test(raw)) return true;
  return false;
}

/**
 * Live Teplohod API отдаёт pre-signed S3 URL (`s3.twcstorage.ru/...`, TTL ~6ч).
 * В БД/кэше они протухают → серые карточки на главной.
 * Канон: стабильный прокси `api.teplohod.info/v1/image?item=EventN&dirtyAlias=file`.
 */
export function stabilizeTeplohodImageUrl(imageUrl?: string | null): string | null {
  const raw = String(imageUrl || '').trim();
  if (!raw) return null;

  const signedMatch = raw.match(
    /teplohod-(?:private|public)\/images\/cache\/Events\/(Event\d+)\/([^/?#]+)/i,
  );
  const item = signedMatch?.[1];
  const dirtyAlias = signedMatch?.[2];
  if (item && dirtyAlias) {
    return `https://api.teplohod.info/v1/image?item=${encodeURIComponent(item)}&dirtyAlias=${encodeURIComponent(dirtyAlias)}`;
  }

  // Уже стабильный URL, но с лишней подписью/мусором в query — не трогаем.
  return raw;
}

export function pickFirstUsableEventImageUrl(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const candidate of candidates) {
    if (!candidate || isPlaceholderEventImageUrl(candidate)) continue;
    const stabilized = stabilizeTeplohodImageUrl(candidate);
    if (stabilized && !isPlaceholderEventImageUrl(stabilized)) return stabilized;
  }
  return null;
}
