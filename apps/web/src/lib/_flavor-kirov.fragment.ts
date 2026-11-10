/* Kirov flavor: identity slides + weather. Hyphen-only. */
export const KIROV_SLIDES: import('./city-hub-local-flavor.ts').CityIdentitySlide[] = [
  { id: 'dymka', title: 'Дымковская игрушка', text: 'Дымковская игрушка - традиционный глиняный промысел, связанный с одноимённой слободой Кирова. В музее на улице Свободы, 67 можно познакомиться с историей и современными работами мастеров.', imageSrc: '/images/cities/identity/kirov/dymkovo.jpg', imageAlt: 'Фигурки дымковской игрушки', slugs: ['kirov-kirovskaya-oblast-muzey-dymkovskoy-igrushki'], target: 'places', badge: 'Ремесло' },
  { id: 'kotelnich', title: 'Пермская фауна у Котельнича', text: 'У Котельнича находится местонахождение ископаемых позвоночных Пермского периода. Коллекция находок стала основой Вятского палеонтологического музея в Кирове. Иллюстрация показывает музейный экспонат.', imageSrc: '/images/cities/identity/kirov/kotelnich-fossils.jpg', imageAlt: 'Иллюстративное изображение скелета парейазавра в музейной экспозиции', slugs: ['kirov-kirovskaya-oblast-vyatskiy-paleontologicheskiy-muzey', 'kirov-kirovskaya-oblast-kotelnicheskoe-pariazavry'], target: 'mixed', badge: 'Палеонтология' },
];
export const KIROV_WEATHER = {
  latitude: 58.6048, longitude: 49.6722, timezone: 'Europe/Kirov',
  outdoorSlugs: ['kirov-kirovskaya-oblast-naberezhnaya-grina', 'kirov-kirovskaya-oblast-ulitsa-spasskaya-vyatskiy-arbat', 'kirov-kirovskaya-oblast-aleksandrovskiy-sad'],
  indoorSlugs: ['kirov-kirovskaya-oblast-vyatskiy-paleontologicheskiy-muzey', 'kirov-kirovskaya-oblast-muzey-dymkovskoy-igrushki', 'kirov-kirovskaya-oblast-kirovskiy-krayevedcheskiy-muzey'],
  outdoorCta: 'Для прогулки по набережной и саду проверьте прогноз и состояние дорожек.',
  indoorCtaOvercast: 'В пасмурный день можно выбрать музей и исторический центр.',
  indoorCtaRain: 'На случай дождя включите в план музеи; проверьте их расписание.',
  indoorCtaSnow: 'Зимой проверьте режим работы музеев и доступность парков.',
};
