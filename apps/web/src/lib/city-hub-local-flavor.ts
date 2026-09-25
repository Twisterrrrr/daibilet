/**
 * Per-city hub extras: identity tags, weather coords, indoor/outdoor CTA maps,
 * seasonal «когда ехать» copy. Keep out of cityInfo (coords/mustSee) so other
 * agents can edit geo without merge fights.
 *
 * Tourist hubs with weather+seasons+identity: Perm, Moscow, SPB, Kaliningrad, NN,
 * Ekaterinburg, Kazan, Samara, Krasnodar, Krasnoyarsk, Novosibirsk, Voronezh, Ufa, Omsk, Chelyabinsk, Tyumen, Rostov-on-Don, Penza, Tver.
 */

import {
  SOCHI_SLIDES,
  SOCHI_WEATHER,
} from './_flavor-sochi.fragment.ts';
import {
  SARATOV_SLIDES,
  SARATOV_WEATHER,
} from './_flavor-saratov.fragment.ts';
import {
  YAROSLAVL_SLIDES,
  YAROSLAVL_WEATHER,
} from './_flavor-yaroslavl.fragment.ts';
import {
  VOLGOGRAD_SLIDES,
  VOLGOGRAD_WEATHER,
} from './_flavor-volgograd.fragment.ts';
import {
  BARNAUL_WHEN_TO_GO,
  CHELYABINSK_WHEN_TO_GO,
  EKB_WHEN_TO_GO,
  KAZAN_WHEN_TO_GO,
  KGD_WHEN_TO_GO,
  KRASNODAR_WHEN_TO_GO,
  KRASNOYARSK_WHEN_TO_GO,
  MSK_WHEN_TO_GO,
  NN_WHEN_TO_GO,
  NOVOSIBIRSK_WHEN_TO_GO,
  OMSK_WHEN_TO_GO,
  PENZA_WHEN_TO_GO,
  PERM_WHEN_TO_GO,
  ROSTOV_NA_DONU_WHEN_TO_GO,
  RYAZAN_WHEN_TO_GO,
  SAMARA_WHEN_TO_GO,
  SARATOV_WHEN_TO_GO,
  SMOLENSK_WHEN_TO_GO,
  SOCHI_WHEN_TO_GO,
  SPB_WHEN_TO_GO,
  TULA_WHEN_TO_GO,
  TVER_WHEN_TO_GO,
  TYUMEN_WHEN_TO_GO,
  UFA_WHEN_TO_GO,
  VOLGOGRAD_WHEN_TO_GO,
  VORONEZH_WHEN_TO_GO,
  YAROSLAVL_WHEN_TO_GO,
} from './when-to-go-packs.ts';
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
};

/** Macro season pills for the «Когда ехать» tablist (bodies come from seasons). */
export const CITY_SEASON_TABS: CitySeasonTab[] = [
  { id: 'spring', label: 'Весна' },
  { id: 'summer', label: 'Лето' },
  { id: 'autumn', label: 'Осень' },
  { id: 'winter', label: 'Зима' },
];

export type CityWhenToGoVerdictLine = {
  label: string;
  value: string;
};

export type CityWhenToGoFlavor = {
  timeZone: string;
  /** Compact goal answers - not a rewrite of seasons. */
  verdict: CityWhenToGoVerdictLine[];
  seasons: CityWhenToGoSeason[];
};

