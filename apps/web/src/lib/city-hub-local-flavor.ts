/**
 * Per-city hub extras: identity tags, weather coords, indoor/outdoor CTA maps,
 * seasonal «когда ехать» copy. Keep out of cityInfo (coords/mustSee) so other
 * agents can edit geo without merge fights.
 *
 * Tourist hubs with weather+seasons+identity: Perm, Moscow, SPB, Kaliningrad, NN,
 * Ekaterinburg, Kazan, Samara, Krasnodar, Krasnoyarsk, Novosibirsk, Voronezh, Ufa, Omsk, Chelyabinsk, Tyumen, Rostov-on-Don, Penza, Tver.
 */

import { normalizeCityHubSlug } from './city-hub-config.ts';
import type { CityMustSeeItem, CitySuburbItem, CitySuburbPlace } from './cityInfo.ts';
import { transliterateSlug } from './routes.ts';

export type CityIdentityTag = {
  id: string;
  /** Owner hashtag, kept recognizable. */
  hashtag: string;
  hint: string;
  /** venueSlug / locationSlug from cityInfo mustSee or suburbs (incl. nested POI). */
  slugs: string[];
  target: 'places' | 'suburbs' | 'mixed';
};

export type CityWeatherFlavor = {
  latitude: number;
  longitude: number;
  timezone: string;
  outdoorSlugs: string[];
  indoorSlugs: string[];
  outdoorCta: string;
  indoorCtaOvercast: string;
  indoorCtaRain: string;
  indoorCtaSnow: string;
};

export type CityWhenToGoSeasonId =
  | 'winter'
  | 'spring'
  | 'summer'
  | 'lateSummer'
  | 'earlyAutumn'
  | 'lateAutumn'
  /** Compact 4-season packs (Krasnodar / Krasnoyarsk / Novosibirsk). */
  | 'autumn';

export type CityWhenToGoSeason = {
  id: CityWhenToGoSeasonId;
  /** Calendar months 1-12 in the city time zone. */
  months: number[];
  /** Badge: Конец лета */
  headline: string;
  /** One short paragraph under the badge. */
  body: string;
};

export type CitySeasonTabId = 'spring' | 'summer' | 'autumn' | 'winter';

export type CitySeasonTab = {
  id: CitySeasonTabId;
  label: string;
  body: string;
};

export type CityWhenToGoFlavor = {
  timeZone: string;
  seasons: CityWhenToGoSeason[];
  tabs: CitySeasonTab[];
};

export type CityWhenToGoBlurb = {
  seasonId: CityWhenToGoSeasonId;
  month: number;
  monthLabel: string;
  headline: string;
  body: string;
  tab: CitySeasonTabId;
};

export type CityIdentitySlide = {
  id: string;
  title: string;
  text: string;
  imageSrc: string;
  imageAlt: string;
  slugs: string[];
  target: 'places' | 'suburbs' | 'mixed';
  /** Short category pill on the photo (Символ, Гастро, …). */
  badge?: string;
};

export type CityHubLocalFlavor = {
  identityHeading?: string;
  /** Muted line under the identity H2. */
  identityLead?: string;
  tags: CityIdentityTag[];
  slides?: CityIdentitySlide[];
  weather?: CityWeatherFlavor;
  /** Editorial seasonality, not a daily weather forecast. */
  whenToGo?: CityWhenToGoFlavor;
};

export type CityPlaceFocus = {
  id: string;
  label: string;
  slugs: string[];
  scrollTo: 'places' | 'suburbs';
};

const PERM_WEATHER: CityWeatherFlavor = {
  latitude: 58.01,
  longitude: 56.23,
  timezone: 'Asia/Yekaterinburg',
  outdoorSlugs: [
    'naberezhnaya-kamy',
    'perm-schaste-ne-za-gorami',
    'perm-park-gorkogo',
    'perm-rayskiy-sad',
    'permskaya-esplanada',
  ],
  indoorSlugs: [
    'permskaya-galereya',
    'perm-permm',
    'perm-dom-meshkova',
    'teatr-teatr',
    'perm-permskie-posikunchiki',
    'perm-chomga',
  ],
  outdoorCta: 'Отличная погода для речной прогулки по Каме или парков',
  indoorCtaOvercast: 'Сегодня пасмурно. Посмотрите крытые музеи, Театр-Театр или рестораны',
  indoorCtaRain: 'Сегодня дождь. Посмотрите крытые музеи, Театр-Театр или рестораны',
  indoorCtaSnow: 'Сегодня снег. Посмотрите крытые музеи, Театр-Театр или рестораны',
};

const MONTH_TITLE = [
  '',
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

function tabForSeasonId(id: CityWhenToGoSeasonId): CitySeasonTabId {
  if (id === 'winter') return 'winter';
  if (id === 'spring') return 'spring';
  if (id === 'earlyAutumn' || id === 'lateAutumn' || id === 'autumn') return 'autumn';
  return 'summer';
}

const PERM_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Asia/Yekaterinburg',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Горнолыжка в Губахе, заснеженная тайга, Белогорский монастырь и Кунгурская ледяная пещера. Хохловку и Усьву в мороз лучше не планировать.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'Межсезонье: слякоть и лёд на тропах. В городе - музеи и Театр-Театр. Хохловку и Усьву оставьте на июнь.',
    },
    {
      id: 'summer',
      months: [6, 7],
      headline: 'Лето',
      body: 'Лучшее окно на край: набережная, сплавы, Хохловка, Каменный город и Усьва. Речной сезон на Каме открыт.',
    },
    {
      id: 'lateSummer',
      months: [8],
      headline: 'Конец лета',
      body: 'Идеально для загородных поездок (Хохловка, Усьва), пока не начались осенние дожди. Речные прогулки ещё открыты.',
    },
    {
      id: 'earlyAutumn',
      months: [9],
      headline: 'Ранняя осень',
      body: 'Лес жёлтый, в Хохловке народу меньше. Речной сезон на Каме уже сходит - если нужен загород, едьте в этом месяце.',
    },
    {
      id: 'lateAutumn',
      months: [10, 11],
      headline: 'Поздняя осень',
      body: 'Дожди и раскисшие тропы. Время для музеев, театров и Дягилевского фестиваля, не для Усьвы.',
    },
  ],
  tabs: [
    {
      id: 'spring',
      label: 'Весна',
      body: 'В городе - музеи и Театр-Театр. Хохловку и Усьву лучше оставить на июнь: в апреле ещё слякоть.',
    },
    {
      id: 'summer',
      label: 'Лето',
      body: 'Набережная, сплавы, Хохловка, фестивали под открытым небом. Речной сезон на Каме открыт.',
    },
    {
      id: 'autumn',
      label: 'Осень',
      body: 'Время для музеев, театров и Дягилевского фестиваля. Загород с октября раскисает.',
    },
    {
      id: 'winter',
      label: 'Зима',
      body: 'Горнолыжка в Губахе, заснеженная тайга, Белогорский монастырь и Кунгурская ледяная пещера.',
    },
  ],
};

function seasonTabs(bodies: Record<CitySeasonTabId, string>): CitySeasonTab[] {
  return [
    { id: 'spring', label: 'Весна', body: bodies.spring },
    { id: 'summer', label: 'Лето', body: bodies.summer },
    { id: 'autumn', label: 'Осень', body: bodies.autumn },
    { id: 'winter', label: 'Зима', body: bodies.winter },
  ];
}

const SPB_WEATHER: CityWeatherFlavor = {
  latitude: 59.93,
  longitude: 30.31,
  timezone: 'Europe/Moscow',
  outdoorSlugs: [
    'saint-petersburg-dvortsovaya-ploschad',
    'saint-petersburg-dvortsovaya-naberezhnaya',
    'saint-petersburg-nizhniy-park-petergofa',
  ],
  indoorSlugs: ['ermitazh', 'saint-petersburg-pyshechnaya-na-bolshoy-konyushennoy'],
  outdoorCta: 'Хороший день для набережной Невы или Петергофа',
  indoorCtaOvercast: 'Сегодня пасмурно. Посмотрите Эрмитаж или пышечную на Конюшенной',
  indoorCtaRain: 'Сегодня дождь. Посмотрите Эрмитаж или пышечную на Конюшенной',
  indoorCtaSnow: 'Сегодня снег. Посмотрите Эрмитаж или пышечную на Конюшенной',
};

const SPB_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Europe/Moscow',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Из-за влажности -5 °C ощущаются как -15 °C. Эрмитаж и Мариинка без очередей. Новый год дорогой, февраль - самые дешёвые перелёты и отели.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'Март-апрель сырые и ветреные. Со второй половины мая (+15 °C) открываются фонтаны Петергофа и навигация по рекам.',
    },
    {
      id: 'summer',
      months: [6, 7],
      headline: 'Лето',
      body: 'Пик сезона (+20...+23 °C) и Белые ночи с конца мая до середины июля. Жильё лучше брать за 2-3 месяца.',
    },
    {
      id: 'lateSummer',
      months: [8],
      headline: 'Конец лета',
      body: 'В августе чуть спокойнее пика Белых ночей, но чаще дожди. Фонтаны Петергофа ещё работают.',
    },
    {
      id: 'earlyAutumn',
      months: [9],
      headline: 'Ранняя осень',
      body: 'Бабье лето около +13 °C, золотые парки Пушкина и Павловска. Фонтаны ещё можно застать в начале месяца.',
    },
    {
      id: 'lateAutumn',
      months: [10, 11],
      headline: 'Поздняя осень',
      body: 'С октября фонтаны закрыты, холодает. Ноябрь - самый бюджетный месяц для музеев и театра.',
    },
  ],
  tabs: seasonTabs({
    spring: 'Март и апрель сырые. Со второй половины мая открываются фонтаны Петергофа и теплоходы по каналам.',
    summer: 'Белые ночи - самый плотный сезон. В августе чуть спокойнее, чаще дожди.',
    autumn: 'Сентябрь - золотые парки. С октября фонтаны закрыты, к ноябрю цены на поездку падают.',
    winter: 'Влажный холод. Эрмитаж без очередей. Новый год дорогой, февраль - самый тихий.',
  }),
};

const KGD_WEATHER: CityWeatherFlavor = {
  latitude: 54.71,
  longitude: 20.51,
  timezone: 'Europe/Kaliningrad',
  outdoorSlugs: ['kaliningrad-ostrov-kanta', 'kaliningrad-kurshskaya-kosa'],
  indoorSlugs: [
    'kaliningrad-kafedral-nyy-sobor',
    'kaliningrad-muzey-yantarya',
    'kaliningrad-muzey-mirovogo-okeana',
  ],
  outdoorCta: 'Хороший день для острова Канта или Куршской косы',
  indoorCtaOvercast: 'Сегодня пасмурно. Посмотрите Музей янтаря, собор или Музей Мирового океана',
  indoorCtaRain: 'Сегодня дождь. Посмотрите Музей янтаря, собор или Музей Мирового океана',
  indoorCtaSnow: 'Сегодня снег. Посмотрите Музей янтаря, собор или Музей Мирового океана',
};

const KGD_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Europe/Kaliningrad',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Мягкая зима около 0 °C, снег редкий. Новогодние ярмарки поднимают цены, февраль - самый тихий месяц.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'Март ещё +3 °C. В мае (+15 °C) каштаны и мало туристов: удобно ехать на форты и Куршскую косу.',
    },
    {
      id: 'summer',
      months: [6, 7],
      headline: 'Лето',
      body: 'Пик сезона (+22...+25 °C). Море прогревается к середине июля. Июль - плотные даты на косе и в Светлогорске.',
    },
    {
      id: 'lateSummer',
      months: [8],
      headline: 'Конец лета',
      body: 'Август всё ещё пляжный пик в Зеленоградске и Светлогорске. Перелёт лучше закрыть заранее.',
    },
    {
      id: 'earlyAutumn',
      months: [9],
      headline: 'Ранняя осень',
      body: 'Сентябрь часто +16 °C - спокойные прогулки без июльской толпы.',
    },
    {
      id: 'lateAutumn',
      months: [10, 11],
      headline: 'Поздняя осень',
      body: 'С октября штормы и янтарь на берегу. Ноябрь холодный, ветреный и самый дешёвый.',
    },
  ],
  tabs: seasonTabs({
    spring: 'К маю город в каштанах. Конец мая - форты и коса без летней толпы.',
    summer: 'Море теплое с середины июля. Июль-август - пик в Зеленоградске и Светлогорске.',
    autumn: 'Сентябрь ещё для прогулок. С октября штормы и янтарь, к ноябрю цены падают.',
    winter: 'Около 0 °C, снег тает быстро. Новый год оживлённый, февраль - самый тихий.',
  }),
};

const NN_WEATHER: CityWeatherFlavor = {
  latitude: 56.33,
  longitude: 44.0,
  timezone: 'Europe/Moscow',
  outdoorSlugs: [
    'nizhny-novgorod-nizhegorodskiy-kreml',
    'nizhny-novgorod-chkalovskaya-lestnitsa',
    'nizhny-novgorod-nizhegorodskaya-kanatnaya-doroga',
    'nizhny-novgorod-naberezhnaya-fedorovskogo',
  ],
  indoorSlugs: ['nizhny-novgorod-arsenal-gtsisi', 'nizhny-novgorod-usadba-rukavishnikovyh'],
  outdoorCta: 'Хороший день для кремля, канатки или набережной закатов',
  indoorCtaOvercast: 'Сегодня пасмурно. Посмотрите Арсенал ГЦСИ или усадьбу Рукавишниковых',
  indoorCtaRain: 'Сегодня дождь. Посмотрите Арсенал ГЦСИ или усадьбу Рукавишниковых',
  indoorCtaSnow: 'Сегодня снег. Посмотрите Арсенал ГЦСИ или усадьбу Рукавишниковых',
};

const NN_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Europe/Moscow',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Снежная зима -8...-12 °C. Чкаловская лестница обледеневает, кремль выглядит сказочно. Январь дорогой, февраль - спад цен.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'Март-апрель: снег и ледоход. Май (+17 °C) - лучшее окно для Покровки и набережных без зноя.',
    },
    {
      id: 'summer',
      months: [6, 7],
      headline: 'Лето',
      body: 'Столица закатов (+22...+25 °C), фестивали на набережных. Выходные лучше закрывать заранее.',
    },
    {
      id: 'lateSummer',
      months: [8],
      headline: 'Конец лета',
      body: 'Август всё ещё высокий сезон на Волге. Закаты на Фёдоровского и канатка работают в полную силу.',
    },
    {
      id: 'earlyAutumn',
      months: [9],
      headline: 'Ранняя осень',
      body: 'Сентябрь около +14 °C и золотая листва в кремле - спокойный экскурсионный месяц.',
    },
    {
      id: 'lateAutumn',
      months: [10, 11],
      headline: 'Поздняя осень',
      body: 'Речные туманы, дожди и похолодание. Хороший момент сэкономить на дороге в город.',
    },
  ],
  tabs: seasonTabs({
    spring: 'К маю тепло для Покровки и набережных, без июльского зноя.',
    summer: 'Закаты, фестивали на набережных. Выходные разбирают быстро.',
    autumn: 'Сентябрь - золото кремля. С октября туманы и дожди, цены на дорогу падают.',
    winter: 'Настоящая снежная зима. Январь праздничный, февраль - самый выгодный заезд.',
  }),
};


const MSK_WEATHER: CityWeatherFlavor = {
  latitude: 55.76,
  longitude: 37.62,
  timezone: 'Europe/Moscow',
  outdoorSlugs: [
    'moscow-park-zaryad-e',
    'moscow-park-gorkogo',
    'moscow-vdnh',
    'moscow-vorobevy-gory',
  ],
  indoorSlugs: [
    'moscow-tret-yakovskaya-galereya',
    'moscow-gmii-imeni-pushkina',
    'moscow-bol-shoy-teatr',
  ],
  outdoorCta: 'Хороший день для Зарядья, Парка Горького или ВДНХ',
  indoorCtaOvercast: 'Сегодня пасмурно. Посмотрите Третьяковку, Пушкинский или Большой театр',
  indoorCtaRain: 'Сегодня дождь. Посмотрите Третьяковку, Пушкинский или Большой театр',
  indoorCtaSnow: 'Сегодня снег. Посмотрите Третьяковку, Пушкинский или Большой театр',
};

