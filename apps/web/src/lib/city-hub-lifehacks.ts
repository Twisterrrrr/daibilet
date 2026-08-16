/**
 * City hub «лайфхаки»: короткие карточки с CTA.
 * Держим отдельно от cityInfo (coords/mustSee) и local-flavor (погода/уникальность).
 * Пакеты: Пермь, Москва, СПб, Калининград, Нижний Новгород, Екатеринбург, Казань, Самара,
 * Краснодар, Красноярск, Новосибирск.
 */

import { normalizeCityHubSlug } from './city-hub-config.ts';
import type { CityPlaceFocus } from './city-hub-local-flavor.ts';

export type CityLifehackTabId = 'walk' | 'transit' | 'fly' | 'food';

export type CityLifehackBodyPart = {
  text: string;
  strong?: boolean;
};

export type CityLifehackCta = {
  kind: 'maps' | 'gis' | 'affiche' | 'places' | 'link';
  label: string;
  href?: string;
  slugs?: string[];
  scrollTo?: 'places' | 'suburbs';
  extra?: Array<{ label: string; href: string }>;
};

export type CityLifehackIcon = 'walk' | 'transit' | 'fly' | 'food' | 'loop' | 'museum' | 'ship' | 'cable';

export type CityLifehackItem = {
  id: string;
  tabId: CityLifehackTabId;
  icon: CityLifehackIcon;
  title: string;
  body: CityLifehackBodyPart[];
  cta: CityLifehackCta;
};

export type CityLifehackTab = {
  id: CityLifehackTabId;
  label: string;
};

export type CityLifehackPack = {
  tabs: CityLifehackTab[];
  items: CityLifehackItem[];
  /** Не дублировать длинный CityTravelSection, если карточки закрывают ту же тему. */
  skipTravel: boolean;
};

const LIFEHACK_TABS: CityLifehackTab[] = [
  { id: 'walk', label: 'Пешком' },
  { id: 'transit', label: 'Транспорт' },
  { id: 'fly', label: 'Перелёт' },
  { id: 'food', label: 'Еда' },
];

function tabsFor(items: CityLifehackItem[]): CityLifehackTab[] {
  const used = new Set(items.map((item) => item.tabId));
  return LIFEHACK_TABS.filter((tab) => used.has(tab.id));
}

function lifehackPack(items: CityLifehackItem[], skipTravel = true): CityLifehackPack {
  return { skipTravel, tabs: tabsFor(items), items };
}

export function yandexMapsSearchUrl(query: string): string {
  return `https://yandex.ru/maps/?text=${encodeURIComponent(query)}`;
}

export function twoGisCitySearchUrl(citySlug: string, query: string): string {
  return `https://2gis.ru/${citySlug}/search/${encodeURIComponent(query)}`;
}

function body(...chunks: Array<string | { s: string }>): CityLifehackBodyPart[] {
  return chunks.map((chunk) =>
    typeof chunk === 'string' ? { text: chunk } : { text: chunk.s, strong: true },
  );
}

const PERM_ITEMS: CityLifehackItem[] = [
    {
      id: 'perm-green-line',
      tabId: 'walk',
      icon: 'walk',
      title: 'Бесплатный гид под ногами',
      body: body(
        'Цветные линии на асфальте центра. ',
        { s: 'Зеленая' },
        ' - главный исторический маршрут, ',
        { s: 'Красная' },
        ' - романтические места. Гид не нужен.',
      ),
      cta: {
        kind: 'maps',
        label: 'Маршрут на карте',
        href: yandexMapsSearchUrl('Зеленая линия Пермь'),
      },
    },
    {
      id: 'perm-transfer-discount',
      tabId: 'transit',
      icon: 'transit',
      title: 'Скидка 50% на пересадку',
      body: body(
        'Приложение «Транспортная карта Пермь» (QR) или карта-кошелек. Вторая поездка за ',
        { s: '40-60 мин' },
        ' - ',
        { s: '22 ₽' },
        ' вместо ',
        { s: '43 ₽' },
        '.',
      ),
      cta: {
        kind: 'gis',
        label: 'Транспорт на карте',
        href: twoGisCitySearchUrl('perm', 'Транспорт Пермь'),
      },
    },
    {
      id: 'perm-bus-300t',
      tabId: 'transit',
      icon: 'loop',
      title: 'Обзорный круг на 300Т',
      body: body(
        'Городской кольцевой ',
        { s: '300Т' },
        ' за ',
        { s: '2 часа' },
        ' объезжает около ',
        { s: '30 км' },
        ' достопримечательностей. Обычный билет, не тур-шаттл.',
      ),
      cta: {
        kind: 'maps',
        label: 'Яндекс Карты',
        href: yandexMapsSearchUrl('автобус 300Т Пермь'),
        extra: [{ label: '2ГИС', href: twoGisCitySearchUrl('perm', 'автобус 300Т Пермь') }],
      },
    },
    {
      id: 'perm-pobeda-friday',
      tabId: 'fly',
      icon: 'fly',
      title: 'Дешевле утром в пятницу',
      body: body(
        'В Пермь летает лоукостер ',
        { s: 'Победа' },
        '. Часто дешевле: туда ',
        { s: 'утро пятницы' },
        ', обратно ',
        { s: 'суббота' },
        '. Гибкие даты за ',
        { s: '3-4 недели' },
        '.',
      ),
      cta: {
        kind: 'affiche',
        label: 'Смотреть афишу Перми',
      },
    },
    {
      id: 'perm-posikunchiki',
      tabId: 'food',
      icon: 'food',
      title: 'Посикунчики: обед до 300 ₽',
      body: body(
        'Крошечные пирожки с мясом, уксус и горчица. Центральный рынок и местные кафе, обед до ',
        { s: '300 ₽' },
        '.',
      ),
      cta: {
        kind: 'places',
        label: 'Где поесть в Перми',
        slugs: ['perm-permskie-posikunchiki', 'perm-chomga'],
        scrollTo: 'places',
      },
    },
  ];

