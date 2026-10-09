/* Ulyanovsk hub. */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const ULYANOVSK_SUBURBS: any[] = [
  { name: 'Сенгилей', desc: 'Город на берегу Волги в 60 км.', address: 'г. Сенгилей', locationSlug: 'ulyanovsk-sengiley', latitude: 53.9622, longitude: 48.7944, travelVector: 'Юг', travelVectorBlurb: 'Авто ~1 ч.', places: [
    { name: 'Набережная Сенгилея', desc: 'Панорама водохранилища.', locationSlug: 'ulyanovsk-naberezhnaya-sengileya', latitude: 53.9615, longitude: 48.7928 },
    { name: 'Государев овраг', desc: 'Лесной каньон.', locationSlug: 'ulyanovsk-gosudarev-ovrag', latitude: 53.9588, longitude: 48.7872 },
  ]},
  { name: 'Новоульяновск', desc: 'Город-спутник с мостом.', address: 'г. Новоульяновск', locationSlug: 'ulyanovsk-novoulyanovsk', latitude: 54.1517, longitude: 48.3883, travelVector: 'Мост', travelVectorBlurb: 'Авто ~20 мин.', places: [
    { name: 'Императорский мост', desc: 'Мост через Волгу.', locationSlug: 'ulyanovsk-imperatorskiy-most', latitude: 54.1365, longitude: 48.3733 },
  ]},
];
export const ULYANOVSK_DAY_ROUTE_PRESETS: any[] = [
  { id: 'ulyanovsk-classic', title: 'Классический Симбирск', description: 'Мемориал, музей, Новый Венец.', travelVector: 'Пешком, 3-4 ч.', stops: [
    { name: 'Ленинский мемориал', desc: 'Комплекс.', locationSlug: 'ulyanovsk-leninskiy-memorial', visitMinutes: 60 },
    { name: 'Музей-заповедник', desc: 'Квартал Симбирска.', venueSlug: 'ulyanovsk-muzey-zapovednik-rodina-v-i-lenina', visitMinutes: 90 },
    { name: 'Бульвар Новый Венец', desc: 'Панорама Волги.', locationSlug: 'ulyanovsk-bul-var-novyy-venets', visitMinutes: 40 },
  ]},
  { id: 'ulyanovsk-aviation', title: 'Авиация и Волга', description: 'Музей авиации.', travelVector: 'Авто.', stops: [
    { name: 'Музей авиации', desc: '40 самолётов.', venueSlug: 'ulyanovsk-golovnoy-muzey-istorii-grazhdanskoy-aviatsii', visitMinutes: 120 },
    { name: 'Императорский мост', desc: 'Мост.', locationSlug: 'ulyanovsk-imperatorskiy-most', visitMinutes: 30 },
  ]},
];
export const ULYANOVSK_MUST_SEE: any[] = [
  { name: 'Бульвар Новый Венец', desc: 'Набережная с панорамой Волги.', locationSlug: 'ulyanovsk-bul-var-novyy-venets', mustSeeFilter: 'main', visitMinutes: 40, latitude: 54.3182, longitude: 48.4012 },
  { name: 'Музей-заповедник «Родина В.И. Ленина»', desc: 'Квартал деревянного Симбирска.', venueSlug: 'ulyanovsk-muzey-zapovednik-rodina-v-i-lenina', mustSeeFilter: 'museum', visitMinutes: 90, latitude: 54.3156, longitude: 48.3975 },
  { name: 'Музей гражданской авиации', desc: '40 самолётов, Ту-144.', venueSlug: 'ulyanovsk-golovnoy-muzey-istorii-grazhdanskoy-aviatsii', mustSeeFilter: 'museum', visitMinutes: 120, latitude: 54.3228, longitude: 48.3922 },
  { name: 'Императорский мост', desc: 'Мост через Волгу длиной 2 км.', locationSlug: 'ulyanovsk-imperatorskiy-most', mustSeeFilter: 'main', visitMinutes: 30, latitude: 54.3355, longitude: 48.3733 },
  { name: 'Памятник букве «Ё»', desc: 'Карамзинский символ.', locationSlug: 'ulyanovsk-pamyatnik-bukve-e', mustSeeFilter: 'monument', visitMinutes: 15, latitude: 54.3185, longitude: 48.4015 },
  { name: 'Ленинский мемориал', desc: 'Комплекс с домом Ульяновых.', locationSlug: 'ulyanovsk-leninskiy-memorial', mustSeeFilter: 'main', visitMinutes: 60, latitude: 54.3162, longitude: 48.3998 },
  { name: 'Музей Гончарова', desc: 'Усадьба писателя.', venueSlug: 'ulyanovsk-muzey-goncharova', mustSeeFilter: 'museum', visitMinutes: 60, latitude: 54.3148, longitude: 48.3965 },
  { name: 'Успенский собор', desc: 'Храм-классицизм.', venueSlug: 'ulyanovsk-uspenskiy-sobor', mustSeeFilter: 'temple', visitMinutes: 30, latitude: 54.3172, longitude: 48.3988 },
  { name: 'Симбирская крепость', desc: 'Место основания города.', locationSlug: 'ulyanovsk-simbirskaya-krepost', mustSeeFilter: 'views', visitMinutes: 45, latitude: 54.3195, longitude: 48.4032 },
  { name: 'Театр драмы им. Гончарова', desc: 'Старейший театр.', venueSlug: 'ulyanovsk-teatr-dramy', mustSeeFilter: 'main', visitMinutes: 120, latitude: 54.3168, longitude: 48.3982 },
  { name: 'Краеведческий музей', desc: 'История Симбирской губернии.', venueSlug: 'ulyanovsk-krayevedcheskiy-muzey', mustSeeFilter: 'museum', visitMinutes: 90, latitude: 54.3175, longitude: 48.3995 },
  { name: 'Музей-квартира Ульяновых', desc: 'Дом, где родился Ленин.', venueSlug: 'ulyanovsk-muzey-kvartira-ulianovyh', mustSeeFilter: 'museum', visitMinutes: 60, latitude: 54.3158, longitude: 48.3972 },
  { name: 'Парк Победы', desc: 'Мемориал.', locationSlug: 'ulyanovsk-park-pobedy-novoulyanovsk', mustSeeFilter: 'park', visitMinutes: 40, latitude: 54.3222, longitude: 48.3891 },
  { name: 'Набережная Гончарова', desc: 'Смотровая на Волгу.', locationSlug: 'ulyanovsk-naberezhnaya-goncharova', mustSeeFilter: 'views', visitMinutes: 25, latitude: 54.3135, longitude: 48.3935 },
  { name: 'Свияжский залив', desc: 'Пляж и виды.', locationSlug: 'ulyanovsk-sviyazhskiy-zaliv', mustSeeFilter: 'views', visitMinutes: 30, latitude: 54.3125, longitude: 48.3915 },
  { name: 'Памятник Гончарову', desc: 'Писателю-земляку.', locationSlug: 'ulyanovsk-pamyatnik-goncharovu', mustSeeFilter: 'monument', visitMinutes: 10, latitude: 54.3135, longitude: 48.3935 },
  { name: 'Особняк Арбузова', desc: 'Купеческий дом.', locationSlug: 'ulyanovsk-osobnyak-arbuzova', mustSeeFilter: 'houses', visitMinutes: 20, latitude: 54.3168, longitude: 48.3978 },
  { name: 'Музей боевой славы', desc: 'ВОВ.', venueSlug: 'ulyanovsk-muzey-boevoy-slavy', mustSeeFilter: 'museum', visitMinutes: 60, latitude: 54.3188, longitude: 48.4012 },
  { name: 'Набережная Сенгилея', desc: 'Берег Волги.', locationSlug: 'ulyanovsk-naberezhnaya-sengileya', mustSeeFilter: 'views', visitMinutes: 30, latitude: 53.9615, longitude: 48.7928 },
];
export const ULYANOVSK_FAQ: Array<{ q: string; a: string }> = [
  { q: 'Правда ли, что Волга рекордной ширины?', a: 'Да, до 40 км.' },
  { q: 'Где памятник букве «Ё»?', a: 'На бульваре Новый Венец.' },
  { q: 'Можно ли зайти в дом Ульяновых?', a: 'Да, флигель под куполом мемориала.' },
  { q: 'Что попробовать?', a: 'Посикунчики, волжская рыба.' },
  { q: 'Когда ехать?', a: 'С конца мая по сентябрь.' },
];
export const ULYANOVSK_TRAVEL =
  'Аэропорт Баратаевка — рейсы из Москвы (~1,5 ч). Поезд «Ульяновск» с Казанского вокзала — ежедневно. Лучшее время — с конца мая по сентябрь.';