const MSK_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Europe/Moscow',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Каток на Красной площади, гирлянды и музеи без летних очередей. Новый год дорогой, февраль - тише и выгоднее.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'Март ещё слякотный. С мая (+15...+18 °C) открываются веранды, парки и речные прогулки по Москве-реке.',
    },
    {
      id: 'summer',
      months: [6, 7],
      headline: 'Лето',
      body: 'Пик сезона (+22...+28 °C): фестивали, веранды, Зарядье и Воробьёвы горы. Билеты в топ-музеи лучше брать заранее.',
    },
    {
      id: 'lateSummer',
      months: [8],
      headline: 'Конец лета',
      body: 'Август всё ещё тёплый, но чуть спокойнее июля. Удобное окно на парки и вечерние набережные.',
    },
    {
      id: 'earlyAutumn',
      months: [9],
      headline: 'Ранняя осень',
      body: 'Сентябрь часто +15 °C и золотая листва в Коломенском и Царицыно - один из лучших месяцев для прогулок.',
    },
    {
      id: 'lateAutumn',
      months: [10, 11],
      headline: 'Поздняя осень',
      body: 'С октября дожди и ранние сумерки. Время для театров, выставок и низких цен на жильё вне праздников.',
    },
  ],
  tabs: seasonTabs({
    spring: 'К маю тепло для парков и теплоходов. Март-апрель чаще слякоть и ветер.',
    summer: 'Фестивали, веранды и длинные вечера. Топ-музеи лучше бронировать заранее.',
    autumn: 'Сентябрь - золото парков. С октября дожди, к ноябрю поездка обычно дешевле.',
    winter: 'Катки и гирлянды. Новый год дорогой, февраль - самый спокойный заезд.',
  }),
};

const PERM_SLIDES: CityIdentitySlide[] = [
  {
    id: 'medved',
    title: 'Культовый мишка',
    text: 'Медведь - главный символ края ещё с XVI века. Иностранцы шутят, что они ходят у нас по улицам, а мы поставили ему бронзовый памятник в центре. Здесь же зародилось древнее шаманское литьё - Пермский звериный стиль.',
    imageSrc: '/images/venues/perm/permskiy-medved.jpg',
    imageAlt: 'Памятник Пермскому медведю',
    slugs: ['perm-permskiy-medved'],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'bogi',
    title: 'Деревянные боги',
    text: 'Уникальное явление, которого нет больше нигде в России. В XVII веке местные мастера вырезали из дерева православных святых, наделив их чертами лиц коренных народов Урала. Смесь христианства и язычества.',
    imageSrc: '/images/venues/perm/permskaya-galereya.jpg',
    imageAlt: 'Пермская художественная галерея',
    slugs: ['permskaya-galereya', 'muzej-hohlovka'],
    target: 'mixed',
    badge: 'Искусство',
  },
  {
    id: 'posikunchiki',
    title: 'Те самые посикунчики',
    text: 'Главный гастрономический бренд Прикамья. Крошечные уральские пирожки на один укус. Фишка в сочности: когда откусываешь, они брызжут горячим бульоном - отсюда и название.',
    imageSrc: '/images/venues/perm/permskie-posikunchiki.jpg',
    imageAlt: 'Посикунчики в Перми',
    slugs: ['perm-permskie-posikunchiki', 'perm-chomga'],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'schaste',
    title: 'Символ новой Перми',
    text: 'Огромные красные буквы на берегу Камы у Речного вокзала. Главный фото-хит и визуальный бренд города, который знают по всей стране благодаря фильмам и сериалам.',
    imageSrc: '/images/venues/perm/schaste-ne-za-gorami.jpg',
    imageAlt: 'Инсталляция Счастье не за горами на Каме',
    slugs: [
      'perm-schaste-ne-za-gorami',
      'naberezhnaya-kamy',
      'permsky-solenye-ushi',
      'perm-permskiy-medved',
      'perm-park-kamney-permskie-vorota',
    ],
    target: 'places',
    badge: 'Арт-объект',
  },
];

function tagsFromSlides(slides: CityIdentitySlide[]): CityIdentityTag[] {
  return slides.map((slide) => ({
    id: slide.id,
    hashtag: slide.title,
    hint: slide.title,
    slugs: slide.slugs,
    target: slide.target,
  }));
}

const IDENTITY_LEAD = 'Четыре вещи, за которыми сюда едут в первую очередь';

const MSK_SLIDES: CityIdentitySlide[] = [
  {
    id: 'moskva-siti',
    title: 'Скорость и масштаб',
    text: 'Культ «Москва-Сити». Бешеный темп, дух больших денег и вечного движения. Стеклянные башни-небоскребы стали новым визуальным кодом города, определяющим его амбициозный характер.',
    imageSrc: '/images/venues/moscow/moskva-siti.jpg',
    imageAlt: 'Москва-Сити',
    slugs: ['moscow-moskva-siti', 'moscow-smotrovaya-moskva-siti'],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'usadby',
    title: 'Усадебный побег',
    text: 'Парковые резиденции. Уникальный московский контраст: огромные царские усадьбы (Царицыно, Коломенское), интегрированные в мегаполис. Главное место силы, где москвичи замедляют время.',
    imageSrc: '/images/venues/moscow/tsaritsyno.jpg',
    imageAlt: 'Музей-заповедник Царицыно',
    slugs: ['moscow-tsaritsyno', 'moscow-kolomenskoe'],
    target: 'places',
    badge: 'Искусство',
  },
  {
    id: 'foodmalls',
    title: 'Культ фуд-моллов',
    text: 'Рынки-гиганты. В Москве не просто едят, здесь празднуют гастрономию. Пространства вроде «Депо» и «Даниловского» превратили покупку еды в главный социальный ритуал и стиль жизни.',
    imageSrc: '/images/venues/moscow/depo-lesnaya.jpg',
    imageAlt: 'Депо.Москва на Лесной',
    slugs: ['moscow-depo-lesnaya', 'moscow-danilovskiy-rynok'],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'vysotki',
    title: 'Монументальный ампир',
    text: 'Сталинские высотки. «Семь сестер» - величественные каменные шпили, которые царят над городом. Они задают Москве ее имперский, слегка суровый и торжественный силуэт.',
    imageSrc: '/images/venues/moscow/kotelnicheskaya-naberezhnaya.jpg',
    imageAlt: 'Жилой дом на Котельнической набережной',
    slugs: ['moscow-kotelnicheskaya-naberezhnaya'],
    target: 'places',
    badge: 'Архитектура',
  },
];

const SPB_SLIDES: CityIdentitySlide[] = [
  {
    id: 'razvod-mostov',
    title: 'Поэзия большой воды',
    text: 'Развод мостов. Дух города-порта и Северной Венеции. Ночной подъем многотонных крыльев мостов под музыку над Невой - главный объединяющий ритуал питерских белых ночей.',
    imageSrc: '/images/venues/saint-petersburg/dvortsovyy-most.jpg',
    imageAlt: 'Дворцовый мост в Санкт-Петербурге',
    slugs: ['saint-petersburg-dvortsovyy-most', 'saint-petersburg-dvortsovaya-naberezhnaya'],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'dvory',
    title: 'Изнанка Петербурга',
    text: 'Парадные и дворы. Романтика распада, мистические дворы-колодцы и доходные дома со световыми фонарями и лепниной. Тайный мир, формирующий меланхоличный и глубокий дух города.',
    imageSrc: '/images/venues/saint-petersburg/otkrytye-dvory-kolodtsy-ekskursii-po-dvoram.jpg',
    imageAlt: 'Дворы-колодцы Петербурга',
    slugs: [
      'saint-petersburg-otkrytye-dvory-kolodtsy-ekskursii-po-dvoram',
      'saint-petersburg-paradnaya-romashka-dom-eliseeva',
    ],
    target: 'places',
    badge: 'Искусство',
  },
  {
    id: 'pyshki',
    title: 'Вкус ностальгии',
    text: 'Легендарные пышки. Горячая выпечка в сахарной пудре из культовой пышечной на Большой Конюшенной. Главный гастро-код, где советские традиции и рецепт неизменны с 1958 года.',
    imageSrc: '/images/venues/saint-petersburg/pyshechnaya-na-bolshoy-konyushennoy.jpg',
    imageAlt: 'Пышечная на Большой Конюшенной',
    slugs: ['saint-petersburg-pyshechnaya-na-bolshoy-konyushennoy'],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'sevkabel',
    title: 'Заводской ренессанс',
    text: 'Севкабель Порт. Превращение серых кирпичных заводов у залива в центры моды, инди-музыки и современного арта. Символ нового, живого и свободного Петербурга.',
    imageSrc: '/images/venues/saint-petersburg/sevkabel-port.jpg',
    imageAlt: 'Севкабель Порт',
    slugs: ['saint-petersburg-sevkabel-port'],
    target: 'places',
    badge: 'Арт-объект',
  },
];

const NN_SLIDES: CityIdentitySlide[] = [
  {
    id: 'zakaty',
    title: 'Столица закатов',
    text: 'Слияние двух рек. Географический феномен: из-за расположения на высоких холмах над Стрелкой Волги и Оки солнце здесь уходит за горизонт невероятно долго, окрашивая весь город в золото.',
    imageSrc: '/images/venues/nizhny-novgorod/strelka-rek-volgi-i-oki.jpg',
    imageAlt: 'Стрелка рек Волги и Оки',
    slugs: ['nizhny-novgorod-strelka-rek-volgi-i-oki', 'nizhny-novgorod-naberezhnaya-fedorovskogo'],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'street-art',
    title: 'Город-галерея',
    text: 'Нижегородский стрит-арт. Мекка уличного искусства России. Локальные художники не портят стены, а тонко вписывают свои глубокие философские полотна в фактуру старых деревянных домов.',
    imageSrc: '/images/venues/nizhny-novgorod/arsenal-gtsisi.jpg',
    imageAlt: 'Арсенал ГЦСИ и стрит-арт в Нижнем Новгороде',
    slugs: ['nizhny-novgorod-street-art-kvartaly', 'nizhny-novgorod-pochainskiy-bulvar'],
    target: 'places',
    badge: 'Искусство',
  },
  {
    id: 'shaverma',
    title: 'Культ на Средном',
    text: 'Нижегородская шаверма. Главный стритфуд-феномен Поволжья. Огромное, легендарное локальное блюдо, ради которого топ-менеджеры и студенты стоят в одной круглосуточной очереди.',
    imageSrc: '/images/venues/nizhny-novgorod/shaverma-sredny.jpg',
    imageAlt: 'Нижегородская шаверма на Средном рынке',
    slugs: ['nizhny-novgorod-shaverma-na-srednom', 'nizhny-novgorod-rozhdestvenskaya-ulitsa'],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'pakgauzy',
    title: 'Ажурное кружево',
    text: 'Пакгаузы на Стрелке. Металлические каркасы XIX века, сохраненные и превращенные на стрелке рек в хайтек-концертный зал. Символ бережного отношения к промышленному наследию.',
    imageSrc: '/images/venues/nizhny-novgorod/pakgauzy-strelka.jpg',
    imageAlt: 'Пакгаузы на Стрелке',
    slugs: ['nizhny-novgorod-pakgauzy-na-strelke', 'nizhny-novgorod-strelka-rek-volgi-i-oki'],
    target: 'places',
    badge: 'Архитектура',
  },
];

const KGD_SLIDES: CityIdentitySlide[] = [
  {
    id: 'homliny',
    title: 'Локальный квест',
    text: 'Семья Хомлинов. Семь крошечных бронзовых фигурок мифических существ-домовых, спрятанных по городу. Интерактивная сказка, которая знакомит туристов с духом места через игру.',
    imageSrc: '/images/venues/kaliningrad/homlin-mama-varya.jpg',
    imageAlt: 'Хомлин-мама Варя у Бранденбургских ворот',
    slugs: [
      'kaliningrad-skulptura-dedushka-homlin-karl',
      'kaliningrad-skulptura-babushka-homlin-marta',
      'kaliningrad-malysh-homlin-unya',
      'kaliningrad-malyshka-homlin-ulya',
      'kaliningrad-homlin-mama-varya',
    ],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'gotika',
    title: 'Немецкий след',
    text: 'Кёнигсбергская готика. Оборонительные форты, городские ворота и величественный Кафедральный собор XIV века на острове Канта. Суровое балтийское средневековье посреди России.',
    imageSrc: '/images/venues/kaliningrad/kafedral-nyy-sobor.jpg',
    imageAlt: 'Кафедральный собор на острове Канта',
    slugs: [
      'kaliningrad-kafedral-nyy-sobor',
      'kaliningrad-ostrov-kanta',
      'kaliningrad-fort-5',
      'kaliningrad-korolevskie-vorota',
    ],
    target: 'places',
    badge: 'Искусство',
  },
  {
    id: 'klopsy',
    title: 'Прусский ужин',
    text: 'Кёнигсбергские клопсы. Нежные мясные биточки под каперсовым соусом, сваренные в наваристом бульоне. Исторический вкус старого Кёнигсберга, возрожденный современными шефами.',
    imageSrc: '/images/venues/kaliningrad/shtayndamm-99.jpg',
    imageAlt: 'Ресторан Штайндамм 99',
    slugs: ['kaliningrad-shtayndamm-99', 'kaliningrad-gastrobar-sol'],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'kosa',
    title: 'Песчаная утопия',
    text: 'Куршская коса. Хрупкий мир гигантских дюн, Танцующего леса и суровой Балтики. Уникальный природный заповедник, определяющий уединенный и созерцательный характер региона.',
    imageSrc: '/images/venues/kaliningrad/kurshskaya-kosa.jpg',
    imageAlt: 'Куршская коса',
    slugs: ['kaliningrad-kurshskaya-kosa', 'kaliningrad-tantsuyuschiy-les', 'kaliningrad-dyuna-efa'],
    target: 'suburbs',
    badge: 'Арт-объект',
  },
];

const EKB_WEATHER: CityWeatherFlavor = {
  latitude: 56.838,
  longitude: 60.597,
  timezone: 'Asia/Yekaterinburg',
  outdoorSlugs: [
    'ekaterinburg-plotinka-istoricheskiy-skver',
    'ekaterinburg-naberezhnaya-rabochey-molodezhi',
    'ekaterinburg-smotrovaya-ploschadka-bts-vysotskiy',
    'ekaterinburg-pamyatnik-klaviatura',
    'ekaterinburg-park-uktus',
  ],
  indoorSlugs: [
    'ekaterinburg-el-tsin-tsentr',
    'ekaterinburg-muzey-izobrazitelnyh-iskusstv',
    'ekaterinburg-kraevedcheskiy-muzey',
    'ekaterinburg-pashtet',
    'ekaterinburg-zmeeed',
  ],
  outdoorCta: 'Отличная погода для Плотинки, набережной и смотровой «Высоцкого»',
  indoorCtaOvercast: 'Сегодня пасмурно. Загляните в Ельцин Центр, музеи или «Паштет»',
  indoorCtaRain: 'Сегодня дождь. Загляните в Ельцин Центр, музеи или «Паштет»',
  indoorCtaSnow: 'Сегодня снег. Загляните в Ельцин Центр, музеи или термы Уктуса',
};

const EKB_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Asia/Yekaterinburg',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Суровые уральские морозы, Ледовый городок на площади 1905 года, Уктус и тур по пельменным.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'В марте ещё снег, к маю город резко зеленеет. Театральные премьеры и первые прогулки по конструктивизму.',
    },
    {
      id: 'summer',
      months: [6, 7, 8],
      headline: 'Лето',
      body: 'Пик сезона: Ural Music Night, STENOGRAFFIA, набережные и навигация на Городском пруду.',
    },
    {
      id: 'earlyAutumn',
      months: [9],
      headline: 'Ранняя осень',
      body: 'Золото в ЦПКиО и Шарташе, театральный сезон и марафон «Безумные дни».',
    },
    {
      id: 'lateAutumn',
      months: [10, 11],
      headline: 'Поздняя осень',
      body: 'Город плавно уходит в зиму: музеи, концерты и меньше туристического шума.',
    },
  ],
  tabs: seasonTabs({
    spring:
      'В марте ещё лежит снег, а в мае город резко зеленеет. Сезон театральных премьер и первых экскурсий по конструктивизму.',
    summer:
      'Пик сезона: набережные, open-air (Ural Music Night, STENOGRAFFIA) и навигация на Городском пруду.',
    autumn:
      'Сентябрь - золотая осень в ЦПКиО и Шарташе, «Безумные дни». С ноября город уходит в зиму.',
    winter:
      'Ледовый городок на площади 1905 года, Уктус и согревающий тур по пельменным и барам.',
  }),
};