const MOSCOW_ITEMS: CityLifehackItem[] = [
  {
    id: 'msk-troika',
    tabId: 'transit',
    icon: 'transit',
    title: 'Экономия на метро до 40%',
    body: body(
      'Не берите разовые билеты в кассе. Карта «Тройка» и тариф «Единый» на ',
      { s: '1 или 3 суток' },
      ' - безлимит метро, МЦК, МЦД и автобусов. Окупается за ',
      { s: '3-4 поездки' },
      ' в день.',
    ),
    cta: {
      kind: 'link',
      label: 'Тарифы «Тройки»',
      href: 'https://transport.mos.ru/troika',
    },
  },
  {
    id: 'msk-mow-code',
    tabId: 'fly',
    icon: 'fly',
    title: 'Ищите рейс по коду MOW',
    body: body(
      'Не фиксируйте аэропорт. Общий код ',
      { s: 'MOW' },
      ': Внуково, Домодедово и Шереметьево могут отличаться на ',
      { s: '20-30%' },
      ' в один день. Лоукостеры чаще садятся во Внуково или Жуковский.',
    ),
    cta: {
      kind: 'affiche',
      label: 'Смотреть афишу Москвы',
    },
  },
  {
    id: 'msk-annushka',
    tabId: 'walk',
    icon: 'loop',
    title: 'Обзорный круг за 57 ₽',
    body: body(
      'Вместо Hop-on Hop-off садитесь на трамвай ',
      { s: 'А («Аннушка»)' },
      ' или автобус ',
      { s: 'м1' },
      '. Кремль, Храм Христа Спасителя, Бульварное кольцо, Парк Горького. Оплата «Тройкой», около ',
      { s: '57 ₽' },
      '.',
    ),
    cta: {
      kind: 'maps',
      label: 'Маршрут Аннушки',
      href: yandexMapsSearchUrl('трамвай А Аннушка Москва'),
      extra: [{ label: '2ГИС', href: twoGisCitySearchUrl('moscow', 'трамвай А Аннушка') }],
    },
  },
  {
    id: 'msk-museum-week',
    tabId: 'walk',
    icon: 'museum',
    title: 'Бесплатные музеи раз в месяц',
    body: body(
      '«Московская музейная неделя» - ',
      { s: 'каждую третью неделю месяца' },
      '. Космонавтика, Царицыно, Коломенское и десятки площадок. Бесплатный билет заранее на mos.ru.',
    ),
    cta: {
      kind: 'link',
      label: 'Билеты на mos.ru',
      href: 'https://www.mos.ru/afisha/',
      extra: [{ label: 'Царицыно на карте', href: yandexMapsSearchUrl('музей-заповедник Царицыно') }],
    },
  },
  {
    id: 'msk-stolovaya-57',
    tabId: 'food',
    icon: 'food',
    title: 'Обед в центре за 400-600 ₽',
    body: body(
      'Фуд-корты Депо и Центральный рынок или столовая ',
      { s: '№57 в ГУМе' },
      ' на Красной площади. Сытный обед ',
      { s: '400-600 ₽' },
      ', без ресторанной наценки.',
    ),
    cta: {
      kind: 'places',
      label: 'Где поесть в Москве',
      slugs: ['moscow-stolovaya-57', 'moscow-depo-lesnaya', 'moscow-tsentralnyy-rynok'],
      scrollTo: 'places',
    },
  },
];

