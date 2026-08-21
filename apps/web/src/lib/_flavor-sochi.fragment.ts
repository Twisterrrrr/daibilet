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
  outdoorCta: 'Отличная погода для Морвокзала, «Ривьеры» и прогулки к Дендрарию',
  indoorCtaOvercast: 'Сегодня пасмурно. Загляните в худмузей, краеведческий или «Белые Ночи»',
  indoorCtaRain: 'Сегодня дождь. Худмузей, зал органной музыки или гастробар «Баран-Рапан»',
  indoorCtaSnow: 'Сегодня снег в горах. Музеи центра и хинкали в «Белых Ночах» после променада',
};

export const SOCHI_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Europe/Moscow',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Горнолыжный сплит в Красной Поляне. Побережье пустеет и радует субтропической зеленью при +10 °C, в горах - плотный вельвет. Утренние трассы и вечерние прогулки по пустынной набережной.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'До середины апреля можно совмещать горные лыжи и пляжные прогулки. В мае - цветение глицинии и рододендронов, воздух до +20 °C. Лучшее время для треккинга к полноводным водопадам.',
    },
    {
      id: 'summer',
      months: [6, 7, 8],
      headline: 'Лето',
      body: 'Пик пляжного сезона и нагрузки на логистику. Воздух до +30 °C, море до +26 °C, высокая влажность. Фишки - ночные трансферы в горы ради прохлады и круизы на яхтах на закате.',
    },
    {
      id: 'autumn',
      months: [9, 10, 11],
      headline: 'Осень',
      body: 'Золотой сезон: в сентябре-октябре море еще теплое (+23 °C), жара уходит. В ноябре Поляна багровеет. Идеально для гастротуризма и прогулок по Кавказскому заповеднику.',
    },
  ],
  tabs: [
    {
      id: 'spring',
      label: 'Весна',
      body: 'Период контрастов: до середины апреля можно совмещать горные лыжи и пляжные прогулки. В мае Сочи взрывается цветением глицинии и рододендронов, воздух прогревается до +20 °C. Лучшее время для треккинга к водопадам, пока они максимально полноводны.',
    },
    {
      id: 'summer',
      label: 'Лето',
      body: 'Пик пляжного сезона, высокого спроса и максимальной нагрузки на логистику. Воздух прогревается до +30 °C, море - до +26 °C, из-за чего в городе держится высокая влажность. Главные фишки - ночные трансферы в горы ради прохлады и круизы на яхтах на закате.',
    },
    {
      id: 'autumn',
      label: 'Осень',
      body: 'Настоящий золотой сезон: в сентябре-октябре море еще теплое (+23 °C), но уходит удушающая жара. В ноябре Поляна окрашивается в багряные тона. Идеальное время для гастротуризма и спокойных прогулок по Кавказскому заповеднику.',
    },
    {
      id: 'winter',
      label: 'Зима',
      body: 'Время идеального горнолыжного сплита в Красной Поляне. Прибрежный кластер пустеет и радует субтропической зеленью при +10 °C, а в горах ложится плотный вельвет. Главная фишка - утренний вельвет на трассах и вечерние прогулки по пустынной набережной без толп.',
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
    imageSrc: '/images/venues/sochi/identity-gastro.jpg',
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
