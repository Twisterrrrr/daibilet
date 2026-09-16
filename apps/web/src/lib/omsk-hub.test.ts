import assert from 'node:assert/strict';
import test from 'node:test';

import { OMSK_FAQ, OMSK_MUST_SEE, OMSK_SUBURBS, OMSK_TRAVEL } from './omsk-hub.ts';

function empty(value: unknown): boolean {
  return !String(value ?? '').trim();
}

function noDash(value: unknown): boolean {
  const text = JSON.stringify(value);
  return !text.includes('\u2014') && !text.includes('\u2013');
}

test('Omsk hub has 15+50 places, two suburbs with nested desc, Omsk-only FAQ', () => {
  assert.ok(OMSK_MUST_SEE.length >= 60);
  for (const place of OMSK_MUST_SEE) {
    assert.equal(empty(place.desc), false, place.name);
    assert.ok(place.locationSlug || place.venueSlug, place.name);
    assert.match(String(place.locationSlug || place.venueSlug), /^omsk-/);
    assert.ok(Number.isFinite(place.latitude), `${place.name} lat`);
    assert.ok(Number.isFinite(place.longitude), `${place.name} lng`);
  }
  assert.ok(OMSK_MUST_SEE.some((item) => item.locationSlug === 'omsk-zakladnoy-kamen-hrama-sergiya-radonezhskogo'));
  assert.ok(OMSK_MUST_SEE.some((item) => /Парк культуры им\. 30-летия ВЛКСМ/.test(item.name)));
  assert.equal(
    OMSK_MUST_SEE.some((item) => /культуры культуры/.test(item.name)),
    false,
  );
  assert.ok(OMSK_MUST_SEE.some((item) => item.locationSlug === 'omsk-ptichya-gavan'));
  assert.equal(
    OMSK_MUST_SEE.some((item) => /природный природный/i.test(JSON.stringify(item))),
    false,
  );

  const bySlug = new Map(OMSK_SUBURBS.map((suburb: { locationSlug?: string }) => [suburb.locationSlug, suburb]));
  for (const slug of ['omsk-starina-sibirskaya', 'omsk-chernoluchye']) {
    const suburb = bySlug.get(slug) as
      | {
          desc?: string;
          address?: string;
          latitude?: number;
          longitude?: number;
          places?: Array<{ name: string; desc?: string; locationSlug?: string }>;
        }
      | undefined;
    assert.ok(suburb, slug);
    assert.equal(empty(suburb?.desc), false, slug);
    assert.equal(empty(suburb?.address), false, `${slug} address`);
    assert.ok(Number.isFinite(suburb?.latitude), `${slug} lat`);
    assert.ok((suburb?.places || []).length >= 7, `${slug} nested`);
    for (const nested of suburb?.places || []) {
      assert.equal(empty(nested.desc), false, `${slug} / ${nested.name}`);
      assert.match(String(nested.locationSlug), /^omsk-/);
    }
  }
  const polyany = OMSK_SUBURBS.flatMap((suburb: { places?: Array<{ locationSlug?: string; desc?: string }> }) => suburb.places || []).find(
    (place) => place.locationSlug === 'omsk-chernoluchye-gribnye-polyany',
  );
  assert.ok(polyany);
  assert.match(String(polyany?.desc), /Прииртыш/i);
  assert.equal(/мещер/i.test(String(polyany?.desc)), false);

  assert.ok(OMSK_FAQ.some((item) => /метро/i.test(item.q)));
  assert.ok(OMSK_FAQ.some((item) => /летов/i.test(item.q)));
  assert.ok(OMSK_FAQ.some((item) => /пыл/i.test(item.q) || /ветр/i.test(item.q)));
  assert.ok(OMSK_FAQ.some((item) => /эрмитаж/i.test(item.q)));
  const faqText = JSON.stringify(OMSK_FAQ);
  assert.equal(/челябин/i.test(faqText), false);
  assert.match(faqText, /Зелен|Аграрн|бор/i);

  assert.ok(noDash(OMSK_FAQ));
  assert.ok(noDash(OMSK_SUBURBS));
  assert.ok(noDash(OMSK_TRAVEL));
  assert.equal(/уфим/i.test(JSON.stringify(OMSK_MUST_SEE)), false);
});