const SPB_ITEMS: CityLifehackItem[] = [
  {
    id: 'spb-podorozhnik',
    tabId: 'transit',
    icon: 'transit',
    title: 'Подорожник вместо жетонов',
    body: body(
      'Карта «Подорожник» или «Мир» (лучше ЕКП). Поездка в метро и наземке почти в ',
      { s: 'два раза дешевле' },
      ' разового тарифа.',
    ),
    cta: {
      kind: 'link',
      label: 'Карта «Подорожник»',
      href: 'https://podorozhnik.spb.ru/',
    },
  },
  {
    id: 'spb-bridges',
    tabId: 'walk',
    icon: 'ship',
    title: 'Разводные мосты бесплатно',
    body: body(
      'К ',
      { s: '01:10' },
      ' пешком на Дворцовую или Адмиралтейскую набережную. Дневные катера ищите на Фонтанке или Мойке: на ',
      { s: '30-40% дешевле' },
      ' причалов у Невского.',
    ),
    cta: {
      kind: 'maps',
      label: 'Дворцовая набережная',
      href: yandexMapsSearchUrl('Дворцовая набережная Санкт-Петербург'),
    },
  },
  {
    id: 'spb-peterhof',
    tabId: 'walk',
    icon: 'museum',
    title: 'Петергоф утром и билеты онлайн',
    body: body(
      'Нижний парк бесплатен ',
      { s: 'до открытия касс' },
      ' и после выключения фонтанов. Эрмитаж и Русский музей - только официальные сайты, без очереди и наценки.',
    ),
    cta: {
      kind: 'link',
      label: 'Петергоф официально',
      href: 'https://peterhofmuseum.ru/',
      extra: [{ label: 'Эрмитаж', href: 'https://www.hermitagemuseum.org/' }],
    },
  },
  {
    id: 'spb-pyshechnaya',
    tabId: 'food',
    icon: 'food',
    title: 'Пышки на Большой Конюшенной',
    body: body(
      '«Пышечная» с 1958 года, Большая Конюшенная, ',
      { s: '25' },
      '. Пышки по советскому рецепту и чай - копейки, без хипстерской наценки Рубинштейна.',
    ),
    cta: {
      kind: 'places',
      label: 'Пышечная на карте мест',
      slugs: ['saint-petersburg-pyshechnaya-na-bolshoy-konyushennoy'],
      scrollTo: 'places',
    },
  },
  {
    id: 'spb-rooftop',
    tabId: 'walk',
    icon: 'walk',
    title: 'Панорама без крыш-туров',
    body: body(
      'Легально: смотровая «Этажей» на Лиговском или фуд-корт ТРК «Галерея» с панорамными окнами. Экскурсии по крышам дорогие и часто вне правил.',
    ),
    cta: {
      kind: 'places',
      label: 'Лофт Этажи',
      slugs: ['saint-petersburg-loft-proekt-etazhi'],
      scrollTo: 'places',
    },
  },
];

const KGD_ITEMS: CityLifehackItem[] = [
  {
    id: 'kgd-subsidy',
    tabId: 'fly',
    icon: 'fly',
    title: 'Субсидия и ручная кладь',
    body: body(
      'Прописка в области, до ',
      { s: '23 лет' },
      ' или пенсионеры: субсидированные рейсы Аэрофлота, Smartavia, S7 часто в ',
      { s: '2-3 раза дешевле' },
      '. Куртка и дождевик влезают в бесплатную кладь - багаж не покупайте заранее.',
    ),
    cta: {
      kind: 'affiche',
      label: 'Смотреть афишу Калининграда',
    },
  },
  {
    id: 'kgd-244e',
    tabId: 'transit',
    icon: 'transit',
    title: 'Из Храброво за 150 ₽',
    body: body(
      'Автобус ',
      { s: '244Э' },
      ' от терминала до Южного автовокзала каждые ',
      { s: '30-40 мин' },
      ', в пути около ',
      { s: '40 минут' },
      ', билет около ',
      { s: '150 ₽' },
      '.',
    ),
    cta: {
      kind: 'maps',
      label: 'Автобус 244Э',
      href: yandexMapsSearchUrl('автобус 244Э Храброво Калининград'),
      extra: [{ label: '2ГИС', href: twoGisCitySearchUrl('kaliningrad', 'автобус 244Э') }],
    },
  },
  {
    id: 'kgd-kosa',
    tabId: 'walk',
    icon: 'walk',
    title: 'Куршская коса без тур-автобуса',
    body: body(
      '«Ласточка» до Зеленоградска, затем автобус ',
      { s: '210 или 593' },
      '. Экосбор пешком и на рейсовом ниже, чем на авто. Билет нацпарка берите онлайн.',
    ),
    cta: {
      kind: 'link',
      label: 'Экосбор нацпарка',
      href: 'https://www.park-kosa.ru/',
      extra: [{ label: 'Коса на карте', href: yandexMapsSearchUrl('Куршская коса') }],
    },
  },
  {
    id: 'kgd-organ',
    tabId: 'walk',
    icon: 'museum',
    title: 'Орган на острове Канта за полцены',
    body: body(
      'Дневной мини-концерт ',
      { s: '40 минут' },
      ' в Кафедральном соборе - та же мощь органа, примерно в ',
      { s: 'два раза дешевле' },
      ' вечерней программы.',
    ),
    cta: {
      kind: 'places',
      label: 'Собор на острове Канта',
      slugs: ['kaliningrad-kafedral-nyy-sobor', 'kaliningrad-ostrov-kanta'],
      scrollTo: 'places',
    },
  },
  {
    id: 'kgd-amber',
    tabId: 'walk',
    icon: 'walk',
    title: 'Янтарь не у собора',
    body: body(
      'У Рыбной деревни ценник завышен. Магазины комбината в посёлке Янтарный или лавки в жилых кварталах. После шторма в Зеленоградске мелкий янтарь бывает на песке ',
      { s: 'бесплатно' },
      '.',
    ),
    cta: {
      kind: 'places',
      label: 'Янтарный комбинат',
      slugs: ['kaliningrad-yantarnyy-kombinat', 'kaliningrad-muzey-yantarya'],
      scrollTo: 'suburbs',
    },
  },
];

