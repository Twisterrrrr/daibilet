/**
 * City hub «лайфхаки»: короткие карточки с CTA.
 * Держим отдельно от cityInfo (coords/mustSee) и local-flavor (погода/уникальность).
 * Пакеты: Пермь, Москва, СПб, Калининград, Нижний Новгород, Екатеринбург, Казань, Самара,
 * Краснодар, Красноярск, Новосибирск, Воронеж, Рязань, Уфа, Омск, Челябинск, Тюмень.
 */

import { normalizeCityHubSlug } from './city-hub-config.ts';
import type { CityPlaceFocus } from './city-hub-local-flavor.ts';
import { SOCHI_ITEMS } from './_lifehacks-sochi.fragment.ts';
import { SARATOV_ITEMS } from './_lifehacks-saratov.fragment.ts';
import { YAROSLAVL_ITEMS } from './_lifehacks-yaroslavl.fragment.ts';
import { VOLGOGRAD_ITEMS } from './_lifehacks-volgograd.fragment.ts';

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
      label: 'Открыть на карте',
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

const VORONEZH_ITEMS: CityLifehackItem[] = [
  {
    id: 'voronezh-transport-sbp',
    tabId: 'transit',
    icon: 'transit',
    title: 'Карта и СБП дешевле наличных',
    body: body(
      'При оплате банковской картой или через СБП проезд в автобусах и троллейбусах автоматически дешевле наличных на ',
      { s: '2-4 ₽' },
      '.',
    ),
    cta: {
      kind: 'gis',
      label: 'Транспорт на карте',
      href: twoGisCitySearchUrl('voronezh', 'транспорт Воронеж'),
    },
  },
  {
    id: 'voronezh-free-museums',
    tabId: 'walk',
    icon: 'museum',
    title: 'Третья среда и бесплатная диорама',
    body: body(
      'В музее Крамского и Краеведческом каждая ',
      { s: 'третья среда' },
      ' месяца - бесплатный вход для лиц до 18 лет и студентов. Постоянную экспозицию «Музей-диорама» все смотрят бесплатно в любой день работы.',
    ),
    cta: {
      kind: 'places',
      label: 'Музеи Воронежа',
      slugs: [
        'voronezh-hudozhestvennyy-muzey-kramskogo',
        'voronezh-kraevedcheskiy-muzey',
        'voronezh-muzey-diorama',
      ],
      scrollTo: 'places',
    },
  },
  {
    id: 'voronezh-free-views',
    tabId: 'walk',
    icon: 'walk',
    title: 'Бесплатные смотровые',
    body: body(
      'Не платите за рестораны ради панорамы. Лучший вид на реку, Чернавский мост и левый берег - с холма у ',
      { s: 'Ильинского храма' },
      ' и с площадок на ',
      { s: 'Чернавской дамбе' },
      '.',
    ),
    cta: {
      kind: 'maps',
      label: 'Места на карте',
      href: yandexMapsSearchUrl('Ильинский храм Воронеж'),
      extra: [{ label: 'Чернавская дамба', href: yandexMapsSearchUrl('Чернавская дамба Воронеж') }],
    },
  },
  {
    id: 'voronezh-robin-sdobin',
    tabId: 'food',
    icon: 'food',
    title: 'Робин Сдобин вместо фастфуда',
    body: body(
      'Ищите киоски «Робин Сдобин» или «Кулинария» у Центрального рынка. Пышные слойки, закрытые пиццы «робики» и пирожки с мясом - за смешные деньги.',
    ),
    cta: {
      kind: 'places',
      label: 'Где поесть в Воронеже',
      slugs: ['voronezh-gastro-tsentralnyy-rynok', 'voronezh-kofeynya-promka'],
      scrollTo: 'places',
    },
  },
  {
    id: 'voronezh-ramon-park-free',
    tabId: 'walk',
    icon: 'walk',
    title: 'Парк дворца в Рамони бесплатно',
    body: body(
      'Вход внутрь Дворца Ольденбургских платный, но прогулка по Верхнему и Нижнему парку усадьбы с видом на каскады террас ',
      { s: 'бесплатна' },
      '.',
    ),
    cta: {
      kind: 'places',
      label: 'Маршрут в Рамонь',
      slugs: ['voronezh-ramon'],
      scrollTo: 'suburbs',
    },
  },
];

