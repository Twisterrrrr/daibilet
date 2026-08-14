/**
 * City hub «лайфхаки»: короткие карточки с CTA.
 * Держим отдельно от cityInfo (coords/mustSee) и local-flavor (погода/уникальность).
 * Пакеты: Пермь, Москва, СПб, Калининград, Нижний Новгород. Остальные города - null.
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

const CITY_HUB_LIFEHACKS: Record<string, CityLifehackPack> = {
  perm: lifehackPack(PERM_ITEMS),
  moscow: lifehackPack(MOSCOW_ITEMS),
  'saint-petersburg': lifehackPack(SPB_ITEMS),
  kaliningrad: lifehackPack(KGD_ITEMS),
  'nizhny-novgorod': lifehackPack(NN_ITEMS),
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
