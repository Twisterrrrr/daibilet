import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  hasMinimalLocationProfile,
  isGenericUnnamedPlace,
  kindFromMustSeeItem,
  parseLocVenueHelperCalls,
  parsePlaceHelperCalls,
  parseSuburbParents,
  resolveSeedSlug,
  sanitizeEditorialText,
  toSeedPlan,
} from './hub-must-see-seed.js';

describe('parsePlaceHelperCalls', () => {
  it('reads top-level place() and marks nested suburb POIs', () => {
    const src = `
export const ROSTOV_NA_DONU_MUST_SEE: any[] = [
  place('Памятник «Тачанка-Ростовчанка»', 'Исполинский монумент на южном въезде в город.', 47.184112, 39.739112, {
    address: 'южный въезд в город',
    locationSlug: 'rostov-na-donu-tachanka-rostovchanka',
    mustSeeFilter: 'monument',
  }),
];

export const ROSTOV_NA_DONU_SUBURBS: any[] = [
  {
    name: 'Танаис',
    places: [
      place('Главный раскоп Танаиса', 'Остатки улиц античного полиса в степи у Дона.', 47.271112, 39.332312, {
        address: 'Территория музея-заповедника',
        locationSlug: 'rostov-na-donu-tanais-glavnyy-raskop',
        mustSeeFilter: 'main',
      }),
    ],
  },
];
`;
    const rows = parsePlaceHelperCalls(src, 'rostov-na-donu');
    assert.equal(rows.length, 2);
    assert.equal(rows[0].nested, false);
    assert.equal(rows[0].locationSlug, 'rostov-na-donu-tachanka-rostovchanka');
    assert.equal(rows[1].nested, true);
    assert.equal(rows[1].name, 'Главный раскоп Танаиса');
  });
});

describe('parseLocVenueHelperCalls', () => {
  it('reads top-level loc/venue and marks nested suburb POIs', () => {
    const src = `
export const RYAZAN_MUST_SEE: any[] = [
  loc(
    'Дворец Олега',
    'Самое большое гражданское здание Кремля XVII века.',
    'ул. Кремль, 15',
    'ryazan-dvorets-olega',
    'houses',
    40,
    54.636112,
    39.749102,
  ),
  venue(
    'Рязанский кремль (музей-заповедник)',
    'Архитектурный ансамбль на крутом берегу реки Трубеж.',
    'ул. Кремль, 15',
    'ryazan-kreml-muzey-zapovednik',
    'museum',
    90,
    54.6358,
    39.7484,
  ),
];

export const RYAZAN_SUBURBS: any[] = [
  {
    name: 'Константиново',
    places: [
      loc(
        'Дом родителей С. А. Есенина',
        'Крестьянская изба с обстановкой семьи поэта.',
        'с. Константиново',
        'ryazan-konstantinovo-dom-roditeley-esenina',
        'museum',
        30,
        54.862312,
        39.449102,
      ),
    ],
  },
];
`;
    const rows = parseLocVenueHelperCalls(src, 'ryazan');
    assert.equal(rows.length, 3);
    assert.equal(rows[0].nested, false);
    assert.equal(rows[0].locationSlug, 'ryazan-dvorets-olega');
    assert.equal(rows[0].latitude, 54.636112);
    assert.equal(rows[1].venueSlug, 'ryazan-kreml-muzey-zapovednik');
    assert.equal(rows[1].locationSlug, null);
    assert.equal(rows[2].nested, true);
  });

  it('prefers suburb locationSlug over museum twin', () => {
    assert.equal(
      resolveSeedSlug({
        locationSlug: 'ryazan-konstantinovo',
        venueSlug: 'ryazan-muzey-zapovednik-s-a-esenina-v-konstantinovo',
      }),
      'ryazan-konstantinovo',
    );
  });
});

describe('parseSuburbParents', () => {
  it('keeps the parent card, not nested places', () => {
    const src = `
export const ROSTOV_NA_DONU_SUBURBS: any[] = [
  {
    name: 'Танаис',
    desc: 'Античный город под открытым небом в степи у Дона.',
    locationSlug: 'rostov-na-donu-tanais',
    latitude: 47.271112,
    longitude: 39.332312,
    address: 'Ростовская обл., хутор Недвиговка',
    places: [
      place('Главный раскоп Танаиса', 'Остатки улиц.', 47.271112, 39.332312, {
        address: 'Территория музея',
        locationSlug: 'rostov-na-donu-tanais-glavnyy-raskop',
      }),
    ],
  },
];
`;
    const rows = parseSuburbParents(src, 'rostov-na-donu', 'ROSTOV_NA_DONU_SUBURBS');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, 'Танаис');
    assert.equal(rows[0].locationSlug, 'rostov-na-donu-tanais');
    assert.equal(rows[0].latitude, 47.271112);
  });
});