const ROSTOV_ITEMS: CityLifehackItem[] = [
  {
    id: 'rostov-card-cheaper',
    tabId: 'transit',
    icon: 'transit',
    title: 'Карта дешевле наличных',
    body: body(
      'В ростовских автобусах и трамваях выгоднее платить банковской картой. Безнал обычно дешевле наличных на ',
      { s: '5-6 ₽' },
      '.',
    ),
    cta: {
      kind: 'gis',
      label: 'Транспорт на карте',
      href: twoGisCitySearchUrl('rostov', 'транспорт Ростов-на-Дону'),
    },
  },
  {
    id: 'rostov-pushkinskaya-free',
    tabId: 'walk',
    icon: 'walk',
    title: 'Пушкинская бесплатно и без лимита',
    body: body(
      'Главный зеленый променад города доступен ',
      { s: '24/7' },
      ': бульвар, скамейки, клумбы, тень и длинная пешая ось через центр без билетов и турникетов.',
    ),
    cta: {
      kind: 'places',
      label: 'Маршрут по Пушкинской',
      slugs: ['rostov-na-donu-pushkinskaya-ulitsa', 'rostov-na-donu-pamyatnik-pushkinu'],
      scrollTo: 'places',
    },
  },
  {
    id: 'rostov-free-view',
    tabId: 'walk',
    icon: 'walk',
    title: 'Седова вместо платной панорамы',
    body: body(
      'Лучший вид на порт, Дон и Ворошиловский мост открывается ',
      { s: 'бесплатно' },
      ' со смотровой на Седова. На закат приходите за 30-40 минут до солнца.',
    ),
    cta: {
      kind: 'maps',
      label: 'Смотровая на карте',
      href: yandexMapsSearchUrl('Смотровая на Седова Ростов-на-Дону'),
    },
  },
  {
    id: 'rostov-market-snack',
    tabId: 'food',
    icon: 'food',
    title: 'Перекус на Старом базаре',
    body: body(
      'Вместо дорогого фастфуда идите на Центральный рынок за пирожками, рыбой, овощами и локальными закусками. Это самый дешевый способ попробовать город ',
      { s: 'по-настоящему' },
      '.',
    ),
    cta: {
      kind: 'places',
      label: 'Рынок и гастро',
      slugs: ['rostov-na-donu-tsentral-nyy-rynok-staryy-bazar', 'rostov-na-donu-raki-i-gady'],
      scrollTo: 'places',
    },
  },
  {
    id: 'rostov-museum-day',
    tabId: 'walk',
    icon: 'museum',
    title: 'Краеведческий музей по льготному дню',
    body: body(
      'Перед визитом проверяйте льготные и бесплатные дни у областного музея краеведения. Для студентов и детей они часто заметно выгоднее разового входа в высокий сезон.',
    ),
    cta: {
      kind: 'places',
      label: 'Музеи Ростова',
      slugs: [
        'rostov-na-donu-oblastnoy-muzey-kraevedeniya',
        'rostov-na-donu-muzey-izobrazitelnyh-iskusstv',
      ],
      scrollTo: 'places',
    },
  },
];

const PENZA_ITEMS: CityLifehackItem[] = [
  {
    id: 'penza-center-walk',
    tabId: 'walk',
    icon: 'walk',
    title: 'Центр реально пройти пешком',
    body: body(
      'Пенза выигрывает компактностью. Крепостной холм, Московская, фонтан и музей одной картины собираются в один маршрут ',
      { s: 'без такси' },
      '.',
    ),
    cta: {
      kind: 'places',
      label: 'Маршрут по центру',
      slugs: ['penza-pamyatnik-pervoposelentsu', 'penza-penzenskaya-peshehodnaya-ulitsa-moskovskaya'],
      scrollTo: 'places',
    },
  },
  {
    id: 'penza-card-transport',
    tabId: 'transit',
    icon: 'transit',
    title: 'Безнал удобнее наличных',
    body: body(
      'В городском транспорте проще и быстрее платить картой. Для короткой поездки между вокзалом и центром отдельная транспортная карта не нужна.',
    ),
    cta: {
      kind: 'gis',
      label: 'Транспорт на карте',
      href: twoGisCitySearchUrl('penza', 'транспорт Пенза'),
    },
  },
  {
    id: 'penza-park-free',
    tabId: 'walk',
    icon: 'walk',
    title: 'Парк Белинского почти бесплатен',
    body: body(
      'Сам вход в исторический парк и прогулка по аллеям ',
      { s: 'бесплатны' },
      '. Платить есть смысл только за отдельные аттракционы и планетарий.',
    ),
    cta: {
      kind: 'places',
      label: 'Парк Белинского',
      slugs: ['penza-park-imeni-v-g-belinskogo', 'penza-planetariy'],
      scrollTo: 'places',
    },
  },
  {
    id: 'penza-market-snack',
    tabId: 'food',
    icon: 'food',
    title: 'Перекус вместо ресторанной паузы',
    body: body(
      'На центральных улицах ищите пекарни, кофейни и быстрые обеды. Для небольшого города это часто выгоднее, чем садиться в полноценный ресторан посреди маршрута.',
    ),
    cta: {
      kind: 'places',
      label: 'Где поесть в Пензе',
      slugs: ['penza-moskovskaya-gastro-kvartal', 'penza-centralnyy-rynok'],
      scrollTo: 'places',
    },
  },
  {
    id: 'penza-tarhany-plan',
    tabId: 'walk',
    icon: 'museum',
    title: 'Тарханы - только половиной дня',
    body: body(
      'Не вставляйте Тарханы в короткий городской день. Это отдельный выезд минимум на ',
      { s: 'полдня' },
      ', иначе вы потеряете и музей, и саму Пензу.',
    ),
    cta: {
      kind: 'places',
      label: 'Выезд в Тарханы',
      slugs: ['penza-tarhany-day-trip', 'penza-muzey-zapovednik-tarhany'],
      scrollTo: 'suburbs',
    },
  },
];

