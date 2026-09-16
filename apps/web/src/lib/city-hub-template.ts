export type CityHubTemplate = 'default' | 'editorial';

/** Пилотные slug для optional allowlist (env). Не включаются сами по себе. */
export const CITY_HUB_EDITORIAL_PILOT_SLUGS = [
  'sankt-peterburg',
  'saint-petersburg',
  'moscow',
] as const;

function firstQueryValue(value: string | string[] | null | undefined): string | null {
  if (value == null) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim().toLowerCase();
  return trimmed || null;
}

function parseAllowlist(envValue: string | null | undefined): Set<string> {
  if (!envValue?.trim()) return new Set();
  return new Set(
    envValue
      .split(/[,;\s]+/)
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Выбор шаблона хаба.
 * - `?hub=editorial` → editorial (любой город)
 * - `?hub=default` → всегда default (даже на allowlist)
 * - иначе, если slug в `CITY_HUB_EDITORIAL_SLUGS` → editorial
 * - иначе default (фаза 1)
 */
export function resolveCityHubTemplate({
  slug,
  hubQuery,
  allowlistEnv = process.env.CITY_HUB_EDITORIAL_SLUGS,
}: {
  slug: string;
  hubQuery?: string | string[] | null;
  allowlistEnv?: string | null;
}): CityHubTemplate {
  const hub = firstQueryValue(hubQuery);
  if (hub === 'editorial') return 'editorial';
  if (hub === 'default') return 'default';

  const allowlist = parseAllowlist(allowlistEnv);
  if (!allowlist.size) return 'default';

  const normalized = slug.trim().toLowerCase();
  if (allowlist.has(normalized)) return 'editorial';
  return 'default';
}