describe('min profile', () => {
  it('rejects unnamed gastro and agent-note copy', () => {
    assert.equal(isGenericUnnamedPlace('Ресторан с пензенской локальной кухней'), true);
    assert.equal(isGenericUnnamedPlace('Кофейни Фонтанной площади'), true);
    assert.equal(isGenericUnnamedPlace('Памятник «Тачанка-Ростовчанка»'), false);
    assert.equal(
      sanitizeEditorialText(
        'Главный банковский фасад центра, координата здесь должна оставаться в пределах 53-й широты.',
      ),
      'Главный банковский фасад центра',
    );
  });

  it('requires name, coords, address and a real description', () => {
    const base = {
      name: 'Памятник «Тачанка-Ростовчанка»',
      desc: 'Исполинский монумент на южном въезде в город, один из самых узнаваемых символов Ростова.',
      latitude: 47.184112,
      longitude: 39.739112,
      address: 'южный въезд в город',
    };
    assert.equal(hasMinimalLocationProfile(base), true);
    assert.equal(hasMinimalLocationProfile({ ...base, address: '' }), false);
    assert.equal(hasMinimalLocationProfile({ ...base, latitude: null }), false);
  });
});

describe('toSeedPlan', () => {
  it('publishes a monument as /locations and skips nested POIs', () => {
    const live = toSeedPlan({
      cityKey: 'rostov-na-donu',
      name: 'Памятник «Тачанка-Ростовчанка»',
      desc: 'Исполинский монумент на южном въезде в город, один из самых узнаваемых символов Ростова.',
      latitude: 47.184112,
      longitude: 39.739112,
      address: 'южный въезд в город',
      locationSlug: 'rostov-na-donu-tachanka-rostovchanka',
      mustSeeFilter: 'monument',
      nested: false,
    });
    assert.equal(live.skipReason, null);
    assert.equal(live.kind, 'MONUMENT');
    assert.equal(live.canonicalPath, '/locations/rostov-na-donu-tachanka-rostovchanka');

    const nested = toSeedPlan({
      cityKey: 'rostov-na-donu',
      name: 'Главный раскоп Танаиса',
      desc: 'Остатки улиц, жилых кварталов и каменных стен античного полиса.',
      latitude: 47.271112,
      longitude: 39.332312,
      address: 'Территория музея-заповедника',
      locationSlug: 'rostov-na-donu-tanais-glavnyy-raskop',
      nested: true,
    });
    assert.equal(nested.skipReason, 'nested-suburb-poi');
  });

  it('aliases the Rostov market slug to the live row', () => {
    assert.equal(
      resolveSeedSlug({ locationSlug: 'rostov-na-donu-tsentralnyy-rynok-staryy-bazar' }),
      'rostov-na-donu-tsentral-nyy-rynok-staryy-bazar',
    );
  });

  it('plants museums on /venues', () => {
    const plan = toSeedPlan({
      cityKey: 'penza',
      name: 'Пензенский краеведческий музей',
      desc: 'Полный срез истории губернии от археологии до модерна.',
      latitude: 53.197012,
      longitude: 45.020212,
      address: 'ул. Красная, 73',
      venueSlug: 'penza-kraevedcheskiy-muzey',
      mustSeeFilter: 'museum',
      nested: false,
    });
    assert.equal(plan.skipReason, null);
    assert.equal(plan.kind, 'MUSEUM_ART_SPACE');
    assert.equal(plan.canonicalPath, '/venues/penza-kraevedcheskiy-muzey');
  });

  it('keeps temple/street kinds on the location family', () => {
    assert.equal(kindFromMustSeeItem({ name: 'Спасский собор', mustSeeFilter: 'temple' }).kind, 'ATTRACTION');
    assert.equal(kindFromMustSeeItem({ name: 'Пушкинская улица', mustSeeFilter: 'street' }).kind, 'OUTDOOR_LOCATION');
  });
});
