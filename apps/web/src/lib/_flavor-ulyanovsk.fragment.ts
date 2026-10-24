/* Ulyanovsk flavor: identity slides + weather. Hyphen-only. */
export const ULYANOVSK_SLIDES: import('./city-hub-local-flavor.ts').CityIdentitySlide[] = [
  { id: 'nikolskiy-cathedral', title: 'Храмовая архитектура Симбирской земли', text: 'Исторические соборы и приходские церкви хранят несколько пластов истории Симбирска и его округи. Никольский собор выделяется строгими пропорциями и силуэтом старого уездного храма.', imageSrc: '/images/venues/ulyanovsk/nikolskiy-sobor.jpg', imageAlt: 'Никольский собор в Ульяновской области', slugs: ['ulyanovsk-nikolskiy-sobor'], target: 'places', badge: 'Архитектура' },
  { id: 'volga', title: 'Сенгилей и широкая Волга', text: 'На юге области Волга раскрывается особенно широко. Сенгилей стоит у самой воды, а прогулка по набережной показывает речной характер Симбирского Поволжья.', imageSrc: '/images/venues/ulyanovsk/sengiley.jpg', imageAlt: 'Сенгилей и волжский берег', slugs: ['ulyanovsk-sengiley', 'ulyanovsk-naberezhnaya-sengileya'], target: 'places', badge: 'Природа' },
  { id: 'avia', title: 'Столица гражданской авиации', text: 'В музее гражданской авиации под открытым небом собрана история пассажирских самолётов - от первых массовых лайнеров до сверхзвукового Ту-144. Это один из главных авиационных музеев страны.', imageSrc: '/images/venues/ulyanovsk/identity-civil-aviation.jpg', imageAlt: 'Иллюстрация советского пассажирского самолёта на музейной стоянке', slugs: ['ulyanovsk-golovnoy-muzey-istorii-grazhdanskoy-aviatsii'], target: 'places', badge: 'Техника' },
  { id: 'sengiley-history', title: 'История Сенгилея и края', text: 'Краеведческий музей Сенгилея рассказывает о жизни волжского уездного города и истории юга Ульяновской области.', imageSrc: '/images/venues/ulyanovsk/sengileevskiy-muzey.jpg', imageAlt: 'Краеведческий музей в Сенгилее', slugs: ['ulyanovsk-sengileevskiy-muzey'], target: 'places', badge: 'История' },
];
export const ULYANOVSK_WEATHER = {
  latitude: 54.3182, longitude: 48.4012, timezone: 'Europe/Ulyanovsk',
  outdoorSlugs: ['ulyanovsk-bul-var-novyy-venets', 'ulyanovsk-imperatorskiy-most', 'ulyanovsk-naberezhnaya-goncharova', 'ulyanovsk-sviyazhskiy-zaliv'],
  indoorSlugs: ['ulyanovsk-leninskiy-memorial', 'ulyanovsk-muzey-zapovednik-rodina-v-i-lenina', 'ulyanovsk-golovnoy-muzey-istorii-grazhdanskoy-aviatsii', 'ulyanovsk-muzey-goncharova'],
  outdoorCta: 'Сухо: Новый Венец и набережная - ботинки чистые',
  indoorCtaOvercast: 'Пасмурно: мемориал или музей авиации',
  indoorCtaRain: 'Дождь: музеи центра и кафе на Спасской',
  indoorCtaSnow: 'Снег: тёплые залы; к Волге только в шапке',
};
