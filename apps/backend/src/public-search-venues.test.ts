import assert from 'node:assert/strict';
import test from 'node:test';

import { collapsePublicSearchVenueRows } from './public-search-venues.ts';

test('collapsePublicSearchVenueRows keeps one fortress museum hit', () => {
  const rows = collapsePublicSearchVenueRows([
    {
      id: 'venue_sight',
      slug: 'saint-petersburg-petropavlovskaya-krepost',
      title: 'Петропавловская крепость',
      score: 0.5,
      city: 'Санкт-Петербург',
      kind: 'ATTRACTION',
    },
    {
      id: 'venue_ravelin',
      slug: 'alekseevskiy-ravelin',
      title:
        'Петропавловская крепость. Алексеевский равелин (внутренняя территория, ближе к пляжу со стороны Кронверкского пролива)',
      score: 0.6,
      city: 'Санкт-Петербург',
      kind: 'MUSEUM_ART_SPACE',
    },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.title, 'Петропавловская крепость');
  assert.equal(String(rows[0]?.kind).toUpperCase(), 'MUSEUM_ART_SPACE');
});
