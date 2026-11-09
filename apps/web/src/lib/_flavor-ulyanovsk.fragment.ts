/* Ulyanovsk identity slides use assets distinct from the «Что посмотреть» cards. */
export const ULYANOVSK_SLIDES: import('./city-hub-local-flavor.ts').CityIdentitySlide[] = [
  {
    id: 'lenin',
    title: 'Литературный Симбирск',
    text: 'Ульяновск — родина писателя Ивана Гончарова. В историческом центре сохранились дома губернского города; один из них связан с именем автора «Обломова».',
    imageSrc: '/images/venues/ulyanovsk/identity-goncharov-house-20261110.jpg',
    imageAlt: 'Исторический краснокирпичный дом-музей в центре Ульяновска',
    slugs: [],
    target: 'places',
    badge: 'История',
  },
  {
    id: 'volga',
    title: 'Город над Волгой',
    text: 'Исторический центр стоит на высоком правом берегу. С бульвара Новый Венец открываются виды на Волгу и противоположный берег; панорама меняется вместе с погодой и сезоном.',
    imageSrc: '/images/venues/ulyanovsk/identity-volga-20261110.jpg',
    imageAlt: 'Волга и берег напротив Ульяновска',
    slugs: ['ulyanovsk-bul-var-novyy-venets'],
    target: 'places',
    badge: 'Волга',
  },
  {
    id: 'avia',
    title: 'Авиационная история',
    text: 'У аэропорта Баратаевка работает музей гражданской авиации с открытой экспозицией самолётов и вертолётов. Он находится за пределами центра, поэтому поездку стоит планировать отдельно.',
    imageSrc: '/images/venues/ulyanovsk/identity-tu144-20261110.jpg',
    imageAlt: 'Самолёт Ту-144 в экспозиции музея гражданской авиации Ульяновска',
    slugs: ['ulyanovsk-golovnoy-muzey-istorii-grazhdanskoy-aviatsii'],
    target: 'places',
    badge: 'Авиация',
  },
  {
    id: 'karamzin',
    title: 'Карамзин и буква «Ё»',
    text: 'Ульяновск бережно хранит литературную историю города и региона: здесь можно увидеть памятник букве «Ё», а также памятник историку и писателю Николаю Карамзину.',
    imageSrc: '/images/venues/ulyanovsk/identity-karamzin-20261110.jpg',
    imageAlt: 'Памятник историку Николаю Карамзину в Ульяновске',
    slugs: ['ulyanovsk-pamyatnik-bukve-e'],
    target: 'places',
    badge: 'Литература',
  },
];

export const ULYANOVSK_WEATHER = {
  latitude: 54.3182, longitude: 48.4012, timezone: 'Europe/Ulyanovsk',
  outdoorSlugs: ['ulyanovsk-bul-var-novyy-venets'],
  indoorSlugs: ['ulyanovsk-leninskiy-memorial', 'ulyanovsk-muzey-zapovednik-rodina-v-i-lenina', 'ulyanovsk-golovnoy-muzey-istorii-grazhdanskoy-aviatsii', 'dvorec-knigi'],
  outdoorCta: 'Погода подходит для прогулки по Новому Венцу',
  indoorCtaOvercast: 'В пасмурную погоду выберите музей или мемориал',
  indoorCtaRain: 'Во время дождя подойдут музеи и библиотека',
  indoorCtaSnow: 'В снегопад выбирайте площадки в помещении',
};