const NN_ITEMS: CityLifehackItem[] = [
  {
    id: 'nn-lastochka',
    tabId: 'fly',
    icon: 'fly',
    title: 'Сравните «Ласточку» с самолётом',
    body: body(
      'Из Москвы «Ласточка» или «Сапсан» - около ',
      { s: '3 часов 45 минут' },
      ' до центра. Часто дешевле авиа с учётом трансфера в аэропорт.',
    ),
    cta: {
      kind: 'affiche',
      label: 'Смотреть афишу Нижнего',
    },
  },
  {
    id: 'nn-cable',
    tabId: 'walk',
    icon: 'cable',
    title: 'Канатка вместо теплохода',
    body: body(
      'Нижегородская канатная дорога до Бора: ',
      { s: '12 минут' },
      ' над Волгой, билет чуть больше ',
      { s: '100 ₽' },
      '. Панорама как с круиза, без круизной цены.',
    ),
    cta: {
      kind: 'places',
      label: 'Канатная дорога',
      slugs: ['nizhny-novgorod-nizhegorodskaya-kanatnaya-doroga'],
      scrollTo: 'places',
    },
  },
  {
    id: 'nn-kremlin-free',
    tabId: 'walk',
    icon: 'museum',
    title: 'Кремль бесплатно',
    body: body(
      'Территория кремля ',
      { s: 'бесплатна' },
      '. Платно только стена и музеи в башнях. Площадь, техника под открытым небом и виды на Стрелку - без билета.',
    ),
    cta: {
      kind: 'places',
      label: 'Нижегородский кремль',
      slugs: ['nizhny-novgorod-nizhegorodskiy-kreml'],
      scrollTo: 'places',
    },
  },
  {
    id: 'nn-sitikard',
    tabId: 'transit',
    icon: 'transit',
    title: 'Ситикард и бесплатная пересадка',
    body: body(
      'Не берите наличные у кондуктора. Банковская карта или «Ситикард»: дешевле поездка и пересадка ',
      { s: '60 или 90 минут' },
      ' бесплатно.',
    ),
    cta: {
      kind: 'link',
      label: 'Ситикард',
      href: 'https://siticard.ru/',
    },
  },
  {
    id: 'nn-rozhdestvenskaya',
    tabId: 'food',
    icon: 'food',
    title: 'Ланч на Рождественской',
    body: body(
      'Ресторанная улица кусается вечером. Стрит-фуд и бизнес-ланчи ',
      { s: '12:00-16:00' },
      ' в будни - скидка до ',
      { s: '50%' },
      ' на волжскую кухню.',
    ),
    cta: {
      kind: 'places',
      label: 'Рождественская улица',
      slugs: ['nizhny-novgorod-rozhdestvenskaya-ulitsa'],
      scrollTo: 'places',
    },
  },
];