const EKB_SLIDES: CityIdentitySlide[] = [
  {
    id: 'ural-rock',
    title: 'Столица уральского рока',
    text: 'Свободный, дерзкий и музыкальный характер. Родина «Наутилуса Помпилиуса», «Чайфа» и «Агаты Кристи». Раз в год город превращается в гигантскую сцену Ural Music Night.',
    imageSrc: '/images/venues/ekaterinburg/identity-rock.jpg',
    imageAlt: 'Уральский рок и ночная сцена Екатеринбурга',
    slugs: [
      'ekaterinburg-everjazz',
      'ekaterinburg-rok-bar-tsyn',
      'ekaterinburg-tele-club-fabrika',
      'ekaterinburg-new-bar',
    ],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'stenograffia',
    title: 'Заводские стены Бажова',
    text: 'Один из главных центров стрит-арта в стране. Фестиваль STENOGRAFFIA легально превращает индустриальные постройки, заборы и дворы в признанные арт-объекты.',
    imageSrc: '/images/venues/ekaterinburg/identity-street-art.jpg',
    imageAlt: 'Стрит-арт на заводских стенах Екатеринбурга',
    slugs: [
      'ekaterinburg-mural-uralskiy-bars',
      'ekaterinburg-perekhod-tsoya',
      'ekaterinburg-pamyatnik-klaviatura',
      'ekaterinburg-pamyatnik-beatles',
    ],
    target: 'places',
    badge: 'Искусство',
  },
  {
    id: 'posikunchiki',
    title: 'Уральские посикунчики',
    text: 'Сытная таежная кухня: крошечные пирожки-посикунчики с горячим бульоном и пельмени с мясом, дичью или лесными грибами.',
    imageSrc: '/images/venues/ekaterinburg/identity-gastro.jpg',
    imageAlt: 'Уральские пельмени и посикунчики',
    slugs: ['ekaterinburg-pashtet', 'ekaterinburg-pelmeni-klub', 'ekaterinburg-zmeeed'],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'avangard',
    title: 'Заповедник авангарда',
    text: 'Мировая столица конструктивизма 1920-1930-х. Городок чекистов, гостиница «Исеть» и водонапорная Белая башня задают суровый индустриальный силуэт.',
    imageSrc: '/images/venues/ekaterinburg/belaya-bashnya.jpg',
    imageAlt: 'Белая башня на Уралмаше',
    slugs: [
      'ekaterinburg-belaya-bashnya',
      'ekaterinburg-gorodok-chekistov',
      'ekaterinburg-gostinitsa-iset',
      'ekaterinburg-dom-oborony',
      'ekaterinburg-glavpochtamt',
    ],
    target: 'places',
    badge: 'Архитектура',
  },
];

const KAZAN_WEATHER: CityWeatherFlavor = {
  latitude: 55.796,
  longitude: 49.109,
  timezone: 'Europe/Moscow',
  outdoorSlugs: [
    'kazan-kazanskiy-kreml',
    'kazan-kremlevskaya-naberezhnaya',
    'kazan-ulitsa-baumana',
    'kazan-tsentr-semi-kazan',
    'kazan-naberezhnaya-nizhniy-kaban',
  ],
  indoorSlugs: [
    'kazan-ermitazh-kazan',
    'kazan-natsionalnyy-muzey-rt',
    'kazan-dom-ushkovoy',
    'kazan-tyubetey',
    'kazan-tugan-avylim',
  ],
  outdoorCta: 'Отличная погода для Кремля, Баумана и набережных',
  indoorCtaOvercast: 'Сегодня пасмурно. Загляните в музеи Кремля, Дом Ушковой или «Тюбетей»',
  indoorCtaRain: 'Сегодня дождь. Загляните в Эрмитаж-Казань, Национальный музей или «Туган Авылым»',
  indoorCtaSnow: 'Сегодня снег. Музеи Кремля, театр Камала и горячая татарская выпечка',
};

const KAZAN_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Europe/Moscow',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Сказочная иллюминация Кремлевской набережной и замерзшая Казанка. Горячая татарская выпечка, театры и заснеженный Свияжск.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'В апреле лед уходит с рек. Май - идеальный месяц для прогулок: город расцветает, открываются террасы, комфортно для длинных экскурсий.',
    },
    {
      id: 'summer',
      months: [6, 7, 8],
      headline: 'Лето',
      body: 'Пик сезона: речные прогулки до Болгара, вечерние променады, озера Лебяжье и open-air фестивали.',
    },
    {
      id: 'earlyAutumn',
      months: [9],
      headline: 'Ранняя осень',
      body: 'Мягкое бабье лето и золото в парке «Черное озеро».',
    },
    {
      id: 'lateAutumn',
      months: [10, 11],
      headline: 'Поздняя осень',
      body: 'С ноября - театральный сезон и уютный музейный отдых.',
    },
  ],
  tabs: seasonTabs({
    spring:
      'В апреле лед полностью уходит с рек. Май - идеальный месяц для прогулок: город расцветает, открываются летние террасы, температура комфортна для долгих экскурсий.',
    summer:
      'Пик туристического сезона. Идеальное время для речных прогулок до Болгара, вечерних променадов по набережным, купания в озерах Лебяжье и open-air фестивалей.',
    autumn:
      'Сентябрь и начало октября радуют мягким бабьим летом и золотыми красками в парке «Черное озеро». С ноября - театральный сезон и музейный отдых.',
    winter:
      'Время сказочной иллюминации на Кремлевской набережной и замерзшей Казанки. Отлично подходит для горячей татарской выпечки, театров и поездок в заснеженный Свияжск.',
  }),
};

const KAZAN_SLIDES: CityIdentitySlide[] = [
  {
    id: 'crossroads',
    title: 'Перекресток культур',
    text: 'Уникальный дух мирного сотворчества и слияния культур. Город, где на одной площади веками гармонично соседствуют православные колокольни и полумесяцы мечетей.',
    imageSrc: '/images/venues/kazan/identity-cultures.jpg',
    imageAlt: 'Казанский Кремль: мечеть и собор рядом',
    slugs: ['kazan-kazanskiy-kreml', 'kazan-mechet-kul-sharif', 'kazan-hram-vseh-religiy'],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'tatar-avantgarde',
    title: 'Татарский авангард',
    text: 'Глубокая национальная айдентика в современной моде, каллиграфии, театре Камала и креативных пространствах, которые транслируют культуру татарского народа в мировом контексте.',
    imageSrc: '/images/venues/kazan/identity-art.jpg',
    imageAlt: 'Татарский авангард и творческая сцена Казани',
    slugs: ['kazan-teatr-kamala', 'kazan-kreativnyy-klaster-shtab', 'kazan-pamyatnik-gabdulle-tukayu'],
    target: 'places',
    badge: 'Искусство',
  },
  {
    id: 'echpochmak',
    title: 'Культ эчпочмака',
    text: 'Легендарная национальная выпечка: сочные треугольные эчпочмаки, нежные кыстыбый и медовый чак-чак - главный гастрономический бренд региона.',
    imageSrc: '/images/venues/kazan/identity-gastro.jpg',
    imageAlt: 'Татарская выпечка: эчпочмак, кыстыбый, чак-чак',
    slugs: ['kazan-tyubetey', 'kazan-tugan-avylim', 'kazan-muzey-chak-chaka'],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'white-stone',
    title: 'Древний белокаменный код',
    text: 'Слияние восточного зодчества и русского барокко. Древние стены, бирюзовые минареты Кул-Шариф и падающая башня Сююмбике формируют силуэт третьей столицы.',
    imageSrc: '/images/venues/kazan/identity-architecture.jpg',
    imageAlt: 'Белокаменный Казанский Кремль и башня Сююмбике',
    slugs: ['kazan-kazanskiy-kreml', 'kazan-bashnya-syuyumbike', 'kazan-mechet-kul-sharif'],
    target: 'places',
    badge: 'Архитектура',
  },
];

const SAMARA_WEATHER: CityWeatherFlavor = {
  latitude: 53.1959,
  longitude: 50.1002,
  timezone: 'Europe/Samara',
  outdoorSlugs: [
    'samara-samarskaya-naberezhnaya',
    'samara-ulitsa-leningradskaya',
    'samara-ploschad-slavy',
    'samara-strukovskiy-sad',
    'samara-smotrovaya-vertolyotka',
  ],
  indoorSlugs: [
    'samara-bunker-stalina',
    'samara-muzey-moderna-usadba-kurlinoy',
    'samara-muzey-samara-kosmicheskaya',
    'samara-pivnoy-bar-na-dne',
    'samara-fabrika-kuhnya-zim',
  ],
  outdoorCta: 'Отличная погода для набережной, Арбата и площади Славы',
  indoorCtaOvercast: 'Сегодня пасмурно. Загляните в Бункер Сталина, Музей Модерна или к ракете «Союз»',
  indoorCtaRain: 'Сегодня дождь. Бункер Сталина, фабрика-кухня ЗИМ или бар «На Дне» укроют от непогоды',
  indoorCtaSnow: 'Сегодня снег. Музеи, бункер и горячее «Жигулёвское» у завода',
};

const SAMARA_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Europe/Samara',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Пушистый волжский снег и катки на площади Куйбышева. Набережная - заснеженный променад; турбазы на Самарской Луке и гастро-бары.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'В апреле лед уходит с Волги. Май - город зеленеет, стартуют первые теплоходы, набережная оживает.',
    },
    {
      id: 'summer',
      months: [6, 7, 8],
      headline: 'Лето',
      body: 'Пик сезона: пляжи в центре, купание, open-air на набережной - город как курорт.',
    },
    {
      id: 'earlyAutumn',
      months: [9],
      headline: 'Ранняя осень',
      body: 'Бабье лето и хайкинг по Жигулям - Вертолётка и Царёв курган.',
    },
    {
      id: 'lateAutumn',
      months: [10, 11],
      headline: 'Поздняя осень',
      body: 'Первый лёд на Волге и спокойный музейно-театральный формат.',
    },
  ],
  tabs: seasonTabs({
    spring:
      'В апреле лед с грохотом уходит с Волги. Май - город резко зеленеет, запускаются первые речные теплоходы, набережная оживает после зимы.',
    summer:
      'Пик и золотой век самарского сезона. Пляжи в центре, Волга прогревается для купания, на набережной non-stop музыкальные и гастрономические open-air.',
    autumn:
      'Сентябрь дарит теплое бабье лето и идеальные условия для хайкинга по Жигулёвским горам (Вертолётка и Царёв курган). В ноябре Волга покрывается первой коркой льда - сезон переходит в культурно-музейный формат.',
    winter:
      'Время пушистого волжского снега и масштабных катков на площади Куйбышева. Набережная превращается в заснеженный променад. Отлично подходит для зимних турбаз на Самарской Луке и согревающих гастро-туров по локальным барам.',
  }),
};

const SAMARA_SLIDES: CityIdentitySlide[] = [
  {
    id: 'space-capital',
    title: 'Космическая столица',
    text: 'Мощный индустриальный и научный статус. На заводе «Прогресс» собраны ступени ракеты Юрия Гагарина. Настоящая ракета на проспекте Ленина - главный символ города.',
    imageSrc: '/images/venues/samara/identity-space.jpg',
    imageAlt: 'Ракета «Союз» у музея «Самара Космическая»',
    slugs: [
      'samara-muzey-samara-kosmicheskaya',
      'samara-fabrika-kuhnya-zim',
      'samara-dom-chemodan',
    ],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'zhiguli-songs',
    title: 'Песни Жигулей',
    text: 'Колыбель бардовской песни, палаточного романтизма и гитарных фестивалей. Дух свободы, костров, уличных музыкантов на набережной и локального стрит-арта.',
    imageSrc: '/images/venues/samara/identity-art.jpg',
    imageAlt: 'Музыканты и бардовский дух на самарской набережной',
    slugs: [
      'samara-samarskaya-naberezhnaya',
      'samara-shiryaevo-samarskaya-luka',
      'samara-ulitsa-leningradskaya',
    ],
    target: 'places',
    badge: 'Искусство',
  },
  {
    id: 'zhiguli-beer',
    title: 'Культ «Жигулёвского»',
    text: 'Свежесваренное пиво легендарного завода Альфреда фон Вакано в паре с волжскими раками - абсолютный кулинарный код Самары.',
    imageSrc: '/images/venues/samara/identity-gastro.jpg',
    imageAlt: 'Жигулёвское пиво и волжские раки',
    slugs: [
      'samara-pivnoy-bar-na-dne',
      'samara-zhigulevskiy-pivovarennyy-zavod',
      'samara-osobnyak-fon-vakano',
    ],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'volga-resort',
    title: 'Курортная линия Волги',
    text: 'Многокилометровая каскадная набережная с песчаными пляжами прямо в историческом центре - атмосфера южного курорта посреди России.',
    imageSrc: '/images/venues/samara/identity-architecture.jpg',
    imageAlt: 'Самарская набережная с пляжем у Волги',
    slugs: [
      'samara-samarskaya-naberezhnaya',
      'samara-volzhskiy-plyazh',
      'samara-strukovskiy-sad',
    ],
    target: 'places',
    badge: 'Архитектура',
  },
];

const KRASNODAR_WEATHER: CityWeatherFlavor = {
  latitude: 45.0355,
  longitude: 38.9753,
  timezone: 'Europe/Moscow',
  outdoorSlugs: [
    'krasnodar-park-galitskogo-park-krasnodar',
    'krasnodar-ulitsa-krasnaya',
    'krasnodar-most-potseluev',
    'krasnodar-yaponskiy-sad',
    'krasnodar-botanicheskiy-sad-kosenko',
  ],
  indoorSlugs: [
    'krasnodar-muzey-felitsyna',
    'krasnodar-hudozhestvennyy-muzey-kovalenko',
    'krasnodar-restoran-borschberry',
    'krasnodar-fudmarket',
    'krasnodar-kreativnyy-klaster-kolos',
  ],
  outdoorCta: 'Отличная погода для парка Галицкого, Красной и набережной',
  indoorCtaOvercast: 'Сегодня пасмурно. Музеи, «Борщberry» или кластер «Колос»',
  indoorCtaRain: 'Сегодня дождь. Фелицын, Коваленко или Фудмаркет укроют от ливня',
  indoorCtaSnow: 'Сегодня сыро и холодно. Музеи, борщ и тёплые гастро-пространства',
};

const KRASNODAR_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Europe/Moscow',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Мягкая южная зима без лютого мороза: Красная остаётся прогулочной, парк Галицкого зеленеет, сезон уходит в музеи, театры и горячий кубанский борщ.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'Настоящее южное лето стартует уже в мае. В апреле город взрывно расцветает, улицы покрываются зеленью - идеально для пеших марафонов, пока асфальт ещё не плавится.',
    },
    {
      id: 'summer',
      months: [6, 7, 8],
      headline: 'Лето',
      body: 'Экстремально жаркий сезон: днём город замирает. Жизнь после 19:00 - набережные, Красная, фонтаны и летние веранды до поздней ночи.',
    },
    {
      id: 'autumn',
      months: [9, 10, 11],
      headline: 'Осень',
      body: 'Бархатный сезон: сентябрь и октябрь около +20-25 °C для виноделен и хайкинга в предгорьях. Листопад в парках держится до конца ноября.',
    },
  ],
  tabs: seasonTabs({
    spring:
      'Настоящее южное лето стартует уже в мае. В апреле город взрывно расцветает, улицы покрываются зеленью, а температура идеально подходит для пеших марафонов, пока солнце ещё не начало плавить асфальт.',
    summer:
      'Экстремально жаркий сезон, когда днём город буквально замирает. Вся жизнь переносится на вечер: набережные и Красная оживают после 19:00, фонтаны работают на максимум, а летние веранды забиты до поздней ночи.',
    autumn:
      'Бархатный и самый комфортный сезон. Сентябрь и октябрь радуют стабильным теплом (+20-25 °C), идеальным для поездок в винодельни и хайкинга по предгорьям. Листопад в парках держится до конца ноября.',
    winter:
      'Мягкая кубанская зима без сибирских морозов: Красная остаётся живой пешеходной осью, парк Галицкого не закрывается, а город уходит в музейно-театральный и гастрономический режим - борщ, сыры и тёплые веранды.',
  }),
};

