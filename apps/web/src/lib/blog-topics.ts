/** Быстрые темы блога для фильтра на `/blog` (помимо города/автора). */

export const BLOG_TOPIC_LABELS = {
  standup: 'Стендап',
  kids: 'С детьми',
  routes: 'Маршруты',
  concerts: 'Концерты',
  river: 'Река',
  tours: 'Экскурсии',
} as const;

export type BlogTopicId = keyof typeof BLOG_TOPIC_LABELS;

/** Порядок чипов на `/blog`. */
export const BLOG_TOPIC_ORDER: BlogTopicId[] = [
  'standup',
  'kids',
  'routes',
  'concerts',
  'river',
  'tours',
];

/** CHPU / landing → тема (совпадает с blog-listing-links). */
const LANDING_TO_TOPIC: Record<string, BlogTopicId> = {
  standup: 'standup',
  'family-kids': 'kids',
  'walking-tours': 'routes',
  'concerts-genre': 'concerts',
  'river-cruises': 'river',
  'moscow-dinner-boat': 'river',
  'bus-tours': 'tours',
  'country-tours': 'tours',
  excursions: 'tours',
};

/** Явный slug → тема, если эвристики по title слабые. */
const SLUG_TOPICS: Record<string, BlogTopicId[]> = {
  'spb-stendap-gid': ['standup'],
  'ekb-stendap-uralskiy-yumor': ['standup'],
  'kuda-poyti-s-detmi': ['kids'],
  'spb-s-rebenkom-v-dozhd': ['kids'],
  'moscow-2-dnya-samostoyatelno-marshrut': ['routes'],
  'sankt-peterburg-3-dnya-samostoyatelno': ['routes'],
  'kazan-2-3-dnya-samostoyatelno-karta': ['routes'],
  'kak-vybrat-koncert': ['concerts'],
  'koncerty-peterburg-osobnyak-klub-zal': ['concerts'],
  'muzyka-v-osobnyakah-spb': ['concerts'],
  'chto-poslushat-jazz': ['concerts'],
  'moskva-rechnye-progulki-kak-vybrat': ['river'],
  'moskva-rechnye-progulki-zaryade': ['river'],
  'rechnye-progulki-neva-kanaly-kak-vybrat': ['river'],
  'kazan-rechnye-progulki': ['river'],
  'uzhin-na-teplohode-moskva-kak-vybrat': ['river'],
  'moskva-avtobusnaya-obzornaya': ['tours'],
  'ekb-uralskiy-mars-bazhovskie-ekskursii': ['tours'],
  'spb-dvory-paradnye-kommunalki': ['tours'],
};

const HEURISTICS: Array<{ topic: BlogTopicId; re: RegExp }> = [
  { topic: 'standup', re: /стендап|standup|stendap|юмор|комик/i },
  { topic: 'kids', re: /с\s+дет|реб[её]н|семь|family|kids|planetarium|планетари/i },
  { topic: 'routes', re: /маршрут|самостоятельно|2\s*дня|3\s*дня|2-3\s*дня/i },
  { topic: 'concerts', re: /концерт|джаз|jazz|музык|особняк.*клуб|классик/i },
  { topic: 'river', re: /речн|теплоход|нева|москв[еа]-рек|каналы|ужин\s+на\s+теплоход/i },
  { topic: 'tours', re: /экскурси|обзорн|автобус|дворы|парадн|квест|escape/i },
];

export function blogTopicLabel(id: string): string {
  return BLOG_TOPIC_LABELS[id as BlogTopicId] || id;
}

export function parseBlogTopicParam(value: string | null | undefined): BlogTopicId | 'all' {
  const raw = String(value || '').trim();
  if (!raw || raw === 'all') return 'all';
  return raw in BLOG_TOPIC_LABELS ? (raw as BlogTopicId) : 'all';
}

export function resolveBlogTopics(input: {
  slug: string;
  title?: string | null;
  tag?: string | null;
  excerpt?: string | null;
  landingSlug?: string | null;
}): BlogTopicId[] {
  const found = new Set<BlogTopicId>();
  const slug = String(input.slug || '').trim();

  for (const id of SLUG_TOPICS[slug] || []) found.add(id);

  const landing = String(input.landingSlug || '').trim();
  if (landing && LANDING_TO_TOPIC[landing]) found.add(LANDING_TO_TOPIC[landing]);

  const haystack = [slug, input.title, input.tag, input.excerpt].filter(Boolean).join(' ');
  for (const rule of HEURISTICS) {
    if (rule.re.test(haystack)) found.add(rule.topic);
  }

  // tag «Семья» из frontmatter
  if (/семь|дет/i.test(String(input.tag || ''))) found.add('kids');

  return BLOG_TOPIC_ORDER.filter((id) => found.has(id));
}

export function postMatchesTopic(
  topics: BlogTopicId[] | undefined,
  topic: BlogTopicId | 'all',
): boolean {
  if (topic === 'all') return true;
  return Boolean(topics?.includes(topic));
}
