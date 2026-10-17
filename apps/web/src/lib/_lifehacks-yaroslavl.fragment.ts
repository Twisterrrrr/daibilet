/**
 * Yaroslavl lifehacks fragment (owner 2026-08-21).
 * Paste into city-hub-lifehacks.ts when integrating - do not edit that file from hub agents.
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

export const YAROSLAVL_ITEMS: CityLifehackItem[] = [
  {
    id: 'yaroslavl-yakarta',
    tabId: 'transit',
    icon: 'transit',
    title: 'Карта «Якарта» и бесплатная пересадка',
    body: body(
      'Единая бесконтактная карта «Якарта» снижает стоимость поездки в автобусах, трамваях и троллейбусах. Лайфхак: синие автобусы «Яавтобус» - при оплате картой в течение ',
      { s: '60 минут' },
      ' первая пересадка бесплатна.',
    ),
    cta: {
      kind: 'gis',
      label: 'Транспорт на карте',
      href: twoGisCitySearchUrl('yaroslavl', 'транспорт Ярославль'),
    },
  },
  {
    id: 'yaroslavl-free-museum-wednesday',
    tabId: 'walk',
    icon: 'museum',
    title: 'Бесплатная среда в Худмузее',
    body: body(
      'Каждую ',
      { s: 'последнюю среду' },
      ' месяца вход в постоянную экспозицию Губернаторского дома Ярославского художественного музея бесплатен для индивидуальных посетителей.',
    ),
    cta: {
      kind: 'places',
      label: 'Худмузей Ярославля',
      slugs: ['yaroslavl-yaroslavskiy-hudozhestvennyy-muzey', 'yaroslavl-gubernatorskiy-sad'],
      scrollTo: 'places',
    },
  },
  {
    id: 'yaroslavl-free-kotorosl-view',
    tabId: 'walk',
    icon: 'walk',
    title: 'Бесплатная панорама Которосли',
    body: body(
      'Не хотите платить за звонницу Спасского монастыря - идите к храму Михаила Архангела на Которосльной набережной. С холма открывается вид на реку, Даманский и КЗЦ «Миллениум» ',
      { s: 'бесплатно' },
      '.',
    ),
    cta: {
      kind: 'maps',
      label: 'Которосльная набережная',
      href: yandexMapsSearchUrl('Которосльная набережная Ярославль'),
      extra: [
        { label: 'Даманский остров', href: yandexMapsSearchUrl('Даманский остров Ярославль') },
      ],
    },
  },
  {
    id: 'yaroslavl-yarushki',
    tabId: 'food',
    icon: 'food',
    title: 'Ярушки со щукой без туристического ценника',
    body: body(
      'Не гонитесь за дорогими пельменными на Кирова. Секретный спот местных - аутентичные пельменные и чебуречные у Первомайской за Гостиным двором: порция горячих ',
      { s: 'ярушек' },
      ' со щукой или судаком по ценам студенческой столовой.',
    ),
    cta: {
      kind: 'places',
      label: 'Где поесть в Ярославле',
      slugs: ['yaroslavl-restoran-ioann-vasilevich', 'yaroslavl-restoran-sobranie'],
      scrollTo: 'places',
    },
  },
  {
    id: 'yaroslavl-demidov-garden-free',
    tabId: 'walk',
    icon: 'walk',
    title: 'Демидовский сад бесплатно',
    body: body(
      'Тихий тенистый сквер в центре регулярного плана: вековые липы, светомузыкальные фонтаны и зоны отдыха. Вход ',
      { s: 'бесплатный' },
      ' - удобная пауза между храмами и набережной.',
    ),
    cta: {
      kind: 'places',
      label: 'Демидовский сад',
      slugs: ['yaroslavl-demidovskiy-sad', 'yaroslavl-demidovskiy-stolp'],
      scrollTo: 'places',
    },
  },
];