const KRASNODAR_SLIDES: CityIdentitySlide[] = [
  {
    id: 'southern-chill',
    title: 'Южная столица чилла',
    text: 'Абсолютно расслабленный, гедонистический характер южного мегаполиса. Прогулки без спешки, кофейный культ и футуристический парк «Краснодар» - феномен парка Галицкого, одно из лучших современных пространств страны.',
    imageSrc: '/images/venues/krasnodar/identity-chill.jpg',
    imageAlt: 'Парк Галицкого и атмосфера южного чилла',
    slugs: [
      'krasnodar-park-galitskogo-park-krasnodar',
      'krasnodar-yaponskiy-sad',
      'krasnodar-gorodskoy-sad-park-gor-kogo',
    ],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'cossack-avantgarde',
    title: 'Казачий авангард',
    text: 'Мощный южный темперамент: казачьи певческие традиции, яркий уличный арт, южная школа живописи и колоритные арт-кластеры на бывших заводах.',
    imageSrc: '/images/venues/krasnodar/identity-art.jpg',
    imageAlt: 'Казачий и современный арт Краснодара',
    slugs: [
      'krasnodar-kreativnyy-klaster-kolos',
      'krasnodar-hudozhestvennyy-muzey-kovalenko',
      'krasnodar-skulptura-avrora',
    ],
    target: 'places',
    badge: 'Искусство',
  },
  {
    id: 'borsch-tomatoes',
    title: 'Культ борща и томатов',
    text: 'Главная житница страны диктует правила: наваристый кубанский борщ с салом и пампушками, сладкие томаты, свежая зелень, кавказские шашлыки и локальные сыры.',
    imageSrc: '/images/venues/krasnodar/identity-gastro.jpg',
    imageAlt: 'Кубанский борщ и южная гастрономия',
    slugs: [
      'krasnodar-restoran-borschberry',
      'krasnodar-fudmarket',
      'krasnodar-ulitsa-krasnaya',
    ],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'ekaterinodar-baroque',
    title: 'Екатерининское барокко',
    text: 'Контраст старого Екатеринодара и южного полиса: кирпичные купеческие особняки XIX века, вековые платаны, кованые козырьки и торжественные триумфальные арки на Красной.',
    imageSrc: '/images/venues/krasnodar/identity-architecture.jpg',
    imageAlt: 'Красная улица и екатеринодарская архитектура',
    slugs: [
      'krasnodar-ulitsa-krasnaya',
      'krasnodar-aleksandrovskaya-triumfal-naya-arka',
      'krasnodar-osobnyak-likhatskogo',
    ],
    target: 'places',
    badge: 'Архитектура',
  },
];

const KRASNOYARSK_WEATHER: CityWeatherFlavor = {
  latitude: 56.0153,
  longitude: 92.8932,
  timezone: 'Asia/Krasnoyarsk',
  outdoorSlugs: [
    'krasnoyarsk-natsional-nyy-park-krasnoyarskie-stolby',
    'krasnoyarsk-karaul-naya-gora-i-chasovnya-paraskevy-pyatnitsy',
    'krasnoyarsk-tsentral-naya-naberezhnaya-eniseya',
    'krasnoyarsk-ostrov-tatyshev',
    'krasnoyarsk-nikolaevskaya-sopka',
  ],
  indoorSlugs: [
    'krasnoyarsk-muzey-usad-ba-v-i-surikova',
    'krasnoyarsk-ploschad-mira-kic',
    'krasnoyarsk-restoran-tunguska',
    'krasnoyarsk-restoran-075-please',
    'krasnoyarsk-kraevedcheskiy-muzey',
  ],
  outdoorCta: 'Отличная погода для Столбов, Караульной горы и набережной Енисея',
  indoorCtaOvercast: 'Сегодня пасмурно. Усадьба Сурикова, «Площадь Мира» или «Тунгуска»',
  indoorCtaRain: 'Сегодня дождь. Музеи, БКЗ и сибирская кухня укроют от непогоды',
  indoorCtaSnow: 'Сегодня снег. «Бобровый лог», музеи и горячая сибирская кухня',
};

const KRASNOYARSK_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Asia/Krasnoyarsk',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Сказочная сибирская зима со снегом и морозами. Енисей не замерзает из-за ГЭС и парит туманами. Время для «Бобрового лога» и согревающей гастрономии.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'В марте и апреле ещё лежит снег. Настоящая весна в мае: город резко зеленеет, открываются террасы, комфорт для первых длинных прогулок.',
    },
    {
      id: 'summer',
      months: [6, 7, 8],
      headline: 'Лето',
      body: 'Пик сезона: Столбы, катера по Красноярскому морю и вечерние набережные. Часто выше +25-30 °C.',
    },
    {
      id: 'autumn',
      months: [9, 10, 11],
      headline: 'Осень',
      body: 'Сентябрь и начало октября - «золотая тайга». Смотровые на Николаевской сопке и Караульной горе. С ноября город уходит в зиму.',
    },
  ],
  tabs: seasonTabs({
    spring:
      'В марте и апреле ещё вовсю лежит снег. Настоящая весна приходит в мае, когда город резко зеленеет, открываются летние террасы, а погода становится комфортной для первых долгих прогулок на природе.',
    summer:
      'Пик туристического сезона. Идеальное время для штурма скал в заповеднике «Столбы», прогулок на катерах по Красноярскому морю и вечерних променадов по набережным. Температура часто поднимается выше +25-30 °C.',
    autumn:
      'Сентябрь и начало октября - невероятно красивый сезон «золотой тайги». Смотровые на Николаевской сопке и Караульной горе предлагают лучшие виды. С ноября город окончательно уходит в зиму.',
    winter:
      'Настоящая сказочная сибирская зима с пушистым снегом и морозами. Енисей в черте города не замерзает из-за ГЭС и создаёт эффектные парящие туманы. Идеально для «Бобрового лога» и согревающего гастро-тура.',
  }),
};

const KRASNOYARSK_SLIDES: CityIdentitySlide[] = [
  {
    id: 'mighty-siberia',
    title: 'Дух могучей Сибири',
    text: 'Величественный характер дикой природы у мегаполиса. Гигантские сиенитовые скалы-останцы среди тайги - главное место силы и символ города: заповедник «Столбы».',
    imageSrc: '/images/venues/krasnoyarsk/identity-siberia.jpg',
    imageAlt: 'Скалы Столбы среди сибирской тайги',
    slugs: [
      'krasnoyarsk-natsional-nyy-park-krasnoyarskie-stolby',
      'krasnoyarsk-fanpark-bobrovyy-log',
      'krasnoyarsk-nikolaevskaya-sopka',
    ],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'surikov-hvorostovsky',
    title: 'Родина Сурикова и Хворостовского',
    text: 'Глубокие культурные традиции: родина художника Василия Сурикова и оперного гения Дмитрия Хворостовского. Мощная художественная школа и лофт-кластеры на берегах Енисея.',
    imageSrc: '/images/venues/krasnoyarsk/identity-art.jpg',
    imageAlt: 'Культурное наследие Красноярска',
    slugs: [
      'krasnoyarsk-muzey-usad-ba-v-i-surikova',
      'krasnoyarsk-hudozhestvennyy-muzey-surikova',
      'krasnoyarsk-ploschad-mira-kic',
    ],
    target: 'places',
    badge: 'Искусство',
  },
  {
    id: 'siberian-game',
    title: 'Культ сибирской дичи',
    text: 'Гастрономическая столица Сибири: строганина из муксуна и нельмы, оленина, таежные грибы, папоротник, кедровые орехи и десерты с брусникой.',
    imageSrc: '/images/venues/krasnoyarsk/identity-gastro.jpg',
    imageAlt: 'Сибирская кухня: рыба, ягоды и дичь',
    slugs: [
      'krasnoyarsk-restoran-tunguska',
      'krasnoyarsk-restoran-075-please',
      'krasnoyarsk-kupecheskiy-kvartal-mira',
    ],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'yenisei-bridges',
    title: 'Мосты и каскады Енисея',
    text: 'Масштабное советское и дореволюционное зодчество. Коммунальный мост и часовня Параскевы Пятницы на десятирублевой купюре - главный архитектурный код.',
    imageSrc: '/images/venues/krasnoyarsk/identity-architecture.jpg',
    imageAlt: 'Мосты Енисея и десятирублевый вид',
    slugs: [
      'krasnoyarsk-kommunalnyy-most',
      'krasnoyarsk-karaul-naya-gora-i-chasovnya-paraskevy-pyatnitsy',
      'krasnoyarsk-peshehodnyy-most-na-ostrov-tatyshev',
    ],
    target: 'places',
    badge: 'Архитектура',
  },
];

const NOVOSIBIRSK_WEATHER: CityWeatherFlavor = {
  latitude: 55.0302,
  longitude: 82.9204,
  timezone: 'Asia/Novosibirsk',
  outdoorSlugs: [
    'novosibirsk-mihaylovskaya-naberezhnaya',
    'novosibirsk-akademgorodok',
    'novosibirsk-zaeltsovskiy-park',
    'novosibirsk-plyazh-zvezda-obskoe-more',
    'novosibirsk-tsentralnyy-park',
  ],
  indoorSlugs: [
    'novosibirsk-novosibirskiy-teatr-opery-i-baleta-novat',
    'novosibirsk-novosibirskiy-hudozhestvennyy-muzey',
    'novosibirsk-muzey-mirovoy-pogrebal-noy-kul-tury',
    'novosibirsk-restoran-sibir-sibir',
    'novosibirsk-akvapark',
  ],
  outdoorCta: 'Отличная погода для Михайловской набережной, Академгородка и Заельцовского бора',
  indoorCtaOvercast: 'Сегодня пасмурно. НОВАТ, Художественный музей или «#СибирьСибирь»',
  indoorCtaRain: 'Сегодня дождь. Музеи, театры и крытый аквапарк укроют от непогоды',
  indoorCtaSnow: 'Сегодня снег. НОВАТ, музеи и горячая сибирская кухня',
};

const NOVOSIBIRSK_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Asia/Novosibirsk',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Сибирская сказка с морозами до -30 °C и хрустящим снегом. Каток у НОВАТ, баня и горнолыжный комплекс «Ключи». Передвигайтесь на метро и такси - сугробы усложняют логистику.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'Март и апрель - продолжение зимы со слякотью. Настоящее тепло в мае: город резко зеленеет, на Михайловской набережной открывается сезон променадов. Бюджетные перелеты и музеи без очередей.',
    },
    {
      id: 'summer',
      months: [6, 7, 8],
      headline: 'Лето',
      body: 'Пик сезона: до +25 °C, пляжи Обского моря, фестивали в Академгородке и долгие вечерние прогулки. Открыта навигация по Оби, летние веранды и прокат самокатов.',
    },
    {
      id: 'autumn',
      months: [9, 10, 11],
      headline: 'Осень',
      body: 'Сентябрь - бабье лето и золото Заельцовского бора. С октября дожди, мокрый снег и ветер. Идеально для театральных сезонов и обновленных ресторанных меню.',
    },
  ],
  tabs: seasonTabs({
    spring:
      'Март и апрель здесь - продолжение зимы с затяжным таянием снега и гололедицей. Настоящее тепло прилетает только в мае, когда город резко зеленеет, а на Михайловской набережной открывается сезон променадов. Лучшее время для бюджетных перелетов и музеев без очередей.',
    summer:
      'Пиковый туристический сезон с комфортным теплом до +25 °C, а иногда и палящим зноем. Главные фишки - отдых на пляжах Обского моря, фестивали в Академгородке и долгие вечерние прогулки. Открыта навигация по Оби, летние веранды и прокат самокатов.',
    autumn:
      'Сентябрь радует мягким бабьим летом и золотыми пейзажами в парке «Заельцовский бор». С октября погода резко портится: дожди, мокрый снег и сильные ветра. Осень идеальна для культурного туризма: открываются театральные сезоны, рестораны обновляют меню.',
    winter:
      'Новосибирск превращается в сибирскую сказку с крепкими морозами до -30 °C и хрустящим снегом. Сюда едут ради катка у НОВАТ, сибирской бани и горнолыжного комплекса «Ключи». Планируйте поездки на метро и такси - сугробы усложняют логистику.',
  }),
};

const NOVOSIBIRSK_SLIDES: CityIdentitySlide[] = [
  {
    id: 'akademgorodok',
    title: 'Академгородок',
    text: 'Ум в окружении тайги. Научный анклав, где среди векового леса живут ученые, а по улицам бегают ручные белки. Исследовательское сердце Сибири - интеллигентный, новаторский и немного бунтарский Новосибирск. Прогулка по Морской показывает, как мирный хай-тек живет рядом с дикой природой.',
    imageSrc: '/images/venues/novosibirsk/identity-symbol.jpg',
    imageAlt: 'Академгородок среди сибирской тайги',
    slugs: [
      'novosibirsk-akademgorodok',
      'novosibirsk-pamyatnik-laboratornoy-myshi',
      'novosibirsk-art-obekt-shpargalka',
    ],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'novat',
    title: 'Сибирский Колизей (НОВАТ)',
    text: 'Культурный масштаб за Уралом. Новосибирский театр оперы и балета - монументальный символ сибирского размаха. Под гигантским куполом ставили авангард даже в годы эвакуации, задав высокую планку зрителям. По масштабам и качеству труппы театр не уступает столичным подмосткам.',
    imageSrc: '/images/venues/novosibirsk/identity-art.jpg',
    imageAlt: 'Купол Новосибирского театра оперы и балета',
    slugs: [
      'novosibirsk-novosibirskiy-teatr-opery-i-baleta-novat',
      'novosibirsk-teatr-globus',
      'novosibirsk-teatr-krasnyy-fakel',
    ],
    target: 'places',
    badge: 'Искусство',
  },
  {
    id: 'siberian-gastro',
    title: 'Сибирская кухня новой волны',
    text: 'Дикоросы, дичь и гастрономический андеграунд. Новосибирск - ресторанная столица Сибири: косуля, омуль, папоротник-орляк и кедровый орех в современных подачах. Еда здесь сытная и честная, но утонченная.',
    imageSrc: '/images/venues/novosibirsk/identity-gastro.jpg',
    imageAlt: 'Новая сибирская кухня в Новосибирске',
    slugs: [
      'novosibirsk-restoran-sibir-sibir',
      'novosibirsk-gastrokort-tsentralnyy-rynok',
      'novosibirsk-kafe-ip-fedoseev',
    ],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'constructivism',
    title: 'Конструктивизм и Стоек',
    text: 'Архитектурный манифест советского авангарда. Новосибирск - заповедник конструктивизма 1920-1930-х: дома-коммуны в центре и наклонный Технопарк («Гуси») в Академгородке. Функциональность и устремленность в будущее без лишней мишуры.',
    imageSrc: '/images/venues/novosibirsk/identity-architecture.jpg',
    imageAlt: 'Конструктивистская архитектура Новосибирска',
    slugs: [
      'novosibirsk-stokvartirnyy-dom',
      'novosibirsk-dom-s-chasami',
      'novosibirsk-glavpochtamt',
    ],
    target: 'places',
    badge: 'Архитектура',
  },
];

const VORONEZH_WEATHER: CityWeatherFlavor = {
  latitude: 51.672,
  longitude: 39.1843,
  timezone: 'Europe/Moscow',
  outdoorSlugs: [
    'voronezh-admiralteyskaya-ploschad',
    'voronezh-park-alye-parusa',
    'voronezh-pamyatnik-petru-i',
    'voronezh-park-orlyonok',
    'voronezh-chernavskaya-damba',
  ],
  indoorSlugs: [
    'voronezh-hudozhestvennyy-muzey-kramskogo',
    'voronezh-kraevedcheskiy-muzey',
    'voronezh-kamernyy-teatr',
    'voronezh-restoran-el-chico',
    'voronezh-kofeynya-promka',
  ],
  outdoorCta: 'Отличная погода для Адмиралтейской, «Алых парусов» и прогулки к Петру',
  indoorCtaOvercast: 'Сегодня пасмурно. Загляните в музей Крамского, Краеведческий или «Промку»',
  indoorCtaRain: 'Сегодня дождь. Музей Крамского, Камерный театр или стейкхаус «El Chico»',
  indoorCtaSnow: 'Сегодня снег. Музеи центра и стейкхаусы после прогулки к Петру',
};

