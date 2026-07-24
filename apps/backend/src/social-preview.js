const SITE_NAME = 'Дайбилет';
const SITE_ORIGIN = String(process.env.DAIBILET_PUBLIC_URL || 'https://daibilet.ru').replace(/\/+$/, '');

const DEFAULT_TITLE = 'Дайбилет — экскурсии, музеи и события';
const DEFAULT_DESCRIPTION =
  'Билеты на экскурсии, музеи, речные прогулки и события в городах России. Сравнение цен и расписания на Дайбилет.';

function cityHubSeoTitleFallback(cityName) {
  const name = String(cityName || '').trim() || 'Город';
  const short = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Moscow',
  }).format(new Date());
  return `${name}: афиша, экскурсии и билеты на сегодня, ${short} | ${SITE_NAME}`;
}

function venueSeoTitleFallback(venueName) {
  const name = String(venueName || '').trim() || 'Площадка';
  const short = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Moscow',
  }).format(new Date());
  return `${name}: афиша и билеты на сегодня, ${short} | ${SITE_NAME}`;
}

function resolveVenueShareTitle(venue) {
  const custom = String(venue?.seoTitle || '').trim();
  if (custom && /на сегодня/i.test(custom)) {
    return /\|?\s*Дайбилет\s*$/i.test(custom) ? custom : `${custom} | ${SITE_NAME}`;
  }
  return venueSeoTitleFallback(venue?.name || venue?.title);
}

const CITY_SHARE_ALIASES = {
  moskva: 'moscow',
  'sankt-peterburg': 'saint-petersburg',
  'nizhniy-novgorod': 'nizhny-novgorod',
  'velikiy-novgorod': 'veliky-novgorod',
  'rostov-na-donu': 'rostov-on-don',
  rostov: 'rostov-on-don',
};

const CITY_SHARE_SLUGS = new Set([
  'saint-petersburg',
  'moscow',
  'kazan',
  'kaliningrad',
  'vladivostok',
  'vologda',
  'irkutsk',
  'perm',
  'samara',
  'sochi',
  'ekaterinburg',
  'nizhny-novgorod',
  'novosibirsk',
  'krasnodar',
  'suzdal',
  'veliky-novgorod',
  'voronezh',
  'yaroslavl',
  'krasnoyarsk',
  'omsk',
  'chelyabinsk',
  'rostov-on-don',
  'saratov',
  'tula',
  'tver',
  'tyumen',
  'ufa',
  'ulan-ude',
  'ryazan',
  'stavropol',
  'tomsk',
  'ulyanovsk',
  'izhevsk',
  'orel',
  'orenburg',
  'penza',
  'volgograd',
  'sortavala',
]);

function cityShareImageFallback(slug, sourceSlug, name) {
  // Prefer latin public slug: sourceSlug may be translit garbage / cyrillic ("нижнии-новгород").
  const candidates = [slug, sourceSlug, name]
    .map((value) =>
      String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-'),
    )
    .filter(Boolean);
  for (const raw of candidates) {
    const imageSlug = CITY_SHARE_ALIASES[raw] || raw;
    if (CITY_SHARE_SLUGS.has(imageSlug)) return `/images/cities/${imageSlug}.png`;
  }
  return null;
}

const BOT_UA_RE =
  /(bot|telegram|facebook|twitter|linkedin|slack|whatsapp|discord|vkshare|preview|embedly|pinterest|skype|googlebot|bingpreview|yandex|mail\.ru)/i;

export function isSocialPreviewAgent(userAgent = '') {
  return BOT_UA_RE.test(String(userAgent || ''));
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function absoluteUrl(pathOrUrl) {
  const value = String(pathOrUrl || '').trim();
  if (!value) return SITE_ORIGIN;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_ORIGIN}${value.startsWith('/') ? value : `/${value}`}`;
}

function buildMetaTags({ title, description, url, image, type = 'website' }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeUrl = escapeHtml(url);
  const safeImage = image ? escapeHtml(absoluteUrl(image)) : '';

  return [
    `<title>${safeTitle}</title>`,
    `<meta name="description" content="${safeDescription}" />`,
    `<meta property="og:type" content="${escapeHtml(type)}" />`,
    `<meta property="og:locale" content="ru_RU" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${safeTitle}" />`,
    `<meta property="og:description" content="${safeDescription}" />`,
    `<meta property="og:url" content="${safeUrl}" />`,
    safeImage ? `<meta property="og:image" content="${safeImage}" />` : '',
    safeImage ? `<meta property="og:image:secure_url" content="${safeImage}" />` : '',
    safeImage ? `<meta property="og:image:width" content="1200" />` : '',
    safeImage ? `<meta property="og:image:height" content="630" />` : '',
    `<meta name="twitter:card" content="${safeImage ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${safeTitle}" />`,
    `<meta name="twitter:description" content="${safeDescription}" />`,
    safeImage ? `<meta name="twitter:image" content="${safeImage}" />` : '',
    `<link rel="canonical" href="${safeUrl}" />`,
  ]
    .filter(Boolean)
    .join('\n    ');
}