export type CityWhenToGoBlurb = {
  seasonId: CityWhenToGoSeasonId;
  month: number;
  monthLabel: string;
  headline: string;
  body: string;
  /** Derived coarse season for legacy callers. */
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
  outdoorCta: 'Сухо: Кама и набережная - ботинки останутся чистыми',
  indoorCtaOvercast: 'Серое небо: галерея или Театр-Театр, пока улица ждёт',
  indoorCtaRain: 'Дождь: музеи и кафе центра короткими перебежками',
  indoorCtaSnow: 'Снег: тёплые залы; к Каме только в протекторе',
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
  outdoorCta: 'Без дождя: Нева или Дворцовая - зонт можно оставить в гостинице',
  indoorCtaOvercast: 'Пасмурно: Эрмитаж без летней толпы или пышки на Конюшенной',
  indoorCtaRain: 'Дождь: Эрмитаж и пышечная - улицу режьте короткими кусками',
  indoorCtaSnow: 'Снег: тёплые залы; на набережной влажный холод сильнее градусника',
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
  outdoorCta: 'Без дождя: остров Канта или коса - на берегу всё равно ветровка',
  indoorCtaOvercast: 'Серо: Музей янтаря, собор или Музей Мирового океана',
  indoorCtaRain: 'Дождь с залива: янтарь, собор и короткий крытый маршрут по центру',
  indoorCtaSnow: 'Редкий снег: те же музеи - улицу держите короткой из-за сырости',
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
  outdoorCta: 'Ясно: кремль, канатка или закат на Фёдоровского',
  indoorCtaOvercast: 'Пасмурно: Арсенал ГЦСИ или усадьба Рукавишниковых',
  indoorCtaRain: 'Дождь: Арсенал и усадьбы - Чкаловскую лестницу лучше не штурмовать',
  indoorCtaSnow: 'Снег: indoor по Арсеналу; на лестнице и валах - протектор',
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
  outdoorCta: 'Сухо: Зарядье или Горького - зонт можно не таскать',
  indoorCtaOvercast: 'Серо: Третьяковка или Пушкинский вместо гонки по паркам',
  indoorCtaRain: 'Ливень: музеи и театр; парки спокойно перенесите',
  indoorCtaSnow: 'Снег: галереи; на Красной площади ветер с реки режет сильнее прогноза',
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
    imageSrc: '/images/venues/nizhny-novgorod/nn-street-art-gallery.jpg',
    imageAlt: 'Стрит-арт на деревянном доме в Нижнем Новгороде',
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
  outdoorCta: 'Сухо: Плотинка, набережная или смотровая «Высоцкого»',
  indoorCtaOvercast: 'Серо: Ельцин Центр или «Паштет» вместо длинной улицы',
  indoorCtaRain: 'Дождь: Ельцин Центр и крытый центр; Плотинку оставьте на сухое окно',
  indoorCtaSnow: 'Снег: Ельцин Центр или термы Уктуса после короткой прогулки',
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
  outdoorCta: 'Сухо: Кремль, Баумана и набережные - зонт можно не брать',
  indoorCtaOvercast: 'Пасмурно: музеи Кремля, Дом Ушковой или «Тюбетей»',
  indoorCtaRain: 'Дождь: Эрмитаж-Казань, Национальный музей или «Туган Авылым»',
  indoorCtaSnow: 'Снег: музеи Кремля и Камал; после улицы - горячая выпечка',
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
  outdoorCta: 'Ясно: набережная, Арбат или площадь Славы',
  indoorCtaOvercast: 'Пасмурно: Бункер Сталина, Музей Модерна или ракета «Союз»',
  indoorCtaRain: 'Дождь: бункер, фабрика-кухня ЗИМ или «На Дне» - улицу режьте коротко',
  indoorCtaSnow: 'Снег: музеи и бункер; после холода - «Жигулёвское» у завода',
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
  outdoorCta: 'Сухо: парк Галицкого, Красная или набережная',
  indoorCtaOvercast: 'Пасмурно: музеи, «Борщberry» или кластер «Колос»',
  indoorCtaRain: 'Ливень: Фелицын, Коваленко или фудмаркет - улицу не геройствуйте',
  indoorCtaSnow: 'Сыро и холодно: музеи, борщ и тёплые гастро-залы',
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
  outdoorCta: 'Ясно: Столбы, Караульная гора или набережная Енисея',
  indoorCtaOvercast: 'Пасмурно: усадьба Сурикова, «Площадь Мира» или «Тунгуска»',
  indoorCtaRain: 'Дождь: музеи, БКЗ и сибирская кухня вместо троп на Столбах',
  indoorCtaSnow: 'Снег: «Бобровый лог», музеи и горячая еда после холода',
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
  outdoorCta: 'Сухо: Михайловская набережная, Академгородок или Заельцовский бор',
  indoorCtaOvercast: 'Пасмурно: НОВАТ, Художественный или «#СибирьСибирь»',
  indoorCtaRain: 'Дождь: музеи и театры - бор оставьте на сухое',
  indoorCtaSnow: 'Снег: НОВАТ и музеи; после улицы - горячая сибирская кухня',
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
    title: 'Конструктивизм и Стоквартирный дом',
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
  outdoorCta: 'Ясно: Адмиралтейская, «Алые паруса» или прогулка к Петру',
  indoorCtaOvercast: 'Пасмурно: Крамской, Краеведческий или «Промка»',
  indoorCtaRain: 'Дождь: Крамской, Камерный или стейкхаус «El Chico»',
  indoorCtaSnow: 'Снег: музеи центра; после улицы к Петру - тёплый стейкхаус',
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
  outdoorCta: 'Сухо: Салават Юлаев, Арт-квадрат или набережная Белой',
  indoorCtaOvercast: 'Пасмурно: Нестеров, Национальный музей или «Kumpan Cafe»',
  indoorCtaRain: 'Дождь: Нестеров, опера или кыстыбыи в Aibat Hallyar',
  indoorCtaSnow: 'Снег: музеи; после Салавата - кофейня с башкирским мёдом',
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
  outdoorCta: 'Ясно: Дон, Пушкинская или смотровая на Седова',
  indoorCtaOvercast: 'Пасмурно: краеведческий, музей на Пушкинской или рынок',
  indoorCtaRain: 'Дождь: музеи центра, театр Горького или длинный обед в «Онегин Даче»',
  indoorCtaSnow: 'Ветрено и сыро: музеи и театр выигрывают у набережной',
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
  outdoorCta: 'Сухо: крепостной холм, Московская или парк Белинского',
  indoorCtaOvercast: 'Пасмурно: музей одной картины, галерея или Дом Мейерхольда',
  indoorCtaRain: 'Дождь: музеи и драмтеатр - компактный центр читается и так',
  indoorCtaSnow: 'Снег: короткий indoor-маршрут по музеям и театру',
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
  outdoorCta: 'Ясно: Староволжский мост, набережные или Трёхсвятская',
  indoorCtaOvercast: 'Пасмурно: Путевой дворец, галерея или Музей козла',
  indoorCtaRain: 'Дождь: дворец, краеведческий и театр вместо длинной набережной',
  indoorCtaSnow: 'Снег: дворцы и музеи; Трёхсвятскую - короткими кусками',
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
  outdoorCta: 'Сухо: Кремлёвский вал, Почтовая или Лыбедский бульвар',
  indoorCtaOvercast: 'Пасмурно: Пожалостин, музей леденца или «Кофе Культ»',
  indoorCtaRain: 'Дождь: Пожалостин, усадьба Павлова или калинник в «Графине»',
  indoorCtaSnow: 'Снег: музеи центра; после Кремля - русская печь',
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

const TULA_WEATHER: CityWeatherFlavor = {
  latitude: 54.1931,
  longitude: 37.6173,
  timezone: 'Europe/Moscow',
  outdoorSlugs: [
    'tula-kazanskaya-naberezhnaya',
    'tula-ulitsa-metallistov',
    'tula-tul-skiy-kreml',
    'tula-smotrovaya-proletarskoy-naberezhnoy',
    'tula-park-belousova',
  ],
  indoorSlugs: [
    'tula-muzey-oruzhiya-shlem',
    'tula-muzey-tulskie-samovary',
    'tula-muzey-tul-skiy-pryanik',
    'tula-tvorcheskiy-industrial-nyy-klaster-oktava',
    'tula-restoran-kultura',
  ],
  outdoorCta: 'Ясно: Кремль, Казанская набережная или Металлистов',
  indoorCtaOvercast: 'Пасмурно: Музей оружия, самовары или «Октава»',
  indoorCtaRain: 'Дождь: Музей оружия, пряник или обед в «Культуре»',
  indoorCtaSnow: 'Снег: музеи центра; после Кремля - чай с пряником',
};

const SMOLENSK_WEATHER: CityWeatherFlavor = {
  latitude: 54.7826,
  longitude: 32.0453,
  timezone: 'Europe/Moscow',
  outdoorSlugs: [
    'smolensk-smolenskaya-krepostnaya-stena',
    'smolensk-lopatinskiy-sad',
    'smolensk-sad-blone',
    'smolensk-naberezhnaya-vladimira-krestitelya',
    'smolensk-smotrovaya-na-sobornom-holme',
  ],
  indoorSlugs: [
    'smolensk-svyato-uspenskiy-kafedralnyy-sobor',
    'smolensk-gromovaya-bashnya',
    'smolensk-smolenskaya-hudozhestvennaya-galereya',
    'smolensk-istoricheskiy-muzey',
    'smolensk-kafe-smolenskiy-konfekt',
  ],
  outdoorCta: 'Сухо: крепостная стена, Лопатинский сад или набережная Днепра',
  indoorCtaOvercast: 'Пасмурно: Громовая башня, галерея или Успенский собор',
  indoorCtaRain: 'Дождь: музеи центра, «Смоленский конфект» или филармония',
  indoorCtaSnow: 'Снег: валы скользкие - после стены кофейни у Блонье',
};



const TULA_SLIDES: CityIdentitySlide[] = [
  {
    id: 'tula-weapons',
    title: 'Оружейное мастерство и стальной характер',
    text: 'ДНК Тулы ковалось веками у раскаленных горнов. Город возвел оборонное дело в культ: от кремлевских башен до футуристического Музея оружия в форме шлема.',
    imageSrc: '/images/venues/tula/muzey-oruzhiya-shlem.jpg',
    imageAlt: 'Тульский музей оружия в форме богатырского шлема',
    slugs: ['tula-muzey-oruzhiya-shlem', 'tula-pamyatnik-levshe', 'tula-pamyatnik-petru-i'],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'tula-tolstoy',
    title: 'Лев Толстой и вселенская философия',
    text: 'Тульская земля - колыбель великой русской литературы. Дух Ясной Поляны формирует культуру созерцания, поиска правды и близости к корням.',
    imageSrc: '/images/venues/tula/muzey-usad-ba-l-n-tolstogo-yasnaya-polyana.jpg',
    imageAlt: 'Усадьба Льва Толстого в Ясной Поляне',
    slugs: [
      'tula-muzey-usad-ba-l-n-tolstogo-yasnaya-polyana',
      'tula-yasnaya-polyana-dom-muzey',
      'tula-yasnaya-polyana-mogila',
    ],
    target: 'mixed',
    badge: 'Искусство',
  },
  {
    id: 'tula-pryanik',
    title: 'Пряничный бренд и чайные традиции',
    text: 'Вкус Тулы - смесь терпкого меда, пряностей и дымка из самовара. Печатный пряник и самоварное чаепитие стали визитной карточкой России.',
    imageSrc: '/images/venues/tula/identity-gastro.jpg',
    imageAlt: 'Тульский печатный пряник и самовар на столе',
    slugs: [
      'tula-skulptura-tulskiy-pryanik',
      'tula-muzey-tul-skiy-pryanik',
      'tula-muzey-tulskie-samovary',
    ],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'tula-kreml-oktava',
    title: 'Краснокирпичный Кремль и «Октава»',
    text: 'Архитектурный код города - стык древней истории и постиндустриального урбанизма. Оборонительные стены соседствуют с креативными пространствами из стекла и бетона.',
    imageSrc: '/images/venues/tula/tul-skiy-kreml.jpg',
    imageAlt: 'Стены Тульского кремля с Успенским собором',
    slugs: [
      'tula-tul-skiy-kreml',
      'tula-tvorcheskiy-industrial-nyy-klaster-oktava',
      'tula-ulitsa-metallistov',
    ],
    target: 'places',
    badge: 'Архитектура',
  },
];

const SMOLENSK_SLIDES: CityIdentitySlide[] = [
  {
    id: 'smolensk-wall',
    title: 'Смоленская крепостная стена',
    text: '«Ожерелье всея Руси» - каменный щит города. Прясла и башни задают ритм прогулок и силуэт холмов.',
    imageSrc: '/images/venues/smolensk/identity-symbol.jpg',
    imageAlt: 'Смоленская крепостная стена и башни',
    slugs: [
      'smolensk-smolenskaya-krepostnaya-stena',
      'smolensk-gromovaya-bashnya',
      'smolensk-bashnya-veselukha',
    ],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'smolensk-glinka-tenisheva',
    title: 'Наследие Глинки и Тенишевой',
    text: 'Музыка Новоспасского и художественная колония Талашкина - две линии смоленской культуры, которые слышны до сих пор.',
    imageSrc: '/images/venues/smolensk/identity-art.jpg',
    imageAlt: 'Наследие Глинки и Тенишевой в Смоленске',
    slugs: [
      'smolensk-pamyatnik-mihailu-glinke',
      'smolensk-istoriko-arhitekturnyy-kompleks-teremok-flenovo',
      'smolensk-muzey-usadba-glinki-novospasskoe',
    ],
    target: 'mixed',
    badge: 'Искусство',
  },
  {
    id: 'smolensk-konfekt',
    title: 'Смоленский конфект и вяземский пряник',
    text: 'Сладкий код региона: конфект в центре города и пряничная традиция Вязьмы как главный гастросувенир.',
    imageSrc: '/images/venues/smolensk/identity-gastro.jpg',
    imageAlt: 'Смоленский конфект и вяземский пряник',
    slugs: [
      'smolensk-kafe-smolenskiy-konfekt',
      'smolensk-vyazma-muzey-pryanika',
      'smolensk-restoran-pivovarnya-mayakovskiy',
    ],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'smolensk-temples',
    title: 'Домонгольские храмы и Успенский собор',
    text: 'От Петра и Павла на Городянке до бело-бирюзового Успенского на холме - Смоленск читается как каменная летопись Руси.',
    imageSrc: '/images/venues/smolensk/identity-architecture.jpg',
    imageAlt: 'Успенский собор и древние храмы Смоленска',
    slugs: [
      'smolensk-svyato-uspenskiy-kafedralnyy-sobor',
      'smolensk-tserkov-petra-i-pavla-na-gorodyanke',
      'smolensk-tserkov-arhangela-mihaila-svirskaya',
    ],
    target: 'places',
    badge: 'Архитектура',
  },
];

const BARNAUL_WEATHER: CityWeatherFlavor = {
  latitude: 53.3548,
  longitude: 83.7698,
  timezone: 'Asia/Barnaul',
  outdoorSlugs: [
    'barnaul-nagornyy-park-i-bukvy-barnaul',
    'barnaul-gorodskaya-naberezhnaya-obi',
    'barnaul-lentochnyy-bor',
    'barnaul-park-izumrudnyy',
    'barnaul-malo-tobol-skaya-ulitsa-barnaul-skiy-arbat',
  ],
  indoorSlugs: [
    'barnaul-altayskiy-kraevedcheskiy-muzey',
    'barnaul-turisticheskiy-tsentr-gornaya-apteka',
    'barnaul-gosudarstvennyy-hudozhestvennyy-muzey-altayskogo-kraya-ghmak',
    'barnaul-gosudarstvennaya-filarmoniya-altayskogo-kraya',
    'barnaul-restoratsiya-gornaya-apteka',
  ],
  outdoorCta: 'Ясно: Нагорный парк, набережная Оби или Ленточный бор',
  indoorCtaOvercast: 'Пасмурно: «Горная аптека», краеведческий или художественный музей',
  indoorCtaRain: 'Дождь: музеи Ползунова, филармония или обед в «Горной аптеке»',
  indoorCtaSnow: 'Снег: лыжня в Ленточном бору, затем чай и дичь в «Горной аптеке»',
};


const BARNAUL_SLIDES: CityIdentitySlide[] = [
  {
    id: 'barnaul-bear-silver',
    title: 'Медведь и Серебро',
    text: 'ДНК Барнаула связан с Демидовским сереброплавильным заводом. Медведь как хозяин тайги символизирует сибирский характер: суровый, прагматичный, но способный создавать красоту из грубого камня.',
    imageSrc: '/images/venues/barnaul/identity-symbol.jpg',
    imageAlt: 'Символы Барнаула: медведь и серебро',
    slugs: [
      'barnaul-demidovskiy-stolp',
      'barnaul-barnaul-skiy-serebroplavil-nyy-zavod-spichka',
      'barnaul-skulptura-medved',
    ],
    target: 'places',
    badge: 'Символ',
  },
  {
    id: 'barnaul-mining-culture',
    title: 'Горнозаводская культура и литература',
    text: 'Здесь творил изобретатель Иван Ползунов и черпал вдохновение Василий Шукшин. Местное искусство пропитано темой земли, труда и просторов Алтая.',
    imageSrc: '/images/venues/barnaul/identity-art.jpg',
    imageAlt: 'Горнозаводская культура и литература Барнаула',
    slugs: [
      'barnaul-pamyatnik-polzunovu',
      'barnaul-pamyatnik-shukshinu',
      'barnaul-teatr-dramy-imeni-shukshina',
    ],
    target: 'mixed',
    badge: 'Искусство',
  },
  {
    id: 'barnaul-altai-gastro',
    title: 'Алтайские специалитеты',
    text: 'Барнаул - гастрономическая витрина региона: мед, сыры, облепиха и дичь. Кухня здесь про здоровье, экологичность и связь с тайгой.',
    imageSrc: '/images/venues/barnaul/identity-gastro.jpg',
    imageAlt: 'Алтайские специалитеты Барнаула',
    slugs: [
      'barnaul-restoratsiya-gornaya-apteka',
      'barnaul-kraftovyy-restoran-biver',
      'barnaul-malo-tobol-skaya-ulitsa-barnaul-skiy-arbat',
    ],
    target: 'places',
    badge: 'Гастро',
  },
  {
    id: 'barnaul-wood-architecture',
    title: 'Сибирское барокко и деревянное зодчество',
    text: 'Кирпичный классицизм и купеческие усадьбы с резными наличниками. Нагорный парк связывает прошлое с панорамой на Обь.',
    imageSrc: '/images/venues/barnaul/identity-architecture.jpg',
    imageAlt: 'Деревянное и каменное зодчество Барнаула',
    slugs: [
      'barnaul-dom-kuptsov-shadrinyh',
      'barnaul-usadba-inzhenera-lesnevskogo',
      'barnaul-nagornyy-park-i-bukvy-barnaul',
    ],
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
  outdoorCta: 'Сухо: Любинский, Тарские ворота или закат у речного вокзала',
  indoorCtaOvercast: 'Пасмурно: Врубель, Эрмитаж-Сибирь или Skuratov',
  indoorCtaRain: 'Дождь: Врубель, Эрмитаж-Сибирь или Гастродвор «Любинский»',
  indoorCtaSnow: 'Снег: крепость и каток; после Любинского - сибирские настойки',
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
  outdoorCta: 'Ясно: Кировка, набережная Миасса или Алое поле',
  indoorCtaOvercast: 'Пасмурно: метеорит, музей искусств или UDOBNO',
  indoorCtaRain: 'Дождь: исторический музей, опера Глинки или «Купеческий»',
  indoorCtaSnow: 'Снег: музеи центра; после катка в Гагарина - уральские пельмени',
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
  outdoorCta: 'Сухо: ярусы Туры, Мост Влюбленных или Дзержинского',
  indoorCtaOvercast: 'Пасмурно: музей Словцова, драмтеатр или «Чум»',
  indoorCtaRain: 'Дождь: Словцов, чайная «Наличники» или строганина в «Чуме»',
  indoorCtaSnow: 'Снег: музеи; после ярусов - термы Верхнего Бора',
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
  tula: {
    identityHeading: 'Чем уникальна Тула',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(TULA_SLIDES),
    slides: TULA_SLIDES,
    weather: TULA_WEATHER,
    whenToGo: TULA_WHEN_TO_GO,
  },
  smolensk: {
    identityHeading: 'Чем уникален Смоленск',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(SMOLENSK_SLIDES),
    slides: SMOLENSK_SLIDES,
    weather: SMOLENSK_WEATHER,
    whenToGo: SMOLENSK_WHEN_TO_GO,
  },
  barnaul: {
    identityHeading: 'Чем уникален Барнаул',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(BARNAUL_SLIDES),
    slides: BARNAUL_SLIDES,
    weather: BARNAUL_WEATHER,
    whenToGo: BARNAUL_WHEN_TO_GO,
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
  sochi: {
    identityHeading: 'Чем уникален Сочи',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(SOCHI_SLIDES),
    slides: SOCHI_SLIDES,
    weather: SOCHI_WEATHER,
    whenToGo: SOCHI_WHEN_TO_GO,
  },
  saratov: {
    identityHeading: 'Чем уникален Саратов',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(SARATOV_SLIDES),
    slides: SARATOV_SLIDES,
    weather: SARATOV_WEATHER,
    whenToGo: SARATOV_WHEN_TO_GO,
  },
  yaroslavl: {
    identityHeading: 'Чем уникален Ярославль',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(YAROSLAVL_SLIDES),
    slides: YAROSLAVL_SLIDES,
    weather: YAROSLAVL_WEATHER,
    whenToGo: YAROSLAVL_WHEN_TO_GO,
  },
  volgograd: {
    identityHeading: 'Чем уникален Волгоград',
    identityLead: IDENTITY_LEAD,
    tags: tagsFromSlides(VOLGOGRAD_SLIDES),
    slides: VOLGOGRAD_SLIDES,
    weather: VOLGOGRAD_WEATHER,
    whenToGo: VOLGOGRAD_WHEN_TO_GO,
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

/**
 * Copy under season tabs: on the active calendar season use that month's body;
 * otherwise join all season paragraphs that map to the macro tab.
 */
export function seasonGuideForTab(
  whenToGo: CityWhenToGoFlavor | null | undefined,
  current: CityWhenToGoBlurb | null | undefined,
  tabId: CitySeasonTabId,
): { body: string; nowLabel: string | null; isCurrent: boolean } {
  const isCurrent = Boolean(current && current.tab === tabId);
  if (isCurrent && current?.body?.trim()) {
    return {
      body: current.body.trim(),
      nowLabel: `${current.headline}${current.monthLabel ? ` (${current.monthLabel})` : ''}`,
      isCurrent: true,
    };
  }
  const bodies = (whenToGo?.seasons || [])
    .filter((season) => tabForSeasonId(season.id) === tabId)
    .map((season) => season.body.trim())
    .filter(Boolean);
  return { body: bodies.join(' '), nowLabel: null, isCurrent: false };
}

export function whenToGoBestTime(
  whenToGo: CityWhenToGoFlavor | null | undefined,
): string | null {
  const line =
    whenToGo?.verdict?.find((item) => item.label === 'Лучшее время') ||
    whenToGo?.verdict?.[0];
  const value = line?.value?.trim();
  return value || null;
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