const VORONEZH_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Europe/Moscow',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Плотный снег и около -5...-9 °C. Тюбинги и лыжи в «Чертовицах» за городом. Центральные улицы чистят, согреться помогают местные стейкхаусы.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'В апреле город стремительно зеленеет, термометр скачет до +15 °C. Пешие холмы без летнего зноя. В мае открывается навигация: сап по Воронежскому водохранилищу.',
    },
    {
      id: 'summer',
      months: [6, 7, 8],
      headline: 'Лето',
      body: 'Жарко и сухо, часто выше +30 °C: город оживает вечером. Карла Маркса превращается в сплошную веранду. Плюс сезона - загородные арт-парки и замки в часе езды.',
    },
    {
      id: 'autumn',
      months: [9, 10, 11],
      headline: 'Осень',
      body: 'Сентябрь и октябрь: мягкое солнце и +12...+18 °C. «Алые паруса» золотеют. Меньше транзита на юг, отели заметно дешевле.',
    },
  ],
  tabs: seasonTabs({
    spring:
      'В апреле Воронеж стремительно зеленеет, а термометр резко скачет до +15 °C. Идеальное время для долгих пеших прогулок по историческим холмам без летнего зноя. В мае открывается сезон навигации, и можно арендовать сапборд для заплыва по Воронежскому водохранилищу.',
    summer:
      'Лето здесь жаркое и сухое, часто выше +30 °C, из-за чего город оживает в вечернее время. Центральная пешеходная улица Карла Маркса превращается в сплошную веранду с крафтовыми барами. Главный плюс сезона - доступность загородных арт-парков и замков в часе езды от центра.',
    autumn:
      'Сентябрь и октябрь радуют мягким солнцем и комфортными +12...+18 °C. Леса вокруг города и парк «Алые паруса» окрашиваются в золото. Логистически это золотой сезон: спадает поток транзитных туристов, едущих на юг, и цены на отели заметно снижаются.',
    winter:
      'Город укрывает плотный снег, а температура держится около -5...-9 °C. Главная фишка - катание на тюбингах и лыжах в спортивном комплексе «Чертовицы» прямо за городом. Центральные улицы отлично чистят, а согреться после прогулок помогают местные стейкхаусы.',
  }),
};

const UFA_WEATHER: CityWeatherFlavor = {
  latitude: 54.726,
  longitude: 55.948,
  timezone: 'Asia/Yekaterinburg',
  outdoorSlugs: [
    'ufa-pamyatnik-salavatu-yulaevu',
    'ufa-monument-druzhby',
    'ufa-art-kvadrat',
    'ufa-novaya-ufimskaya-naberezhnaya',
    'ufa-smotrovaya-u-pamyatnika-salavatu',
  ],
  indoorSlugs: [
    'ufa-hudozhestvennyy-muzey-nesterova',
    'ufa-natsionalnyy-muzey',
    'ufa-bashkirskiy-teatr-opery-i-baleta',
    'ufa-aibat-hallyar',
    'ufa-kumpan-cafe',
  ],
  outdoorCta: 'Отличная погода для Салавата Юлаева, Арт-квадрата и набережной Белой',
  indoorCtaOvercast: 'Сегодня пасмурно. Загляните в музей Нестерова, Национальный музей или «Kumpan Cafe»',
  indoorCtaRain: 'Сегодня дождь. Музей Нестерова, опера или кыстыбыи в Aibat Hallyar',
  indoorCtaSnow: 'Сегодня снег. Музеи центра и кофейни с башкирским медом после прогулки к Салавату',
};

const UFA_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Asia/Yekaterinburg',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Пушистый снег и около -12...-15 °C. Катание на сноуборде и лыжах в «Олимпик Парке» в черте города, ледовые городки у площади Салавата Юлаева. Крутые холмы и гололед, согреться помогают кофейни с башкирским медом.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'В апреле Уфа резко сбрасывает снег, к маю воздух прогревается до +18 °C и пахнет черемухой. Лучшее время для утесов и памятников без жары. В мае запускают речные прогулки по Белой и Уфе.',
    },
    {
      id: 'summer',
      months: [6, 7, 8],
      headline: 'Лето',
      body: 'Жарко и солнечно, часто за +30 °C. Город укрывается в тени парков и веранд на Чернышевского. Плюс сезона - озера, шиханы и оборудованные пляжи Белой.',
    },
    {
      id: 'autumn',
      months: [9, 10, 11],
      headline: 'Осень',
      body: 'Сентябрь: бабье лето +15...+20 °C. В октябре Уфа золотеет и багровеет. Меньше очередей на смотровых, перелеты и отели дешевле. Хороший сезон для музеев и гастро.',
    },
  ],
  tabs: seasonTabs({
    spring:
      'В апреле Уфа резко сбрасывает снежные оковы, а к маю воздух прогревается до +18 °C и наполняется ароматом цветущей черемухи. Это лучшее время для осмотра уфимских крутых утесов и памятников без изнуряющей жары. В мае официально запускают речные прогулки по рекам Белая (Агидель) и Уфа (Караидель).',
    summer:
      'Лето здесь по-южному жаркое и солнечное, часто за +30 °C. Весь город укрывается в тени вековых парков и уличных веранд на улице Чернышевского. Главный плюс сезона - возможность с комфортом доехать до культовых башкирских озер, шиханов и скал, а также искупаться на оборудованных пляжах реки Белой.',
    autumn:
      'Сентябрь балует комфортным бабьим летом (+15...+20 °C), а в октябре Уфа окрашивается в золотые и багряные тона. Логистически это идеальное время: спадают летние очереди на смотровых площадках, а цены на перелеты и отели опускаются до минимума. Отличный сезон для музеев и гастро-туров.',
    winter:
      'Уфа превращается в суровую сказку с пушистым снегом и средней температурой -12...-15 °C. Главная фишка - катание на сноубордах и лыжах в черте города («Олимпик Парк») и масштабные ледовые городки у площади Салавата Юлаева. Логистика усложняется из-за крутых холмов и гололеда, но городские кофейни с башкирским медом компенсируют зимний холод.',
  }),
};

const UFA_SLIDES: CityIdentitySlide[] = [
  {
    id: 'salavat-yulaev',
    title: 'Салават Юлаев',
    text: 'Крупнейшая конная статуя в России и Европе весом 40 тонн возвышается над Белой на крутом утесе. Место встреч и силы для каждого уфимца.',
    imageSrc: '/images/venues/ufa/pamyatnik-salavatu-yulaevu.jpg',
    imageAlt: 'Памятник Салавату Юлаеву над рекой Белой',
    slugs: [
      'ufa-pamyatnik-salavatu-yulaevu',
      'ufa-smotrovaya-u-pamyatnika-salavatu',
      'ufa-kongress-holl-toratau',
    ],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'ufa-rock',
    title: 'Уфимский рок и андеграунд',
    text: 'Родина Земфиры, Юрия Шевчука и Lumen. Концерты, уличные музыканты и независимые арт-пространства сильнее, чем в других регионах Поволжья.',
    imageSrc: '/images/venues/ufa/art-kvadrat.jpg',
    imageAlt: 'Арт-квадрат и уфимский рок',
    slugs: ['ufa-art-kvadrat', 'ufa-muzey-roka-kinoteatr-rodina', 'ufa-musichall27'],
    target: 'places',
    badge: 'Искусство',
  },
  {
    id: 'bashkir-honey',
    title: 'Башкирский мед и конина',
    text: 'Бортевой мед, казылык, корот и корот-чай. Здесь кормят сытно и щедро продуктами уральских предгорий.',
    imageSrc: '/images/venues/ufa/gostinyy-dvor.jpg',
    imageAlt: 'Гостиный двор и башкирская гастрономия Уфы',
    slugs: ['ufa-aibat-hallyar', 'ufa-kumpan-cafe', 'ufa-gostinyy-dvor'],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'lyalya-tyulpan',
    title: 'Мечеть-медресе «Ляля-Тюльпан»',
    text: 'Минареты в виде бутонов тюльпанов. Уфа как мост между Азией и Европой, где восточные традиции соседствуют с городским ритмом.',
    imageSrc: '/images/venues/ufa/mechet-medrese-lyalya-tyul-pan.jpg',
    imageAlt: 'Мечеть-медресе «Ляля-Тюльпан»',
    slugs: [
      'ufa-mechet-medrese-lyalya-tyul-pan',
      'ufa-pervaya-sobornaya-mechet',
      'ufa-fontan-sem-devushek',
    ],
    target: 'places',
    badge: 'Архитектура',
  },
];

const VORONEZH_SLIDES: CityIdentitySlide[] = [
  {
    id: 'petrovsky-fleet',
    title: 'Родина регулярного флота',
    text: 'Сухопутный город, где Петр I строил флот. Копия линкора «Гото Предестинация» стоит на воде у Адмиралтейской площади.',
    imageSrc: '/images/venues/voronezh/identity-symbol.jpg',
    imageAlt: 'Корабль-музей «Гото Предестинация» на Воронежском водохранилище',
    slugs: [
      'voronezh-korabl-muzey-goto-predestinatsiya',
      'voronezh-admiralteyskaya-ploschad',
      'voronezh-pamyatnik-petru-i',
    ],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'literary-city',
    title: 'Платонов, Бим и неформальный город',
    text: 'Литературный и рок-Воронеж: Платонов на проспекте, Белый Бим у театра «Шут» и память Юрия Хоя на левом берегу.',
    imageSrc: '/images/venues/voronezh/identity-art.jpg',
    imageAlt: 'Памятник Белому Биму у театра кукол «Шут»',
    slugs: [
      'voronezh-pamyatnik-belomu-bimu',
      'voronezh-pamyatnik-platonovu',
      'voronezh-pamyatnik-yuriyu-hoyu',
    ],
    target: 'places',
    badge: 'Искусство',
  },
  {
    id: 'chernozem-meat',
    title: 'Мясо Черноземья',
    text: 'Стейкхаусы, фудхолл Центрального рынка и кофе «Промка» на проспекте. Вечером - настойки и крафт вдоль Красной линии.',
    imageSrc: '/images/venues/voronezh/identity-gastro.jpg',
    imageAlt: 'Стейкхаус и гастрономия Воронежа',
    slugs: [
      'voronezh-restoran-el-chico',
      'voronezh-gastro-tsentralnyy-rynok',
      'voronezh-kofeynya-promka',
    ],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'merchant-spire',
    title: 'Шпиль ЮВЖД и замок в Рамони',
    text: 'Купеческий классицизм, 68-метровый шпиль ЮВЖД и модерн «Бристоля». В часе езды - неоготический дворец Ольденбургских.',
    imageSrc: '/images/venues/voronezh/identity-architecture.jpg',
    imageAlt: 'Шпиль здания Управления ЮВЖД на проспекте Революции',
    slugs: [
      'voronezh-zdanie-upravleniya-yuvzhd',
      'voronezh-gostinitsa-bristol',
      'voronezh-ramon',
    ],
    target: 'mixed',
    badge: 'Архитектура',
  },
];

const ROSTOV_NA_DONU_WEATHER: CityWeatherFlavor = {
  latitude: 47.222,
  longitude: 39.72,
  timezone: 'Europe/Moscow',
  outdoorSlugs: [
    'rostov-na-donu-naberezhnaya-reki-don-beregovaya-ulitsa',
    'rostov-na-donu-pushkinskaya-ulitsa',
    'rostov-na-donu-park-revolyutsii',
    'rostov-na-donu-smotrovaya-na-sedova',
    'rostov-na-donu-park-levoberezhnyy',
  ],
  indoorSlugs: [
    'rostov-na-donu-oblastnoy-muzey-kraevedeniya',
    'rostov-na-donu-muzey-izobrazitelnyh-iskusstv',
    'rostov-na-donu-teatr-dramy-im-gorkogo',
    'rostov-na-donu-onegin-dacha',
    'rostov-na-donu-tsentral-nyy-rynok-staryy-bazar',
  ],
  outdoorCta: 'Отличная погода для Дона, Пушкинской и смотровой на Седова',
  indoorCtaOvercast: 'Сегодня пасмурно. Загляните в краеведческий, музей на Пушкинской или на рынок',
  indoorCtaRain: 'Сегодня дождь. Музеи центра, театр Горького или длинный обед в «Онегин Даче»',
  indoorCtaSnow: 'Сегодня ветрено и сыро. Музеи, театр и гастро-точки центра подойдут лучше набережной',
};

const ROSTOV_NA_DONU_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Europe/Moscow',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Мягко, но ветрено: около -3...-5 °C, снег легко сменяется дождем. Лучше планировать музеи, рынки и короткие прогулки между гастро-паузы.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'В апреле город быстро зеленеет, а в мае уже +20...+25 °C. Лучшее время для длинных прогулок по Пушкинской, рынку и набережной до летней жары.',
    },
    {
      id: 'summer',
      months: [6, 7, 8],
      headline: 'Лето',
      body: 'Очень жарко и сухо, нередко +35...+40 °C. Днем лучше музеи и рестораны, а набережную и Левбердон оставлять на вечер.',
    },
    {
      id: 'autumn',
      months: [9, 10, 11],
      headline: 'Осень',
      body: 'Сентябрь и октябрь - золотой сезон Ростова: долгое тепло, меньше транзитного трафика по М-4 и комфортные прогулки по центру.',
    },
  ],
  tabs: seasonTabs({
    spring:
      'В апреле Ростов быстро зеленеет, а к маю воздух выходит на +20...+25 °C. Это идеальное время для Пушкинской, Большой Садовой и рынков без изнуряющей жары. В мае оживает набережная и стартует сезон прогулочных теплоходов.',
    summer:
      'Лето здесь экстремально жаркое и сухое, часто выше +35 °C. Планируйте основные прогулки утром и после заката, а дневные часы оставляйте на музеи, рынок и рестораны с кондиционером. Плюс сезона - южные фрукты, раки и доступность загородных выездов.',
    autumn:
      'Сентябрь и октябрь дают Ростову тот самый бархатный ритм: +18...+23 °C, меньше трафика по М-4, дешевле отели и комфортнее длинные пешие маршруты. Это лучший момент для смотровых, Парамоновских складов и винных выездов по области.',
    winter:
      'Зима на Дону мягкая, но ветреная: около -3...-5 °C, а снег легко сменяется дождем. Зато исторический центр остается компактным и удобным, а согреваться приятно на рынке, в музеях и купеческих ресторанах.',
  }),
};

const ROSTOV_NA_DONU_SLIDES: CityIdentitySlide[] = [
  {
    id: 'don-bridge',
    title: 'Дон и Ворошиловский мост',
    text: 'Широкий Дон делит Ростов на деловой правый и расслабленный левый берег. Мост и река вместе объясняют южный характер города лучше любой открытки.',
    imageSrc: '/images/venues/rostov-na-donu/naberezhnaya-reki-don-beregovaya-ulitsa.jpg',
    imageAlt: 'Набережная Дона в Ростове-на-Дону',
    slugs: [
      'rostov-na-donu-naberezhnaya-reki-don-beregovaya-ulitsa',
      'rostov-na-donu-park-levoberezhnyy',
      'rostov-na-donu-smotrovaya-na-sedova',
    ],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'merchant-yards',
    title: 'Купеческие дворы и Нахичевань',
    text: 'Ростовская эклектика, дворики-галерки и армянская Нахичевань формируют ощущение южной Одессы без моря. Город сильнее всего раскрывается именно в полутонаx фасадов и дворов.',
    imageSrc: '/images/venues/rostov-na-donu/bol-shaya-sadovaya-ulitsa.jpg',
    imageAlt: 'Большая Садовая улица и купеческая архитектура Ростова',
    slugs: [
      'rostov-na-donu-zdanie-gorodskoy-dumy',
      'rostov-na-donu-torgovyy-dom-yablokovyh',
      'rostov-na-donu-dom-kotlyarova',
    ],
    target: 'places',
    badge: 'Искусство',
  },
  {
    id: 'don-crayfish',
    title: 'Раки, рынок и южный стол',
    text: 'Донские раки, сазан, помидоры, автохтонные вина и большой рынок делают гастрономию не дополнением, а частью городского характера.',
    imageSrc: '/images/venues/rostov-na-donu/tsentral-nyy-rynok-staryy-bazar.jpg',
    imageAlt: 'Центральный рынок Ростова-на-Дону',
    slugs: [
      'rostov-na-donu-tsentral-nyy-rynok-staryy-bazar',
      'rostov-na-donu-raki-i-gady',
      'rostov-na-donu-onegin-dacha',
    ],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'tractor-theatre',
    title: 'Театр-трактор и авангард',
    text: 'Театр Горького 1935 года - один из самых сильных памятников конструктивизма в стране. Ростов умеет быть не только купеческим и южным, но и по-настоящему смелым.',
    imageSrc: '/images/venues/rostov-na-donu/teatral-naya-ploschad.jpg',
    imageAlt: 'Театральная площадь и театр драмы в Ростове-на-Дону',
    slugs: [
      'rostov-na-donu-teatr-dramy-im-gorkogo',
      'rostov-na-donu-park-revolyutsii',
      'rostov-na-donu-paramonovskie-sklady',
    ],
    target: 'places',
    badge: 'Архитектура',
  },
];

