/**
 * Dinner / river cruise card titles: excursion name primary, ship secondary.
 * Strips named ships from marketing titles when we can show them as a muted line.
 */

const SHIP_TAG_RE = /теплоход|катер|яхт|palace|ривер|монарх|нео/i;
const SHIP_LABEL_PREFIX_RE = /^(?:теплоход|катер|яхта)\s*[:：-]?\s*/iu;

/** Named ship inside a marketing title (quoted or Capitalized; not «на теплоходе с видом»). */
const SHIP_IN_TITLE_RE =
  /(?:на|с)\s+(?:премиум-|люкс-)?теплоход(?:е|а)?\s+(?:[«"']([^«"']{2,48})[»"']|([A-ZА-ЯЁ][A-Za-zА-Яа-яЁё0-9-]{1,40}(?:\s*\([^)]{1,40}\))?))/u;

const NAMED_SHIP_PHRASE_RE =
  /\s*(?:,?\s*)?(?:на|с)\s+(?:премиум-|люкс-)?теплоход(?:е|а)?\s+(?:[«"'][^«"']{2,48}[»"']|[A-ZА-ЯЁ][A-Za-zА-Яа-яЁё0-9-]{1,40}(?:\s*\([^)]{1,40}\))?)/giu;

function cleanShipName(raw: string): string | null {
  const cleaned = String(raw || '')
    .replace(SHIP_LABEL_PREFIX_RE, '')
    .replace(/[«»"']/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:–—-]+|[\s:–—-]+$/g, '')
    .trim();
  if (!cleaned || cleaned.length < 2) return null;
  if (/^(?:борту|воде|реке|неве|москве)/i.test(cleaned)) return null;
  return cleaned;
}

function shipFromTags(tags?: string[] | null): string | null {
  for (const tag of tags || []) {
    if (!SHIP_TAG_RE.test(tag)) continue;
    const name = cleanShipName(tag);
    if (name) return name;
  }
  return null;
}

function shipFromTitle(title: string): string | null {
  const match = title.match(SHIP_IN_TITLE_RE);
  if (!match) return null;
  return cleanShipName(match[1] || match[2] || '');
}

function stripShipFromTitle(title: string, shipName: string | null): string {
  let next = String(title || '').trim();
  if (!next) return next;

  if (shipName) {
    const escaped = shipName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    next = next.replace(
      new RegExp(
        `(?:на|с)\\s+(?:премиум-|люкс-)?теплоход(?:е|а)?\\s+[«"']?${escaped}[»"']?`,
        'giu',
      ),
      '',
    );
  }

  next = next.replace(NAMED_SHIP_PHRASE_RE, '');
  next = next
    .replace(/\s*[—–-]\s*[«"']([^«"']+)[»"']\s*$/u, ' «$1»')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/^[—–\-\s,.:;]+|[—–\-\s,.:;]+$/g, '')
    .trim();

  // Prefer a short quoted trek name when the lead became empty noise.
  if (next.length < 12) {
    const quoted = String(title).match(/[«"']([^«"']{8,80})[»"']/);
    if (quoted?.[1]) return quoted[1].trim();
    return String(title || '').trim();
  }
  return next;
}

export function resolveCruiseDisplayTitle(input: {
  title?: string | null;
  tags?: string[] | null;
}): { excursionTitle: string; shipName: string | null } {
  const rawTitle = String(input.title || '').trim();
  const fromTags = shipFromTags(input.tags);
  const fromTitle = shipFromTitle(rawTitle);
  const shipName = fromTags || fromTitle;
  const excursionTitle = stripShipFromTitle(rawTitle, shipName) || rawTitle;
  return { excursionTitle, shipName };
}

export function formatShipSecondaryLabel(shipName: string | null | undefined): string | null {
  const name = cleanShipName(String(shipName || ''));
  if (!name) return null;
  if (/^теплоход/i.test(name)) return name;
  return `Теплоход: ${name}`;
}
