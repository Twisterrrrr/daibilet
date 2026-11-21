/* Kirov flavor: identity slides + weather. Hyphen-only. */
const IMAGE_DIR = '/images/venues/kirov-kirovskaya-oblast';
export const KIROV_SLIDES: import('./city-hub-local-flavor.ts').CityIdentitySlide[] = [
  {
    id: 'kirov-dymkovo',
    title: 'Дымковская игрушка',
    text: 'Вятский промысел продолжают мастерицы Кирова. На фото — дымковская композиция работы Екатерины Удальцовой.',
    imageSrc: `${IMAGE_DIR}/dymkovo-author-commons.jpg`,
    imageAlt: 'Дымковская композиция работы Екатерины Удальцовой',
    imageCredit: { author: 'Ele-chudinovsk', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Dymkovskaya_toy._Author_Ekaterina_Udaltsova,_Kirov.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    slugs: ['kirov-kirovskaya-oblast-muzey-dymkovskoy-igrushki'],
    target: 'places',
    badge: 'Промысел',
  },
  {
    id: 'kirov-alexander-garden',
    title: 'Александровский сад',
    text: 'Исторический парк на высоком берегу Вятки узнаваем по классической ротонде и панорамам реки.',
    imageSrc: `${IMAGE_DIR}/alexandrovskiy-garden-commons.jpg`,
    imageAlt: 'Освещённая ротонда Александровского сада зимней ночью',
    imageCredit: { author: 'Ele-chudinovsk', sourceUrl: 'https://commons.wikimedia.org/wiki/File:%D0%A6%D0%B5%D0%BD%D1%82%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D0%B0%D1%8F_%D1%80%D0%BE%D1%82%D0%BE%D0%BD%D0%B4%D0%B0_%D0%90%D0%BB%D0%B5%D0%BA%D1%81%D0%B0%D0%BD%D0%B4%D1%80%D0%BE%D0%B2%D1%81%D0%BA%D0%BE%D0%B3%D0%BE_%D1%81%D0%B0%D0%B4%D0%B0._%D0%97%D0%B8%D0%BC%D0%BD%D1%8F%D1%8F_%D0%BD%D0%BE%D1%87%D1%8C.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    slugs: ['kirov-kirovskaya-oblast-aleksandrovskiy-sad'],
    target: 'places',
    badge: 'Архитектура',
  },
  {
    id: 'kirov-kikimora',
    title: 'Кикимора Вятская',
    text: 'Кикимора стала частью городского фольклорного образа. На фото — костюмированный персонаж в Заречном парке, не одна из небольших бронзовых фигурок квеста в центре.',
    imageSrc: `${IMAGE_DIR}/kikimora-zarechny-commons.jpg`,
    imageAlt: 'Костюмированный образ Кикиморы в Заречном парке Кирова',
    imageCredit: { author: 'Ele-chudinovsk', sourceUrl: 'https://commons.wikimedia.org/wiki/File:%D0%9C%D0%B8%D1%84%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B9_%D0%BF%D0%B5%D1%80%D1%81%D0%BE%D0%BD%D0%B0%D0%B6_%D0%9A%D0%B8%D0%BA%D0%B8%D0%BC%D0%BE%D1%80%D0%B0_%D0%B2%D1%8F%D1%82%D1%81%D0%BA%D0%B0%D1%8F_%D0%B2_%D0%97%D0%B0%D1%80%D0%B5%D1%87%D0%BD%D0%BE%D0%BC_%D0%BF%D0%B0%D1%80%D0%BA%D0%B5_%D0%B3._%D0%9A%D0%B8%D1%80%D0%BE%D0%B2%D0%B0.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    slugs: ['kirov-kikimora-trail'],
    target: 'places',
    badge: 'Фольклор',
  },
];
export const KIROV_WEATHER = {
  latitude: 58.6048, longitude: 49.6722, timezone: 'Europe/Kirov',
  outdoorSlugs: ['kirov-kirovskaya-oblast-naberezhnaya-grina', 'kirov-kirovskaya-oblast-ulitsa-spasskaya-vyatskiy-arbat', 'kirov-kirovskaya-oblast-aleksandrovskiy-sad'],
  indoorSlugs: ['kirov-kirovskaya-oblast-vyatskiy-paleontologicheskiy-muzey', 'kirov-kirovskaya-oblast-muzey-dymkovskoy-igrushki', 'kirov-kirovskaya-oblast-krayevedcheskiy-muzey'],
  outdoorCta: 'Для прогулки по набережной и саду проверьте прогноз и состояние дорожек.',
  indoorCtaOvercast: 'В пасмурный день можно выбрать музей и исторический центр.',
  indoorCtaRain: 'На случай дождя включите в план музеи; проверьте их расписание.',
  indoorCtaSnow: 'Зимой проверьте режим работы музеев и доступность парков.',
};
