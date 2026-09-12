/** Surgut thin hub pack (wave 1 must-see). Hyphen-only copy. */
/* eslint-disable @typescript-eslint/no-explicit-any */

function place(
  name: string,
  desc: string,
  latitude: number,
  longitude: number,
  opts: {
    address: string;
    locationSlug?: string;
    venueSlug?: string;
    mustSeeFilter?: string;
    visitMinutes?: number | string;
    alsoMain?: boolean;
  },
): any {
  return {
    name,
    desc,
    address: opts.address,
    latitude,
    longitude,
    mustSeeFilter: opts.mustSeeFilter || 'main',
    visitMinutes: opts.visitMinutes ?? 30,
    ...(opts.locationSlug ? { locationSlug: opts.locationSlug } : {}),
    ...(opts.venueSlug ? { venueSlug: opts.venueSlug } : {}),
    ...(typeof opts.alsoMain === 'boolean' ? { alsoMain: opts.alsoMain } : {}),
  };
}

export const SURGUT_MUST_SEE: any[] = [
  place('Сургутский мост', 'Один из символов города - длинный мост через Обь.', 61.2548, 73.4261, {
    address: 'мост через Обь',
    locationSlug: 'surgut-surgutskiy-most',
    mustSeeFilter: 'views',
    visitMinutes: 30,
    alsoMain: true,
  }),
  place('Проспект Энергетиков', 'Главная городская артерия с современной застройкой.', 61.254, 73.3962, {
    address: 'пр. Энергетиков',
    locationSlug: 'surgut-prospekt-energetikov',
    mustSeeFilter: 'street',
    visitMinutes: 40,
    alsoMain: true,
  }),
  place('Краеведческий музей', 'История города, нефти и коренных народов Югры.', 61.2501, 73.3894, {
    address: 'ул. 30 лет Победы',
    venueSlug: 'surgut-kraevedcheskiy-muzey',
    mustSeeFilter: 'museum',
    visitMinutes: 60,
    alsoMain: true,
  }),
  place('Этнопарк «Старый Сургут»', 'Деревянный квартал и живая реконструкция старого города.', 61.2572, 73.4021, {
    address: 'ул. Энергетиков',
    locationSlug: 'surgut-etnopark-staryy-surgut',
    mustSeeFilter: 'museum',
    visitMinutes: 75,
    alsoMain: true,
  }),
  place('Набережная Оби', 'Прогулочная линия у большой сибирской реки.', 61.2488, 73.4185, {
    address: 'набережная Оби',
    locationSlug: 'surgut-naberezhnaya-obi',
    mustSeeFilter: 'views',
    visitMinutes: 45,
    alsoMain: true,
  }),
  place('Мемориал факела', 'Память о газовой и нефтяной истории региона.', 61.2611, 73.3842, {
    address: 'мемориальная зона центра',
    locationSlug: 'surgut-memorial-fakela',
    mustSeeFilter: 'monument',
    visitMinutes: 20,
  }),
  place('Храм Преображения', 'Крупный православный храм современного Сургута.', 61.2654, 73.3751, {
    address: 'ул. Университетская',
    locationSlug: 'surgut-hram-preobrazheniya',
    mustSeeFilter: 'temple',
    visitMinutes: 25,
  }),
  place('Парк за Саймой', 'Зелёная зона для спокойной прогулки вне делового центра.', 61.2425, 73.3688, {
    address: 'район Саймы',
    locationSlug: 'surgut-park-za-saymoy',
    mustSeeFilter: 'park',
    visitMinutes: 50,
  }),
];

export const SURGUT_TRAVEL =
  'Сургут принимает прямые рейсы из Москвы и крупных хабов Сибири. Из аэропорта до центра 20-40 минут на такси. Лучшее время - июнь-август: длинный день и комфортные прогулки по набережной.';

export const SURGUT_FAQ = [
  {
    q: 'Что смотреть в первую очередь?',
    a: 'Этнопарк «Старый Сургут», набережную Оби и проспект Энергетиков - это быстрый каркас города за полдня.',
  },
  {
    q: 'Нужна ли машина?',
    a: 'В центре можно обойтись такси и пешком, но для моста и дальних точек такси заметно экономит время.',
  },
];
