import type { PublicCatalogListItemDto, PublicSessionDto } from '@daibilet/contracts/public';

/** Micro-badges for landing schedule/cards - derived from tags/subcategories/title only (no fake ratings). */
export type LandingCardBadgeId =
  | 'walking'
  | 'bus'
  | 'group'
  | 'private'
  | 'dinner'
  | 'set-menu'
  | 'buffet'
  | 'vip'
  | 'live-music'
  | 'guide'
  | 'open-deck'
  | 'hit';

export type LandingCardBadge = {
  id: LandingCardBadgeId;
  label: string;
};

type BadgeSource = Pick<
  PublicSessionDto | PublicCatalogListItemDto,
  'title' | 'category' | 'tags' | 'subcategories'
> & {
  sessionCount?: number | null;
  landingSlugs?: string[] | null;
};

const BADGE_DEFS: Array<{
  id: LandingCardBadgeId;
  label: string;
  test: (text: string) => boolean;
}> = [
  { id: 'walking', label: 'Пешеходная', test: (t) => /пешеход|пешком|walking|прогулк\w*\s+по\s+город/i.test(t) },
  { id: 'bus', label: 'Автобусная', test: (t) => /автобус|hop-?on|city\s*tour|сити\s*тур|обзорн\w*\s+экскурс/i.test(t) },
  { id: 'private', label: 'Индивидуальная', test: (t) => /индивидуальн|private|персональн|1-4\s*чел/i.test(t) },
  { id: 'group', label: 'Групповая', test: (t) => /групп|сборн|open\s*mic|открыт\w*\s+микрофон/i.test(t) },
  { id: 'set-menu', label: 'Сет-меню', test: (t) => /сет-?меню|set-?menu|дегустац/i.test(t) },
  { id: 'buffet', label: 'Фуршет', test: (t) => /фуршет|buffet/i.test(t) },
  { id: 'dinner', label: 'Ужин', test: (t) => /ужин|dinner|гастроном/i.test(t) },
  { id: 'vip', label: 'VIP', test: (t) => /\bvip\b|вип/i.test(t) },
  { id: 'live-music', label: 'Живая музыка', test: (t) => /живая\s+музык|джив|jazz|джаз|саксофон/i.test(t) },
  { id: 'guide', label: 'С гидом', test: (t) => /гид|экскурсовод|audio\s*guide|аудиогид/i.test(t) },
  { id: 'open-deck', label: 'Открытая палуба', test: (t) => /открыт\w*\s+палуб|open\s*deck/i.test(t) },
];

function corpus(session: BadgeSource): string {
  return [
    session.title,
    session.category,
    ...(session.subcategories || []),
    ...(session.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function isHitSignal(session: BadgeSource): boolean {
  return (session.sessionCount || 0) >= 4 || (session.landingSlugs?.length || 0) > 0;
}

/** Up to `limit` micro-badges; hit is last and only from real catalog signals. */
export function deriveLandingCardBadges(session: BadgeSource, limit = 3): LandingCardBadge[] {
  const text = corpus(session);
  const badges: LandingCardBadge[] = [];

  for (const def of BADGE_DEFS) {
    if (badges.length >= limit) break;
    if (def.id === 'dinner' && badges.some((b) => b.id === 'set-menu' || b.id === 'buffet')) continue;
    if (def.id === 'group' && badges.some((b) => b.id === 'private')) continue;
    if (def.test(text)) badges.push({ id: def.id, label: def.label });
  }

  if (badges.length < limit && isHitSignal(session)) {
    badges.push({ id: 'hit', label: 'Хит' });
  }

  return badges.slice(0, limit);
}

export function sessionMatchesLandingBadge(session: BadgeSource, badgeId: LandingCardBadgeId | 'all'): boolean {
  if (badgeId === 'all') return true;
  if (badgeId === 'hit') return isHitSignal(session);
  const def = BADGE_DEFS.find((item) => item.id === badgeId);
  if (!def) return false;
  return def.test(corpus(session));
}

/** Chips that appear at least once in the current session set (for client filters). */
export function collectLandingBadgeFacets(
  sessions: BadgeSource[],
  preferred: LandingCardBadgeId[] = ['set-menu', 'buffet', 'vip', 'live-music', 'dinner', 'guide'],
): LandingCardBadge[] {
  const present = new Set<LandingCardBadgeId>();
  for (const session of sessions) {
    for (const badge of deriveLandingCardBadges(session, 6)) {
      present.add(badge.id);
    }
  }
  return preferred
    .filter((id) => present.has(id))
    .map((id) => {
      const def = BADGE_DEFS.find((item) => item.id === id);
      return { id, label: def?.label || id } satisfies LandingCardBadge;
    });
}
