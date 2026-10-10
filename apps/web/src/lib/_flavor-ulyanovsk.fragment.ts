/* Ulyanovsk flavor: identity slides + weather. Hyphen-only. */
export const ULYANOVSK_SLIDES: import('./city-hub-local-flavor.ts').CityIdentitySlide[] = [
  { id: 'lenin', title: 'Родина Ленина', text: 'В Симбирске родился Владимир Ильич Ульянов. Флигель усадьбы Ульяновых накрыт стеклянным куполом Ленинского мемориала - уникальная архитектура, где древность спрятана внутри модернизма.', imageSrc: '/images/venues/ulyanovsk/leninskiy-memorial.jpg', imageAlt: 'Ленинский мемориал в Ульяновске', slugs: ['ulyanovsk-leninskiy-memorial', 'ulyanovsk-muzey-zapovednik-rodina-v-i-lenina'], target: 'places', badge: 'История' },
  { id: 'volga', title: 'Волга рекордной ширины', text: 'Куйбышевское водохранилище разлилось до 40 км - противоположный берег исчезает в дымке. Бульвар Новый Венец - панорамная набережная, откуда открывается вид на «море».', imageSrc: '/images/venues/ulyanovsk/bul-var-novyy-venets.jpg', imageAlt: 'Бульвар Новый Венец', slugs: ['ulyanovsk-bul-var-novyy-venets', 'ulyanovsk-imperatorskiy-most'], target: 'places', badge: 'Природа' },
  { id: 'avia', title: 'Столица гражданской авиации', text: 'Единственный в мире музей гражданской авиации под открытым небом: 40 самолётов, включая сверхзвуковой Ту-144. Родина конструкторов и пилотов, чьи машины летали по всему СССР.', imageSrc: '/images/venues/ulyanovsk/golovnoy-muzey-istorii-grazhdanskoy-aviatsii.jpg', imageAlt: 'Музей гражданской авиации', slugs: ['ulyanovsk-golovnoy-muzey-istorii-grazhdanskoy-aviatsii'], target: 'places', badge: 'Техника' },
  { id: 'karamzin', title: 'Буква «Ё» и Карамзин', text: 'В Симбирске родился Николай Карамзин - историк, который ввёл букву «Ё» в обиход. Памятник букве стоит на бульваре Новый Венец, а рядом - Музей Гончарова, другого великого земляка.', imageSrc: '/images/venues/ulyanovsk/pamyatnik-bukve-e.jpg', imageAlt: 'Памятник букве Ё', slugs: ['ulyanovsk-pamyatnik-bukve-e', 'ulyanovsk-muzey-goncharova'], target: 'places', badge: 'Символ' },
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