const EKB_ITEMS: CityLifehackItem[] = [
  {
    id: 'ekb-colored-lines',
    tabId: 'walk',
    icon: 'walk',
    title: 'Бесплатный гид под ногами',
    body: body(
      'Цветные линии на асфальте центра. ',
      { s: 'Красная' },
      ' - главный исторический маршрут, ',
      { s: 'Синяя' },
      ' - царский путь Романовых, ',
      { s: 'Фиолетовая' },
      ' - стрит-арт. Гид не нужен.',
    ),
    cta: {
      kind: 'maps',
      label: 'Маршрут на карте',
      href: yandexMapsSearchUrl('Красная линия Екатеринбург'),
    },
  },
  {
    id: 'ekb-ekarta',
    tabId: 'transit',
    icon: 'transit',
    title: 'Скидка на пересадки по ЕКАРТЕ',
    body: body(
      'Пополняемая карта-кошелек «ЕКАРТА». С тарифом «Электронный кошелек» пересадка между трамваями и автобусами в течение ',
      { s: '60 минут' },
      ' бесплатна.',
    ),
    cta: {
      kind: 'gis',
      label: 'Транспорт на карте',
      href: twoGisCitySearchUrl('ekaterinburg', 'ЕКАРТА'),
    },
  },
  {
    id: 'ekb-meteogorka',
    tabId: 'walk',
    icon: 'walk',
    title: 'Смотровая Метеогорки вместо высотки',
    body: body(
      'Смотровая площадка Метеогорки - панорама на Екатеринбург-Сити и центр ',
      { s: 'бесплатна' },
      ', в отличие от платного 52 этажа «Высоцкого».',
    ),
    cta: {
      kind: 'maps',
      label: 'Яндекс Карты',
      href: yandexMapsSearchUrl('Метеогорка Екатеринбург'),
      extra: [{ label: '2ГИС', href: twoGisCitySearchUrl('ekaterinburg', 'Метеогорка') }],
    },
  },
  {
    id: 'ekb-yeltsin-wednesday',
    tabId: 'walk',
    icon: 'museum',
    title: 'Музейная неделя в Ельцин Центре',
    body: body(
      'Каждую третью среду месяца вход в интерактивный музей Бориса Ельцина и арт-галерею стоит всего ',
      { s: '100-150 ₽' },
      ' вместо полной стоимости. Планируйте даты.',
    ),
    cta: {
      kind: 'affiche',
      label: 'Смотреть афишу Екатеринбурга',
    },
  },
  {
    id: 'ekb-posikunchiki',
    tabId: 'food',
    icon: 'food',
    title: 'Посикунчики и пельмени до 350 ₽',
    body: body(
      'Сытный обед уральскими мини-пирожками или пельменями ручной лепки в сетях «Пельмени Клуб» или «Кулинария №1» - до ',
      { s: '350 ₽' },
      '.',
    ),
    cta: {
      kind: 'places',
      label: 'Где поесть в Екатеринбурге',
      slugs: ['ekaterinburg-pelmeni-klub', 'ekaterinburg-pashtet'],
      scrollTo: 'places',
    },
  },
];

const KAZAN_ITEMS: CityLifehackItem[] = [
  {
    id: 'kazan-kremlin-free',
    tabId: 'walk',
    icon: 'museum',
    title: 'Кремль без билета',
    body: body(
      'Территория белокаменного Казанского Кремля и вход в мечеть Кул-Шариф полностью ',
      { s: 'бесплатны' },
      '. Платить нужно только за закрытые музеи в башнях.',
    ),
    cta: {
      kind: 'maps',
      label: 'Маршрут на карте',
      href: yandexMapsSearchUrl('Казанский Кремль'),
    },
  },
  {
    id: 'kazan-transport-card',
    tabId: 'transit',
    icon: 'transit',
    title: 'Безлимитный проезд по карте КТ',
    body: body(
      'Покупайте карту «Транспортная карта Казани» на ',
      { s: '1-3 дня' },
      ' в кассах метро. Безлимитные поездки на автобусах, трамваях и метро без переплат.',
    ),
    cta: {
      kind: 'gis',
      label: 'Транспорт на карте',
      href: twoGisCitySearchUrl('kazan', 'метро Казань'),
    },
  },
  {
    id: 'kazan-chasha',
    tabId: 'walk',
    icon: 'walk',
    title: 'Вид с Чаши за 150 ₽',
    body: body(
      'Подъем на крышу Центра семьи «Казан» (Чаша) - лучшая панорама на Казанку и Кремль по цене чашки чая, около ',
      { s: '150 ₽' },
      '.',
    ),
    cta: {
      kind: 'maps',
      label: 'Яндекс Карты',
      href: yandexMapsSearchUrl('Центр семьи Казан'),
      extra: [{ label: '2ГИС', href: twoGisCitySearchUrl('kazan', 'Центр семьи Казан') }],
    },
  },
  {
    id: 'kazan-sviyazhsk-train',
    tabId: 'transit',
    icon: 'ship',
    title: 'Электричка до Свияжска вместо Метеора',
    body: body(
      'Пригородный поезд от вокзала Казань-1 до станции Свияжск идет ',
      { s: '1 час' },
      ' и стоит около ',
      { s: '120 ₽' },
      '. Это примерно в 8 раз дешевле билета на скоростной водный Метеор.',
    ),
    cta: {
      kind: 'affiche',
      label: 'Смотреть афишу Казани',
    },
  },
  {
    id: 'kazan-echpochmak-lunch',
    tabId: 'food',
    icon: 'food',
    title: 'Эчпочмак-ланч до 250 ₽',
    body: body(
      'Национальная выпечка (эчпочмаки, кыстыбый, губадия) в сети «Тюбетей» или «Доброй столовой». Обед до ',
      { s: '250 ₽' },
      '.',
    ),
    cta: {
      kind: 'places',
      label: 'Где поесть в Казани',
      slugs: ['kazan-tyubetey', 'kazan-tugan-avylim'],
      scrollTo: 'places',
    },
  },
];

