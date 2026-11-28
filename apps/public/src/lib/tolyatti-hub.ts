/** Tolyatti city hub pack. */
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
  place('Парковый комплекс истории техники имени К. Г. Сахарова', 'Открытая коллекция автомобилей, авиационной, железнодорожной и военной техники.', 53.4805, 49.4872, {
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
  place('Памятник Василию Татищеву', 'Конная статуя основателя Ставрополя-на-Волге на высоком берегу водохранилища.', 53.4735, 49.5062, {
    address: 'Комзина, 1А',
    locationSlug: 'tolyatti-pamyatnik-tatischevu',
    mustSeeFilter: 'monument',
    visitMinutes: 15,
    alsoMain: true,
  }),
  place('Спасо-Преображенский кафедральный собор', 'Кафедральный собор Автозаводского района.', 53.5186, 49.4152, {
    address: 'ул. Революционная, 19',
    locationSlug: 'tolyatti-spaso-preobrazhenskiy-sobor',
    mustSeeFilter: 'temple',
    visitMinutes: 30,
  }),
  place('Площадь Свободы и Обелиск Славы', 'Центральная площадь с мемориалом четырём тольяттинцам - героям Великой Отечественной войны.', 53.5078, 49.4204, {
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
  'Перед поездкой проверьте актуальное расписание транспорта и часы работы площадок. Тольятти растянут вдоль Волги, поэтому учитывайте время на переезды между районами. Для прогулок у воды выбирайте тёплую сухую погоду; музеи подходят для поездки в любой сезон.';

export const TOLYATTI_SIGHTS = [
  { title: 'Технический музей имени К. Г. Сахарова', text: 'Большая открытая коллекция техники на территории АвтоВАЗа.' },
  { title: 'Памятник Василию Татищеву', text: 'Конная статуя основателя Ставрополя-на-Волге у берега водохранилища.' },
  { title: 'Обелиск Славы', text: 'Мемориал на площади Свободы в память о героях-тольяттинцах.' },
  { title: 'Портпосёлок', text: 'Старый район у воды, связанный с историей прежнего Ставрополя.' },
  { title: 'Спасо-Преображенский кафедральный собор', text: 'Крупный храм Автозаводского района.' },
  { title: 'Парк Победы', text: 'Зелёное общественное пространство в Автозаводском районе.' },
];

export const TOLYATTI_DAY_ROUTE_PRESETS = [
  {
    id: 'tolyatti-volga-and-old-stavropol',
    title: 'Волга и старый Ставрополь',
    description: 'Памятник Татищеву, прогулка по Портпосёлку и виды на водохранилище.',
    stops: [
      { name: 'Памятник Василию Татищеву', locationSlug: 'tolyatti-pamyatnik-tatischevu' },
      { name: 'Портпосёлок', locationSlug: 'tolyatti-portposelok' },
      { name: 'Набережная Волги', locationSlug: 'tolyatti-naberezhnaya-volgi' },
    ],
  },
  {
    id: 'tolyatti-avtograd-day',
    title: 'Автоград за один день',
    description: 'Технический музей, парк Победы и Спасо-Преображенский собор.',
    stops: [
      { name: 'Парковый комплекс истории техники имени К. Г. Сахарова', venueSlug: 'tolyatti-tehnicheskiy-muzey-vaz' },
      { name: 'Парк Победы', locationSlug: 'tolyatti-park-pobedy' },
      { name: 'Спасо-Преображенский кафедральный собор', locationSlug: 'tolyatti-spaso-preobrazhenskiy-sobor' },
    ],
  },
];

export const TOLYATTI_FAQ = [
  {
    q: 'Сколько времени закладывать на Технический музей?',
    a: 'На открытую площадку комфортно закладывать 1,5-2 часа, особенно если идёте с детьми.',
  },
  {
    q: 'Где ловить виды на Волгу?',
    a: 'Набережная и Портпосёлок дают разные ракурсы: городской променад и более тихий берег.',
  },
  {
    q: 'Что посмотреть в Тольятти за один день?',
    a: 'Выберите технический музей и Автозаводский район либо маршрут по Волге с памятником Татищеву и Портпосёлком. Между районами удобнее перемещаться на транспорте.',
  },
  {
    q: 'Где находится памятник Татищеву?',
    a: 'У берега Волги, в районе Портпосёлка; адрес в городском туристическом паспорте - улица Комзина, 1А.',
  },
];
