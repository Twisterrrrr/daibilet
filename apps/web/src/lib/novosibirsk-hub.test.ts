import assert from 'node:assert/strict';
import test from 'node:test';

import { NOVOSIBIRSK_FAQ, NOVOSIBIRSK_SUBURBS } from './novosibirsk-hub.ts';

function empty(value: unknown): boolean {
  return !String(value ?? '').trim();
}

test('Novosibirsk day-trip suburbs keep Akademgorodok and add Suzun Iskitim Koltsovo Berdskie', () => {
  const bySlug = new Map(
    NOVOSIBIRSK_SUBURBS.map((suburb: { locationSlug?: string }) => [suburb.locationSlug, suburb]),
  );
  for (const slug of [
    'novosibirsk-akademgorodok',
    'novosibirsk-suzun',
    'novosibirsk-iskitim-lozhok',
    'novosibirsk-koltsovo',
    'novosibirsk-berdskie-skaly',
  ]) {
    const suburb = bySlug.get(slug) as
      | {
          desc?: string;
          address?: string;
          latitude?: number;
          longitude?: number;
          locationSlug?: string;
          places?: Array<{
            name: string;
            desc?: string;
            address?: string;
            latitude?: number;
            longitude?: number;
            locationSlug?: string;
            dayRouteId?: string;
          }>;
        }
      | undefined;
    assert.ok(suburb, slug);
    assert.equal(empty(suburb?.desc), false, slug);
    assert.equal(empty(suburb?.address), false, `${slug} address`);
    assert.ok(Number.isFinite(suburb?.latitude), `${slug} lat`);
    assert.ok(Number.isFinite(suburb?.longitude), `${slug} lng`);
    assert.ok((suburb?.places || []).length >= 4, `${slug} nested`);
    for (const nested of suburb?.places || []) {
      assert.equal(empty(nested.desc), false, `${slug} / ${nested.name}`);
      const nestedSlug = nested.locationSlug || nested.dayRouteId;
      assert.ok(nestedSlug, `${nested.name} slug`);
      assert.match(String(nestedSlug), /^novosibirsk-/);
      if (nested.locationSlug && suburb?.locationSlug !== 'novosibirsk-akademgorodok') {
        assert.equal(empty(nested.address), false, `${nestedSlug} address`);
        assert.ok(Number.isFinite(nested.latitude), `${nestedSlug} lat`);
        assert.ok(Number.isFinite(nested.longitude), `${nestedSlug} lng`);
      }
    }
  }
  const coffee = NOVOSIBIRSK_SUBURBS.flatMap(
    (suburb: { places?: Array<{ locationSlug?: string; desc?: string }> }) => suburb.places || [],
  ).find((place) => place.locationSlug === 'novosibirsk-koltsovo-akademiya-kofe');
  assert.ok(coffee);
  assert.equal(/чернозем/i.test(String(coffee?.desc)), false);
  assert.match(String(coffee?.desc), /наукоград|за Уралом/i);
  assert.ok(NOVOSIBIRSK_FAQ.some((item) => /спортивн/i.test(item.q)));
  assert.ok(NOVOSIBIRSK_FAQ.some((item) => /большевистск/i.test(item.q)));
  assert.ok(NOVOSIBIRSK_FAQ.some((item) => /бункер/i.test(item.q)));
  assert.ok(NOVOSIBIRSK_FAQ.some((item) => /обск/i.test(item.q)));
  assert.ok(
    [...NOVOSIBIRSK_FAQ, ...NOVOSIBIRSK_SUBURBS].every((item) => {
      const text = JSON.stringify(item);
      return !text.includes('\u2014') && !text.includes('\u2013');
    }),
  );
});
