/** Метаданные фильтров блога: автор, тип, город (slug). */

export const BLOG_AUTHOR_LABELS: Record<string, string> = {
  max: 'Макс',
  anna: 'Анна',
  elena: 'Елена',
  igor: 'Игорь',
  artur: 'Артур',
  editorial: 'Редакция',
};

/** Публичный бейдж колонки (не «Колонка»). */
export const COLUMN_BADGE_LABEL = 'От автора';

export const BLOG_ARTICLE_TYPE_LABELS: Record<string, string> = {
  gid: 'Гид',
  column: COLUMN_BADGE_LABEL,
  digest: 'Дайджест',
  obzor: 'Обзор',
};

export const BLOG_CITY_FILTER_LABELS: Record<string, string> = {
  moscow: 'Москва',
  'saint-petersburg': 'Санкт-Петербург',
  kazan: 'Казань',
  ekaterinburg: 'Екатеринбург',
  kaliningrad: 'Калининград',
  'nizhny-novgorod': 'Нижний Новгород',
  regions: 'Регионы',
  multi: 'Несколько городов',
};

/** Цветные плашки городов в колонке «Свежее» (без purple glow). */
export const BLOG_CITY_BADGE_CLASS: Record<string, string> = {
  moscow: 'bg-rose-50 text-rose-800 ring-rose-200/80',
  'saint-petersburg': 'bg-sky-50 text-sky-900 ring-sky-200/80',
  kazan: 'bg-emerald-50 text-emerald-900 ring-emerald-200/80',
  ekaterinburg: 'bg-amber-50 text-amber-950 ring-amber-200/80',
  regions: 'bg-slate-100 text-slate-700 ring-slate-200/80',
  multi: 'bg-slate-100 text-slate-700 ring-slate-200/80',
};

export function blogCityBadgeClassName(citySlug?: string | null): string {
  const slug = String(citySlug || '')
    .trim()
    .toLowerCase();
  return (
    BLOG_CITY_BADGE_CLASS[slug] || 'bg-primary-50 text-primary-800 ring-primary-200/70'
  );
}

/** Цветные плашки тегов/тем на карточках ленты (без purple glow). */
const BLOG_TAG_BADGE_RULES: Array<{ re: RegExp; className: string }> = [
  { re: /маршрут|гид|обзор|дайджест/i, className: 'bg-sky-50 text-sky-900 ring-sky-200/80' },
  { re: /река|теплоход|мост|канал|нева/i, className: 'bg-cyan-50 text-cyan-900 ring-cyan-200/80' },
  { re: /концерт|музык|джаз|фестив/i, className: 'bg-rose-50 text-rose-900 ring-rose-200/80' },
  { re: /дет|семь|kids/i, className: 'bg-amber-50 text-amber-950 ring-amber-200/80' },
  { re: /стендап|юмор|комик/i, className: 'bg-emerald-50 text-emerald-900 ring-emerald-200/80' },
  { re: /экскурси|тур|дворы|парадн/i, className: 'bg-orange-50 text-orange-950 ring-orange-200/80' },
  { re: /москва|moscow/i, className: 'bg-rose-50 text-rose-800 ring-rose-200/80' },
  {
    re: /петербург|питер|spb|saint-petersburg/i,
    className: 'bg-sky-50 text-sky-900 ring-sky-200/80',
  },
  { re: /от автора|колонк/i, className: 'bg-primary-50 text-primary-900 ring-primary-200/70' },
];

export function blogTagBadgeClassName(tag?: string | null): string {
  const label = String(tag || '').trim();
  if (!label) return 'bg-primary-50 text-primary-800 ring-primary-200/70';
  for (const rule of BLOG_TAG_BADGE_RULES) {
    if (rule.re.test(label)) return rule.className;
  }
  return 'bg-primary-50 text-primary-800 ring-primary-200/70';
}

export type BlogArticleType = keyof typeof BLOG_ARTICLE_TYPE_LABELS;

/** Канонические метаданные по slug (статика + backfill эвристики). */
const SLUG_META: Record<
  string,
  {
    authorId: string;
    articleType: BlogArticleType;
    citySlug?: string;
    city?: string;
  }