const PENZA_WEATHER: CityWeatherFlavor = {
  latitude: 53.195,
  longitude: 45.0183,
  timezone: 'Europe/Moscow',
  outdoorSlugs: [
    'penza-pamyatnik-pervoposelentsu',
    'penza-penzenskaya-peshehodnaya-ulitsa-moskovskaya',
    'penza-park-imeni-v-g-belinskogo',
    'penza-svetozvukovoy-fontan',
    'penza-smotrovaya-staraya-penza',
  ],
  indoorSlugs: [
    'penza-muzey-odnoy-kartiny-im-g-v-myasnikova',
    'penza-kartinnaya-galereya-im-savickogo',
    'penza-dom-meyerholda',
    'penza-kraevedcheskiy-muzey',
    'penza-dramaticheskiy-teatr-lunacharskogo',
  ],
  outdoorCta: 'Отличная погода для старой крепости, Московской и парка Белинского',
  indoorCtaOvercast: 'Сегодня пасмурно. Выбирайте музей одной картины, галерею или Дом Мейерхольда',
  indoorCtaRain: 'Сегодня дождь. Музеи и драмтеатр дадут Пензу не хуже прогулки',
  indoorCtaSnow: 'Сегодня снег. Компактный центр удобно смотреть через музеи и театр',
};

const PENZA_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Europe/Moscow',
  seasons: [
    { id: 'winter', months: [12, 1, 2], headline: 'Зима', body: 'Спокойный музейный сезон: театр, галерея и музей одной картины собираются в короткий городской маршрут.' },
    { id: 'spring', months: [3, 4, 5], headline: 'Весна', body: 'Город быстро зеленеет, становится приятно гулять по Московской и крепостному холму.' },
    { id: 'summer', months: [6, 7, 8], headline: 'Лето', body: 'Лучшее время для фонтанной площади, парка Белинского и длинных прогулок по центру без верхней одежды.' },
    { id: 'autumn', months: [9, 10, 11], headline: 'Осень', body: 'Литературный и самый атмосферный сезон: Тарханы, желтые аллеи и мягкий провинциальный ритм.' },
  ],
  tabs: seasonTabs({
    spring:
      'Весной Пенза быстро зеленеет и особенно хорошо читается как тихий город на холмах. Это удобный сезон для центра, Московской и парка Белинского без летней толпы.',
    summer:
      'Лето - самый открытый городской сезон: фонтанная площадь оживает вечером, в парке Белинского дольше светло, а пешие маршруты между музеями проходят без пауз на холод.',
    autumn:
      'Осень особенно идет Пензе: желтеют аллеи, спокойнее в центре и лучше сочетаются городской маршрут с выездом в Тарханы. Это главный литературный сезон города.',
    winter:
      'Зимой Пенза становится камерной. Лучше делать ставку на музей одной картины, Дом Мейерхольда, галерею и вечерний театр, а прогулки держать короткими.',
  }),
};

const PENZA_SLIDES: CityIdentitySlide[] = [
  {
    id: 'old-fortress',
    title: 'Крепостной холм',
    text: 'Пенза начинается с крепостной смотровой и памятника первопоселенцу. Здесь особенно хорошо видно, что город вырос на пограничной линии, а не вокруг промышленной гигантомании.',
    imageSrc: '/images/venues/penza/pamyatnik-pervoposelentsu.jpg',
    imageAlt: 'Памятник Первопоселенцу в Пензе',
    slugs: ['penza-pamyatnik-pervoposelentsu', 'penza-smotrovaya-staraya-penza', 'penza-spasskiy-kafedralnyy-sobor'],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'meyerhold-city',
    title: 'Мейерхольд и камерный театр',
    text: 'Для нестоличного города у Пензы необычно сильный театральный код: Мейерхольд, драмтеатр и спокойный культурный центр в шаговой доступности.',
    imageSrc: '/images/venues/penza/muzey-odnoy-kartiny-im-g-v-myasnikova.jpg',
    imageAlt: 'Культурная Пенза и музейный центр',
    slugs: ['penza-dom-meyerholda', 'penza-dramaticheskiy-teatr-lunacharskogo', 'penza-muzey-odnoy-kartiny-im-g-v-myasnikova'],
    target: 'places',
    badge: 'Искусство',
  },
  {
    id: 'quiet-moscow',
    title: 'Московская без спешки',
    text: 'Пешеходная Московская, кофейни, фонтан и размеренный провинциальный темп - одна из главных причин, почему Пенза ощущается человеческой и удобной.',
    imageSrc: '/images/venues/penza/penzenskaya-peshehodnaya-ulitsa-moskovskaya.jpg',
    imageAlt: 'Пешеходная улица Московская в Пензе',
    slugs: ['penza-penzenskaya-peshehodnaya-ulitsa-moskovskaya', 'penza-svetozvukovoy-fontan', 'penza-moskovskaya-gastro-kvartal'],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'lermontov-tarhany',
    title: 'Лермонтов и Тарханы',
    text: 'Пенза сильна тем, что городской центр легко продолжается в литературный day trip. Тарханы - не случайный музей области, а часть местной идентичности.',
    imageSrc: '/images/venues/penza/muzey-zapovednik-tarhany.jpg',
    imageAlt: 'Музей-заповедник Тарханы',
    slugs: ['penza-muzey-zapovednik-tarhany', 'penza-tarhany-day-trip', 'penza-literaturnyy-muzey'],
    target: 'mixed',
    badge: 'Архитектура',
  },
];

const TVER_WEATHER: CityWeatherFlavor = {
  latitude: 56.8587,
  longitude: 35.9176,
  timezone: 'Europe/Moscow',
  outdoorSlugs: [
    'tver-starovolzhskiy-most',
    'tver-naberezhnaya-stepana-razina',
    'tver-naberezhnaya-afanasiya-nikitina',
    'tver-gorodskoy-sad',
    'tver-peshehodnaya-trehsvyatskaya-ulitsa',
  ],
  indoorSlugs: [
    'tver-imperatorskiy-putevoy-dvorets',
    'tver-oblastnaya-kartinnaya-galereya',
    'tver-muzey-kozla',
    'tver-kraevedcheskiy-muzey',
    'tver-dramaticheskiy-teatr',
  ],
  outdoorCta: 'Отличная погода для Староволжского моста, набережных и Трехсвятской',
  indoorCtaOvercast: 'Сегодня пасмурно. Выбирайте Путевой дворец, галерею или Музей козла',
  indoorCtaRain: 'Сегодня дождь. Дворец, краеведческий музей и театр дадут Тверь не хуже прогулки',
  indoorCtaSnow: 'Сегодня снег. Компактный центр удобно смотреть через дворцы, музеи и Трехсвятскую',
};

const TVER_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Europe/Moscow',
  seasons: [
    { id: 'winter', months: [12, 1, 2], headline: 'Зима', body: 'Пушистый снег при комфортных -6...-10 °C. Главная фишка - тюбинг в парке «Яр» и праздничная Трехсвятская, а «Ласточка» из Москвы занимает около 1 часа 40 минут.' },
    { id: 'spring', months: [3, 4, 5], headline: 'Весна', body: 'В апреле Волга вскрывается ото льда, в мае город зеленеет при +15...+18 °C. Это лучшее время смотреть лучевой центр без летней пыли, а в середине мая стартует речная навигация.' },
    { id: 'summer', months: [6, 7, 8], headline: 'Лето', body: 'Мягкое лето около +24 °C, в июле бывает и за +30. Город уходит в тень Городского сада, на веранды Радищева и пляжи Волги и Тверцы. Удобно ехать в Торжок, на Селигер и к истоку Волги.' },
    { id: 'autumn', months: [9, 10, 11], headline: 'Осень', body: 'Сентябрь держит бабье лето около +15 °C, в октябре набережные и Императорский сад золотеют. Транзит спадает, билеты на экспрессы свободнее - идеальный музейный сезон.' },
  ],
  tabs: seasonTabs({
    spring:
      'Весной Тверь быстро зеленеет и особенно хорошо читается как лучевой город на холмах. Это удобный сезон для Путевого дворца, Трехсвятской и набережной Афанасия Никитина без летнего зноя.',
    summer:
      'Лето - самый открытый городской сезон: пляжи Волги и Тверцы, веранды бульвара Радищева и длинный свет для Торжка и Старицы. В жару прячьтесь в Городском саду и во дворце.',
    autumn:
      'Осень особенно идет Твери: золотеют набережные, спокойнее в центре и лучше сочетаются городской маршрут с выездом в Домотканово. Это главный музейный сезон между двумя столицами.',
    winter:
      'Зимой Тверь становится камерной. Лучше делать ставку на Путевой дворец, галерею и сытную купеческую кухню, а прогулки держать короткими по подсвеченной Трехсвятской.',
  }),
};

const TVER_SLIDES: CityIdentitySlide[] = [
  {
    id: 'starovolzhsky-bridge',
    title: 'Староволжский мост',
    text: 'Ажурный консольный мост 1900 года визуально близок к будапештским аркам. Это главный маркер Твери: связующее звено двух столиц и европейская инженерия над Волгой.',
    imageSrc: '/images/venues/tver/starovolzhskiy-most.jpg',
    imageAlt: 'Староволжский мост в Твери',
    slugs: ['tver-starovolzhskiy-most', 'tver-naberezhnaya-afanasiya-nikitina', 'tver-pamyatnik-afanasiyu-nikitinu'],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'travel-palace',
    title: 'Путевой дворец и тверское барокко',
    text: 'Резиденция Екатерины II на набережной задает парадный масштаб города. После пожара XVIII века Тверь застраивалась трезубцем радиальных улиц по петербургскому образцу.',
    imageSrc: '/images/venues/tver/imperatorskiy-putevoy-dvorets.jpg',
    imageAlt: 'Императорский путевой дворец в Твери',
    slugs: ['tver-imperatorskiy-putevoy-dvorets', 'tver-oblastnaya-kartinnaya-galereya', 'tver-spaso-preobrazhenskiy-sobor'],
    target: 'places',
    badge: 'Искусство',
  },
  {
    id: 'pozharskaya-goat',
    title: 'Пожарская котлета и тверской козел',
    text: 'Сочная котлета в сухарях, слойки с брусникой и ироничный культ козла держат гастрономический каркас города. Здесь принято кормить сытно и с историческим шлейфом.',
    imageSrc: '/images/venues/tver/naberezhnaya-stepana-razina.jpg',
    imageAlt: 'Набережная Степана Разина в Твери',
    slugs: ['tver-restoran-lyublin', 'tver-muzey-kozla', 'tver-peshehodnaya-trehsvyatskaya-ulitsa'],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'morozov-town',
    title: 'Морозовский городок',
    text: 'Текстильная мануфактура Абрама Морозова - город в городе из красного кирпича с готическими арками. Рабочие казармы здесь строили как замки, а не как бараки.',
    imageSrc: '/images/venues/tver/morozovskiy-gorodok-dvor-proletarki.jpg',
    imageAlt: 'Морозовский городок Двор Пролетарки',
    slugs: ['tver-morozovskiy-gorodok-dvor-proletarki', 'tver-gastroprostranstvo-fabrika', 'tver-kinoteatr-zvezda'],
    target: 'places',
    badge: 'Архитектура',
  },
];

const RYAZAN_WEATHER: CityWeatherFlavor = {
  latitude: 54.629,
  longitude: 39.742,
  timezone: 'Europe/Moscow',
  outdoorSlugs: [
    'ryazan-ulitsa-pochtovaya',
    'ryazan-lybedskiy-bulvar',
    'ryazan-smotrovaya-kremlevskiy-val',
    'ryazan-nizhniy-gorodskoy-sad',
    'ryazan-torgovyy-gorodok',
  ],
  indoorSlugs: [
    'ryazan-hudozhestvennyy-muzey-pozhalostina',
    'ryazan-muzey-istorii-ryazanskogo-ledentsa',
    'ryazan-muzey-usad-ba-akademika-i-p-pavlova',
    'ryazan-restoran-grafin',
    'ryazan-kofeynya-kofe-kult',
  ],
  outdoorCta: 'Отличная погода для Кремлевского вала, Почтовой и Лыбедского бульвара',
  indoorCtaOvercast: 'Сегодня пасмурно. Загляните в музей Пожалостина, леденец или «Кофе Культ»',
  indoorCtaRain: 'Сегодня дождь. Музей Пожалостина, усадьба Павлова или калинник в «Графине»',
  indoorCtaSnow: 'Сегодня снег. Музеи центра и русская печь после прогулки по Кремлю',
};

const RYAZAN_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Europe/Moscow',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Глубокий снег при комфортных -6...-10 °C. Главная фишка - комплекс «В некотором царстве» и лыжи в Солотче. Согреться помогают блюда из русской печи и локальные настойки.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'В апреле город сбрасывает снег, в мае цветет сирень при +15...+18 °C. Лучшее время для Константиново: Ока разливается. Навигация от Кремлевской пристани открывается в середине мая.',
    },
    {
      id: 'summer',
      months: [6, 7, 8],
      headline: 'Лето',
      body: 'Тепло и солнечно, около +25 °C. Весь город на верандах Почтовой и пляжах Оки и озер Солотчи. Долгие прогулки, палатки в Мещере и уличные фестивали.',
    },
    {
      id: 'autumn',
      months: [9, 10, 11],
      headline: 'Осень',
      body: 'Сентябрь - бабье лето около +15 °C, в октябре золотеют сосны Солотчи. Меньше транзита из Москвы, билеты на экспрессы свободны, отели дешевле. Удобный сезон для музеев.',
    },
  ],
  tabs: seasonTabs({
    spring:
      'В апреле Рязань стремительно сбрасывает снег, а в мае зацветает сирень при +15...+18 °C. Это лучшее время для поездки в Константиново на родину Есенина, когда Ока разливается, создавая бескрайнее водное море. Навигация на реке открывается в середине мая, запуская сезон речных круизов от Кремлевской пристани.',
    summer:
      'Лето здесь теплое и солнечное, средняя температура держится около +25 °C. Весь город перемещается на летние веранды пешеходной Почтовой улицы и пляжи Оки и озер Солотчи. Главный плюс сезона - идеальные условия для долгих пеших прогулок, загородных палаточных лагерей в Мещере и посещения уличных фестивалей.',
    autumn:
      'Сентябрь радует мягким бабьим летом (+15 °C), а в октябре сосновые леса Солотчи и парки города окрашиваются в золото. Логистически это золотой сезон: спадает волна транзитных туристов из Москвы, билеты на экспрессы свободны, а цены на гостиницы заметно снижаются. Отличное время для музейных туров.',
    winter:
      'Рязань засыпает глубоким снегом при комфортных -6...-10 °C. Главная фишка - посещение сказочного загородного комплекса «В некотором царстве» и катание на лыжах в курортном поселке Солотча. Логистика в историческом центре хорошая, а согреться помогают местные рестораны, предлагающие блюда из русской печи и локальные настойки.',
  }),
};

