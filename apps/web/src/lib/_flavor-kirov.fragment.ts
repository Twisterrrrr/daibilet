/* Kirov flavor: identity slides + weather. Hyphen-only. */
export const KIROV_SLIDES: import('./city-hub-local-flavor.ts').CityIdentitySlide[] = [
  { id: 'dymka', title: 'Дымковская игрушка', text: 'Всемирно известная глиняная игрушка - главный символ Вятки. Яркие кони, куклы и барыни ручной росписи создаются в Дымковской слободе уже более 400 лет.', imageSrc: '/images/venues/kirov-kirovskaya-oblast/muzey-dymkovskoy-igrushki.jpg', imageAlt: 'Дымковская игрушка', slugs: ['kirov-kirovskaya-oblast-muzey-dymkovskoy-igrushki', 'kirov-kirovskaya-oblast-dymkovskaya-sloboda'], target: 'places', badge: 'Символ' },
  { id: 'kikimora', title: 'Резиденция Кикиморы', text: 'По славянским легендам, именно на Вятке живёт Кикимора Вятская. «Заповедник сказок» - интерактивный парк в сосновом бору, где русские сказки оживают.', imageSrc: '/images/venues/kirov-kirovskaya-oblast/zapovednik-skazok.jpg', imageAlt: 'Заповедник сказок', slugs: ['kirov-kirovskaya-oblast-zapovednik-skazok'], target: 'places', badge: 'Сказка' },
  { id: 'dino', title: 'Парейазавры Котельнича', text: 'Котельническое местонахождение - мировой кладезь окаменелостей пермского периода. В палеонтологическом музее Кирова хранятся скелеты ящеров, живших 250 миллионов лет назад.', imageSrc: '/images/venues/kirov-kirovskaya-oblast/vyatskiy-paleontologicheskiy-muzey.jpg', imageAlt: 'Палеонтологический музей', slugs: ['kirov-kirovskaya-oblast-vyatskiy-paleontologicheskiy-muzey', 'kirov-kirovskaya-oblast-kotelnicheskoe-pariazavry'], target: 'mixed', badge: 'Наука' },
  { id: 'pryanik', title: 'Вятский пряник', text: 'Старинный рецепт, уникальная роспись и вкус, который помнят поколения. Дегустация в музее пряника на Спасской - обязательный ритуал каждого гостя Вятки.', imageSrc: '/images/venues/kirov-kirovskaya-oblast/muzey-vyatskogo-pryanika.jpg', imageAlt: 'Вятский пряник', slugs: ['kirov-kirovskaya-oblast-muzey-vyatskogo-pryanika'], target: 'places', badge: 'Гастро' },
];
export const KIROV_WEATHER = {
  latitude: 58.6048, longitude: 49.6722, timezone: 'Europe/Kirov',
  outdoorSlugs: ['kirov-kirovskaya-oblast-naberezhnaya-grina', 'kirov-kirovskaya-oblast-ulitsa-spasskaya-vyatskiy-arbat', 'kirov-kirovskaya-oblast-aleksandrovskiy-sad', 'kirov-kirovskaya-oblast-hlynovskoe-gorodische'],
  indoorSlugs: ['kirov-kirovskaya-oblast-vyatskiy-paleontologicheskiy-muzey', 'kirov-kirovskaya-oblast-muzey-dymkovskoy-igrushki', 'kirov-kirovskaya-oblast-kirovskiy-krayevedcheskiy-muzey', 'kirov-kirovskaya-oblast-muzey-vyatskogo-pryanika'],
  outdoorCta: 'Сухо: набережная Грина и Спасская - ботинки чистые',
  indoorCtaOvercast: 'Пасмурно: палеонтология или музей дымки',
  indoorCtaRain: 'Дождь: музеи и кафе на Спасской',
  indoorCtaSnow: 'Снег: тёплые залы; Заповедник сказок',
};