const TVER_ITEMS: CityLifehackItem[] = [
  {
    id: 'tver-volga-card',
    tabId: 'transit',
    icon: 'transit',
    title: 'Карта «Волга» дешевле наличных',
    body: body(
      'В автобусах и троллейбусах платите картой «Волга» или любой бесконтактной. Безнал сразу дешевле наличных на ',
      { s: '4-5 ₽' },
      ', а онлайн-тариф дает бесплатную пересадку за 60 минут.',
    ),
    cta: {
      kind: 'gis',
      label: 'Транспорт Твери',
      href: twoGisCitySearchUrl('tver', 'транспорт Тверь'),
    },
  },
  {
    id: 'tver-palace-free',
    tabId: 'walk',
    icon: 'museum',
    title: 'Бесплатный день во дворце',
    body: body(
      'Каждую последнюю среду месяца Путевой дворец бесплатен для лиц до 18 лет, многодетных семей и студентов ссузов. Левитан и залы Екатерины II можно увидеть ',
      { s: 'без лишнего билета' },
      '.',
    ),
    cta: {
      kind: 'places',
      label: 'Путевой дворец',
      slugs: ['tver-imperatorskiy-putevoy-dvorets', 'tver-oblastnaya-kartinnaya-galereya'],
      scrollTo: 'places',
    },
  },
  {
    id: 'tver-nikitin-view',
    tabId: 'walk',
    icon: 'walk',
    title: 'Бесплатный вид с набережной Никитина',
    body: body(
      'Не платите за пентхаус ради кадра Волги. Лучший круговой вид на дворец, стрелку и арки Староволжского моста открывается с гранитных амфитеатров набережной Афанасия Никитина.',
    ),
    cta: {
      kind: 'places',
      label: 'Смотровая на Волгу',
      slugs: ['tver-naberezhnaya-afanasiya-nikitina', 'tver-starovolzhskiy-most'],
      scrollTo: 'places',
    },
  },
  {
    id: 'tver-sloyki',
    tabId: 'food',
    icon: 'food',
    title: 'Тверские слойки на Трехсвятской',
    body: body(
      'Ищите кулинарии «Тверской кондитер» на пешеходной Трехсвятской. Слойка с брусникой или пирожок с рыбой стоят копейки и лучше держат долгую прогулку, чем дорогая кофейня.',
    ),
    cta: {
      kind: 'places',
      label: 'Где поесть в Твери',
      slugs: ['tver-peshehodnaya-trehsvyatskaya-ulitsa', 'tver-restoran-lyublin'],
      scrollTo: 'places',
    },
  },
  {
    id: 'tver-tmaka-free',
    tabId: 'walk',
    icon: 'walk',
    title: 'Парк «Тьмака» бесплатен',
    body: body(
      'Благоустроенная пойма с экотропами, пикник-зонами и воркаутом открыта ',
      { s: 'бесплатно 24/7' },
      '. Платные закрытые зоны отдыха для этой прогулки не нужны.',
    ),
    cta: {
      kind: 'places',
      label: 'Парк Тьмака',
      slugs: ['tver-landshaftnyy-park-tmaka'],
      scrollTo: 'places',
    },
  },
];

