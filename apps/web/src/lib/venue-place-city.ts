/** Регион в title City, а населённый пункт - в citySlug (типично для РБ и др.). */

const REGION_LIKE_RE =
  /^(республика\s|удмуртская\sреспублика)/i;

const REGION_TAIL_RE =
  /\s+(область|край|республика|автономный округ|округ)$/i;

/** Хвосты slug вроде `октябрьскии-республика-башкортостан`. */
const REGION_SLUG_TAILS = [
  '-республика-башкортостан',
  '-башкортостан',
  '-республика-татарстан',
  '-татарстан',
  '-республика-карелия',
  '-карелия',
  '-республика-коми',
  '-республика-дагестан',
  '-республика-хакасия',
  '-московская-область',
  '-ленинградская-область',
];

const SETTLEMENT_SLUG_LABELS: Record<string, string> = {
  стерлитамак: 'Стерлитамак',
  нефтекамск: 'Нефтекамск',
  белебеи: 'Белебей',
  белебей: 'Белебей',
  октябрьский: 'Октябрьский',
  октябрьскии: 'Октябрьский',
  'октябрьскии-республика-башкортостан': 'Октябрьский',
  благовещенск: 'Благовещенск',
  'благовещенск-башкортостан': 'Благовещенск',
  уфа: 'Уфа',
  салават: 'Салават',
  сибай: 'Сибай',
  кумертау: 'Кумертау',
  туймазы: 'Туймазы',
  ишимбай: 'Ишимбай',
  мелеуз: 'Мелеуз',
};

export function isRegionLikeCityTitle(title: string | null | undefined): boolean {
  const raw = String(title || '').trim();
  if (!raw) return false;
  if (REGION_LIKE_RE.test(raw)) return true;
  if (REGION_TAIL_RE.test(raw)) return true;
  if (/автономный округ/i.test(raw)) return true;
  return false;
}

function humanizeSettlementSlug(slug: string): string {
  let base = slug.toLowerCase().trim();
  for (const tail of REGION_SLUG_TAILS) {
    if (base.endsWith(tail)) {
      base = base.slice(0, -tail.length);
      break;
    }
  }
  if (!base) return '';
  if (SETTLEMENT_SLUG_LABELS[base]) return SETTLEMENT_SLUG_LABELS[base];
  // Транслит-артефакт: октябрьскии → октябрьский
  base = base.replace(/ии$/u, 'ий');
  return base
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
}

/** Имя населённого пункта из citySlug (или null). */
export function settlementLabelFromCitySlug(citySlug: string | null | undefined): string | null {
  const raw = String(citySlug || '').trim().toLowerCase();
  if (!raw) return null;
  if (SETTLEMENT_SLUG_LABELS[raw]) return SETTLEMENT_SLUG_LABELS[raw];
  const label = humanizeSettlementSlug(raw);
  return label || null;
}

/**
 * Город для карточки / фильтра Мест: при region-title берём settlement из slug.
 * Иначе - обычный city title.
 */
export function resolveVenuePlaceCity(
  city: string | null | undefined,
  citySlug?: string | null,
): string {
  const title = String(city || '').trim();
  const settlement = settlementLabelFromCitySlug(citySlug);
  if (isRegionLikeCityTitle(title)) {
    return settlement || title;
  }
  return title || settlement || '';
}
