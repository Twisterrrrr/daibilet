/** Teplohod и другие источники иногда отдают заглушку вместо обложки. */
export function isPlaceholderEventImageUrl(imageUrl?: string | null): boolean {
  const raw = String(imageUrl || '').trim();
  if (!raw) return true;

  const lower = raw.toLowerCase();
  if (lower.includes('placeholder.gif')) return true;
  if (/api\.teplohod\.info\/v1\/image\?item=&/i.test(raw)) return true;

  return false;
}

export function pickFirstUsableEventImageUrl(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const candidate of candidates) {
    if (candidate && !isPlaceholderEventImageUrl(candidate)) return candidate;
  }
  return null;
}
