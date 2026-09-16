export const VITE_ADMIN_BASE =
  process.env.NEXT_PUBLIC_VITE_ADMIN_URL || 'https://admin.daibilet.ru/legacy';
export const PUBLIC_SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://daibilet.ru';
export const NEXT_ADMIN_BASE =
  process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.daibilet.ru';

export function viteAdminHref(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${VITE_ADMIN_BASE.replace(/\/$/, '')}${clean}`;
}

export function formatAdminNumber(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.max(0, Math.round(value || 0)));
}

export function formatAdminDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU');
}

export function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function buildPageHref(
  basePath: string,
  current: Record<string, string | undefined>,
  patch: Record<string, string | undefined | null>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...patch })) {
    if (value == null || value === '' || value === 'all') continue;
    if (key === 'page' && value === '1') continue;
    params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