const RYAZAN_SLIDES: CityIdentitySlide[] = [
  {
    id: 'ryazan-kremlin',
    title: 'Рязанский Кремль',
    text: 'Древнерусский форпост на холме между Трубежем и Лыбедью. Кремль сохранил подлинные гражданские и церковные постройки XVII века, которые определяют силуэт города.',
    imageSrc: '/images/venues/ryazan/identity-symbol.jpg',
    imageAlt: 'Успенский собор Рязанского Кремля на высоком холме',
    slugs: [
      'ryazan-uspenskiy-sobor',
      'ryazan-dvorets-olega',
      'ryazan-smotrovaya-kremlevskiy-val',
    ],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'yesenin-meshchera',
    title: 'Поэзия Есенина и Мещера',
    text: 'Рязанская земля связана с Есениным, Окой и березовыми рощами Мещеры. Эта лирика чувствуется в Константиново, на пристани и в камерных театрах.',
    imageSrc: '/images/venues/ryazan/identity-art.jpg',
    imageAlt: 'Берег Оки и есенинский пейзаж у Константиново',
    slugs: ['ryazan-konstantinovo', 'ryazan-pamyatnik-eseninu', 'ryazan-solotcha'],
    target: 'mixed',
    badge: 'Искусство',
  },
  {
    id: 'karavaets-kalinnik',
    title: 'Караваец и калинник',
    text: 'Главные вкусы региона - тонкие блины каравайцы и пирог калинник из черемуховой муки с калиной. Современные шефы собирают из грибов, ягод и дичи Мещеры высокую кухню.',
    imageSrc: '/images/venues/ryazan/identity-gastro.jpg',
    imageAlt: 'Рязанские каравайцы и пирог калинник на столе',
    slugs: ['ryazan-restoran-grafin', 'ryazan-kafe-briosh', 'ryazan-kofeynya-kofe-kult'],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'saltykov-wood',
    title: 'Деревянное кружево Салтыкова-Щедрина',
    text: 'Квартал купеческих и мещанских домов конца XIX - начала XX века с резными наличниками. Рязань сквозь пожары сберегла дух старой купеческой улицы, соразмерной человеку.',
    imageSrc: '/images/venues/ryazan/identity-architecture.jpg',
    imageAlt: 'Деревянные дома с резными наличниками на улице Салтыкова-Щедрина',
    slugs: ['ryazan-dom-morozova', 'ryazan-dom-sester-hvoshchinskih', 'ryazan-dom-heraskovyh'],
    target: 'places',
    badge: 'Архитектура',
  },
];

const OMSK_WEATHER: CityWeatherFlavor = {
  latitude: 54.984,
  longitude: 73.372,
  timezone: 'Asia/Omsk',
  outdoorSlugs: [
    'omsk-tarskie-vorota',
    'omsk-lyubinskiy-prospekt-ulitsa-lenina',
    'omsk-omskaya-krepost',
    'omsk-rechnoy-vokzal',
    'omsk-ulitsa-chokana-valihanova',
  ],
  indoorSlugs: [
    'omsk-muzey-izobrazitelnyh-iskusstv-vrubelya',
    'omsk-ermitazh-sibir',
    'omsk-kraevedcheskiy-muzey',
    'omsk-skuratov',
    'omsk-gastrodvor-lyubinskiy',
  ],
  outdoorCta: 'Отличная погода для Любинского, Тарских ворот и заката у речного вокзала',
  indoorCtaOvercast: 'Сегодня пасмурно. Загляните к Врубелю, в Эрмитаж-Сибирь или Skuratov',
  indoorCtaRain: 'Сегодня дождь. Музей Врубеля, Эрмитаж-Сибирь или Гастродвор «Любинский»',
  indoorCtaSnow: 'Сегодня снег. Крепость, каток и сибирские настойки после Любинского',
};

const OMSK_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Asia/Omsk',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Сухой мороз -16...-20 °C и солнце, переносится легче влажного холода. Каток в Омской крепости и заснеженный Любинский. Центр чистят, согревают сибирские настойки и блюда из дичи.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'В апреле сходит снег, в мае +15...+18 °C. Лучшие прогулки без жары. Ледоход на Иртыше. С конца мая открывается навигация и яхты у речного вокзала.',
    },
    {
      id: 'summer',
      months: [6, 7, 8],
      headline: 'Лето',
      body: 'Жарко, сухо и солнечно, часто +30 °C. Пляжи Иртыша, Камергерские террасы и газоны парка Королева. Долгие закаты и выезды к пяти озерам Муромцевского района.',
    },
    {
      id: 'autumn',
      months: [9, 10, 11],
      headline: 'Осень',
      body: 'Сентябрь - сибирское бабье лето около +15 °C, в октябре золотеют старые площади и набережные. Меньше транзита, дешевле перелеты и отели. Удобный сезон для музеев.',
    },
  ],
  tabs: seasonTabs({
    spring:
      'В апреле Омск сбрасывает снег, в мае +15...+18 °C. Это лучшее время для пеших маршрутов по Любинскому и крепости без летнего зноя. Следите за ледоходом на Иртыше. С конца мая открывается речная навигация, у речного вокзала появляются яхты.',
    summer:
      'Лето жаркое, сухое и солнечное, часто +30 °C. Город уходит на пляжи Иртыша, Камергерские террасы и газоны парка Королева. Главный плюс сезона - длинные закаты и однодневные выезды к пяти известным озерам Муромцевского района.',
    autumn:
      'Сентябрь держит сибирское бабье лето около +15 °C, в октябре золотеют старые площади и набережные. Логистически это золотой сезон: меньше транзитных путешественников, дешевле перелеты и отели. Удобное время для музейных туров к Врубелю и в Эрмитаж-Сибирь.',
    winter:
      'Зима сухая и солнечная при -16...-20 °C, мороз переносится легче, чем кажется. Главная фишка - каток в Омской крепости и заснеженный Любинский проспект. Логистика центра хорошая, согревают сибирские настойки и блюда из дичи.',
  }),
};

const OMSK_SLIDES: CityIdentitySlide[] = [
  {
    id: 'tara-gates',
    title: 'Тарские ворота',
    text: 'Каменный портал крепости XVIII века и память о каторге Достоевского. Под аркой загадывают желание - визуальный маркер старого Омска.',
    imageSrc: '/images/venues/omsk/identity-symbol.jpg',
    imageAlt: 'Тарские ворота Омской крепости',
    slugs: ['omsk-tarskie-vorota', 'omsk-pamyatnik-dostoevskomu-nesuschiy-krest', 'omsk-omskaya-krepost'],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'siberian-punk',
    title: 'Сибирский панк и Егор Летов',
    text: 'Родина «Гражданской обороны»: текстовый авангард, гаражный рок, граффити, инди-бары и поэтические слэмы. Живая сцена - клуб «Викинг».',
    imageSrc: '/images/venues/omsk/identity-art.jpg',
    imageAlt: 'Омский панк и инди-дворы',
    slugs: ['omsk-viking-rok-klub', 'omsk-kamergerskiy-pereulok', 'omsk-pamyatnik-van-gogu'],
    target: 'places',
    badge: 'Искусство',
  },
  {
    id: 'lyubinsky-milk',
    title: 'Любинская сгущенка и сибирская дичь',
    text: 'Кабан, косуля, строганина из нельмы. Гостеприимство, большие порции, таежный мед или сгущенка к чаю в Гастродворе.',
    imageSrc: '/images/venues/omsk/identity-gastro.jpg',
    imageAlt: 'Сибирская дичь и сгущенка к чаю в Омске',
    slugs: ['omsk-gastrodvor-lyubinskiy', 'omsk-skuratov', 'omsk-restoran-senkevich'],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'kamergersky',
    title: 'Камергерский переулок',
    text: 'Петербургский дворик в Сибири: кирпич начала XX века и ресторанная улица за Московскими рядами.',
    imageSrc: '/images/venues/omsk/identity-architecture.jpg',
    imageAlt: 'Кирпичный Камергерский переулок в Омске',
    slugs: [
      'omsk-kamergerskiy-pereulok',
      'omsk-moskovskie-torgovye-ryady',
      'omsk-lyubinskiy-prospekt-ulitsa-lenina',
    ],
    target: 'places',
    badge: 'Архитектура',
  },
];

const CHELYABINSK_WEATHER: CityWeatherFlavor = {
  latitude: 55.1644,
  longitude: 61.4368,
  timezone: 'Asia/Yekaterinburg',
  outdoorSlugs: [
    'chelyabinsk-naberezhnaya-reki-miass',
    'chelyabinsk-aloe-pole',
    'chelyabinsk-park-kul-tury-i-otdyha-im-yu-a-gagarina',
    'chelyabinsk-elevator',
    'chelyabinsk-pamyatnik-osnovatelyam',
  ],
  indoorSlugs: [
    'chelyabinsk-gosudarstvennyy-istoricheskiy-muzey-yuzhnogo-urala',
    'chelyabinsk-muzey-izobrazitelnyh-iskusstv',
    'chelyabinsk-organnyy-zal-rodina',
    'chelyabinsk-restoran-kupecheskiy',
    'chelyabinsk-kofeynya-udobno',
  ],
  outdoorCta: 'Отличная погода для Кировки, набережной Миасса и Алого поля',
  indoorCtaOvercast: 'Сегодня пасмурно. Загляните к метеориту, в музей искусств или UDOBNO',
  indoorCtaRain: 'Сегодня дождь. Исторический музей, опера Глинки или «Купеческий»',
  indoorCtaSnow: 'Сегодня снег. Музеи центра и уральские пельмени после катка в парке Гагарина',
};

const CHELYABINSK_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Asia/Yekaterinburg',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Скрипучий снег, солнце и около -12...-16 °C. Сноуборд в «Солнечной долине» у города, большой каток в парке Гагарина среди старых сосен. Улицы чистят быстро, мороз пережидают в ресторанах уральской кухни.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'Апрель сбрасывает зиму, в мае +15...+18 °C. Лучшие долгие прогулки по историческим улицам и набережной Миасса без летней пыли и жары. В мае сап и лодки на Изумрудном карьере.',
    },
    {
      id: 'summer',
      months: [6, 7, 8],
      headline: 'Лето',
      body: 'Ярко, сухо, часто +30 °C, на Кировке плавится асфальт. Город уходит на террасы Белого рынка и пляжи Смолино, Тургояка, Увильдов. Лучшая логистика для однодневных выездов на Таганай и Зюраткуль.',
    },
    {
      id: 'autumn',
      months: [9, 10, 11],
      headline: 'Осень',
      body: 'В сентябре бабье лето около +15 °C, в октябре реликтовый городской бор золотеет. Самая дешевая логистика: меньше транзитных туристов к озерам, билеты на поезда и цены отелей падают.',
    },
  ],
  tabs: seasonTabs({
    spring:
      'Апрель сбрасывает зиму, к маю воздух прогревается до +15...+18 °C. Это лучшее время для долгих прогулок по историческим улицам и набережной Миасса без летней пыли и жары. В мае на Изумрудном (Смолинском) карьере открывают сап и лодки.',
    summer:
      'Лето яркое, сухое и часто жаркое, около +30 °C: на Кировке плавится асфальт. Город уходит на террасы Белого рынка и пляжи Смолино, Тургояка и Увильдов. Плюс сезона - самая удобная логистика однодневных выездов на Таганай и Зюраткуль.',
    autumn:
      'Сентябрь балует бабьим летом около +15 °C, в октябре реликтовый челябинский городской бор золотеет. Логистически это самый дешевый сезон: меньше транзитных туристов к озерам, свободнее билеты на поезда, отели заметно дешевле.',
    winter:
      'Скрипучий снег, яркое солнце и около -12...-16 °C. Главная фишка - сноуборд в «Солнечной долине» у города и большой каток в парке Гагарина среди старых сосен. Улицы чистят быстро, мороз пережидают в ресторанах уральской кухни.',
  }),
};

const CHELYABINSK_SLIDES: CityIdentitySlide[] = [
  {
    id: 'chelyabinsk-meteorite',
    title: 'Челябинский метеорит',
    text: 'Космический бренд и железный характер. Взорвался в 2013 году, крупнейший осколок больше 500 кг хранится в Историческом музее Южного Урала. Код города: неуязвимость, ирония и «космическая столица» Урала.',
    imageSrc: '/images/venues/chelyabinsk/identity-symbol.jpg',
    imageAlt: 'Осколок челябинского метеорита в Историческом музее Южного Урала',
    slugs: [
      'chelyabinsk-gosudarstvennyy-istoricheskiy-muzey-yuzhnogo-urala',
      'chelyabinsk-naberezhnaya-reki-miass',
      'chelyabinsk-skaz-ob-urale',
    ],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'tankograd',
    title: 'Танкоград и индустриальный гигантизм',
    text: 'Ансамбли ЧТЗ, танки ИС и КВ времен войны. Брутальная эстетика, конструктивизм, трудовая гордость; современное искусство в старых цехах.',
    imageSrc: '/images/venues/chelyabinsk/identity-art.jpg',
    imageAlt: 'Ансамбль ЧТЗ и танк у заводских корпусов Танкограда',
    slugs: [
      'chelyabinsk-chtz',
      'chelyabinsk-muzey-istorii-chtz',
      'chelyabinsk-pamyatnik-tankistam-dobrovoltsam',
    ],
    target: 'places',
    badge: 'Искусство',
  },
  {
    id: 'ural-pelmeni',
    title: 'Уральские пельмени и дичь',
    text: 'Три мяса, грузди в сметане, котлеты из лося, пироги со снытью. Современные рестораны пересобирают таежную ДНК: «Купеческий», «По Чесноку» и террасы Белого рынка.',
    imageSrc: '/images/venues/chelyabinsk/identity-gastro.jpg',
    imageAlt: 'Уральские пельмени и дичь в челябинском ресторане',
    slugs: [
      'chelyabinsk-restoran-kupecheskiy',
      'chelyabinsk-po-chesnoku',
      'chelyabinsk-belyy-rynok',
    ],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'gosbank-elevator',
    title: 'Элеватор Госбанка',
    text: 'Заброшенное 40-метровое зернохранилище начала XX века, похожее на готический замок. Индустриальный авангард Челябинска на Кирова, 130Р.',
    imageSrc: '/images/venues/chelyabinsk/identity-architecture.jpg',
    imageAlt: 'Элеватор Госбанка в Челябинске, похожий на готический замок',
    slugs: [
      'chelyabinsk-elevator',
      'chelyabinsk-gosbank',
      'chelyabinsk-dom-oblispolkoma',
    ],
    target: 'places',
    badge: 'Архитектура',
  },
];

const TYUMEN_WEATHER: CityWeatherFlavor = {
  latitude: 57.1522,
  longitude: 65.5272,
  timezone: 'Asia/Yekaterinburg',
  outdoorSlugs: [
    'tyumen-chetyrehurovnevaya-naberezhnaya',
    'tyumen-most-vlyublennyh',
    'tyumen-peshehodnaya-ulitsa-dzerzhinskogo',
    'tyumen-skver-sibirskih-koshek',
    'tyumen-tsvetnoy-bulvar',
  ],
  indoorSlugs: [
    'tyumen-muzey-slovtsova',
    'tyumen-tyumenskiy-dramaticheskiy-teatr',
    'tyumen-restoran-chum',
    'tyumen-chaynaya-nalichniki',
    'tyumen-znamenskiy-kafedral-nyy-sobor',
  ],
  outdoorCta: 'Отличная погода для четырех ярусов Туры, Моста Влюбленных и Дзержинского',
  indoorCtaOvercast: 'Сегодня пасмурно. Загляните в музей Словцова, Большой драматический или «Чум»',
  indoorCtaRain: 'Сегодня дождь. Словцов, чайная «Наличники» или строганина в «Чуме»',
  indoorCtaSnow: 'Сегодня снег. Музеи центра и термы Верхнего Бора после прогулки по ярусам',
};

