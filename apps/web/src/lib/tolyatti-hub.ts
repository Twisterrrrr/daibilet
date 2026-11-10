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
    imageUrl?: string;
    imageCredit?: { author: string; sourceUrl: string; license: string; licenseUrl: string };
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
    ...(opts.imageUrl ? { imageUrl: opts.imageUrl } : {}),
    ...(opts.imageCredit ? { imageCredit: opts.imageCredit } : {}),
    ...(typeof opts.alsoMain === 'boolean' ? { alsoMain: opts.alsoMain } : {}),
  };
}

export const TOLYATTI_MUST_SEE: any[] = [
  place('Парковый комплекс истории техники имени К. Г. Сахарова', 'Открытая коллекция авиационной, железнодорожной, автомобильной и военной техники; среди экспонатов - подводная лодка Б-307.', 53.55309, 49.250004, {
    address: 'Южное шоссе, 137',
    venueSlug: 'tolyatti-tehnicheskiy-muzey-vaz',
    mustSeeFilter: 'museum',
    visitMinutes: 90,
    alsoMain: true,
  }),
  place('Парк Победы', 'Парк Автозаводского района с мемориалом в честь 40-летия Победы и памятником воинам-афганцам.', 53.5104991, 49.2748616, {
    address: 'между ул. Фрунзе и Приморским бульваром',
    imageUrl: '/images/venues/tolyatti/park-pobedy-memorial.jpg',
    imageCredit: {
      author: 'Александр Байдуков',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Togliatti._Memorial_in_honor_of_the_40th_anniversary_of_the_Victory._Victory_Park.jpg',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    },
    locationSlug: 'tolyatti-park-pobedy',
    mustSeeFilter: 'park',
    visitMinutes: 60,
    alsoMain: true,
  }),
  place('Тольяттинский краеведческий музей', 'Экспозиции об истории Ставрополя-на-Волге и Тольятти, природе и культуре Самарского края.', 53.502001, 49.420755, {
    address: 'б-р Ленина, 22',
    venueSlug: 'tolyatti-kraevedcheskiy-muzey',
    imageUrl: '/images/venues/tolyatti/kraevedcheskiy-muzey.jpg',
    imageCredit: {
      author: 'ShinePhantom',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Tolyatti_local_history_museum_20210414.jpg',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    },
    mustSeeFilter: 'museum',
    visitMinutes: 60,
  }),
  place('Набережная Автозаводского района', 'Прогулочная береговая территория у Куйбышевского водохранилища с открытым видом на воду.', 53.504124, 49.261241, {
    address: 'Прибрежный парк, Автозаводский район',
    locationSlug: 'tolyatti-naberezhnaya-volgi',
    mustSeeFilter: 'views',
    visitMinutes: 45,
    alsoMain: true,
  }),
  place('Памятник Василию Татищеву', 'Конная статуя основателя Ставрополя-на-Волге на высоком берегу Волги.', 53.474598, 49.3483, {
    address: 'ул. Комзина, 1А',
    locationSlug: 'tolyatti-pamyatnik-tatischevu',
    mustSeeFilter: 'monument',
    visitMinutes: 15,
    alsoMain: true,
  }),
  place('Спасо-Преображенский кафедральный собор', 'Кафедральный собор Тольяттинской епархии в Автозаводском районе.', 53.521056, 49.278154, {
    address: 'ул. Революционная, 19',
    locationSlug: 'tolyatti-spaso-preobrazhenskiy-sobor',
    mustSeeFilter: 'temple',
    visitMinutes: 30,
  }),
  place('Обелиск Славы на площади Свободы', 'Мемориал в память о тольяттинцах - героях Великой Отечественной войны.', 53.512966, 49.409622, {
    address: 'площадь Свободы',
    locationSlug: 'tolyatti-ploschad-svobody',
    mustSeeFilter: 'main',
    visitMinutes: 25,
    alsoMain: true,
  }),
  place('Портпосёлок', 'Исторический микрорайон у Волги, связанный с переселением Ставрополя при строительстве Куйбышевской ГЭС.', 53.4802, 49.3684, {
    address: 'микрорайон Портовый, ул. Комзина',
    locationSlug: 'tolyatti-portposelok',
    mustSeeFilter: 'views',
    visitMinutes: 40,
  }),
  place('Музей истории АвтоВАЗа', 'Экспозиция об истории Волжского автомобильного завода и его автомобилях.', 53.555412, 49.26412, {
    address: 'Южное шоссе, 121',
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
    title: 'История Ставрополя и Волга',
    description: 'Краеведческий музей, памятник Татищеву и прогулка по историческому Портпосёлку.',
    stops: [
      { name: 'Тольяттинский краеведческий музей', venueSlug: 'tolyatti-kraevedcheskiy-muzey' },
      { name: 'Памятник Василию Татищеву', locationSlug: 'tolyatti-pamyatnik-tatischevu' },
      { name: 'Портпосёлок', locationSlug: 'tolyatti-portposelok' },
    ],
  },
  {
    id: 'tolyatti-avtograd-day',
    title: 'Автоград за один день',
    description: 'Технический музей, прогулка по Парку Победы и Спасо-Преображенский собор.',
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
