/** Tolyatti thin hub pack (wave 1 must-see). Hyphen-only copy. */
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

export const TOLYATTI_MUST_SEE: any[] = [
  place('Технический музей Ваза', 'Открытая площадка с военной и гражданской техникой у Волги.', 53.4805, 49.4872, {
    address: 'Южное шоссе, 121',
    venueSlug: 'tolyatti-tehnicheskiy-muzey-vaz',
    mustSeeFilter: 'museum',
    visitMinutes: 90,
    alsoMain: true,
  }),
  place('Парк Победы', 'Главный зелёный каркас города с аллеями и мемориалами.', 53.5072, 49.4181, {
    address: 'ул. Революционная',
    locationSlug: 'tolyatti-park-pobedy',
    mustSeeFilter: 'park',
    visitMinutes: 60,
    alsoMain: true,
  }),
  place('Набережная Волги', 'Променад с видами на водохранилище и вечерними прогулками.', 53.4931, 49.5124, {
    address: 'набережная Волги',
    locationSlug: 'tolyatti-naberezhnaya-volgi',
    mustSeeFilter: 'views',
    visitMinutes: 45,
    alsoMain: true,
  }),
  place('Скульптура «Восхищение»', 'Городской символ у въезда и удобная точка для фото.', 53.5308, 49.3465, {
    address: 'у въезда в Автозаводский район',
    locationSlug: 'tolyatti-skulptura-voskhischenie',
    mustSeeFilter: 'monument',
    visitMinutes: 15,
    alsoMain: true,
  }),
  place('Свято-Троицкий собор', 'Крупный современный храм Автограда.', 53.5186, 49.4152, {
    address: 'ул. Юбилейная',
    locationSlug: 'tolyatti-troitskiy-sobor',
    mustSeeFilter: 'temple',
    visitMinutes: 30,
  }),
  place('Площадь Свободы', 'Центральная площадь с городским ритмом и событиями.', 53.5078, 49.4204, {
    address: 'пл. Свободы',
    locationSlug: 'tolyatti-ploschad-svobody',
    mustSeeFilter: 'main',
    visitMinutes: 25,
    alsoMain: true,
  }),
  place('Портпосёлок', 'Тихий берег и исторический слой раннего Ставрополя-на-Волге.', 53.4821, 49.5233, {
    address: 'район Портпосёлка',
    locationSlug: 'tolyatti-portposelok',
    mustSeeFilter: 'views',
    visitMinutes: 40,
  }),
  place('Музей истории АвтоВАЗа', 'Заводская история города и автомобильный код Тольятти.', 53.5581, 49.2624, {
    address: 'Южное шоссе, 36',
    venueSlug: 'tolyatti-muzey-istorii-avtovaza',
    mustSeeFilter: 'museum',
    visitMinutes: 60,
  }),
];

export const TOLYATTI_TRAVEL =
  'До Тольятти удобно добираться через Самару: аэропорт Курумоч, затем 1-1,5 часа на такси или автобусе. Из Самары ходят регулярные рейсы и электрички. Лучший сезон - май-сентябрь, когда комфортно гулять по набережной и паркам.';

export const TOLYATTI_FAQ = [
  {
    q: 'Сколько времени закладывать на Технический музей?',
    a: 'На открытую площадку комфортно закладывать 1,5-2 часа, особенно если идёте с детьми.',
  },
  {
    q: 'Где ловить виды на Волгу?',
    a: 'Набережная и Портпосёлок дают разные ракурсы: городской променад и более тихий берег.',
  },
];