const RYAZAN_ITEMS: CityLifehackItem[] = [
  {
    id: 'ryazan-umka-card',
    tabId: 'transit',
    icon: 'transit',
    title: 'Безнал дешевле наличных',
    body: body(
      'Платите в автобусах и троллейбусах любой бесконтактной картой. При безнале проезд автоматически дешевле наличных на ',
      { s: '2-3 ₽' },
      '. Карта «Умка» не обязательна.',
    ),
    cta: {
      kind: 'gis',
      label: 'Маршруты транспорта',
      href: twoGisCitySearchUrl('ryazan', 'транспорт Рязань'),
    },
  },
  {
    id: 'ryazan-kremlin-ticket',
    tabId: 'walk',
    icon: 'museum',
    title: 'Единый билет в Кремль',
    body: body(
      'Не берите билеты в каждый корпус отдельно. В кассе Дворца Олега просите ',
      { s: 'Единый билет' },
      ' на все постоянные экспозиции музея-заповедника - это сбережет до ',
      { s: '40%' },
      '.',
    ),
    cta: {
      kind: 'places',
      label: 'Кремль и палаты',
      slugs: ['ryazan-dvorets-olega', 'ryazan-uspenskiy-sobor', 'ryazan-pevcheskiy-korpus'],
      scrollTo: 'places',
    },
  },
  {
    id: 'ryazan-torgovyy-gorodok-view',
    tabId: 'walk',
    icon: 'walk',
    title: 'Секретный вид из Торгового городка',
    body: body(
      'На территории обновленного Торгового городка («Рязанской ВДНХ») можно ',
      { s: 'бесплатно' },
      ' гулять среди павильонов сталинского ампира и снимать панораму Лесопарка.',
    ),
    cta: {
      kind: 'places',
      label: 'Торговый городок',
      slugs: ['ryazan-torgovyy-gorodok', 'ryazan-lesopark'],
      scrollTo: 'places',
    },
  },
  {
    id: 'ryazan-karavaets',
    tabId: 'food',
    icon: 'food',
    title: 'Каравайцы на Почтовой',
    body: body(
      'Ищите на пешеходной Почтовой локальные пекарни и кофейни. Свежий рязанский караваец с сытной начинкой стоит сущие копейки и заменяет обед.',
    ),
    cta: {
      kind: 'places',
      label: 'Где поесть каравайцы',
      slugs: ['ryazan-kafe-briosh', 'ryazan-kofeynya-kofe-kult', 'ryazan-ulitsa-pochtovaya'],
      scrollTo: 'places',
    },
  },
  {
    id: 'ryazan-lybedskiy-free',
    tabId: 'walk',
    icon: 'walk',
    title: 'Бесплатный Лыбедский бульвар',
    body: body(
      'Огромная ландшафтная зона с сухими фонтанами, арт-объектами и скамейками открыта ',
      { s: 'бесплатно 24/7' },
      '. Парки аттракционов для этой прогулки не нужны.',
    ),
    cta: {
      kind: 'places',
      label: 'Маршрут бульвара',
      slugs: ['ryazan-lybedskiy-bulvar', 'ryazan-grib-rybak', 'ryazan-grib-sportsmen'],
      scrollTo: 'places',
    },
  },
];

const TULA_ITEMS: CityLifehackItem[] = [
  {
    id: 'tula-troyka-card',
    tabId: 'transit',
    icon: 'transit',
    title: 'Безлимитный проезд по городу',
    body: body(
      'Купите в кассе Тулгорэлектротранса единую транспортную карту «Тройка». Проезд по ней в автобусах, трамваях и троллейбусах дешевле, чем по банковской карте или за наличные. За уикенд экономия набегает на приличный обед.',
    ),
    cta: {
      kind: 'gis',
      label: 'Маршруты транспорта',
      href: twoGisCitySearchUrl('tula', 'транспорт Тула'),
    },
  },
  {
    id: 'tula-kremlin-free',
    tabId: 'walk',
    icon: 'museum',
    title: 'Бесплатный Кремль без гидов',
    body: body(
      'Вход на территорию Тульского кремля ',
      { s: 'бесплатный' },
      ' в любое время работы. Плата берется только за экспозиции в башнях и прогулку по стене. Скачайте бесплатный аудиогид в приложении izi.TRAVEL.',
    ),
    cta: {
      kind: 'places',
      label: 'Кремль и башни',
      slugs: ['tula-tul-skiy-kreml', 'tula-bashnya-odoevskih-vorot', 'tula-uspenskiy-sobor-kremlya'],
      scrollTo: 'places',
    },
  },
  {
    id: 'tula-free-museum-tuesday',
    tabId: 'walk',
    icon: 'museum',
    title: 'День бесплатных музеев',
    body: body(
      'Каждый последний вторник месяца Тульский областной художественный музей и Выставочный зал открывают двери ',
      { s: 'бесплатно' },
      '. Подгадайте даты поездки и увидите подлинники Айвазовского, Шишкина и Поленова без билета.',
    ),
    cta: {
      kind: 'places',
      label: 'Художественный музей',
      slugs: ['tula-oblastnoy-hudozhestvennyy-muzey'],
      scrollTo: 'places',
    },
  },
  {
    id: 'tula-kuleyki',
    tabId: 'food',
    icon: 'food',
    title: 'Альтернативный стритфуд в Заречье',
    body: body(
      'Вместо дорогих ресторанов в «Искре» обедайте в Заречье. В пекарнях у Музея оружия продают тульские кулейки - открытые ватрушки с творожно-сметанной начинкой за ',
      { s: '80-120 ₽' },
      '.',
    ),
    cta: {
      kind: 'places',
      label: 'Заречье и Музей оружия',
      slugs: ['tula-muzey-oruzhiya-shlem', 'tula-kafe-pryanosti-i-radosti'],
      scrollTo: 'places',
    },
  },
  {
    id: 'tula-proletarskaya-view',
    tabId: 'walk',
    icon: 'walk',
    title: 'Лучший бесплатный вид на реку',
    body: body(
      'Не платите за смотровые. Панорама Упы, Оружейного завода и «Шлема» открывается со Смотровой площадки Пролетарской набережной ',
      { s: 'бесплатно' },
      '. Приходите на закат со своим кофе.',
    ),
    cta: {
      kind: 'places',
      label: 'Смотровая набережной',
      slugs: ['tula-smotrovaya-proletarskoy-naberezhnoy', 'tula-muzey-oruzhiya-shlem'],
      scrollTo: 'places',
    },
  },
];

