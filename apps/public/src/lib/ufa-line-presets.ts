/** Ufa painted walking lines (owner 2026-08-17). Hyphen-only copy. */
/* eslint-disable @typescript-eslint/no-explicit-any */

function stop(
  name: string,
  desc: string,
  latitude: number,
  longitude: number,
  opts: {
    locationSlug?: string;
    venueSlug?: string;
    dayRouteId?: string;
    address?: string;
    mustSeeFilter?: string;
    visitMinutes?: number;
  } = {},
): any {
  return {
    name,
    desc,
    latitude,
    longitude,
    mustSeeFilter: opts.mustSeeFilter || 'main',
    visitMinutes: opts.visitMinutes ?? 20,
    ...(opts.locationSlug ? { locationSlug: opts.locationSlug } : {}),
    ...(opts.venueSlug ? { venueSlug: opts.venueSlug } : {}),
    ...(opts.dayRouteId ? { dayRouteId: opts.dayRouteId } : {}),
    ...(opts.address ? { address: opts.address } : {}),
  };
}

/** Зеленая линия: купеческая Уфа и дворянское гнездо, 7 точек. */
export const UFA_GREEN_LINE_STOPS: any[] = [
  stop(
    'Здание Дворянского собрания',
    'Классический особняк, где пел молодой Шаляпин. Стартовая точка купеческого трека.',
    54.723891,
    55.943431,
    {
      locationSlug: 'ufa-zdanie-dvoryanskogo-sobraniya',
      address: 'ул. Ленина, 14',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Особняк Костерина и Черникова',
    'Роскошный купеческий модерн буквально за углом от Дворянского собрания.',
    54.726112,
    55.945102,
    {
      locationSlug: 'ufa-osobnyak-kosterina-i-chernikova',
      address: 'ул. Пушкина, 86',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Гостиный двор',
    'Торговое сердце старой Уфы, масштабный каменный каре-корпус XIX века.',
    54.725891,
    55.947891,
    {
      locationSlug: 'ufa-gostinyy-dvor',
      address: 'ул. Верхнеторговая площадь, 1',
      mustSeeFilter: 'houses',
      visitMinutes: 20,
    },
  ),
  stop(
    'Здание Крестьянского поземельного банка',
    'Сказочный краснокирпичный замок с элементами неорусского стиля.',
    54.719412,
    55.946312,
    {
      locationSlug: 'ufa-zdanie-krestyanskogo-pozemelnogo-banka',
      address: 'ул. Советская, 14',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Дом Губернатора',
    'Бывший центр управления Уфимской губернией в строгом классицизме.',
    54.718901,
    55.944112,
    {
      locationSlug: 'ufa-dom-gubernatora',
      address: 'ул. Советская, 18',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Сад культуры и отдыха им. С. Т. Аксакова',
    'Тихое мемориальное место с лебединым озером.',
    54.718102,
    55.941912,
    {
      locationSlug: 'ufa-sad-aksakova',
      address: 'ул. Пушкина, 112/1',
      mustSeeFilter: 'park',
      visitMinutes: 25,
    },
  ),
  stop(
    'Первая соборная мечеть Уфы',
    'Финал линии. Старейший действующий исламский храм города на улице Тукаева.',
    54.713901,
    55.935891,
    {
      locationSlug: 'ufa-pervaya-sobornaya-mechet',
      address: 'ул. Тукаева, 52',
      mustSeeFilter: 'temple',
      visitMinutes: 20,
    },
  ),
];

/** Красная линия: уфимский рок, авангард и стрит-арт, 7 точек. */
export const UFA_RED_LINE_STOPS: any[] = [
  stop(
    'Памятник Мустаю Кариму',
    'Креативный уличный монумент с каскадами летящих страниц.',
    54.726612,
    55.946905,
    {
      locationSlug: 'ufa-pamyatnik-mustayu-karimu',
      address: 'ул. Кирова, 1 (перед Домом профсоюзов)',
      mustSeeFilter: 'monument',
      visitMinutes: 15,
    },
  ),
  stop(
    'Дом-коммуна',
    'Памятник уфимского конструктивизма и авангардного жилого строительства 1930-х.',
    54.724901,
    55.944112,
    {
      locationSlug: 'ufa-dom-kommuna',
      address: 'ул. Ленина, 9/11',
      mustSeeFilter: 'houses',
      visitMinutes: 15,
    },
  ),
  stop(
    'Башкирский театр оперы и балета',
    'Театральный символ, место старта карьеры Рудольфа Нуреева.',
    54.724312,
    55.943891,
    {
      venueSlug: 'ufa-bashkirskiy-teatr-opery-i-baleta',
      address: 'ул. Ленина, 5/1',
      mustSeeFilter: 'creative',
      visitMinutes: 15,
    },
  ),
  stop(
    'Музей рока в кинотеатре «Родина»',
    'Культовое место, посвященное уфимскому периоду группы ДДТ и Земфиры.',
    54.728901,
    55.950112,
    {
      locationSlug: 'ufa-muzey-roka-kinoteatr-rodina',
      address: 'ул. Ленина, 42',
      mustSeeFilter: 'museum',
      visitMinutes: 30,
    },
  ),
  stop(
    'Арт-квадрат',
    'Эпицентр уфимского стрит-арта, перформансов и молодежной жизни под открытым небом.',
    54.728912,
    55.945112,
    {
      locationSlug: 'ufa-art-kvadrat',
      address: 'ул. Чернышевского, 88',
      mustSeeFilter: 'park',
      visitMinutes: 50,
    },
  ),
  stop(
    'Чайная «Матча комната»',
    'Спрятанный концептуальный спот во внутренних кирпичных дворах Арт-квадрата.',
    54.729112,
    55.945891,
    {
      locationSlug: 'ufa-matcha-komnata',
      address: 'ул. Чернышевского, 88 (блок Арт-Квадрат)',
      mustSeeFilter: 'gastro',
      visitMinutes: 30,
    },
  ),
  stop(
    'Ресторан «MusicHall27»',
    'Финальная точка трека. Культовое музыкальное заведение с живым роком.',
    54.727912,
    55.955891,
    {
      locationSlug: 'ufa-musichall27',
      address: 'ул. Кирова, 27',
      mustSeeFilter: 'gastro',
      visitMinutes: 40,
    },
  ),
];

export const UFA_LINE_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'ufa-green-line',
    title: 'Зеленая линия',
    description:
      'Купеческая Уфа и дворянское гнездо: особняки, Гостиный двор, Крестьянский банк и финал у Первой соборной мечети. Весь трек компактно уложен в исторический центр.',
    travelVector: '7 точек · пешком по центру',
    timingNote: 'Связный трек без разрывов: от Дворянского собрания к мечети на Тукаева.',
    stops: UFA_GREEN_LINE_STOPS,
  },
  {
    id: 'ufa-red-line',
    title: 'Красная линия',
    description:
      'Уфимский рок, авангард и стрит-арт: Мустай Карим, дом-коммуна, опера, музей рока в «Родине», Арт-квадрат, «Матча комната» и MusicHall27.',
    travelVector: '7 точек · пешком по дворам',
    timingNote: 'От памятника Мустаю Кариму к MusicHall27 без логистических разрывов.',
    gastroStop: {
      name: 'Чай и рок Красной линии',
      blurb:
        '«Матча комната» во дворах Арт-квадрата и живые концерты в MusicHall27 закрывают неформальный трек.',
    },
    stops: UFA_RED_LINE_STOPS,
  },
];
