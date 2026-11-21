/* Ulyanovsk flavor: identity slides + weather. Hyphen-only. */
export const ULYANOVSK_SLIDES: import('./city-hub-local-flavor.ts').CityIdentitySlide[] = [
  { id: 'lenin', title: 'Родина Ленина', text: 'В Симбирске родился Владимир Ильич Ульянов. Деревянный флигель усадьбы Ульяновых находится внутри территории Ленинского мемориала и связан с историей города.', imageSrc: '/images/venues/ulyanovsk/identity-lenin-generated.png', imageAlt: 'Фасад Ленинского мемориала в Ульяновске', slugs: ['ulyanovsk-leninskiy-memorial', 'ulyanovsk-muzey-zapovednik-rodina-v-i-lenina'], target: 'places', badge: 'История' },
  { id: 'volga', title: 'Волга и высокий берег', text: 'Симбирск стоит на высоком берегу Волги. С бульвара Новый Венец открывается широкий вид на Куйбышевское водохранилище; дальность видимости зависит от погоды.', imageSrc: '/images/venues/ulyanovsk/identity-volga-generated.png', imageAlt: 'Панорама Волги с высокого берега Ульяновска', slugs: ['ulyanovsk-bul-var-novyy-venets', 'ulyanovsk-imperatorskiy-most'], target: 'places', badge: 'Волга' },
  { id: 'avia', title: 'Город гражданской авиации', text: 'Музей гражданской авиации показывает историю отрасли на открытой экспозиционной площадке. Перед визитом проверьте график и схему проезда на сайте музея.', imageSrc: '/images/venues/ulyanovsk/identity-aviation-generated.png', imageAlt: 'Самолёты на площадке музея гражданской авиации в Ульяновске', slugs: ['ulyanovsk-golovnoy-muzey-istorii-grazhdanskoy-aviatsii'], target: 'places', badge: 'Техника' },
  { id: 'karamzin', title: 'Город литературы и земляков', text: 'Симбирск связан с Николаем Карамзиным и Иваном Гончаровым. Историческая застройка и музейный квартал сохраняют память о литературном наследии города.', imageSrc: '/images/venues/ulyanovsk/identity-literary-generated.png', imageAlt: 'Историческая улица старого Симбирска в Ульяновске', slugs: ['ulyanovsk-pamyatnik-bukve-e'], target: 'places', badge: 'Литература' },
  { id: 'local-food', title: 'Волжская кухня', text: 'В меню местных заведений ищите блюда из волжской рыбы и выпечку. Состав меню и доступность конкретных специалитетов меняются от заведения к заведению.', imageSrc: '/images/venues/ulyanovsk/identity-food-generated.png', imageAlt: 'Запечённая рыба и пирог в стиле волжской кухни', slugs: ['ulyanovsk-place-restoran-oblomov', 'ulyanovsk-place-korchma-gopak', 'ulyanovsk-place-top-hop', 'ulyanovsk-place-kafe-volsov'], target: 'places', badge: 'Гастро' },
];
export const ULYANOVSK_WEATHER = {
  latitude: 54.3182, longitude: 48.4012, timezone: 'Europe/Ulyanovsk',
  outdoorSlugs: ['ulyanovsk-bul-var-novyy-venets', 'ulyanovsk-imperatorskiy-most'],
  indoorSlugs: ['ulyanovsk-leninskiy-memorial', 'ulyanovsk-muzey-zapovednik-rodina-v-i-lenina', 'ulyanovsk-golovnoy-muzey-istorii-grazhdanskoy-aviatsii'],
  outdoorCta: 'Сухо: Новый Венец и набережная - ботинки чистые',
  indoorCtaOvercast: 'Пасмурно: мемориал или музей авиации',
  indoorCtaRain: 'Дождь: музеи центра и кафе на Спасской',
  indoorCtaSnow: 'Снег: тёплые залы; к Волге только в шапке',
};

