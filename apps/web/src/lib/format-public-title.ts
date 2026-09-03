/**
 * Soft-normalize public event/venue titles for UI:
 * - strip emojis / supplier CAPS
 * - drop trailing date-time crumbs duplicated in meta
 * - drop schedule parentheses like «(начало … 18:45)»
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

const MONTH_TOKEN =
  '(?:январ[ья]|феврал[ья]|март[а]?|апрел[ья]|ма[йя]|июн[ья]|июл[ья]|август[а]?|сентябр[ья]|октябр[ья]|ноябр[ья]|декабр[ья]|янв\\.?|фев\\.?|мар\\.?|апр\\.?|мая|июн\\.?|июл\\.?|авг\\.?|сен\\.?|окт\\.?|ноя\\.?|дек\\.?)';

/** Emoji / pictographs (incl. ZWJ sequences and variation selectors). */
const EMOJI_RE =
  /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F|\uFE0E)?(?:\u200D(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F|\uFE0E)?)*/gu;

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

function softCaseTitle(value: string): string {
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

/** Parentheses that only carry schedule / start-time noise. */
function isScheduleParenInner(inner: string): boolean {
  const text = inner.trim();
  if (!text) return true;
  if (!/(?:начало|старт|сбор|отправление|время|сеанс|в\s+\d{1,2}[:.]\d{2}|\d{1,2}[:.]\d{2})/i.test(text)) {
    return false;
  }
  // Keep creative subtitles without clock crumbs.
  if (!/\d/.test(text)) return false;
  return true;
}

function stripScheduleParens(value: string): string {
  return value
    .replace(/[([（]\s*([^)\]）]{0,120}?)\s*[)\]）]/g, (full, inner: string) =>
      isScheduleParenInner(inner) ? ' ' : full,
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/** Trailing «/ 11 сентября / 23:00» or «, 23 октября, 21:30». */
function stripTrailingDateTimeCrumbs(value: string): string {
  let next = value;
  const patterns = [
    new RegExp(
      `(?:\\s*[/|,·•\\-]\\s*)+(?:\\d{1,2}\\s+${MONTH_TOKEN})(?:\\s*[/|,·•\\-]\\s*\\d{1,2}[:.]\\d{2})?\\s*$`,
      'iu',
    ),
    /(?:\s*[\/|,·•\-]\s*)+\d{1,2}[:.]\d{2}\s*$/u,
    new RegExp(`(?:\\s*[/|,·•\\-]\\s*)+${MONTH_TOKEN}\\s*$`, 'iu'),
  ];
  for (let i = 0; i < 4; i += 1) {
    const before = next;
    for (const pattern of patterns) {
      next = next.replace(pattern, '').trim();
    }
    if (next === before) break;
  }
  return next;
}

function stripEmoji(value: string): string {
  return value.replace(EMOJI_RE, ' ').replace(/\s+/g, ' ').trim();
}

function tidyTitlePunctuation(value: string): string {
  return value
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([([{])\s+/g, '$1')
    .replace(/\s+([)\]}])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s/|,·•\-–—]+|[\s/|,·•\-–—]+$/g, '')
    .trim();
}

/**
 * Display title: clean supplier noise, then soft-case ALL CAPS.
 * Mixed/editorial titles keep casing after cleanup.
 */
export function formatPublicTitle(raw: string | null | undefined): string {
  let value = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!value) return '';
  value = stripEmoji(value);
  value = stripScheduleParens(value);
  value = stripTrailingDateTimeCrumbs(value);
  value = tidyTitlePunctuation(value);
  if (!value) return '';
  return softCaseTitle(value);
}