export function renderSocialPreviewHtml(meta, { redirectPath } = {}) {
  const title = meta?.title || DEFAULT_TITLE;
  const description = meta?.description || DEFAULT_DESCRIPTION;
  const url = absoluteUrl(meta?.url || redirectPath || '/');
  const image = meta?.image || null;
  const redirect = redirectPath ? absoluteUrl(redirectPath) : url;

  // Без мгновенного refresh: часть Telegram-клиентов уходит на SPA и теряет OG.
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${buildMetaTags({ title, description, url, image, type: meta?.type || 'website' })}
  </head>
  <body>
    <p><a href="${escapeHtml(redirect)}">${escapeHtml(title)}</a></p>
  </body>
</html>`;
}

export async function buildSocialPreviewForPath(db, pathname, builders) {
  const path = String(pathname || '').split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  const {
    buildPublicVenuePage,
    buildPublicEventPage,
    buildPublicArticlePage,
    buildPublicCityPage,
    publicVenueSlug,
    publicVenuePageTemplate,
  } = builders;

  let venueMatch = path.match(/^\/(venues|locations)\/([^/]+)$/);
  if (venueMatch) {
    const slug = decodeURIComponent(venueMatch[2]);
    const payload = await buildPublicVenuePage(db, slug);
    if (!payload?.venue) return null;
    const venue = payload.venue;
    const basePath = publicVenuePageTemplate(venue.type) === 'location' ? '/locations' : '/venues';
    const canonicalSlug = publicVenueSlug(venue.slug, venue.name || venue.title, venue.id);
    const canonicalPath = venue.canonicalPath || `${basePath}/${canonicalSlug}`;
    return {
      title: resolveVenueShareTitle(venue),
      description:
        venue.seoDescription ||
        venue.shortDescription ||
        venue.description ||
        `${venue.name}: события, расписание и билеты.`,
      url: canonicalPath,
      image: venue.heroImageUrl || null,
      redirectPath: canonicalPath,
    };
  }

  const eventMatch = path.match(/^\/events\/([^/]+)$/);
  if (eventMatch) {
    const slug = decodeURIComponent(eventMatch[1]);
    const payload = await buildPublicEventPage(db, slug);
    if (!payload?.event) return null;
    const event = payload.event;
    const canonicalPath = event.canonicalPath || `/events/${event.slug}`;
    return {
      title: event.seoTitle || `${event.title} | ${SITE_NAME}`,
      description: event.seoDescription || event.description || event.title,
      url: canonicalPath,
      image: event.imageUrl || null,
      redirectPath: canonicalPath,
    };
  }

  const blogMatch = path.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    const slug = decodeURIComponent(blogMatch[1]);
    const payload = await buildPublicArticlePage(db, slug);
    const article = payload?.article;
    if (!article) return null;
    const canonicalPath = article.canonicalPath || `/blog/${article.slug}`;
    const cover = article.coverImageUrl || null;
    const shareImage =
      cover && /\/images\/blog\/.+\.(jpe?g|png|webp)$/i.test(cover) && !/-og\./i.test(cover)
        ? cover.replace(/(\.(jpe?g|png|webp))$/i, '-og$1')
        : cover;
    return {
      title: article.seoTitle || article.title,
      description: article.seoDescription || article.excerpt || article.title,
      url: canonicalPath,
      image: shareImage,
      redirectPath: canonicalPath,
      type: 'article',
    };
  }

  const cityMatch = path.match(/^\/cities\/([^/]+)$/);
  if (cityMatch) {
    const slug = decodeURIComponent(cityMatch[1]);
    const payload = await buildPublicCityPage(db, slug);
    if (!payload?.city) return null;
    const city = payload.city;
    const canonicalPath = `/cities/${city.slug || slug}`;
    return {
      title: city.seoTitle || cityHubSeoTitleFallback(city.name),
      description: city.seoDescription || `${city.name}: экскурсии, музеи и события.`,
      url: canonicalPath,
      image: city.heroImageUrl || cityShareImageFallback(city.slug, city.sourceSlug, city.name),
      redirectPath: canonicalPath,
      type: 'website',
    };
  }

  if (path === '/blog') {
    return {
      title: `Блог - статьи и советы о событиях | ${SITE_NAME}`,
      description:
        'Статьи по концертам, театру и городским прогулкам. Как выбрать билет, куда пойти с детьми, что смотреть на этой неделе.',
      url: '/blog',
      image: null,
      redirectPath: '/blog',
    };
  }

  if (path === '/venues') {
    return {
      title: `Площадки: музеи, галереи и театры - билеты онлайн | ${SITE_NAME}`,
      description:
        'Каталог площадок Дайбилет: музеи, галереи, театры и арт-пространства. Актуальная афиша и электронные билеты.',
      url: '/venues',
      image: null,
      redirectPath: '/venues',
    };
  }

  if (path === '/locations') {
    return {
      title: `Локации: причалы, парки и точки старта экскурсий | ${SITE_NAME}`,
      description:
        'Куда приходить: причалы речных прогулок, парки, точки старта пеших экскурсий, автобусные остановки и встречи в аэропорту.',
      url: '/locations',
      image: null,
      redirectPath: '/locations',
    };
  }

  return null;
}
