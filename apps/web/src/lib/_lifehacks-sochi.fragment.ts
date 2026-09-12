/**
 * Sochi lifehacks fragment (owner 2026-08-21). Hyphen-only copy.
 * Parent wires into city-hub-lifehacks.ts - do not edit that file here.
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

export const SOCHI_ITEMS: CityLifehackItem[] = [
  {
    id: 'sochi-troika-lastochka',
    tabId: 'transit',
    icon: 'transit',
    title: '«Тройка» и абонементы на «Ласточку»',
    body: body(
      'В Сочи работает единая транспортная карта ',
      { s: '«Тройка»' },
      ' на городские автобусы. Если часто ездите в Адлер или Красную Поляну - пакетные абонементы РЖД на «Ласточку» на 3, 5 или 10 дней сберегут до ',
      { s: '40%' },
      ' от разовых билетов.',
    ),
    cta: {
      kind: 'gis',
      label: 'Транспорт на карте',
      href: twoGisCitySearchUrl('sochi', 'транспорт Сочи'),
    },
  },
  {
    id: 'sochi-free-museums',
    tabId: 'walk',
    icon: 'museum',
    title: 'Дни открытых дверей в музеях',
    body: body(
      'Каждый ',
      { s: 'третий вторник' },
      ' месяца Сочинский художественный музей открывает двери бесплатно. Музей истории города-курорта - бесплатно в Международный день музеев (18 мая) и в День города.',
    ),
    cta: {
      kind: 'places',
      label: 'Музеи Сочи',
      slugs: ['sochi-hudozhestvennyy-muzey', 'sochi-muzey-istorii-kurorta'],
      scrollTo: 'places',
    },
  },
  {
    id: 'sochi-orlinye-skaly-free',
    tabId: 'walk',
    icon: 'walk',
    title: 'Смотровая вместо платной башни Ахун',
    body: body(
      'Пока туристы платят за башню Ахун, местные поднимаются на бесплатную панораму на ',
      { s: 'Орлиных скалах' },
      '. Вид на Агурское ущелье и вершины Кавказа отсюда не хуже, а вход в Нацпарк можно обойти тропой со стороны Мацесты.',
    ),
    cta: {
      kind: 'maps',
      label: 'Орлиные скалы на карте',
      href: yandexMapsSearchUrl('Орлиные скалы Сочи'),
      extra: [{ label: 'Башня Ахун', href: yandexMapsSearchUrl('Смотровая башня Ахун Сочи') }],
    },
  },
  {
    id: 'sochi-hinkali-streetfood',
    tabId: 'food',
    icon: 'food',
    title: 'Хинкали вместо первой линии',
    body: body(
      'Забудьте про ужин от 3000 ₽ на берегу. Местные едят в ',
      { s: '«Белых ночах»' },
      ' и чебуречной ',
      { s: '«У Кристины»' },
      ' на Виноградной - гигантская сочная хинкалина в разы дешевле и эталоннее по вкусу.',
    ),
    cta: {
      kind: 'places',
      label: 'Где поесть в Сочи',
      slugs: ['sochi-belye-nochi', 'sochi-cheburechnaya-u-kristiny'],
      scrollTo: 'places',
    },
  },
  {
    id: 'sochi-free-phytoskvers',
    tabId: 'walk',
    icon: 'walk',
    title: 'Бесплатные фитоуголки вместо Дендрария',
    body: body(
      'Если вход в Верхний Дендрарий всей семьей бьет по бюджету - идите в сквер ',
      { s: '«Венчаговский»' },
      ' у Комсомольского парка или в сад у собора Архангела Михаила. Бесплатные ландшафтные зоны с субтропическими растениями от озеленителя Венчагова.',
    ),
    cta: {
      kind: 'places',
      label: 'Собор и Дендрарий',
      slugs: ['sochi-sobor-arhangela-mihaila', 'sochi-dendrariy-verhniy'],
      scrollTo: 'places',
    },
  },
];
