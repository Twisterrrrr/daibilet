import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  LOCATION_CATALOG_TYPE_OPTIONS,
  PLACES_HUB_CATEGORY_CHIPS,
  formatPublicVenueTitle,
  isMeetingPointLike,
  isTempleLikeVenueName,
  normalizeVenueKind,
  placesHubCategoryCount,
  isWeakVenueLeadText,
  resolveLocationVenueCopy,
  resolvePlacesHubCategoryChip,
  resolvePublicVenueType,
  venueTypeBreadcrumbPlural,
  venueTypeLabel,
} from './venue-meta.ts';

describe('park + monument venue kinds', () => {
  it('exposes park and monument in location catalog filters', () => {
    const values = LOCATION_CATALOG_TYPE_OPTIONS.map((option) => option.value);
    assert.ok(values.includes('park'));
    assert.ok(values.includes('monument'));
    assert.ok(values.includes('meeting_point'));
    assert.ok(values.includes('gastro'));
    assert.ok(values.includes('outdoor_location'));
    assert.ok(values.includes('temple'));
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

describe('places hub split chips', () => {
  it('exposes galleries, attractions, temples, gastro as separate chips', () => {
    const byId = Object.fromEntries(PLACES_HUB_CATEGORY_CHIPS.map((chip) => [chip.id, chip]));
    assert.deepEqual(byId.galleries?.types, ['art_space']);
    assert.deepEqual(byId.attractions?.types, ['attraction']);
    assert.deepEqual(byId.temples?.types, ['temple']);
    assert.deepEqual(byId.monuments?.types, ['monument']);
    assert.deepEqual(byId.gastro?.types, ['gastro']);
    assert.ok(!byId.museums.types.includes('art_space'));
    assert.ok(!byId.bars_restaurants.types.includes('gastro'));
    assert.ok(!byId.outdoors.types.includes('attraction'));
  });

  it('maps cathedral titles to temple public kind', () => {
    assert.equal(isTempleLikeVenueName('Исаакиевский собор'), true);
    assert.equal(isTempleLikeVenueName('Петропавловская крепость'), false);
    assert.equal(resolvePublicVenueType('attraction', 'Исаакиевский собор'), 'temple');
    assert.equal(resolvePublicVenueType('attraction', 'Бункер-42 на Таганке'), 'attraction');
    assert.equal(resolvePlacesHubCategoryChip('temples')?.label, 'Храмы');
    assert.equal(resolvePlacesHubCategoryChip('temple')?.id, 'temples');
  });

  it('counts temple chip from stats.types.temple', () => {
    const chip = resolvePlacesHubCategoryChip('temples');
    assert.ok(chip);
    assert.equal(placesHubCategoryCount({ temple: 12, attraction: 40 }, chip), 12);
  });
});

describe('fortress display title', () => {
  it('strips ravelin meeting-point garbage', () => {
    assert.equal(
      formatPublicVenueTitle(
        'Петропавловская крепость. Алексеевский равелин (внутренняя территория, ближе к пляжу со стороны Кронверкского пролива)',
      ),
      'Петропавловская крепость',
    );
  });
});

describe('location copy is not a map pin', () => {
  it('treats map-pin fallbacks as weak', () => {
    assert.equal(isWeakVenueLeadText('Памятник на карте города.'), true);
    assert.equal(isWeakVenueLeadText('Точка на маршруте и ориентир в городе.'), true);
    assert.equal(isWeakVenueLeadText('Легкая жанровая точка на прогулочном маршруте.'), true);
    assert.equal(
      isWeakVenueLeadText('Шолохов в лодке среди камышей на набережной Дона - самый живой кадр берега.'),
      false,
    );
  });

  it('does not invent boarding-point copy when the venue has no text', () => {
    const copy = resolveLocationVenueCopy({
      name: 'Тачанка',
      city: 'Ростов-на-Дону',
      description: '',
      shortDescription: 'Памятник на карте города.',
    });
    assert.equal(copy.fullDescription, '');
    assert.equal(copy.heroLead, '');
    assert.equal(copy.aboutBody, '');
    assert.ok(!/точка отправления|время отправления/i.test(copy.howToFind));
  });

  it('strips hookFact prefix from about body', () => {
    const hook =
      'Знаменитые персонажи с чертами Василия Ливанова и Виталия Соломина у британского посольства.';
    const copy = resolveLocationVenueCopy({
      name: 'Холмс',
      city: 'Москва',
      hookFact: hook,
      shortDescription: 'Ливанов и Соломин у британского посольства',
      description: `${hook} Стоит на Смоленской набережной: любимая фототочка.`,
    });
    assert.equal(copy.aboutBody, 'Стоит на Смоленской набережной: любимая фототочка.');
    assert.ok(copy.fullDescription.startsWith(hook));
  });
});
