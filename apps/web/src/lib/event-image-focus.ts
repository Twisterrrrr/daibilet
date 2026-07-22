/**
 * Кадрирование hero события: якорим на линию глаз (верхняя треть),
 * а не на object-top / геометрический центр.
 */

const DEFAULT_EVENT_HERO_OBJECT_POSITION = 'center 18%';

/** Точечные overrides по slug / sourceSlug / externalId. */
const EVENT_HERO_OBJECT_POSITION: Record<string, string> = {
  // Портрет лицом в камеру: глаза чуть выше «правила третей».
  'tc-6a319c0e3e6da873bc2af400-nurminskii-solnyi-koncert-perm-9-oktyabrya-nebar':
    'center 16%',
  '6a319c0e3e6da873bc2af400': 'center 16%',
  // Плотный хедшот: глаза ~45% кадра, дефолт 18% режет лоб/макушку.
  'tc-6a4cdfa9269f8c2690ba9ebb-aleksei-saprykin-chtenie': 'center 50%',
  '6a4cdfa9269f8c2690ba9ebb': 'center 50%',
  'evt_6a4cdfa9269f8c2690ba9ebb': 'center 50%',
};

function normalizeKey(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function resolveEventHeroObjectPosition(input: {
  slug?: string | null;
  sourceSlug?: string | null;
  externalId?: string | null;
  id?: string | null;
}): string {
  const candidates = [input.slug, input.sourceSlug, input.externalId, input.id]
    .map(normalizeKey)
    .filter(Boolean);

  for (const key of candidates) {
    if (EVENT_HERO_OBJECT_POSITION[key]) return EVENT_HERO_OBJECT_POSITION[key];
  }

  return DEFAULT_EVENT_HERO_OBJECT_POSITION;
}
