import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  LOCATION_CATALOG_TYPE_OPTIONS,
  isMeetingPointLike,
  normalizeVenueKind,
  venueTypeBreadcrumbPlural,
  venueTypeLabel,
} from './venue-meta.ts';

describe('park + monument venue kinds', () => {
  it('exposes park and monument in location catalog filters', () => {
    const values = LOCATION_CATALOG_TYPE_OPTIONS.map((option) => option.value);
    assert.ok(values.includes('park'));
    assert.ok(values.includes('monument'));
  });

  it('labels and plurals are RU', () => {
    assert.equal(venueTypeLabel('park'), 'Парк');
    assert.equal(venueTypeLabel('monument'), 'Памятник');
    assert.equal(venueTypeBreadcrumbPlural('park'), 'Парки');
    assert.equal(venueTypeBreadcrumbPlural('monument'), 'Памятники');
  });

  it('normalizes DB enum casing', () => {
    assert.equal(normalizeVenueKind('PARK'), 'park');
    assert.equal(normalizeVenueKind('MONUMENT'), 'monument');
  });

  it('explicit park/monument are not meeting-point-like', () => {
    assert.equal(isMeetingPointLike({ type: 'park', name: 'Парк Монрепо' }), false);
    assert.equal(isMeetingPointLike({ type: 'monument', name: 'Памятник Петру I' }), false);
    assert.equal(isMeetingPointLike({ type: 'meeting_point', name: 'памятник Достоевскому' }), true);
  });
});
