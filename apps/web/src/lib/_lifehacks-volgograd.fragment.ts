/**
 * Volgograd lifehacks fragment (owner 2026-08-21).
 * Wire into city-hub-lifehacks.ts later - do not edit that file from this pack.
 * Hyphen-only copy.
 */
import type { CityLifehackBodyPart, CityLifehackItem } from './city-hub-lifehacks.ts';

function yandexMapsSearchUrl(query: string): string {
  return `https://yandex.ru/maps/?text=${encodeURIComponent(query)}`;
}

function twoGisCitySearchUrl(citySlug: string, query: string): string {
  return `https://2gis.ru/${citySlug}/search/${encodeURIComponent(query)}`;
}

function body(...chunks: Array<string | { s: string }>): CityLifehackBodyPart[] {
  return chunks.map((chunk) =>
    typeof chunk === 'string' ? { text: chunk } : { text: chunk.s, strong: true },
  );
}

export const VOLGOGRAD_ITEMS: CityLifehackItem[] = [
  {
    id: 'volgograd-card-volna',
    tabId: 'transit',
    icon: 'transit',
    title: 'Карта «Волна» и метротрам',
    body: body(
      'Единая карта «Волна» снижает стоимость проезда в автобусах, троллейбусах и скоростном трамвае. С часовым безлимитом пересадки ',
      { s: 'бесплатны' },
      '.',
    ),
    cta: {
      kind: 'gis',
      label: 'Транспорт на карте',
      href: twoGisCitySearchUrl('volgograd', 'скоростной трамвай Волгоград'),
    },
  },
  {
    id: 'volgograd-free-mashkov',
    tabId: 'walk',
    icon: 'museum',
    title: 'Бесплатный день в музее Машкова',
    body: body(
      'Каждый ',
      { s: 'последний четверг' },
      ' месяца постоянная экспозиция Музея изобразительных искусств им. И.И. Машкова бесплатна для индивидуальных посетителей.',
    ),
    cta: {
      kind: 'places',
      label: 'Музей Машкова',
      slugs: ['volgograd-muzey-mashkova'],
      scrollTo: 'places',
    },
  },
  {
    id: 'volgograd-free-views',
    tabId: 'walk',
    icon: 'walk',
    title: 'Бесплатная панорама Волги',
    body: body(
      'Не платите за закрытые смотровые. Поднимитесь на верхний ярус амфитеатра на ',
      { s: 'Центральной набережной' },
      ' или к склону у памятника Чекистам - вид на реку бесплатный.',
    ),
    cta: {
      kind: 'maps',
      label: 'Набережная на карте',
      href: yandexMapsSearchUrl('Центральная набережная 62-й Армии Волгоград'),
      extra: [
        {
          label: 'Площадь Чекистов',
          href: yandexMapsSearchUrl('площадь Чекистов Волгоград'),
        },
      ],
    },
  },
  {
    id: 'volgograd-kotleta',
    tabId: 'food',
    icon: 'food',
    title: 'Котлета по-волгоградски в кулинарии',
    body: body(
      'Вместо туристических ресторанов на набережной ищите кулинарии «Конфетки-Бараночки»: свежая ',
      { s: 'котлета по-волгоградски' },
      ' и выпечка на горчичном масле за копейки.',
    ),
    cta: {
      kind: 'places',
      label: 'Где поесть',
      slugs: ['volgograd-angel-cakes', 'volgograd-kafe-marusya'],
      scrollTo: 'places',
    },
  },
  {
    id: 'volgograd-komsomolskiy-sad',
    tabId: 'walk',
    icon: 'walk',
    title: 'Бесплатный отдых в Комсомольском саду',
    body: body(
      'Вместо платных парков - тенистый ',
      { s: 'Комсомольский сад' },
      ' в центре: гамаки, буккроссинг и иногда бесплатные кинопоказы под открытым небом.',
    ),
    cta: {
      kind: 'places',
      label: 'Комсомольский сад',
      slugs: ['volgograd-komsomolskiy-sad'],
      scrollTo: 'places',
    },
  },
];