const SAMARA_ITEMS: CityLifehackItem[] = [
  {
    id: 'samara-embankment-free',
    tabId: 'walk',
    icon: 'walk',
    title: 'Бесплатный курорт в центре',
    body: body(
      'Самарская набережная и многокилометровые песчаные пляжи полностью ',
      { s: 'бесплатны' },
      '. Есть кабинки, души и спортплощадки - южный курорт без затрат.',
    ),
    cta: {
      kind: 'maps',
      label: 'Маршрут на карте',
      href: yandexMapsSearchUrl('Самарская набережная'),
    },
  },
  {
    id: 'samara-social-card',
    tabId: 'transit',
    icon: 'transit',
    title: 'Скидка по Единой Социальной Карте',
    body: body(
      'Оплачивайте проезд в трамваях и метро картой жителя Самарской области или банковской картой МИР. Поездка выходит на ',
      { s: '5-7 ₽' },
      ' дешевле наличных.',
    ),
    cta: {
      kind: 'gis',
      label: 'Транспорт на карте',
      href: twoGisCitySearchUrl('samara', 'транспорт Самара'),
    },
  },
  {
    id: 'samara-vertolyotka',
    tabId: 'walk',
    icon: 'walk',
    title: 'Вертолетка вместо речного круиза',
    body: body(
      'Смотровая «Вертолетка» на холмах посёлка Управленческий дает лучшую панораму Жигулёвских ворот ',
      { s: 'бесплатно' },
      '. Добраться можно на автобусе.',
    ),
    cta: {
      kind: 'maps',
      label: 'Яндекс Карты',
      href: yandexMapsSearchUrl('Вертолетка Самара'),
      extra: [{ label: '2ГИС', href: twoGisCitySearchUrl('samara', 'Вертолетка') }],
    },
  },
  {
    id: 'samara-om-valday',
    tabId: 'transit',
    icon: 'ship',
    title: 'ОМ и Валдай вместо частных катеров',
    body: body(
      'До Жигулёвского заповедника в Ширяево плывите на регулярных теплоходах «ОМ» от Речного вокзала. Билет чуть больше ',
      { s: '150 ₽' },
      ' вместо дорогого такси-катера.',
    ),
    cta: {
      kind: 'affiche',
      label: 'Смотреть афишу Самары',
    },
  },
  {
    id: 'samara-na-dne',
    tabId: 'food',
    icon: 'food',
    title: 'Пиво и раки «На Дне» до 400 ₽',
    body: body(
      'Берите Жигулёвское в культовом окошке розлива «На Дне» у завода. Литр свежего пива и порция волжских раков на вынос - до ',
      { s: '400 ₽' },
      '.',
    ),
    cta: {
      kind: 'places',
      label: 'Где поесть в Самаре',
      slugs: ['samara-pivnoy-bar-na-dne', 'samara-zhigulevskiy-pivovarennyy-zavod'],
      scrollTo: 'places',
    },
  },
];

const KRASNODAR_ITEMS: CityLifehackItem[] = [
  {
    id: 'krasnodar-galitskiy-free',
    tabId: 'walk',
    icon: 'walk',
    title: 'Парк Галицкого без затрат',
    body: body(
      'Вся территория парка «Краснодар» и арт-объекты полностью ',
      { s: 'бесплатны' },
      '. Тратиться придётся только на кафе или сувениры.',
    ),
    cta: {
      kind: 'maps',
      label: 'Маршрут на карте',
      href: yandexMapsSearchUrl('Парк Краснодар Галицкого'),
    },
  },
  {
    id: 'krasnodar-dendrariy',
    tabId: 'walk',
    icon: 'walk',
    title: 'Дендрарий вместо платных зоопарков',
    body: body(
      'Ботанический сад им. Косенко полностью ',
      { s: 'бесплатен' },
      '. Берите семечки и орехи: здесь живут ручные белки и павлины.',
    ),
    cta: {
      kind: 'gis',
      label: 'Транспорт на карте',
      href: twoGisCitySearchUrl('krasnodar', 'Ботанический сад Косенко'),
    },
  },
  {
    id: 'krasnodar-stadium-ring',
    tabId: 'walk',
    icon: 'walk',
    title: 'Смотровая чаши стадиона',
    body: body(
      'Верхнее пешеходное кольцо вокруг стадиона «Краснодар» даёт панораму парка и города ',
      { s: 'бесплатно' },
      ' в любой день, кроме матчевых.',
    ),
    cta: {
      kind: 'maps',
      label: 'Яндекс Карты',
      href: yandexMapsSearchUrl('Стадион Краснодар смотровая'),
      extra: [{ label: '2ГИС', href: twoGisCitySearchUrl('krasnodar', 'Стадион Краснодар') }],
    },
  },
  {
    id: 'krasnodar-fudmarket-lunch',
    tabId: 'food',
    icon: 'food',
    title: 'Обед на Фудмаркете в будни',
    body: body(
      'Заходите в «Фудмаркет» в будни с 12:00 до 16:00. Многие корнеры делают скидку до ',
      { s: '40%' },
      ' на южные сеты и комбо-ланчи.',
    ),
    cta: {
      kind: 'affiche',
      label: 'Смотреть афишу Краснодара',
    },
  },
  {
    id: 'krasnodar-stolovaya',
    tabId: 'food',
    icon: 'food',
    title: 'Добрая столовая на Красной',
    body: body(
      'Сытно пообедать южным супом, котлетами или выпечкой до ',
      { s: '250 ₽' },
      ' можно в сетевых столовых в начале Красной улицы.',
    ),
    cta: {
      kind: 'places',
      label: 'Где поесть в Краснодаре',
      slugs: ['krasnodar-restoran-borschberry', 'krasnodar-fudmarket'],
      scrollTo: 'places',
    },
  },
];

