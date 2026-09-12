const LONG_TITLE_BREAK_MIN = 48;

export type SplitLongTitle = {
  lead: string;
  mark: ':' | '-';
  tail: string;
};

/**
 * Long PDP titles: break after `: ` or spaced hyphen, not inside words like «Санкт-Петербург».
 */
export function splitLongTitleAtBreak(
  title: string,
  minLength = LONG_TITLE_BREAK_MIN,
): SplitLongTitle | null {
  const text = String(title || '').replace(/\s+/g, ' ').trim();
  if (text.length <= minLength) return null;

  const colonAt = text.indexOf(': ');
  const hyphenAt = text.search(/ [-—–] /);
  const candidates: Array<{ at: number; mark: ':' | '-'; skip: number }> = [];
  if (colonAt >= 0) candidates.push({ at: colonAt, mark: ':', skip: 2 });
  if (hyphenAt >= 0) candidates.push({ at: hyphenAt, mark: '-', skip: 3 });
  candidates.sort((a, b) => a.at - b.at);

  for (const item of candidates) {
    const lead = text.slice(0, item.at).trim();
    const tail = text.slice(item.at + item.skip).trim();
    if (lead.length >= 12 && tail.length >= 8) {
      return { lead, mark: item.mark, tail };
    }
  }
  return null;
}
