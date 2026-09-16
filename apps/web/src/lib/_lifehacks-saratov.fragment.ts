/**
 * Saratov lifehacks fragment for later merge into city-hub-lifehacks.ts.
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

export const SARATOV_ITEMS: CityLifehackItem[] = [
  {
    id: 'saratov-card-poehaly',
    tabId: 'transit',
    icon: 'transit',
    title: 'Карта «Поехали» и электрички',
    body: body(
      'В Саратове действует единая карта ',
      { s: '«Поехали»' },
      ', которая снижает стоимость проезда в трамваях и троллейбусах. На место приземления Гагарина или к утесу удобнее пригородные электрички от ж/д вокзала - заметно дешевле автобусов и междугородних такси.',
    ),
    cta: {
      kind: 'gis',
      label: 'Транспорт на карте',
      href: twoGisCitySearchUrl('saratov', 'транспорт Саратов'),
      extra: [
        { label: 'Электрички', href: yandexMapsSearchUrl('Саратов железнодорожный вокзал электрички') },
      ],
    },
  },
  {
    id: 'saratov-free-radischev',
    tabId: 'walk',
    icon: 'museum',
    title: 'Бесплатный день в Радищевском',
    body: body(
      'Каждый ',
      { s: 'последний четверг' },
      ' месяца вход в постоянную экспозицию исторического корпуса Художественного музея имени Радищева бесплатен для всех категорий граждан.',
    ),
    cta: {
      kind: 'places',
      label: 'Радищевский музей',
      slugs: ['saratov-hudozhestvennyy-muzey-radischeva'],
      scrollTo: 'places',
    },
  },
  {
    id: 'saratov-zavokzalnaya-view',
    tabId: 'walk',
    icon: 'walk',
    title: 'Смотровая «Завокзальная» бесплатно',
    body: body(
      'Вместо шумной смотровой у старого аэропорта поднимитесь на точку ',
      { s: '«Завокзальная»' },
      ' на склоне Кумысной поляны. Обзор на ночной город, мост и Волгу шире, а вход на экотропу бесплатный.',
    ),
    cta: {
      kind: 'maps',
      label: 'Кумысная поляна',
      href: yandexMapsSearchUrl('Кумысная поляна Саратов Завокзальная'),
      extra: [
        {
          label: 'Смотровая у аэропорта',
          href: yandexMapsSearchUrl('Смотровая площадка аэропорт Центральный Саратов'),
        },
      ],
    },
  },
  {
    id: 'saratov-street-bakery',
    tabId: 'food',
    icon: 'food',
    title: 'Кулинарии у Крытого рынка',
    body: body(
      'Для быстрого перекуса местные штурмуют исторические кулинарии у ',
      { s: 'Крытого рынка' },
      ' - сочни с творогом, пирожки с волжской рыбой и мини-калачи по ценам старой советской школы.',
    ),
    cta: {
      kind: 'places',
      label: 'Где поесть в Саратове',
      slugs: ['saratov-krytyy-rynok', 'saratov-gastrobar-kultura', 'saratov-kofeynya-coupe'],
      scrollTo: 'places',
    },
  },
  {
    id: 'saratov-gorky-park-free',
    tabId: 'walk',
    icon: 'walk',
    title: 'Бесплатный парк дубов Горького',
    body: body(
      'Вместо платных аттракционов идите в Городской парк имени Горького: система прудов, 200-летние дубы и возможность ',
      { s: 'бесплатно' },
      ' покормить черных лебедей и белок.',
    ),
    cta: {
      kind: 'places',
      label: 'Парк Горького',
      slugs: ['saratov-park-imeni-gorkogo'],
      scrollTo: 'places',
    },
  },
];
