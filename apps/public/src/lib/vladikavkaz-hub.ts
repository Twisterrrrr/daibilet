/** Vladikavkaz thin hub pack (wave 1 must-see). Hyphen-only copy. */
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

export const VLADIKAVKAZ_MUST_SEE: any[] = [
  place('Проспект Мира', 'Главная пешеходная ось города с фасадами и кафе.', 43.0245, 44.6814, {
    address: 'пр. Мира',
    locationSlug: 'vladikavkaz-prospekt-mira',
    mustSeeFilter: 'street',
    visitMinutes: 60,
    alsoMain: true,
  }),
  place('Набережная Терека', 'Променад вдоль реки с видами на горы.', 43.0208, 44.6752, {
    address: 'набережная Терека',
    locationSlug: 'vladikavkaz-naberezhnaya-tereka',
    mustSeeFilter: 'views',
    visitMinutes: 45,
    alsoMain: true,
  }),
  place('Суннитская мечеть', 'Один из узнаваемых силуэтов Владикавказа у воды.', 43.0259, 44.6788, {
    address: 'ул. Коцоева',
    locationSlug: 'vladikavkaz-sunnitskaya-mechet',
    mustSeeFilter: 'temple',
    visitMinutes: 25,
    alsoMain: true,
  }),
  place('Армянская церковь', 'Камерный храм и важный слой городской культуры.', 43.0271, 44.6835, {
    address: 'ул. Армянская',
    locationSlug: 'vladikavkaz-armyanskaya-cerkov',
    mustSeeFilter: 'temple',
    visitMinutes: 20,
  }),
  place('Парк имени Коста Хетагурова', 'Большой городской парк с аллеями и тихими уголками.', 43.0312, 44.6871, {
    address: 'парк Коста Хетагурова',
    locationSlug: 'vladikavkaz-park-khetagurova',
    mustSeeFilter: 'park',
    visitMinutes: 50,
    alsoMain: true,
  }),
  place('Аллея Нартов', 'Скульптурный маршрут по осетинскому эпосу.', 43.0224, 44.6799, {
    address: 'аллея Нартов',
    locationSlug: 'vladikavkaz-alleya-nartov',
    mustSeeFilter: 'monument',
    visitMinutes: 30,
    alsoMain: true,
  }),
  place('Театр оперы и балета', 'Главная вечерняя сцена республики.', 43.0241, 44.6922, {
    address: 'пл. Ленина',
    venueSlug: 'vladikavkaz-teatr-opery',
    mustSeeFilter: 'creative',
    visitMinutes: 90,
  }),
  place('Площадь Свободы', 'Центральная площадь и ориентир для старта прогулок.', 43.0252, 44.6819, {
    address: 'пл. Свободы',
    locationSlug: 'vladikavkaz-ploschad-svobody',
    mustSeeFilter: 'main',
    visitMinutes: 20,
    alsoMain: true,
  }),
];

export const VLADIKAVKAZ_TRAVEL =
  'Во Владикавказ летают прямые рейсы из Москвы; из аэропорта до центра около 30-40 минут. Город компактный: проспект Мира, Терек и парк Хетагурова удобно связать пешком за один день.';

export const VLADIKAVKAZ_FAQ = [
  {
    q: 'С чего начать прогулку?',
    a: 'С проспекта Мира и набережной Терека - оттуда логично зайти к мечети и дальше в парк.',
  },
  {
    q: 'Можно ли увидеть горы из города?',
    a: 'Да, особенно с набережной Терека в ясную погоду - это один из главных кадров Владикавказа.',
  },
];