const KRASNOYARSK_ITEMS: CityLifehackItem[] = [
  {
    id: 'krasnoyarsk-tatyshev-free',
    tabId: 'walk',
    icon: 'walk',
    title: 'Суслики Татышева без затрат',
    body: body(
      'Остров Татышев - полностью ',
      { s: 'бесплатный' },
      ' эко-парк. Купите овсяные хлопья или яблоки: ручные суслики выйдут сами.',
    ),
    cta: {
      kind: 'maps',
      label: 'Маршрут на карте',
      href: yandexMapsSearchUrl('Остров Татышев Красноярск'),
    },
  },
  {
    id: 'krasnoyarsk-nikolaevskaya',
    tabId: 'walk',
    icon: 'walk',
    title: 'Николаевская сопка вместо платных канаток',
    body: body(
      'Смотровая на Николаевской сопке даёт хайтек-панораму на город и тайгу ',
      { s: 'бесплатно' },
      '. До подножия - городской автобус, дальше пешком.',
    ),
    cta: {
      kind: 'gis',
      label: 'Транспорт на карте',
      href: twoGisCitySearchUrl('krasnoyarsk', 'Николаевская сопка'),
    },
  },
  {
    id: 'krasnoyarsk-uspenskiy',
    tabId: 'walk',
    icon: 'walk',
    title: 'Свободный вход в монастырь на Енисее',
    body: body(
      'Свято-Успенский мужской монастырь открыт для всех ',
      { s: 'бесплатно' },
      ': ландшафтный сад, деревянный собор и выставки икон.',
    ),
    cta: {
      kind: 'maps',
      label: 'Яндекс Карты',
      href: yandexMapsSearchUrl('Свято-Успенский монастырь Красноярск'),
      extra: [
        { label: '2ГИС', href: twoGisCitySearchUrl('krasnoyarsk', 'Успенский монастырь') },
      ],
    },
  },
  {
    id: 'krasnoyarsk-lunch-075',
    tabId: 'food',
    icon: 'food',
    title: 'Обед строганиной на ланчах',
    body: body(
      'В будни с 12:00 до 16:00 «0.75 Please» и «Тунгуска» делают скидки до ',
      { s: '30%' },
      ' или сибирские сет-ланчи по доступной цене.',
    ),
    cta: {
      kind: 'affiche',
      label: 'Смотреть афишу Красноярска',
    },
  },
  {
    id: 'krasnoyarsk-elektrichka',
    tabId: 'transit',
    icon: 'transit',
    title: 'Городская электричка до Дивногорска',
    body: body(
      'Вместо такси езжайте в Дивногорск на городской электричке вдоль Енисея. Билет около ',
      { s: '40 ₽' },
      '.',
    ),
    cta: {
      kind: 'gis',
      label: 'Транспорт в Красноярске',
      href: twoGisCitySearchUrl('krasnoyarsk', 'электричка Дивногорск'),
    },
  },
];

