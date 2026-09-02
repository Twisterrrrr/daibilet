/**
 * Soft-normalize ALL-CAPS supplier titles for public UI.
 * Keeps mixed-case / editorial titles unchanged.
 */

const LETTER_RE = /[A-Za-zА-Яа-яЁё]/g;
const UPPER_RE = /[A-ZА-ЯЁ]/g;

/** Russian glue words that stay lowercase inside a title. */
const TITLE_STOPWORDS = new Set([
  'а',
  'без',
  'в',
  'во',
  'для',
  'до',
  'за',
  'и',
  'из',
  'к',
  'как',
  'на',
  'над',
  'не',
  'ни',
  'о',
  'об',
  'от',
  'по',
  'под',
  'при',
  'с',
  'со',
  'у',
  'или',
  'но',
]);

function letterStats(value: string): { letters: number; upper: number } {
  const letters = value.match(LETTER_RE) || [];
  const upper = value.match(UPPER_RE) || [];
  return { letters: letters.length, upper: upper.length };
}

/** True when most letters are uppercase (supplier CAPS spam). */
export function isMostlyUppercaseTitle(value: string): boolean {
  const { letters, upper } = letterStats(value);
  if (letters < 4) return false;
  return upper / letters >= 0.7;
}

function capitalizeToken(word: string): string {
  if (!word) return word;
  return word[0]!.toLocaleUpperCase('ru-RU') + word.slice(1);
}

/**
 * Display title: ALL CAPS → sentence-ish title case (stopwords stay lower;
 * Latin brands Title Case). Mixed/editorial titles are left as-is.
 */
export function formatPublicTitle(raw: string | null | undefined): string {
  const value = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!value) return '';
  if (!isMostlyUppercaseTitle(value)) return value;

  const lowered = value.toLocaleLowerCase('ru-RU');
  let index = 0;
  return lowered.replace(/[a-zа-яё]+/gi, (word) => {
    const atStart = index === 0;
    index += 1;
    if (!atStart && TITLE_STOPWORDS.has(word)) return word;
    return capitalizeToken(word);
  });
}
