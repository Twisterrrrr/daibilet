/**
 * Sochi local-flavor fragment (owner 2026-08-21). Hyphen-only copy.
 * Parent wires into city-hub-local-flavor.ts - do not edit that file here.
 */

import type {
  CityIdentitySlide,
  CityWeatherFlavor,
  CityWhenToGoFlavor,
} from './city-hub-local-flavor.ts';

export const SOCHI_WEATHER: CityWeatherFlavor = {
  latitude: 43.585,
  longitude: 39.723,
  timezone: 'Europe/Moscow',
  outdoorSlugs: [
    'sochi-morskoy-vokzal',
    'sochi-park-riviera',
    'sochi-dendrariy-verhniy',
    'sochi-olimpiyskiy-park',
    'sochi-zimniy-teatr',
  ],
  indoorSlugs: [
    'sochi-hudozhestvennyy-muzey',
    'sochi-muzey-istorii-kurorta',
    'sochi-zal-organnoy-muzyki',
    'sochi-baran-rapan',
    'sochi-belye-nochi',
  ],
  outdoorCta: 'Сухо: променад от Морвокзала, «Ривьера» или подъём в Дендрарий',
  indoorCtaOvercast: 'Серо над морем: худмузей, краеведческий или хинкали в «Белых Ночах»',
  indoorCtaRain: 'Ливень: орган, худмузей или «Баран-Рапан» - набережную отложите',
  indoorCtaSnow: 'В горах снег, в городе мокро: музеи центра, потом согреться в «Белых Ночах»',
};

export const SOCHI_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Europe/Moscow',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Утро на трассах Красной Поляны, вечер - по почти пустому променаду. В городе пальмы и лёгкая куртка, наверху - нормальный снег.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'До середины апреля ещё можно покататься и к вечеру выйти к морю. В мае город в глицинии; к водопадам идите, пока вода не ушла.',
    },
    {
      id: 'summer',
      months: [6, 7, 8],
      headline: 'Лето',
      body: 'Пляж, очередь на такси и влажная жара. Днём прячьтесь в музеях или уезжайте в горы; купание и закатные рейсы оставляйте на вечер.',
    },
    {
      id: 'autumn',
      months: [9, 10, 11],
      headline: 'Осень',
      body: 'Сентябрь-октябрь: море ещё тёплое, жара уже не давит. В ноябре Поляна багровеет - гастро и заповедник спокойнее июля.',
    },
  ],
  tabs: [
    {
      id: 'spring',
      label: 'Весна',
      body: 'До середины апреля - лыжи утром и море вечером. Май - глициния и полноводные водопады.',
    },
    {
      id: 'summer',
      label: 'Лето',
      body: 'Пляжный пик: влажно, жарко, логистика трещит. Прохлада - горы или рейс на закате.',
    },
    {
      id: 'autumn',
      label: 'Осень',
      body: 'Море ещё тёплое, толпа реже. Ноябрь - багровая Поляна.',
    },
    {
      id: 'winter',
      label: 'Зима',
      body: 'Поляна с утра, пустой променад вечером. Внизу зелень, наверху снег.',
    },
  ],
};

export const SOCHI_SLIDES: CityIdentitySlide[] = [
  {
    id: 'zimniy-teatr',
    title: 'Зимний театр',
    text: 'Коринфские колонны и главный подиум южной культуры. Архитектура сталинского ампира с 66 колоннами создает ощущение вечного праздника. Здесь бьется сердце светской жизни на фоне пальм.',
    imageSrc: '/images/venues/sochi/identity-symbol.jpg',
    imageAlt: 'Зимний театр с колоннадой в Сочи',
    slugs: ['sochi-zimniy-teatr', 'sochi-letniy-teatr', 'sochi-kontsertnyy-zal-festivalnyy'],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'dendrariy',
    title: 'Парк «Дендрарий»',
    text: 'Живая симфония пяти континентов. Столетние секвойи, бамбуковые рощи и вилла Худекова - генетический код города-сада. Местные относятся к парку как к священному зеленому сердцу.',
    imageSrc: '/images/venues/sochi/identity-art.jpg',
    imageAlt: 'Сочинский Дендрарий с пальмовыми аллеями',
    slugs: ['sochi-dendrariy-verhniy', 'sochi-dendrariy-nizhniy', 'sochi-villa-nadezhda'],
    target: 'places',
    badge: 'Искусство',
  },
  {
    id: 'barabulya-hinkali',
    title: 'Барабуля и хинкали',
    text: 'Гастрономический сплав черноморской свежести и кавказского гостеприимства. Хрустящая барабуля на побережье и сочные хинкали с абхазскими специями в горах отражают дуализм курорта.',
    imageSrc: '/images/venues/sochi/barabulya-hinkali.jpg',
    imageAlt: 'Сочинская гастрономия: барабуля и хинкали',
    slugs: ['sochi-belye-nochi', 'sochi-baran-rapan', 'sochi-plakuchaya-iva'],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'morskoy-vokzal',
    title: 'Морской вокзал',
    text: '71-метровый шпиль со звездой и скульптурами-сезонами. Триумф сталинского ампира и главные морские ворота курорта. Сегодня это главный променад с яхтами у исторических галерей.',
    imageSrc: '/images/venues/sochi/identity-architecture.jpg',
    imageAlt: 'Морской вокзал Сочи со шпилем',
    slugs: ['sochi-morskoy-vokzal', 'sochi-brilliantovaya-ruka', 'sochi-morskie-sezony'],
    target: 'places',
    badge: 'Архитектура',
  },
];