> = {
  'fentezi-fest-bylinnyy-bereg': {
    authorId: 'max',
    articleType: 'column',
    citySlug: 'regions',
    city: 'Регионы',
  },
  'open-air-festy-vyhodnoi-ru': {
    authorId: 'max',
    articleType: 'column',
    citySlug: 'saint-petersburg',
    city: 'Санкт-Петербург',
  },
  'muzyka-v-osobnyakah-spb': {
    authorId: 'anna',
    articleType: 'column',
    citySlug: 'saint-petersburg',
    city: 'Санкт-Петербург',
  },
  'spb-s-rebenkom-v-dozhd': {
    authorId: 'elena',
    articleType: 'column',
    citySlug: 'saint-petersburg',
    city: 'Санкт-Петербург',
  },
  'kazan-na-vkus-master-klassy': {
    authorId: 'artur',
    articleType: 'column',
    citySlug: 'kazan',
    city: 'Казань',
  },
  'kak-vybrat-koncert': { authorId: 'editorial', articleType: 'gid' },
  'kuda-poyti-s-detmi': { authorId: 'editorial', articleType: 'gid' },
  'spb-rooftop-guide': {
    authorId: 'editorial',
    articleType: 'gid',
    citySlug: 'saint-petersburg',
    city: 'Санкт-Петербург',
  },
  'chto-poslushat-jazz': {
    authorId: 'editorial',
    articleType: 'gid',
    citySlug: 'moscow',
    city: 'Москва',
  },
  'moskva-rechnye-progulki-zaryade': {
    authorId: 'editorial',
    articleType: 'gid',
    citySlug: 'moscow',
    city: 'Москва',
  },
  'spb-dvory-paradnye-kommunalki': {
    authorId: 'editorial',
    articleType: 'gid',
    citySlug: 'saint-petersburg',
    city: 'Санкт-Петербург',
  },
  'spb-razvod-mostov-kakoi-reis': {
    authorId: 'editorial',
    articleType: 'gid',
    citySlug: 'saint-petersburg',
    city: 'Санкт-Петербург',
  },
  'spb-stendap-gid': {
    authorId: 'editorial',
    articleType: 'gid',
    citySlug: 'saint-petersburg',
    city: 'Санкт-Петербург',
  },
  'kazan-rechnye-progulki': {
    authorId: 'editorial',
    articleType: 'gid',
    citySlug: 'kazan',
    city: 'Казань',
  },
  'moskva-avtobusnaya-obzornaya': {
    authorId: 'editorial',
    articleType: 'obzor',
    citySlug: 'moscow',
    city: 'Москва',
  },
  'spb-planetarium-gid': {
    authorId: 'editorial',
    articleType: 'gid',
    citySlug: 'saint-petersburg',
    city: 'Санкт-Петербург',
  },
  'moskva-master-klass-emal': {
    authorId: 'editorial',
    articleType: 'gid',
    citySlug: 'moscow',
    city: 'Москва',
  },
  'afisha-regionalnye-goroda': {
    authorId: 'editorial',
    articleType: 'obzor',
    citySlug: 'regions',
    city: 'Регионы',
  },
  'moskva-immersivnye-vystavki': {
    authorId: 'editorial',
    articleType: 'gid',
    citySlug: 'moscow',
    city: 'Москва',
  },
  'moskva-kvesty-escape-room': {
    authorId: 'editorial',
    articleType: 'gid',
    citySlug: 'moscow',
    city: 'Москва',
  },
  'myuzikly-teatr-novichok-msk-spb': {
    authorId: 'editorial',
    articleType: 'gid',
    citySlug: 'multi',
    city: 'Несколько городов',
  },
  'moskva-vechernie-diskoteki-shou': {
    authorId: 'editorial',
    articleType: 'gid',
    citySlug: 'moscow',
    city: 'Москва',
  },
  'kazan-2-3-dnya-samostoyatelno-karta': {
    authorId: 'editorial',
    articleType: 'gid',
    citySlug: 'kazan',
    city: 'Казань',
  },
  'ekb-stendap-uralskiy-yumor': {
    authorId: 'editorial',
    articleType: 'gid',
    citySlug: 'ekaterinburg',
    city: 'Екатеринбург',
  },
  'ekb-uralskiy-mars-bazhovskie-ekskursii': {
    authorId: 'editorial',
    articleType: 'gid',
    citySlug: 'ekaterinburg',
    city: 'Екатеринбург',
  },
  'moscow-2-dnya-samostoyatelno-marshrut': {
    authorId: 'editorial',
    articleType: 'gid',
    citySlug: 'moscow',
    city: 'Москва',
  },
  'moskva-rechnye-progulki-kak-vybrat': {
    authorId: 'editorial',
    articleType: 'gid',
    citySlug: 'moscow',
    city: 'Москва',
  },
  'uzhin-na-teplohode-moskva-kak-vybrat': {
    authorId: 'editorial',
    articleType: 'gid',
    citySlug: 'moscow',
    city: 'Москва',
  },
  'sankt-peterburg-3-dnya-samostoyatelno': {
    authorId: 'editorial',
    articleType: 'gid',
    citySlug: 'saint-petersburg',
    city: 'Санкт-Петербург',
  },
  'rechnye-progulki-neva-kanaly-kak-vybrat': {
    authorId: 'editorial',
    articleType: 'gid',
    citySlug: 'saint-petersburg',
    city: 'Санкт-Петербург',
  },
  'koncerty-peterburg-osobnyak-klub-zal': {
    authorId: 'editorial',
    articleType: 'gid',
    citySlug: 'saint-petersburg',
    city: 'Санкт-Петербург',
  },
};