const TYUMEN_WHEN_TO_GO: CityWhenToGoFlavor = {
  timeZone: 'Asia/Yekaterinburg',
  seasons: [
    {
      id: 'winter',
      months: [12, 1, 2],
      headline: 'Зима',
      body: 'Главный зимний курорт: -13...-17 °C и пушистый снег. Открытые термы +38...+40 в сосновом лесу (ЛетоЛето, Верхний Бор). Дороги чистят сразу, согреться помогают сибирские рестораны.',
    },
    {
      id: 'spring',
      months: [3, 4, 5],
      headline: 'Весна',
      body: 'В апреле Тура ломает лед, в мае +15...+18 °C. Лучшие прогулки по купеческим кварталам. В конце мая открывается речная навигация.',
    },
    {
      id: 'summer',
      months: [6, 7, 8],
      headline: 'Лето',
      body: 'Сухо и жарко, часто +30 °C. Гранитный променад Туры и террасы Дзержинского. Экопарки, лесные озера и Тобольск около 2-3 часов.',
    },
    {
      id: 'autumn',
      months: [9, 10, 11],
      headline: 'Осень',
      body: 'Сентябрь +14...+16 °C, бабье лето. В октябре парки золотеют. Золотая логистика: меньше термальных туристов, дешевле перелеты из Москвы и отели.',
    },
  ],
  tabs: seasonTabs({
    spring:
      'В апреле Тура ломает лед, к маю воздух прогревается до +15...+18 °C. Это лучшее время для прогулок по купеческим кварталам без летней жары. В конце мая открывается речная навигация.',
    summer:
      'Лето сухое и жаркое, часто около +30 °C. Гранитный променад четырех ярусов Туры и террасы Дзержинского работают допоздна. Плюс сезона - экопарки, лесные озера и выезд в Тобольск примерно за 2-3 часа.',
    autumn:
      'Сентябрь держит бабье лето +14...+16 °C, в октябре парки золотеют. Логистически это золотой сезон: меньше очередей на термах, перелеты из Москвы и отели дешевле.',
    winter:
      'Тюмень - главный зимний курорт: пушистый снег и -13...-17 °C. Открытые термальные бассейны +38...+40 в сосновом лесу (ЛетоЛето, Верхний Бор). Дороги чистят сразу, после прогулки согревают сибирские рестораны.',
  }),
};

const TYUMEN_SLIDES: CityIdentitySlide[] = [
  {
    id: 'tura-quay',
    title: 'Четыре яруса Туры',
    text: 'Единственная в России четырехярусная гранитная набережная: перепад около 20 м и бронзовые рельефы Сибири. Масштаб нефтяной столицы на реке.',
    imageSrc: '/images/venues/tyumen/identity-symbol.jpg',
    imageAlt: 'Четырехъярусная гранитная набережная Туры в Тюмени',
    slugs: [
      'tyumen-chetyrehurovnevaya-naberezhnaya',
      'tyumen-most-vlyublennyh',
      'tyumen-amfiteatr-nizhney-naberezhnoy',
    ],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'wooden-lace',
    title: 'Тюменская резьба и купеческое кружево',
    text: 'Глухая и пропильная корабельная резьба: наличники как триумфальные арки на деревянных домах Арбата.',
    imageSrc: '/images/venues/tyumen/identity-art.jpg',
    imageAlt: 'Резные наличники деревянного купеческого дома в Тюмени',
    slugs: [
      'tyumen-peshehodnaya-ulitsa-dzerzhinskogo',
      'tyumen-dom-burkova',
      'tyumen-chaynaya-nalichniki',
    ],
    target: 'places',
    badge: 'Искусство',
  },
  {
    id: 'stroganina-kvartet',
    title: 'Строганина, дичь и конфеты «Квартет»',
    text: 'Нельма и муксун, лось и медведь, таежные ягоды с кедровым молоком. Сибирский стол, а не столичный фастфуд.',
    imageSrc: '/images/venues/tyumen/identity-gastro.jpg',
    imageAlt: 'Строганина и сибирская дичь на столе в Тюмени',
    slugs: ['tyumen-restoran-chum', 'tyumen-restoran-poseydon', 'tyumen-chaynaya-nalichniki'],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'dzerzhinskogo-arbat',
    title: 'Пешеходная Дзержинского',
    text: 'Тюменский Арбат: музей деревянного зодчества под открытым небом, террасы и резное кружево.',
    imageSrc: '/images/venues/tyumen/identity-architecture.jpg',
    imageAlt: 'Пешеходная улица Дзержинского с деревянными купеческими домами',
    slugs: [
      'tyumen-peshehodnaya-ulitsa-dzerzhinskogo',
      'tyumen-dom-burkova',
      'tyumen-gostinyy-dvor',
    ],
    target: 'places',
    badge: 'Архитектура',
  },
];

export const CITY_HUB_LOCAL_FLAVOR: Record<string, CityHubLocalFlavor> = {
  perm: {
    identityHeading: 'Чем уникальна Пермь',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(PERM_SLIDES),
    slides: PERM_SLIDES,
    weather: PERM_WEATHER,
    whenToGo: PERM_WHEN_TO_GO,
  },
  moscow: {
    identityHeading: 'Чем уникальна Москва',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(MSK_SLIDES),
    slides: MSK_SLIDES,
    weather: MSK_WEATHER,
    whenToGo: MSK_WHEN_TO_GO,
  },
  'saint-petersburg': {
    identityHeading: 'Чем уникален Санкт-Петербург',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(SPB_SLIDES),
    slides: SPB_SLIDES,
    weather: SPB_WEATHER,
    whenToGo: SPB_WHEN_TO_GO,
  },
  kaliningrad: {
    identityHeading: 'Чем уникален Калининград',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(KGD_SLIDES),
    slides: KGD_SLIDES,
    weather: KGD_WEATHER,
    whenToGo: KGD_WHEN_TO_GO,
  },
  'nizhny-novgorod': {
    identityHeading: 'Чем уникален Нижний Новгород',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(NN_SLIDES),
    slides: NN_SLIDES,
    weather: NN_WEATHER,
    whenToGo: NN_WHEN_TO_GO,
  },
  ekaterinburg: {
    identityHeading: 'Чем уникален Екатеринбург',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(EKB_SLIDES),
    slides: EKB_SLIDES,
    weather: EKB_WEATHER,
    whenToGo: EKB_WHEN_TO_GO,
  },
  kazan: {
    identityHeading: 'Чем уникальна Казань',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(KAZAN_SLIDES),
    slides: KAZAN_SLIDES,
    weather: KAZAN_WEATHER,
    whenToGo: KAZAN_WHEN_TO_GO,
  },
  samara: {
    identityHeading: 'Чем уникальна Самара',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(SAMARA_SLIDES),
    slides: SAMARA_SLIDES,
    weather: SAMARA_WEATHER,
    whenToGo: SAMARA_WHEN_TO_GO,
  },
  krasnodar: {
    identityHeading: 'Чем уникален Краснодар',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(KRASNODAR_SLIDES),
    slides: KRASNODAR_SLIDES,
    weather: KRASNODAR_WEATHER,
    whenToGo: KRASNODAR_WHEN_TO_GO,
  },
  krasnoyarsk: {
    identityHeading: 'Чем уникален Красноярск',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(KRASNOYARSK_SLIDES),
    slides: KRASNOYARSK_SLIDES,
    weather: KRASNOYARSK_WEATHER,
    whenToGo: KRASNOYARSK_WHEN_TO_GO,
  },
  novosibirsk: {
    identityHeading: 'Чем уникален Новосибирск',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(NOVOSIBIRSK_SLIDES),
    slides: NOVOSIBIRSK_SLIDES,
    weather: NOVOSIBIRSK_WEATHER,
    whenToGo: NOVOSIBIRSK_WHEN_TO_GO,
  },
  voronezh: {
    identityHeading: 'Чем уникален Воронеж',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(VORONEZH_SLIDES),
    slides: VORONEZH_SLIDES,
    weather: VORONEZH_WEATHER,
    whenToGo: VORONEZH_WHEN_TO_GO,
  },
  'rostov-na-donu': {
    identityHeading: 'Чем уникален Ростов-на-Дону',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(ROSTOV_NA_DONU_SLIDES),
    slides: ROSTOV_NA_DONU_SLIDES,
    weather: ROSTOV_NA_DONU_WEATHER,
    whenToGo: ROSTOV_NA_DONU_WHEN_TO_GO,
  },
  penza: {
    identityHeading: 'Чем уникальна Пенза',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(PENZA_SLIDES),
    slides: PENZA_SLIDES,
    weather: PENZA_WEATHER,
    whenToGo: PENZA_WHEN_TO_GO,
  },
  tver: {
    identityHeading: 'Чем уникальна Тверь',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(TVER_SLIDES),
    slides: TVER_SLIDES,
    weather: TVER_WEATHER,
    whenToGo: TVER_WHEN_TO_GO,
  },
  ryazan: {
    identityHeading: 'Чем уникальна Рязань',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(RYAZAN_SLIDES),
    slides: RYAZAN_SLIDES,
    weather: RYAZAN_WEATHER,
    whenToGo: RYAZAN_WHEN_TO_GO,
  },
  ufa: {
    identityHeading: 'Чем уникальна Уфа',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(UFA_SLIDES),
    slides: UFA_SLIDES,
    weather: UFA_WEATHER,
    whenToGo: UFA_WHEN_TO_GO,
  },
  omsk: {
    identityHeading: 'Чем уникален Омск',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(OMSK_SLIDES),
    slides: OMSK_SLIDES,
    weather: OMSK_WEATHER,
    whenToGo: OMSK_WHEN_TO_GO,
  },
  chelyabinsk: {
    identityHeading: 'Чем уникален Челябинск',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(CHELYABINSK_SLIDES),
    slides: CHELYABINSK_SLIDES,
    weather: CHELYABINSK_WEATHER,
    whenToGo: CHELYABINSK_WHEN_TO_GO,
  },
  tyumen: {
    identityHeading: 'Чем уникальна Тюмень',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(TYUMEN_SLIDES),
    slides: TYUMEN_SLIDES,
    weather: TYUMEN_WEATHER,
    whenToGo: TYUMEN_WHEN_TO_GO,
  },
};

export function resolveCityLocalFlavor(slug: string | null | undefined): CityHubLocalFlavor | null {
  const normalized = normalizeCityHubSlug(slug);
  if (!normalized) return null;
  return CITY_HUB_LOCAL_FLAVOR[normalized] || null;
}

export function cityHasWeatherWidget(slug: string | null | undefined): boolean {
  return Boolean(resolveCityLocalFlavor(slug)?.weather);
}

export function cityHasWhenToGo(slug: string | null | undefined): boolean {
  return Boolean(resolveCityLocalFlavor(slug)?.whenToGo?.seasons?.length);
}

export function calendarMonthInTimeZone(timeZone: string, at: Date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, month: 'numeric' }).formatToParts(at);
    const month = Number(parts.find((part) => part.type === 'month')?.value);
    if (month >= 1 && month <= 12) return month;
  } catch {
    // Invalid TZ: fall through to UTC month.
  }
  return at.getUTCMonth() + 1;
}

export function pickWhenToGoSeason(
  flavor: CityWhenToGoFlavor,
  month: number,
): CityWhenToGoSeason | null {
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  return flavor.seasons.find((season) => season.months.includes(month)) || null;
}

export function resolveWhenToGoBlurb(
  slug: string | null | undefined,
  at: Date = new Date(),
): CityWhenToGoBlurb | null {
  const flavor = resolveCityLocalFlavor(slug)?.whenToGo;
  if (!flavor) return null;
  const month = calendarMonthInTimeZone(flavor.timeZone, at);
  const season = pickWhenToGoSeason(flavor, month);
  const body = season?.body?.trim();
  if (!season || !body) return null;
  return {
    seasonId: season.id,
    month,
    monthLabel: MONTH_TITLE[month] || '',
    headline: season.headline,
    body,
    tab: tabForSeasonId(season.id),
  };
}

/** Copy under season tabs: current month wins on the active season, otherwise the tab body. */
export function seasonGuideForTab(
  whenToGo: CityWhenToGoFlavor | null | undefined,
  current: CityWhenToGoBlurb | null | undefined,
  tabId: CitySeasonTabId,
): { body: string; nowLabel: string | null; isCurrent: boolean } {
  const tab = whenToGo?.tabs.find((item) => item.id === tabId) || null;
  const isCurrent = Boolean(current && current.tab === tabId);
  const body = (isCurrent ? current?.body : tab?.body)?.trim() || tab?.body?.trim() || '';
  const nowLabel =
    isCurrent && current
      ? `${current.headline}${current.monthLabel ? ` (${current.monthLabel})` : ''}`
      : null;
  return { body, nowLabel, isCurrent };
}

export function cityIdentitySlides(slug: string | null | undefined): CityIdentitySlide[] {
  const slides = resolveCityLocalFlavor(slug)?.slides;
  return Array.isArray(slides) ? slides.filter((slide) => slide.slugs.length > 0) : [];
}

export function cityIdentityTags(slug: string | null | undefined): CityIdentityTag[] {
  const tags = resolveCityLocalFlavor(slug)?.tags;
  return Array.isArray(tags) ? tags.filter((tag) => tag.slugs.length > 0) : [];
}

export function placeSlugKey(
  place: Pick<CityMustSeeItem, 'venueSlug' | 'locationSlug'> | null | undefined,
): string {
  const venue = String(place?.venueSlug || '').trim().toLowerCase();
  if (venue) return venue;
  return String(place?.locationSlug || '').trim().toLowerCase();
}

function suburbNameFocusKeys(name: string): string[] {
  const keys: string[] = [];
  const full = transliterateSlug(name);
  if (full) keys.push(full);
  for (const part of String(name || '').split(/[/]/)) {
    const slug = transliterateSlug(part);
    if (slug) keys.push(slug);
  }
  return keys;
}

export function suburbMatchesSlugs(suburb: CitySuburbItem, slugs: string[]): boolean {
  const want = new Set(slugs.map((slug) => String(slug || '').trim().toLowerCase()).filter(Boolean));
  if (!want.size) return false;
  const keys = [placeSlugKey(suburb), ...suburbNameFocusKeys(suburb.name)];
  for (const poi of suburb.places || []) {
    keys.push(placeSlugKey(poi));
  }
  return keys.some((key) => key && want.has(key));
}

function asMustSee(place: CityMustSeeItem | CitySuburbItem | CitySuburbPlace): CityMustSeeItem {
  return {
    name: place.name,
    desc: String(place.desc || ''),
    href: place.href,
    venueSlug: place.venueSlug,
    locationSlug: place.locationSlug,
    dayRouteId: 'dayRouteId' in place ? place.dayRouteId : undefined,
    latitude: place.latitude,
    longitude: place.longitude,
    address: 'address' in place ? place.address : undefined,
    transitTip: 'transitTip' in place ? place.transitTip : undefined,
    visitMinutes: 'visitMinutes' in place ? place.visitMinutes : undefined,
  };
}

/**
 * Resolve tag/weather slugs to real cityInfo rows (mustSee, suburb root, nested POI).
 * Drops unknown slugs instead of inventing places.
 */
export function collectPlacesBySlugs(
  slugs: string[],
  mustSee: CityMustSeeItem[] = [],
  suburbs: CitySuburbItem[] = [],
): CityMustSeeItem[] {
  const ordered = slugs.map((slug) => String(slug || '').trim().toLowerCase()).filter(Boolean);
  if (!ordered.length) return [];
  const bySlug = new Map<string, CityMustSeeItem>();

  const remember = (place: CityMustSeeItem | CitySuburbItem | CitySuburbPlace) => {
    const key = placeSlugKey(place);
    if (!key || bySlug.has(key)) return;
    bySlug.set(key, asMustSee(place));
  };

  for (const place of mustSee) remember(place);
  for (const suburb of suburbs) {
    remember(suburb);
    for (const poi of suburb.places || []) remember(poi);
  }

  const out: CityMustSeeItem[] = [];
  const seen = new Set<string>();
  for (const slug of ordered) {
    const place = bySlug.get(slug);
    if (!place) continue;
    const key = placeSlugKey(place) || slug;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(place);
  }
  return out;
}

export function focusFromIdentitySlide(slide: CityIdentitySlide): CityPlaceFocus {
  return {
    id: slide.id,
    label: slide.title,
    slugs: slide.slugs,
    scrollTo: slide.target === 'suburbs' ? 'suburbs' : 'places',
  };
}

export function focusFromIdentityTag(tag: CityIdentityTag): CityPlaceFocus {
  return {
    id: tag.id,
    label: tag.hashtag,
    slugs: tag.slugs,
    scrollTo: tag.target === 'suburbs' ? 'suburbs' : 'places',
  };
}

export function focusFromWeatherCta(
  mood: 'sunny' | 'indoor',
  weather: CityWeatherFlavor,
  label: string,
): CityPlaceFocus {
  return {
    id: mood === 'sunny' ? 'weather-outdoor' : 'weather-indoor',
    label,
    slugs: mood === 'sunny' ? weather.outdoorSlugs : weather.indoorSlugs,
    scrollTo: 'places',
  };
}
