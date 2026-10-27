import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveVenueExperienceProfile } from './venue-experience-profile.ts';

test('uses an admission-first vocabulary for museums', () => {
  const profile = resolveVenueExperienceProfile({ type: 'museum', name: 'Русский музей' });
  assert.equal(profile.id, 'museum');
  assert.equal(profile.admissionCtaLabel, 'К входным билетам');
  assert.equal(profile.programTitle, 'Выставки и события');
});

test('uses departures for piers and excursions for meeting points', () => {
  const pier = resolveVenueExperienceProfile({ type: 'pier', name: 'Дворцовая пристань' });
  const meeting = resolveVenueExperienceProfile({ type: 'meeting-point', name: 'У памятника' });
  assert.equal(pier.routeCtaLabel, 'Выбрать рейс');
  assert.equal(pier.programTitle, 'Рейсы и билеты');
  assert.equal(meeting.programTitle, 'Экскурсии отсюда');
});

test('keeps outdoor destinations focused on visits and excursions', () => {
  for (const type of ['park', 'monument', 'outdoor_location', 'temple']) {
    const profile = resolveVenueExperienceProfile({ type, name: 'Городское место' });
    assert.equal(profile.id, 'outdoor');
    assert.equal(profile.programTabLabel, 'Экскурсии');
  }
});
