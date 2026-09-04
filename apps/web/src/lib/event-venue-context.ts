const INSTITUTION_HINTS = [
  { pattern: /пушкинск[^\s]*\s+музе/i, display: 'ГМИИ им Пушкина' },
  { pattern: /московск[^\s]*\s+зоопарк/i, display: 'Московский зоопарк' },
  { pattern: /нов[^\s]*\s+третьяков/i, display: 'Новая Третьяковская галерея' },
  { pattern: /третьяковск[^\s]*\s+галере/i, display: 'Третьяковская галерея' },
  { pattern: /эрмитаж/i, display: 'Государственный Эрмитаж' },
  { pattern: /кремл/i, display: 'Московский Кремль' },
  { pattern: /вднх/i, display: 'ВДНХ' },
];

const TITLE_INSTITUTION_PATTERNS = [
  /(?:^|[\s,:—-])(?:квест|экскурс(?:ия)?)[^,:]*?\s+по\s+([^,(]+)/iu,
  /(?:^|[\s,:—-])по\s+((?:новой\s+)?[а-яё][^,(]{3,80})/iu,
];

function normalizeKey(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/["«»]/g, '')
    .replace(/[^a-z0-9а-я]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractInstitutionPhraseFromTitle(title?: string | null): string | null {
  const text = String(title || '').trim();
  if (!text) return null;

  for (const pattern of TITLE_INSTITUTION_PATTERNS) {
    const match = text.match(pattern);
    const phrase = String(match?.[1] || '').trim();
    if (phrase.length >= 4) return phrase;
  }
  return null;
}

function matchInstitutionHint(phrase: string) {
  const normalized = normalizeKey(phrase);
  return INSTITUTION_HINTS.find((hint) => hint.pattern.test(normalized) || hint.pattern.test(phrase)) || null;
}

export function resolveInstitutionDisplayNameFromTitle(title?: string | null): string | null {
  const phrase = extractInstitutionPhraseFromTitle(title);
  if (!phrase) return null;
  const hint = matchInstitutionHint(phrase);
  if (hint) return hint.display;
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

type EventVenueContextInput = {
  title?: string | null;
  institutionVenue?: string | null;
  institutionVenueSlug?: string | null;
  institutionVenueId?: string | null;
};

export function resolveEventInstitutionLabel(input: EventVenueContextInput): string | null {
  const fromApi = String(input.institutionVenue || '').trim();
  if (fromApi) return fromApi;
  return resolveInstitutionDisplayNameFromTitle(input.title);
}