export function authorLabel(authorId?: string | null): string {
  const id = String(authorId || 'editorial').trim().toLowerCase() || 'editorial';
  return BLOG_AUTHOR_LABELS[id] || 'Редакция';
}

export function isColumnArticle(articleType?: string | null): boolean {
  const type = String(articleType || '')
    .trim()
    .toLowerCase();
  return type === 'column' || type === 'kolonka';
}

/** Нормализует тег листинга: устаревшее «Колонка» → «От автора». */
export function normalizeBlogTagLabel(tag?: string | null, articleType?: string | null): string | null {
  if (isColumnArticle(articleType)) return COLUMN_BADGE_LABEL;
  const raw = String(tag || '').trim();
  if (!raw) return null;
  if (raw === 'Колонка' || raw.toLowerCase() === 'column') return COLUMN_BADGE_LABEL;
  return raw;
}

/** Курсивная подпись в конце колонки. */
export function columnAuthorSignature(authorName?: string | null): string | null {
  const name = String(authorName || '').trim();
  if (!name || name === 'Редакция') return null;
  return `${name}, штатный корреспондент Дайбилет`;
}

/**
 * Убирает из body колонки то, что UI рисует сам:
 * лид «*Авторская колонка…*» и хвост «*Имя, штатный корреспондент Дайбилет*».
 */
export function stripColumnBodyChrome(content?: string | null): string {
  let text = String(content || '').replace(/\r\n/g, '\n').trim();
  if (!text) return '';
  text = text.replace(/^\*[^*\n]*Авторская колонка[^*\n]*\*\s*/u, '');
  text = text.replace(/\n?\s*\*[^*\n]*,\s*штатный корреспондент Дайбилет\*\s*$/u, '');
  return text.trim();
}

/**
 * Убирает SEO/excerpt-префикс вида «Колонка Макса:» / «Авторская колонка Анны:».
 * Не трогает фразы вроде «Колонка о том, как…» (без имени с заглавной).
 */
export function stripColumnMetaPrefix(text?: string | null): string {
  const raw = String(text || '').trim();
  if (!raw) return '';
  const stripped = raw
    .replace(/^(?:Авторская\s+)?[Кк]олонка\s+\p{Lu}[^:]{0,80}:\s*/u, '')
    .trim();
  if (!stripped || stripped === raw) return raw;
  return stripped.charAt(0).toLocaleUpperCase('ru-RU') + stripped.slice(1);
}

/** Имя автора колонки - brand blue; «Редакция» и прочие - нейтральный slate. */
export function blogAuthorNameClassName(
  articleType?: string | null,
  surface: 'light' | 'dark' = 'light',
): string {
  if (isColumnArticle(articleType)) {
    return surface === 'dark' ? 'font-medium text-primary-300' : 'font-medium text-primary-600';
  }
  return surface === 'dark' ? 'font-medium text-white/90' : 'font-medium text-slate-600';
}