const NOVOSIBIRSK_ITEMS: CityLifehackItem[] = [
  {
    id: 'novosibirsk-etk',
    tabId: 'transit',
    icon: 'transit',
    title: 'Безлимит на подземку',
    body: body(
      'Не покупайте разовые жетоны. Единая транспортная карта ',
      { s: '«ЕТК»' },
      ' экономит до ',
      { s: '5 ₽' },
      ' с каждой поездки на метро, автобусах и троллейбусах.',
    ),
    cta: {
      kind: 'link',
      label: 'Тарифы ЕТК',
      href: 'https://metro-nsk.ru/',
      extra: [{ label: 'Схема метро Новосибирска', href: yandexMapsSearchUrl('схема метро Новосибирск') }],
    },
  },
  {
    id: 'novosibirsk-ob-panorama',
    tabId: 'walk',
    icon: 'walk',
    title: 'Бесплатная панорама Оби',
    body: body(
      'Не платите за смотровые в отелях. Лучший бесплатный вид на Обь, Коммунальный и Бугринский мосты - с верхней террасы ',
      { s: 'Михайловской набережной' },
      ' у памятника Александру III на закате.',
    ),
    cta: {
      kind: 'maps',
      label: 'Точка на карте',
      href: yandexMapsSearchUrl('Михайловская набережная Новосибирск Александр III'),
      extra: [
        {
          label: 'Пешеходный гид по набережной',
          href: twoGisCitySearchUrl('novosibirsk', 'Михайловская набережная'),
        },
      ],
    },
  },
  {
    id: 'novosibirsk-museum-thursday',
    tabId: 'walk',
    icon: 'museum',
    title: 'Культурный четверг',
    body: body(
      'В Художественном музее каждый ',
      { s: 'второй четверг месяца' },
      ' для студентов (и в соцдни для других категорий) вход в главные залы бесплатный или ',
      { s: '50-100 ₽' },
      '.',
    ),
    cta: {
      kind: 'places',
      label: 'Афиша Художественного музея',
      slugs: ['novosibirsk-novosibirskiy-hudozhestvennyy-muzey'],
      scrollTo: 'places',
      extra: [
        {
          label: 'Дни бесплатных посещений',
          href: 'https://nsartmuseum.ru/',
        },
      ],
    },
  },
  {
    id: 'novosibirsk-doner',
    tabId: 'food',
    icon: 'food',
    title: 'Кулинарный феномен «Дёнер»',
    body: body(
      'Локальный стритфуд: «Подорожник», запеченная шаурма в ',
      { s: 'MGrill' },
      ' или ',
      { s: '«Дёнер»' },
      '. Сытный обед за ',
      { s: '180-250 ₽' },
      ' в любой точке центра.',
    ),
    cta: {
      kind: 'maps',
      label: 'Карта стритфуда',
      href: yandexMapsSearchUrl('Дёнер Новосибирск'),
      extra: [
        {
          label: 'Где недорого перекусить',
          href: twoGisCitySearchUrl('novosibirsk', 'шаурма Подорожник'),
        },
      ],
    },
  },
  {
    id: 'novosibirsk-akadem-train',
    tabId: 'transit',
    icon: 'loop',
    title: 'Тайны Академгородка за 40 рублей',
    body: body(
      'Вместо такси - электричка от ',
      { s: '«Новосибирск-Главный»' },
      ' до ',
      { s: '«Сеятель»' },
      ' или ',
      { s: '«Обское море»' },
      '. Около ',
      { s: '40 ₽' },
      ' и без пробок на Большевистской.',
    ),
    cta: {
      kind: 'gis',
      label: 'Расписание электричек',
      href: twoGisCitySearchUrl('novosibirsk', 'электричка Сеятель'),
      extra: [
        {
          label: 'Маршрут по Академгородку',
          href: yandexMapsSearchUrl('Академгородок Новосибирск'),
        },
      ],
    },
  },
];

const CITY_HUB_LIFEHACKS: Record<string, CityLifehackPack> = {
  perm: lifehackPack(PERM_ITEMS),
  moscow: lifehackPack(MOSCOW_ITEMS),
  'saint-petersburg': lifehackPack(SPB_ITEMS),
  kaliningrad: lifehackPack(KGD_ITEMS),
  'nizhny-novgorod': lifehackPack(NN_ITEMS),
  ekaterinburg: lifehackPack(EKB_ITEMS),
  kazan: lifehackPack(KAZAN_ITEMS),
  samara: lifehackPack(SAMARA_ITEMS),
  krasnodar: lifehackPack(KRASNODAR_ITEMS),
  krasnoyarsk: lifehackPack(KRASNOYARSK_ITEMS),
  novosibirsk: lifehackPack(NOVOSIBIRSK_ITEMS),
};

export function resolveCityLifehacks(slug: string | null | undefined): CityLifehackPack | null {
  const normalized = normalizeCityHubSlug(slug);
  if (!normalized) return null;
  const pack = CITY_HUB_LIFEHACKS[normalized];
  if (!pack?.items?.length) return null;
  return pack;
}

export function cityHasLifehacks(slug: string | null | undefined): boolean {
  return Boolean(resolveCityLifehacks(slug));
}

export function lifehackBodyText(bodyParts: CityLifehackBodyPart[]): string {
  return bodyParts.map((part) => part.text).join('');
}

export function focusFromLifehackCta(
  item: CityLifehackItem,
  cta: CityLifehackCta,
): CityPlaceFocus | null {
  if (cta.kind !== 'places' || !cta.slugs?.length) return null;
  return {
    id: item.id,
    label: cta.label,
    slugs: cta.slugs,
    scrollTo: cta.scrollTo === 'suburbs' ? 'suburbs' : 'places',
  };
}
