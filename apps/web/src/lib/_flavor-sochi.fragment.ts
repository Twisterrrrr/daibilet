/**
 * Sochi local-flavor fragment (owner 2026-08-21). Hyphen-only copy.
 * Parent wires into city-hub-local-flavor.ts - do not edit that file here.
 */

import type {
  CityIdentitySlide,
  CityWeatherFlavor,
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

export const SOCHI_SLIDES: CityIdentitySlide[] = [
  {
    id: 'black-sea',
    title: 'Чёрное море рядом',
    text: 'Тёплое море и субтропический климат задают курортный ритм Сочи: от гальки и прибоя до долгих прогулок у воды.',
    imageSrc: '/images/venues/sochi/identity-sea-r20261027.jpg',
    imageAlt: 'Волны Чёрного моря на галечном пляже в Сочи',
    slugs: ['sochi-morskoy-vokzal', 'sochi-morskie-sezony', 'sochi-uho-zhelaniy'],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'subtropical-city',
    title: 'Субтропический город',
    text: 'Пальмы, магнолии и вечнозеленые дворы задают Сочи особый городской ритм. Даже обычная прогулка по центру здесь проходит среди густой южной зелени.',
    imageSrc: '/images/venues/sochi/identity-subtropical-r20261027.jpg',
    imageAlt: 'Пальмы и магнолии на улице в центре Сочи',
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
    id: 'seaside-promenade',
    title: 'Жизнь у моря',
    text: 'Мягкий климат и длинная береговая линия превращают прогулку у воды в часть повседневной жизни курорта. К вечеру набережные наполняются огнями, разговорами и шумом прибоя.',
    imageSrc: '/images/venues/sochi/identity-waterfront-r20261027.jpg',
    imageAlt: 'Пальмовая набережная и яхты на побережье Сочи вечером',
    slugs: ['sochi-morskoy-vokzal', 'sochi-brilliantovaya-ruka', 'sochi-morskie-sezony'],
    target: 'places',
    badge: 'Архитектура',
  },
];
