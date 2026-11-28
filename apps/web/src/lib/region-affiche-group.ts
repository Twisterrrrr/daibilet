import type { PublicSessionDto } from '@daibilet/contracts/public';

export type RegionAfficheRow =
  | { kind: 'event'; session: PublicSessionDto }
  | {
      kind: 'series';
      key: string;
      venueName: string;
      venueSlug: string | null;
      city: string;
      sessions: PublicSessionDto[];
    };

const SERIES_MIN = 3;
const SERIES_SHARE = 0.4;

function venueKey(session: PublicSessionDto): string {
  const slug = String(session.venueSlug || '').trim().toLowerCase();
  if (slug) return `slug:${slug}`;
  const id = String(session.venueId || '').trim();
  if (id) return `id:${id}`;
  const name = String(session.venue || '').trim().toLowerCase();
  if (name) return `name:${name}`;
  return `solo:${session.id || session.slug || Math.random()}`;
}

/**
 * Collapse dominant venue series so one club does not flood the region feed.
 * Threshold: >=3 events at venue OR venue share >=40% of the visible list.
 */
export function groupRegionAfficheSessions(sessions: PublicSessionDto[]): RegionAfficheRow[] {
  if (!sessions.length) return [];

  const byVenue = new Map<string, PublicSessionDto[]>();
  for (const session of sessions) {
    const key = venueKey(session);
    const list = byVenue.get(key) || [];
    list.push(session);
    byVenue.set(key, list);
  }

  const collapsedKeys = new Set<string>();
  for (const [key, list] of byVenue) {
    if (key.startsWith('solo:')) continue;
    const share = list.length / sessions.length;
    if (list.length >= SERIES_MIN || share >= SERIES_SHARE) {
      collapsedKeys.add(key);
    }
  }

  const rows: RegionAfficheRow[] = [];
  const emittedSeries = new Set<string>();

  for (const session of sessions) {
    const key = venueKey(session);
    if (collapsedKeys.has(key)) {
      if (emittedSeries.has(key)) continue;
      emittedSeries.add(key);
      const group = byVenue.get(key) || [session];
      rows.push({
        kind: 'series',
        key,
        venueName: String(session.venue || 'Площадка').trim() || 'Площадка',
        venueSlug: session.venueSlug || null,
        city: String(session.city || '').trim(),
        sessions: group,
      });
      continue;
    }
    rows.push({ kind: 'event', session });
  }

  return rows;
}
