/**
 * Event copy must not store "nearest session" date/time lines.
 *
 * The schedule is rendered from live slots in the purchase block. A stored date
 * goes stale after the first session and bakes a fixed timezone into the text
 * (the `+0 UTC` bug). This helper strips legacy lines at render time and in the
 * one-off data cleanup script.
 */

const SESSION_LABELS = [
  'Ближайшая дата',
  'Ближайшие даты',
  'Ближайший сеанс',
  'Следующий сеанс',
  'Ближайшее время',
] as const;

const LABEL_PATTERN = SESSION_LABELS.join('|');

/** A whole list item: `- Ближайшая дата - 18 октября, 03:00`. */
const LIST_ITEM_LINE_RE = new RegExp(
  `^\\s*[-*]\\s*(?:${LABEL_PATTERN})\\s*[-:].*$`,
  'iu',
);

/** An inline sentence: `Следующий сеанс - 18 октября, 03:00.` (never crosses a tag). */
const INLINE_RE = new RegExp(
  `(?:^|(?<=[\\s>]))(?:${LABEL_PATTERN})\\s*[-:]\\s*[^<\\n]*?(?:\\.(?=\\s|$|<)|$|(?=<))`,
  'gimu',
);

/** Legacy `Когда: 18 октября, 03:00.` lead-in (only when a date follows). */
const WHEN_RE =
  /(?:^|(?<=[\s>]))Когда:\s*(?=\d{1,2}\s|\d{4}-)[^!?\n<]*?(?:\.(?=\s|$|<)|$|(?=<))/gimu;

/** Drop `## Heading` blocks whose body became empty after the strip. */
function dropEmptySections(text: string): string {
  if (!text.trim()) return '';
  const parts = text.split(/\n(?=##\s)/u);
  const kept: string[] = [];
  for (const part of parts) {
    const body = part.replace(/^##[^\n]*\n?/u, '').trim();
    if (/^##\s/u.test(part) && !body) continue;
    if (part.trim()) kept.push(part.trim());
  }
  return kept.join('\n\n');
}

/**
 * Remove generated session date/time lines from event description text.
 * Keeps place, address, price, age and everything the provider wrote.
 */
export function stripSessionDateLines(value: string | null | undefined): string {
  let text = String(value || '').replace(/\r\n/g, '\n');
  if (!text.trim()) return '';

  text = text
    .split('\n')
    .filter((line) => !LIST_ITEM_LINE_RE.test(line))
    .join('\n');

  text = text
    .replace(INLINE_RE, (_match, offset, full) => {
      const before = String(full).slice(0, Number(offset)).replace(/[ \t]+$/u, '');
      return /[:;,-]$/u.test(before) ? '.' : ' ';
    })
    .replace(WHEN_RE, ' ')
    // `Город: ближайший сеанс - … .` leaves a dangling `:.` - keep a clean period.
    .replace(/[ \t]*[-–—:;,][ \t]*\./g, '.')
    .replace(/[ \t]*:[ \t]*(?=\n|$)/gm, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([.,;:!?])/g, '$1')
    .replace(/^[ \t]+/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return dropEmptySections(text);
}

/** True when the copy still carries a generated nearest-session line. */
export function hasSessionDateLines(value: string | null | undefined): boolean {
  const text = String(value || '');
  if (!text.trim()) return false;
  return (
    new RegExp(LIST_ITEM_LINE_RE.source, 'imu').test(text) ||
    new RegExp(INLINE_RE.source, 'imu').test(text) ||
    new RegExp(WHEN_RE.source, 'imu').test(text)
  );
}