const SMOLENSK_ITEMS: CityLifehackItem[] = [
  {
    id: 'smolensk-tram-unlimited',
    tabId: 'transit',
    icon: 'transit',
    title: 'Трамвайный безлимит вместо такси',
    body: body(
      'На холмистом рельефе такси быстро съедает бюджет. Возьмите проездной или пополняемую карту Смоленскэлектротранса: трамваи и автобусы закрывают стену, Блонье и площадь Победы дешевле разовых поездок.',
    ),
    cta: {
      kind: 'gis',
      label: 'Транспорт Смоленска',
      href: twoGisCitySearchUrl('smolensk', 'трамвай Смоленск'),
    },
  },
  {
    id: 'smolensk-uspenskiy-secret-view',
    tabId: 'walk',
    icon: 'walk',
    title: 'Секретный вид на Успенский собор',
    body: body(
      'Лучший ракурс на бело-бирюзовый собор - не с парадной лестницы, а с холма у Георгиевской церкви. Приходите на закат: купола и прясла стены складываются в один кадр ',
      { s: 'бесплатно' },
      '.',
    ),
    cta: {
      kind: 'places',
      label: 'Собор и смотровая',
      slugs: ['smolensk-svyato-uspenskiy-kafedralnyy-sobor', 'smolensk-smotrovaya-na-sobornom-holme'],
      scrollTo: 'places',
    },
  },
  {
    id: 'smolensk-free-museums',
    tabId: 'walk',
    icon: 'museum',
    title: 'Культурная среда: бесплатные музеи',
    body: body(
      'Следите за днями открытых дверей областных музеев и галереи: в будни часто бывают льготные и ',
      { s: 'бесплатные' },
      ' часы для студентов и многодетных. Подгадайте вторник или последний день месяца.',
    ),
    cta: {
      kind: 'places',
      label: 'Музеи центра',
      slugs: [
        'smolensk-smolenskaya-hudozhestvennaya-galereya',
        'smolensk-istoricheskiy-muzey',
        'smolensk-muzey-skulptury-konenkova',
      ],
      scrollTo: 'places',
    },
  },
  {
    id: 'smolensk-budget-pryanik',
    tabId: 'food',
    icon: 'food',
    title: 'Где бюджетно съесть легендарный пряник',
    body: body(
      'Вяземский пряник в центре берите в небольших кондитерских и на ярмарках у Блонье, а не только в сувенирных лавках у вокзала. Порция к чаю выходит ',
      { s: 'дешевле' },
      ' туристических наборов «на подарок».',
    ),
    cta: {
      kind: 'places',
      label: 'Конфект и пряник',
      slugs: ['smolensk-kafe-smolenskiy-konfekt', 'smolensk-vyazma-muzey-pryanika'],
      scrollTo: 'places',
    },
  },
  {
    id: 'smolensk-streetfood-mayakovskogo',
    tabId: 'food',
    icon: 'food',
    title: 'Сытный стритфуд по-смоленски',
    body: body(
      'На улице Маяковского ищите пивоварню «Маяковский» и соседние кухни: плотные бургеры, локальное пиво и быстрый обед без ресторанного чека. Удобная пауза между Блонье и Лопатинским садом.',
    ),
    cta: {
      kind: 'places',
      label: 'Маяковский',
      slugs: ['smolensk-restoran-pivovarnya-mayakovskiy', 'smolensk-lopatinskiy-sad'],
      scrollTo: 'places',
    },
  },
];

