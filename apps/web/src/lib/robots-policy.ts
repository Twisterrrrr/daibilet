export const ROBOTS_CRAWL_DISALLOW = [
  '/api/',
  '/account/',
  '/checkout/',
  '/login',
  '/admin/',
  '/reviews/write',
  '/preview-cards',
] as const;

/** Yandex-only parameters that never change the `/events` result set. */
export const YANDEX_EVENTS_CLEAN_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'gclid',
  'yclid',
  'ysclid',
  'fbclid',
  'ref',
  'view',
] as const;

export function resolveRobotsSiteUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  return (
    env.DAIBILET_SITE_URL ||
    env.NEXT_PUBLIC_SITE_URL ||
    'https://daibilet.ru'
  ).replace(/\/+$/, '');
}

function allowedCrawlerBlock(userAgent: string, cleanParams = false): string[] {
  const lines = [`User-agent: ${userAgent}`, 'Allow: /'];
  for (const path of ROBOTS_CRAWL_DISALLOW) lines.push(`Disallow: ${path}`);
  if (cleanParams) {
    lines.push(
      '# Yandex only: these parameters do not change the event result set.',
      `Clean-param: ${YANDEX_EVENTS_CLEAN_PARAMS.join('&')} /events`,
    );
  }
  return lines;
}

export function renderPublicRobotsTxt(siteUrl = 'https://daibilet.ru'): string {
  const blocks = [
    allowedCrawlerBlock('*'),
    allowedCrawlerBlock('Googlebot'),
    allowedCrawlerBlock('Yandex', true),
    ['User-agent: liliabots', 'Disallow: /'],
    ['User-agent: liliabot', 'Disallow: /'],
    [`Sitemap: ${siteUrl.replace(/\/+$/, '')}/sitemap.xml`],
  ];
  return `${blocks.map((lines) => lines.join('\n')).join('\n\n')}\n`;
}
