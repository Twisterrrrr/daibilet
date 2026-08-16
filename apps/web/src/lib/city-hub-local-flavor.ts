/**
 * Per-city hub extras: identity tags, weather coords, indoor/outdoor CTA maps,
 * seasonal «когда ехать» copy. Keep out of cityInfo (coords/mustSee) so other
 * agents can edit geo without merge fights.
 *
 * Tourist hubs with weather+seasons+identity: Perm, Moscow, SPB, Kaliningrad, NN,
 * Ekaterinburg, Kazan, Samara, Krasnodar, Krasnoyarsk, Novosibirsk.
 */

import { normalizeCityHubSlug } from './city-hub-config.ts';
import type { CityMustSeeItem, CitySuburbItem, CitySuburbPlace } from './cityInfo.ts';

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

export function suburbMatchesSlugs(suburb: CitySuburbItem, slugs: string[]): boolean {
  const want = new Set(slugs.map((slug) => String(slug || '').trim().toLowerCase()).filter(Boolean));
  if (!want.size) return false;
  const keys = [placeSlugKey(suburb)];
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