const UFA_ITEMS: CityLifehackItem[] = [
  {
    id: 'ufa-alga-card',
    tabId: 'transit',
    icon: 'transit',
    title: 'Транспортная карта «Алга»',
    body: body(
      'Купите в киоске или на вокзале карту «Алга». Проезд в автобусах, троллейбусах и трамваях сразу дешевле на ',
      { s: '5-7 ₽' },
      '. Фишка тарифа «Счастливый час»: бесплатная пересадка между городскими маршрутами в течение ',
      { s: '60 минут' },
      '.',
    ),
    cta: {
      kind: 'gis',
      label: 'Транспорт на карте',
      href: twoGisCitySearchUrl('ufa', 'транспорт Уфа'),
    },
  },
  {
    id: 'ufa-nesterov-saturday',
    tabId: 'walk',
    icon: 'museum',
    title: 'Бесплатный день в музее Нестерова',
    body: body(
      'Шедевры Бурлюка, Шишкина, Коровина и самого Нестерова можно увидеть бесплатно. Каждую ',
      { s: 'последнюю субботу' },
      ' месяца Художественный музей им. Нестерова открывает двери для лиц до 18 лет и многодетных семей.',
    ),
    cta: {
      kind: 'places',
      label: 'Музей Нестерова',
      slugs: ['ufa-hudozhestvennyy-muzey-nesterova'],
      scrollTo: 'places',
    },
  },
  {
    id: 'ufa-vatan-view',
    tabId: 'walk',
    icon: 'walk',
    title: 'Панорама у Конгресс-холла вместо ресторанов',
    body: body(
      'Лучший вид на Белую и Забелье открывается бесплатно со склонов парка «Ватан» у памятника Салавату Юлаеву и смотровых за Конгресс-холлом. Вид отсюда круче, чем из любого уфимского панорамного пентхауса.',
    ),
    cta: {
      kind: 'maps',
      label: 'Места на карте',
      href: yandexMapsSearchUrl('Памятник Салавату Юлаеву Уфа'),
      extra: [
        { label: 'Конгресс-холл Торатау', href: yandexMapsSearchUrl('Конгресс-холл Торатау Уфа') },
      ],
    },
  },
  {
    id: 'ufa-aibat-hallyar',
    tabId: 'food',
    icon: 'food',
    title: 'Национальный стритфуд в Aibat Hallyar',
    body: body(
      'Не тратьте деньги на стандартный фастфуд. Заходите в «Aibat Hallyar» за башкирскими кыстыбыями. Огромная лепешка с картофельным пюре, кониной или грибами стоит копейки, но насыщает на полдня.',
    ),
    cta: {
      kind: 'places',
      label: 'Где поесть в Уфе',
      slugs: ['ufa-aibat-hallyar', 'ufa-kumpan-cafe'],
      scrollTo: 'places',
    },
  },
  {
    id: 'ufa-art-kvadrat-free',
    tabId: 'walk',
    icon: 'walk',
    title: 'Бесплатные лекции и кино в Арт-квадрате',
    body: body(
      'Не покупайте билеты на дорогие шоу. Во внутреннем дворе «Арт-квадрата» на открытой синей сцене летом почти каждый день ',
      { s: 'бесплатно' },
      ' крутят кино, устраивают поэтические слэмы, уличный театр и лекции урбанистов.',
    ),
    cta: {
      kind: 'places',
      label: 'Арт-квадрат',
      slugs: ['ufa-art-kvadrat'],
      scrollTo: 'places',
    },
  },
];

