/**
 * Кадрирование афиш события: якорим на линию глаз (верхняя треть),
 * а не на object-top / геометрический центр.
 *
 * Hero и карточки каталога делят overrides; default у карточек чуть мягче
 * под агрессивный 16:9 crop портретных афиш.
 */

const DEFAULT_EVENT_HERO_OBJECT_POSITION = 'center 18%';

/** 16:9 card: типичный хедшот держит глаза+лоб лучше, чем center 50%. */
const DEFAULT_EVENT_CARD_OBJECT_POSITION = 'center 20%';

/** Точечные overrides по slug / sourceSlug / externalId. */
const EVENT_IMAGE_OBJECT_POSITION: Record<string, string> = {
  // Портрет лицом в камеру: глаза чуть выше «правила третей».
  'tc-6a319c0e3e6da873bc2af400-nurminskii-solnyi-koncert-perm-9-oktyabrya-nebar':
    'center 16%',
  '6a319c0e3e6da873bc2af400': 'center 16%',
  // Плотный хедшот: глаза ~45% кадра, дефолт 18%/20% режет лоб/макушку.
  'tc-6a4cdfa9269f8c2690ba9ebb-aleksei-saprykin-chtenie': 'center 50%',
  '6a4cdfa9269f8c2690ba9ebb': 'center 50%',
  'evt_6a4cdfa9269f8c2690ba9ebb': 'center 50%',
};

function normalizeKey(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function resolveEventImageObjectPosition(
  input: {
    slug?: string | null;
    sourceSlug?: string | null;
    externalId?: string | null;
    id?: string | null;
  },
  fallback: string,
): string {
  const candidates = [input.slug, input.sourceSlug, input.externalId, input.id]
    .map(normalizeKey)
    .filter(Boolean);

  for (const key of candidates) {
    if (EVENT_IMAGE_OBJECT_POSITION[key]) return EVENT_IMAGE_OBJECT_POSITION[key];
  }

  return fallback;
}

export function resolveEventHeroObjectPosition(input: {
  slug?: string | null;
  sourceSlug?: string | null;
  externalId?: string | null;
  id?: string | null;
}): string {
  return resolveEventImageObjectPosition(input, DEFAULT_EVENT_HERO_OBJECT_POSITION);
}

export function resolveEventCardObjectPosition(input: {
  slug?: string | null;
  sourceSlug?: string | null;
  externalId?: string | null;
  id?: string | null;
}): string {
  return resolveEventImageObjectPosition(input, DEFAULT_EVENT_CARD_OBJECT_POSITION);
}
