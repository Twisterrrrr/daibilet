import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LANDING_PAGE_SESSION_LIMIT,
  selectLandingPageSessions,
} from './public-landing-page-sessions.ts';

function session(partial: { city?: string; citySlug?: string; title?: string; id?: string }) {
  return {
    id: partial.id || partial.title || 's',
    title: partial.title || 'Event',
    city: partial.city || 'Не указан',
    citySlug: partial.citySlug || '',
    destination: partial.city || 'Не указан',
    priceFrom: 1000,
  };
}

test('selectLandingPageSessions: city-scope before cap keeps non-top national rows', () => {
  const matched = [
    ...Array.from({ length: LANDING_PAGE_SESSION_LIMIT }, (_, i) =>
      session({ id: `msk-${i}`, title: `MSK ${i}`, city: 'Москва', citySlug: 'moscow' }),
    ),
    session({ id: 'samara-1', title: 'Standup Samara', city: 'Самара', citySlug: 'samara' }),
    session({ id: 'samara-2', title: 'Standup Samara 2', city: 'Самара', citySlug: 'samara' }),
    session({ id: 'samara-3', title: 'Standup Samara 3', city: 'Самара', citySlug: 'samara' }),
    session({ id: 'samara-4', title: 'Standup Samara 4', city: 'Самара', citySlug: 'samara' }),
  ];

  const national = selectLandingPageSessions(matched, '');
  assert.equal(national.matchCount, matched.length);
  assert.equal(national.pageSessions.length, LANDING_PAGE_SESSION_LIMIT);
  assert.equal(
    national.pageSessions.filter((row) => row.citySlug === 'samara').length,
    0,
    'national top-N would hide Samara (old bug)',
  );

  const cityScoped = selectLandingPageSessions(matched, 'samara');
  assert.equal(cityScoped.matchCount, 4);
  assert.equal(cityScoped.pageSessions.length, 4);
  assert.ok(cityScoped.pageSessions.every((row) => row.citySlug === 'samara'));
});

test('selectLandingPageSessions: uncapped matchCount when city has more than grid limit', () => {
  const matched = Array.from({ length: 60 }, (_, i) =>
    session({ id: `samara-${i}`, title: `Concert ${i}`, city: 'Самара', citySlug: 'samara' }),
  );
  const cityScoped = selectLandingPageSessions(matched, 'Самара');
  assert.equal(cityScoped.matchCount, 60);
  assert.equal(cityScoped.pageSessions.length, LANDING_PAGE_SESSION_LIMIT);
});