const OMSK_ITEMS: CityLifehackItem[] = [
  {
    id: 'omsk-omka-card',
    tabId: 'transit',
    icon: 'transit',
    title: 'Карта «Омка» дешевле наличных',
    body: body(
      'Проезд по транспортной карте «Омка» дешевле оплаты наличными на ',
      { s: '5 ₽' },
      '. Карту берут в киосках и на остановках центра.',
    ),
    cta: {
      kind: 'gis',
      label: 'Транспорт на карте',
      href: twoGisCitySearchUrl('omsk', 'транспорт Омск'),
    },
  },
  {
    id: 'omsk-vrubel-free',
    tabId: 'walk',
    icon: 'museum',
    title: 'Третья среда у Врубеля',
    body: body(
      'Каждая ',
      { s: 'третья среда' },
      ' месяца в музее Врубеля - бесплатный вход для лиц до 18 лет, студентов и многодетных семей. Билеты в Эрмитаж-Сибирь все равно берите на сайте музея.',
    ),
    cta: {
      kind: 'places',
      label: 'Музеи Омска',
      slugs: [
        'omsk-muzey-izobrazitelnyh-iskusstv-vrubelya',
        'omsk-ermitazh-sibir',
        'omsk-kraevedcheskiy-muzey',
      ],
      scrollTo: 'places',
    },
  },
  {
    id: 'omsk-free-sunset',
    tabId: 'walk',
    icon: 'walk',
    title: 'Бесплатный закат у речного вокзала',
    body: body(
      'Не платите за веранду ради Иртыша. Лучший закат - со смотровой у ',
      { s: 'речного вокзала' },
      ' на Лермонтова, 2. Зимой рядом - каток в крепости.',
    ),
    cta: {
      kind: 'maps',
      label: 'Места на карте',
      href: yandexMapsSearchUrl('Речной вокзал Омск'),
      extra: [{ label: 'Омская крепость', href: yandexMapsSearchUrl('Омская крепость') }],
    },
  },
  {
    id: 'omsk-skuratov',
    tabId: 'food',
    icon: 'food',
    title: 'Кофе Skuratov вместо сетевых',
    body: body(
      'На Лермонтова, 4Б берите фильтр и выпечку в Skuratov. Это короткая пауза между речным вокзалом и Камергерским, без очередей фудкортов.',
    ),
    cta: {
      kind: 'places',
      label: 'Где поесть в Омске',
      slugs: ['omsk-skuratov', 'omsk-gastrodvor-lyubinskiy'],
      scrollTo: 'places',
    },
  },
  {
    id: 'omsk-krepost-free',
    tabId: 'walk',
    icon: 'walk',
    title: 'Крепость открыта круглосуточно',
    body: body(
      'Территория Омской крепости, Тарские и Тобольские ворота доступны ',
      { s: '24/7 бесплатно' },
      '. Платите только за музеи внутри квартала.',
    ),
    cta: {
      kind: 'places',
      label: 'Крепость и ворота',
      slugs: ['omsk-omskaya-krepost', 'omsk-tarskie-vorota', 'omsk-tobolskie-vorota'],
      scrollTo: 'places',
    },
  },
];

const CHELYABINSK_ITEMS: CityLifehackItem[] = [
  {
    id: 'chelyabinsk-transport-card',
    tabId: 'transit',
    icon: 'transit',
    title: 'Транспортная карта и 60 минут пересадки',
    body: body(
      'Купите транспортную карту. Безнал дешевле наличных, а пересадка между городскими маршрутами в течение ',
      { s: '60 минут' },
      ' идет по льготному тарифу.',
    ),
    cta: {
      kind: 'gis',
      label: 'Транспорт на карте',
      href: twoGisCitySearchUrl('chelyabinsk', 'транспорт Челябинск'),
    },
  },
  {
    id: 'chelyabinsk-fine-arts-thursday',
    tabId: 'walk',
    icon: 'museum',
    title: 'Бесплатный первый четверг в музее искусств',
    body: body(
      'Музей изобразительных искусств на площади Революции открывает постоянную экспозицию бесплатно каждый ',
      { s: 'первый четверг' },
      ' месяца для студентов и гостей до 18 лет.',
    ),
    cta: {
      kind: 'places',
      label: 'Музеи Челябинска',
      slugs: [
        'chelyabinsk-muzey-izobrazitelnyh-iskusstv',
        'chelyabinsk-gosudarstvennyy-istoricheskiy-muzey-yuzhnogo-urala',
      ],
      scrollTo: 'places',
    },
  },
  {
    id: 'chelyabinsk-miass-view',
    tabId: 'walk',
    icon: 'walk',
    title: 'Бесплатная смотровая на Миасс',
    body: body(
      'Не платите за ресторан ради панорамы. Лучший вид на реку - с набережной у Исторического музея Южного Урала. Вход на смотровую ',
      { s: 'бесплатный' },
      '.',
    ),
    cta: {
      kind: 'maps',
      label: 'Места на карте',
      href: yandexMapsSearchUrl('Набережная реки Миасс Челябинск'),
      extra: [
        {
          label: 'Исторический музей',
          href: yandexMapsSearchUrl('Исторический музей Южного Урала'),
        },
      ],
    },
  },
  {
    id: 'chelyabinsk-pelmeni-ternopolskaya',
    tabId: 'food',
    icon: 'food',
    title: 'Дешевые пельмени на Тернопольской',
    body: body(
      'Уральские пельмени трех мяс на Тернопольской заметно дешевле, чем на террасах Белого рынка. Рынок берите для вечера и атмосферы, обед - в пельменных рядом.',
    ),
    cta: {
      kind: 'places',
      label: 'Где поесть в Челябинске',
      slugs: ['chelyabinsk-belyy-rynok', 'chelyabinsk-restoran-kupecheskiy'],
      scrollTo: 'places',
    },
  },
  {
    id: 'chelyabinsk-victory-tanks',
    tabId: 'walk',
    icon: 'walk',
    title: 'Танки в Саду Победы круглосуточно',
    body: body(
      'Уличная выставка техники в Саду Победы открыта ',
      { s: 'бесплатно 24/7' },
      '. Билет в музей ЧТЗ для этой прогулки не нужен.',
    ),
    cta: {
      kind: 'places',
      label: 'Сад Победы и ЧТЗ',
      slugs: ['chelyabinsk-sad-pobedy', 'chelyabinsk-muzey-istorii-chtz'],
      scrollTo: 'places',
    },
  },
];

