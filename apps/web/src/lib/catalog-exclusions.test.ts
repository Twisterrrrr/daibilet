import assert from 'node:assert/strict';
import test from 'node:test';

import { isCatalogExcludedMuseumAdmission } from './catalog-exclusions';

test('excludes Harry Potter museum admissions from stale web payloads', () => {
  assert.equal(isCatalogExcludedMuseumAdmission({ title: 'Музей Гарри Поттера' }), true);
  assert.equal(
    isCatalogExcludedMuseumAdmission({
      title: 'Взрослый билет',
      venueSlug: 'muzei-garri-pottera-683e8e0935b8fc7a60f565d3',
    }),
    true,
  );
});

test('keeps themed events outside the museum', () => {
  assert.equal(
    isCatalogExcludedMuseumAdmission({
      title: 'Гарри Поттер: музыкальное шоу в планетарии',
      slug: 'garri-potter-muzykalnoe-shou',
      venue: 'Планетарий 1',
    }),
    false,
  );
});
