import assert from 'node:assert/strict';
import test from 'node:test';

import { groupRegionAfficheSessions } from './region-affiche-group.ts';
import type { PublicSessionDto } from '@daibilet/contracts/public';

function session(
  partial: Partial<PublicSessionDto> & { id: string; title: string; venue: string },
): PublicSessionDto {
  return {
    slug: partial.id,
    city: 'Королёв',
    venueSlug: 'restobar-39',
    venueKind: 'club',
    category: 'Концерт',
    priceFrom: 1000,
    ...partial,
  } as PublicSessionDto;
}

test('groupRegionAfficheSessions collapses venues with 3+ events', () => {
  const rows = groupRegionAfficheSessions([
    session({ id: '1', title: 'Блюз 1', venue: 'Рестобар 39' }),
    session({ id: '2', title: 'Блюз 2', venue: 'Рестобар 39' }),
    session({ id: '3', title: 'Блюз 3', venue: 'Рестобар 39' }),
    session({ id: '4', title: 'Другое', venue: 'ДК', venueSlug: 'dk' }),
  ]);

  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.kind, 'series');
  if (rows[0]?.kind === 'series') {
    assert.equal(rows[0].sessions.length, 3);
    assert.equal(rows[0].venueName, 'Рестобар 39');
  }
  assert.equal(rows[1]?.kind, 'event');
});

test('groupRegionAfficheSessions collapses 40% share with only 2 events', () => {
  const rows = groupRegionAfficheSessions([
    session({ id: '1', title: 'A', venue: 'Club' }),
    session({ id: '2', title: 'B', venue: 'Club' }),
    session({ id: '3', title: 'C', venue: 'Other', venueSlug: 'other' }),
    session({ id: '4', title: 'D', venue: 'Other2', venueSlug: 'other2' }),
    session({ id: '5', title: 'E', venue: 'Other3', venueSlug: 'other3' }),
  ]);

  // 2/5 = 40% → collapse Club
  const series = rows.filter((r) => r.kind === 'series');
  assert.equal(series.length, 1);
  if (series[0]?.kind === 'series') {
    assert.equal(series[0].sessions.length, 2);
  }
});