const TYUMEN_ITEMS: CityLifehackItem[] = [
  {
    id: 'tyumen-tts-card',
    tabId: 'transit',
    icon: 'transit',
    title: 'Бесконтакт ТТС дешевле наличных',
    body: body(
      'В автобусах Тюмени бесконтактная карта или смартфон ТТС сразу дешевле наличных на ',
      { s: '1-2 ₽' },
      '.',
    ),
    cta: {
      kind: 'gis',
      label: 'Транспорт на карте',
      href: twoGisCitySearchUrl('tyumen', 'транспорт Тюмень'),
    },
  },
  {
    id: 'tyumen-slovtsov-wednesday',
    tabId: 'walk',
    icon: 'museum',
    title: 'Словцов бесплатно в третью среду',
    body: body(
      'Музей Словцова в ',
      { s: 'третью среду' },
      ' месяца бесплатен для лиц до 18 лет и студентов.',
    ),
    cta: {
      kind: 'places',
      label: 'Музей Словцова',
      slugs: ['tyumen-muzey-slovtsova'],
      scrollTo: 'places',
    },
  },
  {
    id: 'tyumen-lovers-bridge-view',
    tabId: 'walk',
    icon: 'walk',
    title: 'Панорама с Моста Влюбленных бесплатно',
    body: body(
      'Не платите за ресторан ради вида. Лучший бесплатный ракурс на четыре яруса Туры - с ',
      { s: 'Моста Влюбленных' },
      '.',
    ),
    cta: {
      kind: 'maps',
      label: 'Места на карте',
      href: yandexMapsSearchUrl('Мост Влюбленных Тюмень'),
      extra: [
        { label: 'Четырехъярусная набережная', href: yandexMapsSearchUrl('Четырехъярусная набережная Тюмень') },
      ],
    },
  },
  {
    id: 'tyumen-shanezhki',
    tabId: 'food',
    icon: 'food',
    title: 'Шанежки на Дзержинского',
    body: body(
      'Уличный стол Арбата: шанежки на Дзержинского вместо сетевого фастфуда. Чай рядом - в «Наличниках» на ',
      { s: 'Дзержинского, 34С' },
      '.',
    ),
    cta: {
      kind: 'places',
      label: 'Где поесть в Тюмени',
      slugs: ['tyumen-chaynaya-nalichniki', 'tyumen-peshehodnaya-ulitsa-dzerzhinskogo'],
      scrollTo: 'places',
    },
  },
  {
    id: 'tyumen-steamship-free',
    tabId: 'walk',
    icon: 'walk',
    title: 'Бесплатные события в пароходной конторе',
    body: body(
      'На площадке пароходной конторы Колмакова у Туры часто проходят ',
      { s: 'бесплатные' },
      ' городские события и ярмарки. Проверяйте афишу у фудкорта, билет не обязателен.',
    ),
    cta: {
      kind: 'places',
      label: 'Пароходная контора',
      slugs: ['tyumen-parohodnaya-kontora-kolmakova', 'tyumen-fudkort-parohodnoy-kontory'],
      scrollTo: 'places',
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
  voronezh: lifehackPack(VORONEZH_ITEMS),
  ryazan: lifehackPack(RYAZAN_ITEMS),
  tula: lifehackPack(TULA_ITEMS),
  smolensk: lifehackPack(SMOLENSK_ITEMS),
  ufa: lifehackPack(UFA_ITEMS),
  omsk: lifehackPack(OMSK_ITEMS),
  chelyabinsk: lifehackPack(CHELYABINSK_ITEMS),
  tyumen: lifehackPack(TYUMEN_ITEMS),
  'rostov-na-donu': lifehackPack(ROSTOV_ITEMS),
  penza: lifehackPack(PENZA_ITEMS),
  tver: lifehackPack(TVER_ITEMS),
  sochi: lifehackPack(SOCHI_ITEMS),
  saratov: lifehackPack(SARATOV_ITEMS),
  yaroslavl: lifehackPack(YAROSLAVL_ITEMS),
  volgograd: lifehackPack(VOLGOGRAD_ITEMS),
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
