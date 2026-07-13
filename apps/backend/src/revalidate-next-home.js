/**
 * POST to Next internal revalidate after catalog sync (home ISR + unstable_cache).
 */
export async function revalidateNextHome(reason = 'manual') {
  const secret = process.env.DAIBILET_NEXT_REVALIDATE_SECRET?.trim();
  const base = (process.env.DAIBILET_WEB_REVALIDATE_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');

  if (!secret) {
    console.warn('[revalidate-next-home] DAIBILET_NEXT_REVALIDATE_SECRET missing — skip');
    return { ok: false, skipped: true, reason: 'missing_secret' };
  }

  const response = await fetch(`${base}/api/internal/revalidate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      tags: ['home-page', 'catalog-page'],
      paths: [
        '/',
        '/events',
        '/cities/sankt-peterburg',
        '/cities/moscow',
        '/rechnye-progulki',
        '/avtobusnye-ekskursii',
        '/api/public/stats',
      ],
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.warn(`[revalidate-next-home] HTTP ${response.status} (${reason}):`, payload);
    return { ok: false, status: response.status, payload, reason };
  }

  console.log(`[revalidate-next-home] OK (${reason}):`, payload);
  return { ok: true, payload, reason };
}