export function articleTypeLabel(type?: string | null): string {
  const key = String(type || 'gid').trim().toLowerCase();
  return BLOG_ARTICLE_TYPE_LABELS[key] || BLOG_ARTICLE_TYPE_LABELS.gid;
}

export function cityFilterLabel(citySlug?: string | null, cityName?: string | null): string {
  const slug = String(citySlug || '').trim().toLowerCase();
  if (slug && BLOG_CITY_FILTER_LABELS[slug]) return BLOG_CITY_FILTER_LABELS[slug];
  if (cityName) return cityName;
  return 'Без города';
}

export function resolveSlugBlogMeta(slug: string): {
  authorId: string;
  authorName: string;
  articleType: BlogArticleType;
  citySlug: string | null;
  city: string | null;
} {
  const hit = SLUG_META[slug];
  if (hit) {
    return {
      authorId: hit.authorId,
      authorName: authorLabel(hit.authorId),
      articleType: hit.articleType,
      citySlug: hit.citySlug || null,
      city: hit.city || null,
    };
  }

  // Эвристики для новых slug без явной записи
  const lower = slug.toLowerCase();
  let articleType: BlogArticleType = 'gid';
  if (lower.includes('afisha-nedeli') || lower.includes('digest')) articleType = 'digest';
  else if (lower.includes('obzor') || lower.includes('obzorn')) articleType = 'obzor';
  else if (lower.includes('column') || lower.includes('kolonka')) articleType = 'column';

  let citySlug: string | null = null;
  let city: string | null = null;
  if (lower.startsWith('moskva-') || lower.includes('-msk')) {
    citySlug = 'moscow';
    city = 'Москва';
  } else if (lower.startsWith('spb-') || lower.includes('-spb') || lower.includes('peterburg')) {
    citySlug = 'saint-petersburg';
    city = 'Санкт-Петербург';
  } else if (lower.startsWith('kazan-')) {
    citySlug = 'kazan';
    city = 'Казань';
  } else if (lower.startsWith('ekb-') || lower.includes('ekaterinburg') || lower.includes('ural')) {
    citySlug = 'ekaterinburg';
    city = 'Екатеринбург';
  } else if (lower.includes('regional') || lower.includes('region')) {
    citySlug = 'regions';
    city = 'Регионы';
  }

  return {
    authorId: 'editorial',
    authorName: 'Редакция',
    articleType,
    citySlug,
    city,
  };
}

/** Нормализация citySlug для фильтра (в т.ч. pseudo-города regions/multi). */
export function normalizeBlogCitySlug(
  citySlug?: string | null,
  cityName?: string | null,
  fallbackSlug?: string | null,
): string | null {
  const raw = String(citySlug || fallbackSlug || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
  if (raw === 'spb' || raw === 'petersburg' || raw === 'sankt-peterburg' || raw === 'peterburg') {
    return 'saint-petersburg';
  }
  if (raw === 'msk' || raw === 'moskva') return 'moscow';
  if (raw === 'ekb' || raw === 'yekaterinburg') return 'ekaterinburg';
  if (raw === 'nizhniy-novgorod' || raw === 'nizhny-novgorod') return 'nizhny-novgorod';

  const name = String(cityName || citySlug || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
  const haystack = `${raw} ${name}`.trim();
  if (haystack.includes('москв')) return 'moscow';
  if (haystack.includes('петербург') || haystack.includes('санкт')) return 'saint-petersburg';
  if (haystack.includes('казан')) return 'kazan';
  if (haystack.includes('екатеринбург') || haystack.includes('уральск')) return 'ekaterinburg';
  if (haystack.includes('калининград')) return 'kaliningrad';
  // «Нижний Новгород» vs «Великий Новгород»: нужен маркер «нижн».
  if (haystack.includes('нижн') && haystack.includes('новгород')) return 'nizhny-novgorod';
  if (haystack.includes('регион')) return 'regions';

  if (raw && BLOG_CITY_FILTER_LABELS[raw]) return raw;
  // Только slug-like токены (не кириллические display-name вроде «нижний новгород»).
  if (raw && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw)) return raw;
  return null;
}
