/**
 * Unified destination registry for city hubs and satellite cities.
 * Hub suburb cards + region child scoped pages read the same editorial source.
 */

import { regionChildCityHref } from '../../../backend/src/search-geo-match.ts';

import type { CityInfoEntry, CitySuburbItem, CitySuburbPlace } from './cityInfo.ts';
import { childCityTitleGenitive } from './region-hub-seo.ts';
import { cityHref } from './routes.ts';
import { hydrateDestinationRegistryFromCityInfo as hydrateAutoRegistryEntries } from './destination-registry-auto.ts';
import {
  ABRAMTSEVO_SUBURB_CARD,
  ARHANGELSKOE_SUBURB_CARD,
  BORODINO_SUBURB_CARD,
  ISTRA_SUBURB_CARD,
  KOLOMNA_SUBURB_CARD,
  MELIHOVO_SUBURB_CARD,
  SERGIEV_POSAD_SUBURB_CARD,
  ZVENIGOROD_SUBURB_CARD,
} from './moscow-suburbs.ts';
import {
  GATCHINA_SUBURB_CARD,
  KRONSTADT_SUBURB_CARD,
  KURORT_COAST_SUBURB_CARD,
  ORANIENBAUM_SUBURB_CARD,
  PAVLOVSK_SUBURB_CARD,
  PETERHOF_SUBURB_CARD,
  PUSHKIN_SUBURB_CARD,
  SHLISSELBURG_SUBURB_CARD,
  SOSNOVY_BOR_SUBURB_CARD,
  STRELNA_SUBURB_CARD,
} from './saint-petersburg-suburbs.ts';

const PARENT_HUB_LABELS: Record<string, string> = {
  'saint-petersburg': 'Санкт-Петербург',
  moscow: 'Москва',
  tver: 'Тверь',
  'nizhny-novgorod': 'Нижний Новгород',
  kaliningrad: 'Калининград',
  perm: 'Пермь',
};

export type DestinationKind =
  | 'city-root'
  | 'suburb'
  | 'satellite-city'
  | 'region-child';

export type DestinationPresentation = {
  showInParentHub: boolean;
  showStandalonePage: boolean;
  hubTeaserMaxChars?: number;
};

export type DestinationEditorial = {
  brief: string;
  hookFact?: string;
  whyGo?: string;
  travel?: string;
  faq?: Array<{ q: string; a: string }>;
};

export type DestinationRegistryEntry = {
  id: string;
  slug: string;
  name: string;
  kind: DestinationKind;
  parentHubSlug?: string;
  regionSlug?: string;
  catalogCitySlug?: string;
  editorial: DestinationEditorial;
  suburbCard: CitySuburbItem;
  presentation: DestinationPresentation;
  registryStatus: 'migrated' | 'pending' | 'skipped' | 'needs-data';
};

/** Pilot: Выборг as SPB suburb + LO region child. */
export const VYBORG_SUBURB_CARD: CitySuburbItem = {
  name: 'Выборг',
  desc: 'Средневековый шведский город у финской границы: замок на скале, парк Монрепо и гранитная брусчатка Старого города.',
  mustSeeFilter: 'main',
  places: [
    {
      name: 'Выборгский замок',
      desc: 'единственный в России полностью сохранившийся средневековый шведский рыцарский замок, основанный на скалистом острове в 1293 году.',
      locationSlug: 'vyborg-vyborgskiy-zamok',
      latitude: 60.7158,
      longitude: 28.7292,
    },
    {
      name: 'Башня Святого Олафа',
      desc: 'монументальная замковая доминанта с толщиной стен до четырех метров, служащая главной смотровой площадкой на историческую брусчатку города.',
      locationSlug: 'vyborg-bashnya-svyatogo-olafa',
      latitude: 60.71595,
      longitude: 28.72855,
    },
    {
      name: 'Скальный парк Монрепо',
      desc: 'редкий по красоте скальный пейзажный парк на берегу Выборгского залива с гранитными валунами ледникового периода и Островом мертвых.',
      locationSlug: 'vyborg-skalnyy-park-monrepo',
      latitude: 60.7321,
      longitude: 28.7245,
    },
    {
      name: 'Часовая башня',
      desc: 'старинная колокольня разрушенного собора XV века, на которой до сих пор исправно работают тяжелые часовые механизмы часового мастера.',
      locationSlug: 'vyborg-chasovaya-bashnya',
      latitude: 60.71285,
      longitude: 28.73145,
    },
    {
      name: 'Круглая башня',
      desc: 'мощная средневековая башня на Рыночной площади, сохранившаяся часть городских укреплений XVI века.',
      locationSlug: 'vyborg-kruglaya-bashnya',
      latitude: 60.71355,
      longitude: 28.73285,
    },
    {
      name: 'Анненские укрепления',
      desc: 'бастионный пояс XVIII века на мысе, откуда открывается вид на замок и Выборгский залив.',
      locationSlug: 'vyborg-annenskie-ukrepleniya',
      latitude: 60.71785,
      longitude: 28.72655,
    },
    {
      name: 'Ратуша (Старая ратуша)',
      desc: 'историческое здание городского самоуправления на площади Старой Ратуши в сердце средневекового Выборга.',
      locationSlug: 'vyborg-staraya-ratusha',
      latitude: 60.71235,
      longitude: 28.73055,
    },
    {
      name: 'Библиотека Алвара Аалто',
      desc: 'шедевр мирового архитектурного функционализма с уникальным волнообразным деревянным потолком и системой бестеневого освещения.',
      locationSlug: 'vyborg-biblioteka-alvara-aalto',
      latitude: 60.709,
      longitude: 28.7478,
    },
  ],
  travelVector: 'Северный и Выборгский вектор',
  travelVectorBlurb:
    'Скоростные электрички «Ласточки» от метро «Площадь Ленина» связывают центр с курортным побережьем и Выборгом.',
  stationHub: 'Финляндский вокзал',
  stationName: 'Станция Выборг',
  logisticsExit: 'Станция Выборг',
  gastroStop: { name: 'Ресторан «Таверна»', blurb: 'Средневековая атмосфера: эль, мясо в хлебе, глиняная посуда.' },
  gastroHint:
    'Ресторан «Таверна» (Выборг) - Аутентичный средневековый ресторан в центре старого города, блюда в глиняной посуде, эль и мясо в хлебной булке.',
};

/** Pilot: Торжок as Tver suburb (+ future thin city page). */
export const TORZHOK_SUBURB_CARD: CitySuburbItem = {
  name: 'Торжок',
  desc: 'Древнейший город Тверской земли: Борисоглебский монастырь, золотое шитье, пожарские котлеты и купеческий масштаб на холмах Тверцы.',
  locationSlug: 'tver-torzhok',
  mustSeeFilter: 'main',
  visitMinutes: '6-8 ч',
  latitude: 57.039112,
  longitude: 34.958912,
  address: 'Тверская обл., г. Торжок, ул. Старицкая, 1',
  travelVector: '«Ласточка» / авто ~1 ч',
  travelVectorBlurb: 'Закладывайте на скоростной поезд «Ласточка» или автомобиль около часа, чтобы приехать к 09:30 утра.',
  timingNote: 'По крутым набережным Тверцы к стенам Борисоглебского монастыря, золотое шитье и котлеты оставьте на финал.',
  logisticsExit: 'вокзал Торжка / парковка у монастыря',
  gastroStop: {
    name: 'Пожарская котлета',
    blurb: 'Именно здесь Пушкин заказывал котлеты у Дарьи Пожарской. Берите их в историческом центре, а не в придорожном кафе у трассы.',
  },
  places: [
    {
      name: 'Новоторжский Борисоглебский монастырь',
      desc: 'Один из старейших монастырей России XI века с собором работы Николая Львова.',
      address: 'ул. Старицкая, 1',
      locationSlug: 'tver-torzhok-borisoglebskiy-monastyr',
      latitude: 57.039112,
      longitude: 34.958912,
      mustSeeFilter: 'temple',
      visitMinutes: 50,
    },
    {
      name: 'Свечная башня монастыря',
      desc: 'Высокая башня со шпилем и лучшим видом на весь Торжок.',
      address: 'территория монастыря',
      locationSlug: 'tver-torzhok-svechnaya-bashnya',
      latitude: 57.039412,
      longitude: 34.958512,
      mustSeeFilter: 'views',
      visitMinutes: 20,
    },
    {
      name: 'Этнографический музей им. Пожарского',
      desc: 'Купеческие палаты про гастро-бренд края и историю пожарской котлеты.',
      address: 'центр Торжка',
      locationSlug: 'tver-torzhok-muzey-pozharskogo',
      latitude: 57.040112,
      longitude: 34.960112,
      mustSeeFilter: 'museum',
      visitMinutes: 40,
    },
    {
      name: 'Музей «Торжокские золотошвеи»',
      desc: 'Подлинное золотное шитье канителью, которым расшивали парадные платья двора.',
      address: 'центр Торжка',
      locationSlug: 'tver-torzhok-zolotoshvei',
      latitude: 57.041112,
      longitude: 34.961112,
      mustSeeFilter: 'museum',
      visitMinutes: 40,
    },
    {
      name: 'Деревянная Старо-Вознесенская церковь',
      desc: 'Шедевр поволжского зодчества XVII века без единого гвоздя на обрыве.',
      address: 'правый берег Тверцы',
      locationSlug: 'tver-torzhok-staro-voznesenskaya-tserkov',
      latitude: 57.042112,
      longitude: 34.957112,
      mustSeeFilter: 'temple',
      visitMinutes: 25,
    },
    {
      name: 'Пешеходный мост через Тверцу',
      desc: 'Арочный виадук между купеческим правым берегом и монастырским левым.',
      address: 'река Тверца',
      locationSlug: 'tver-torzhok-peshehodnyy-most',
      latitude: 57.040512,
      longitude: 34.959512,
      mustSeeFilter: 'views',
      visitMinutes: 15,
    },
    {
      name: 'Усадьба Знаменское-Раёк',
      desc: 'Дворцовый палаццо Львова с круговой колоннадой в 15 км от Торжка.',
      address: 'Тверская обл., усадьба Знаменское-Раёк',
      locationSlug: 'tver-torzhok-znamenskoe-rayok',
      latitude: 57.083112,
      longitude: 34.863112,
      mustSeeFilter: 'mansions',
      visitMinutes: 50,
    },
    {
      name: 'Этнографический музей «Василёво»',
      desc: 'Деревянный музей под открытым небом с Чёртовым мостом и храмами на берегах Тверцы.',
      address: 'Тверская обл., Торжокский район, деревня Василёво',
      locationSlug: 'tver-torzhok-vasilevo',
      latitude: 57.096112,
      longitude: 34.968912,
      mustSeeFilter: 'museum',
      visitMinutes: 60,
    },
  ],
};

export const ZELENOGRADSK_SUBURB_CARD: CitySuburbItem = {
  name: 'Зеленоградск (Кранц)',
  desc: 'Главный курортный городок Балтики и «столица котов» с ухоженными улочками и длинным променадом.',
  travelVector: 'Вокзал - центр - море',
  travelVectorBlurb:
    'Сквозная линия от вокзала: Курортный проспект - кот - музейный квартал Саратовская (Домик Ангелов, Мурариум) - бювет и выход к променаду.',
  logisticsExit: 'Ж/д вокзал Зеленоградск',
  timingNote: 'Сквозная линия вокзал - центр - море без возвратов.',
  places: [
    { name: 'Курортный проспект', desc: 'от вокзала - пешеходная улица со старой немецкой застройкой, гирляндами и кошачьими граффити', latitude: 54.9595, longitude: 20.4765 },
    { name: 'Памятник зеленоградским котам', desc: 'вращающаяся скульптура кота - символ и фото-точка на линии проспекта', latitude: 54.9598, longitude: 20.4755 },
    { name: 'Музей «Домик Ангелов»', desc: 'музейный квартал Саратовская - частная коллекция ангелов в деревянном доме', latitude: 54.9582, longitude: 20.4745 },
    { name: 'Музей кошек «Мурариум»', desc: 'музейный квартал Саратовская - 40-метровая водонапорная башня со смотровой', venueSlug: 'kaliningrad-muzey-koshek-murarium', latitude: 54.958914, longitude: 20.481211 },
    { name: 'Бювет «Королева Луиза»', desc: 'выход к променаду - бесплатная минеральная вода у набережной', latitude: 54.9615, longitude: 20.4785 },
    { name: 'Променад и волнорез', desc: 'морской финал линии - длинный променад и волнорез Кранца', latitude: 54.9625, longitude: 20.4795 },
    { name: 'Кирха Святого Адальберта', desc: 'неоготический силуэт курорта - доминанта старого Кранца рядом с центром', latitude: 54.9575, longitude: 20.4805 },
  ],
};

export const SVETLOGORSK_SUBURB_CARD: CitySuburbItem = {
  name: 'Светлогорск (Раушен)',
  desc: 'Живописный курорт на высокой скале среди вековых сосен с атмосферой старого немецкого Раушена.',
  travelVector: 'Спуск и легкий подъем',
  travelVectorBlurb:
    'Верх: архитектура у Светлогорск-2 (башня, вилла Порр, органный зал) - спуск к морю (Зодиак и променад) - канатка обратно к вокзалу.',
  logisticsExit: 'Светлогорск-2',
  timingNote: 'Верх архитектура - спуск к морю - канатка обратно.',
  places: [
    { name: 'Водонапорная башня Раушена', desc: 'у Светлогорск-2 - 25-метровый силуэт в стиле немецкого романтизма, визитная карточка города', locationSlug: 'kaliningrad-vodonapornaya-bashnya-raushena', latitude: 54.943112, longitude: 20.151214 },
    { name: 'Вилла Порр', desc: 'роскошная немецкая вилла начала XX века с дендропарком - следующий шаг верхнего круга', latitude: 54.9455, longitude: 20.1555 },
    { name: 'Органный зал «Макаров»', desc: 'концертный зал на месте капеллы Santa Maria Stella Maris - перед спуском к морю', latitude: 54.9445, longitude: 20.1525 },
    { name: 'Променад и Солнечные часы «Зодиак»', desc: 'спуск к морю - набережная с мозаичными часами из Книги рекордов Гиннесса', latitude: 54.9405, longitude: 20.1485, transitTip: 'Спуск к морю / променад' },
    { name: 'Скульптура «Нимфея»', desc: 'русалка у променада - фото-точка у моря перед канаткой', latitude: 54.9398, longitude: 20.1475 },
    { name: 'Пляж у фуникулера', desc: 'песчаный пляж у нижней станции - перед подъемом', latitude: 54.9408, longitude: 20.1488 },
    { name: 'Канатная дорога', desc: 'финал наверх к вокзалу - ретро-фуникулер с желтыми кабинками от моря к скале', latitude: 54.9415, longitude: 20.1495, transitTip: 'Канатка обратно к вокзалу' },
  ],
};

export const GORODETS_SUBURB_CARD: CitySuburbItem = {
  name: 'Городец',
  desc: 'Древний волжский город мастеров - роспись, пряники, самовары и набережная за ~1,5 часа от Нижнего.',
  locationSlug: 'nizhny-novgorod-gorodets',
  latitude: 56.6448,
  longitude: 43.4723,
  travelVector: 'Автостанция - монастырь - музейный квартал - Волга',
  travelVectorBlurb:
    'Сквозная линия от автостанции: Феодоровский монастырь - Торговая площадь - музейный квартал (пряник, самовары, роспись) - набережная - «Город мастеров» у причала; обратно на автостанцию - такси ~5 мин.',
  stationHub: 'Автовокзал Щербинки',
  stationName: 'Городец / автостанция',
  logisticsExit: 'Автостанция Городец',
  timingNote:
    'Выезд к 8:30-9:00 - дорога ~1,5 часа. Сквозная линия без возвратов; финал у причала, такси ~5 мин на автостанцию.',
  places: [
    { name: 'Феодоровский монастырь', desc: 'действующая обитель - первая точка после автостанции', latitude: 56.6505, longitude: 43.4685, visitMinutes: 45 },
    { name: 'Торговая площадь / центр', desc: 'историческое ядро с купеческими домами и лавками', latitude: 56.644, longitude: 43.472, visitMinutes: 20 },
    { name: 'Музей городецкого пряника', desc: 'пряничная традиция и мастер-классы - старт музейного квартала', latitude: 56.6442, longitude: 43.4715, visitMinutes: 60 },
    { name: 'Музей самоваров', desc: 'одна из лучших коллекций самоваров в России', latitude: 56.6455, longitude: 43.4735, visitMinutes: 60 },
    { name: 'Музей городецкой росписи', desc: 'классическая роспись по дереву - промысел города', latitude: 56.6438, longitude: 43.4708, visitMinutes: 60 },
    { name: 'Набережная Волги / Революции', desc: 'променад с видами на Волгу и купеческую застройку', latitude: 56.6465, longitude: 43.4755, visitMinutes: 40 },
    { name: 'Детский музейный центр «Город мастеров»', desc: 'интерактив и ремёсла - финал у причала', latitude: 56.6445, longitude: 43.4728, visitMinutes: 60, transitTip: 'Финал у причала; такси ~5 мин обратно на автостанцию' },
  ],
};

export const SEMYONOV_SUBURB_CARD: CitySuburbItem = {
  name: 'Семёнов',
  desc: 'Столица золотой хохломы - фабрика, музей и компактный центр за день.',
  locationSlug: 'nizhny-novgorod-semyonov',
  latitude: 56.7889,
  longitude: 44.4917,
  travelVector: 'Вокзал - фабрика - центр - вокзал',
  travelVectorBlurb:
    'От вокзала к фабрике «Хохломская роспись» (сувениры рядом), затем МТЦ «Золотая хохлома», исторический центр / пл. Ленина и Парк Победы; обратно к вокзалу. Бонус по пути - музей Шарыгина.',
  stationHub: 'Московский вокзал НН / автовокзал',
  stationName: 'Станция Семёнов',
  logisticsExit: 'Станция Семёнов',
  timingNote:
    'Выезд к 8:30-9:00 - ~1,5-2 часа. Кольцо вокзал - фабрика - центр - вокзал; музей Шарыгина - бонус по пути к вокзалу.',
  places: [
    { name: 'Фабрика «Хохломская роспись»', desc: 'действующее производство с экскурсиями; сувениры рядом', latitude: 56.7875, longitude: 44.4955, visitMinutes: 60, transitTip: 'От вокзала короткое такси к фабрике' },
    { name: 'Хохломские ряды / сувениры', desc: 'лакированные изделия и посуда у фабрики', latitude: 56.789, longitude: 44.493, visitMinutes: 20, transitTip: 'Сувениры рядом с фабрикой - без отдельного рейса' },
    { name: 'Музейно-туристический центр «Золотая хохлома»', desc: 'главная экспозиция о промысле и росписи', latitude: 56.7895, longitude: 44.4925, visitMinutes: 60 },
    { name: 'Исторический центр / пл. Ленина', desc: 'компактная прогулка по центру после музея', latitude: 56.7885, longitude: 44.491, visitMinutes: 20 },
    { name: 'Парк Победы', desc: 'зелёная пауза перед возвратом к вокзалу', latitude: 56.7905, longitude: 44.4895, visitMinutes: 40 },
  ],
};

export const KURSHKAYA_KOSA_SUBURB_CARD: CitySuburbItem = {
  name: 'Куршская коса',
  desc: 'Уникальный природный песчаный заповедник ЮНЕСКО между Балтийским морем и Куршским заливом - отдельная поездка на день из города.',
  locationSlug: 'kaliningrad-kurshskaya-kosa',
  travelVector: 'Плавное углубление к Литве',
  travelVectorBlurb:
    'Старт с косы от Зеленоградска: Высота Мюллера (32 км) - Танцующий лес (37 км) - дюна Эфа (42 км). Обед в Морском или Рыбачьем; Фрингилла - на обратном пути к сеансу 15:00-16:00.',
  logisticsExit: 'Зеленоградск / въезд на косу',
  timingNote: 'Старт с косы от Зеленоградска; Фрингилла на возврате к 15:00-16:00.',
  gastroStop: { name: 'Морское / Рыбачий', blurb: 'Обед после дюны Эфа - перед разворотом к Фрингилле.' },
  places: [
    { name: 'Высота Мюллера', desc: '32 км от Зеленоградска, утро - пешеходный маршрут по древней части дюны Брухберг через вековой сосновый лес', latitude: 55.1725, longitude: 20.8415, transitTip: 'Авто ~32 км от Зеленоградска - утро' },
    { name: 'Танцующий лес', desc: '37 км, до полудня - аномальный сосновый бор, где стволы изгибаются кольцами и спиралями', locationSlug: 'kaliningrad-tantsuyuschiy-les', latitude: 55.181211, longitude: 20.854112, transitTip: 'Авто дальше по косе (~37 км) - до полудня' },
    { name: 'Дюна Эфа', desc: '42 км, дальняя точка - высокие песчаные дюны с эко-тропами; обед удобно в Морском или Рыбачьем', locationSlug: 'kaliningrad-dyuna-efa', latitude: 55.223412, longitude: 20.901412, transitTip: 'Авто к дальней точке (~42 км); обед в Морском / Рыбачьем' },
    { name: 'Королевский бор', desc: 'вековой лесной массив у дальней части косы - пауза между Эфой и разворотом', latitude: 55.2055, longitude: 20.8755, transitTip: 'Авто / короткая пауза на развороте' },
    { name: 'Посёлок Рыбачий', desc: 'исторический Rossitten - обед и логистика перед возвратом', latitude: 55.1515, longitude: 20.8235, transitTip: 'Авто к Рыбачьему - обед перед возвратом' },
    { name: 'Лебединое озеро', desc: 'пресноводное озеро у Рыбачьего - спокойная пауза на обратном пути', latitude: 55.1535, longitude: 20.8485 },
    { name: 'Орнитологическая станция «Фрингилла»', desc: '23 км на обратном пути - сеанс кольцевания птиц к 15:00-16:00', latitude: 55.1585, longitude: 20.8255, transitTip: 'Авто на возврате (~23 км) - к сеансу 15:00-16:00' },
  ],
};

export const BALTIYSK_SUBURB_CARD: CitySuburbItem = {
  name: 'Балтийск (Пиллау)',
  desc: 'Самый западный город России и главная база Военно-морского флота РФ на Балтике.',
  travelVector: 'Утро город / день коса',
  travelVectorBlurb:
    'Утро в городе: крепость (~11:00-11:30) и казармы - маяк у парома - паром/катер на косу к Нойтифу - финал у Елизаветы на Северном молу после возврата.',
  logisticsExit: 'Паром на Балтийскую косу у маяка',
  timingNote: 'Крепость утром; коса после парома у маяка.',
  places: [
    { name: 'Шведская крепость Пиллау', desc: 'экскурсия ~11:00-11:30 - цитадель XVII века в форме звезды, действующий военный объект', locationSlug: 'kaliningrad-shvedskaya-krepost-pillau', latitude: 54.639411, longitude: 19.891114, transitTip: 'Утро в городе - экскурсия ~11:00-11:30' },
    { name: 'Пехотные казармы', desc: 'красный кирпич начала XX века, штаб Балтийского флота - городской блок до парома', latitude: 54.6405, longitude: 19.8935 },
    { name: 'Маяк Пиллау и памятник Петру I', desc: 'у парома на косу - самый западный маяк России (Шинкель) и памятник Петру I', latitude: 54.6415, longitude: 19.8825 },
    { name: 'Немецкий аэродром Нойтиф', desc: 'паром/катер на Балтийскую косу - заброшенные авиационные ангары на песке', latitude: 54.6125, longitude: 19.8755, transitTip: 'Паром / катер на Балтийскую косу' },
    { name: 'Памятник Елизавете Петровне', desc: 'финал после возврата - монумент на Северном молу у Балтийского пролива', latitude: 54.6385, longitude: 19.8855, transitTip: 'После парома обратно - Северный мол' },
  ],
};

export const YANTARNY_SUBURB_CARD: CitySuburbItem = {
  name: 'Янтарный (Пальмикен)',
  desc: 'Поселок у единственного в мире комбината открытой добычи янтаря и пляжей с международным Голубым флагом.',
  locationSlug: 'kaliningrad-yantarnyy-kombinat',
  travelVector: 'Авто окраина - пешком центр/пляж',
  travelVectorBlurb:
    'Смотровая комбината на авто к открытию; дальше пешком: замок - парк Беккера и променад - пляж «Шахта Анна».',
  logisticsExit: 'Смотровая Янтарного комбината',
  timingNote: 'Комбината на авто к открытию; дальше пешком парк - променад - пляж.',
  places: [
    { name: 'Смотровая площадка Янтарного комбината', desc: 'на авто к открытию - карьер открытой добычи и «янтарная песочница»', locationSlug: 'kaliningrad-smotrovaya-yantarnogo-kombinata', latitude: 54.869212, longitude: 19.94151, transitTip: 'Авто к смотровой комбината - к открытию' },
    { name: 'Музей янтаря / выставка комбината', desc: 'экспозиция у карьера - короткий контекст перед пешим кругом в центр', latitude: 54.8688, longitude: 19.9425 },
    { name: 'Янтарный замок', desc: 'пешком в центр - замок XIV века, музей пыток, оружие и янтарная лавка', latitude: 54.8675, longitude: 19.9435 },
    { name: 'Парк Беккера', desc: 'пешком к морю - парк Мориса Беккера с редкими деревьями; дальше выход на променад к пляжу', latitude: 54.8685, longitude: 19.9455 },
    { name: 'Пляж «Шахта Анна»', desc: 'финал - широкий пляж с «Голубым флагом» после променада', latitude: 54.8725, longitude: 19.9355 },
  ],
};

export const DIVEEVO_SUBURB_CARD: CitySuburbItem = {
  name: 'Дивеево',
  desc: 'Одна из главных православных святынь России - Серафимо-Дивеевский монастырь (длинный day-trip / с ночёвкой).',
  locationSlug: 'nizhny-novgorod-diveevo',
  latitude: 55.0485,
  longitude: 43.2415,
  travelVector: 'Источники утром - монастырь - Канавка',
  travelVectorBlurb:
    'Утром такси ~15 км к источнику Серафима в Цыгановке; затем монастырь (музей, Троицкий, Преображенский, Благовещенский); Канавка - вторая половина дня. Ближние источники - в логистике у обители.',
  stationHub: 'Автовокзал НН / Арзамас',
  stationName: 'Дивеево / автостанция',
  logisticsExit: 'Автостанция Дивеево',
  timingNote:
    'Выезд не позже 7:00 - в пути 3+ часа. Источник в Цыгановке утром (такси ~15 км); Канавка - после обеда. Ближние источники - у обители без отдельного рейса.',
  places: [
    { name: 'Источник Серафима в Цыгановке', desc: 'дальний источник - купель и набор воды утром', latitude: 55.0525, longitude: 43.2355, visitMinutes: 40, transitTip: 'Такси ~15 км утром из Дивеева / от автостанции' },
    { name: 'Музей истории Дивеевской обители', desc: 'контекст монастыря и жизни Серафима Саровского', latitude: 55.0482, longitude: 43.2435, visitMinutes: 60, transitTip: 'Возврат в обитель - музей у входа / рядом с ансамблем' },
    { name: 'Троицкий собор', desc: 'главный храм с мощами преподобного Серафима Саровского', latitude: 55.0488, longitude: 43.2418, visitMinutes: 30 },
    { name: 'Преображенский собор', desc: 'второй крупный собор ансамбля', latitude: 55.0492, longitude: 43.2425, visitMinutes: 30 },
    { name: 'Благовещенский собор', desc: 'новый крупный храм ансамбля', latitude: 55.0495, longitude: 43.2408, visitMinutes: 30 },
    { name: 'Канавка Божьей Матери', desc: 'святая канавка - обход во второй половине дня', latitude: 55.0475, longitude: 43.2405, visitMinutes: 60, transitTip: 'Вторая половина дня - обход Канавки; ближние источники у обители' },
  ],
};

export const MAKARYEV_SUBURB_CARD: CitySuburbItem = {
  name: 'Макарьевский монастырь',
  desc: 'Желтоводский Макариев монастырь на Волге - компактный day-trip к речным просторам.',
  locationSlug: 'nizhny-novgorod-makaryev',
  latitude: 56.0835,
  longitude: 45.0615,
  travelVector: 'Лысково паром - монастырь - село',
  travelVectorBlurb:
    'До Лыскова автобус/авто, далее паром на Макарьево; монастырь и стены/смотровая, затем посёлок. Бонус - страусиная ферма (если остаётся время).',
  stationHub: 'Автовокзал НН / Лысково',
  stationName: 'Макарьево',
  logisticsExit: 'Паром Лысково - Макарьево',
  timingNote:
    'Закладывайте паром Лысково (~30 мин в навигацию). Монастырь - стены/смотровая - посёлок; страусиная ферма - бонус.',
  places: [
    { name: 'Желтоводский Макариев монастырь / Троицкий собор', desc: 'укреплённый ансамбль и главный храм на берегу Волги', latitude: 56.0835, longitude: 45.0615, visitMinutes: 60, transitTip: 'Паром из Лыскова (~30 мин)' },
    { name: 'Крепостные стены / волжская смотровая', desc: 'оборонительный контур и вид на Волгу с берега', latitude: 56.0842, longitude: 45.0605, visitMinutes: 30 },
    { name: 'Посёлок Макарьево', desc: 'тихий посад у стен - короткая прогулка после обители', latitude: 56.0825, longitude: 45.0635, visitMinutes: 20, transitTip: 'Страусиная ферма - бонус отдельным такси/авто' },
  ],
};

export const DESTINATION_REGISTRY: DestinationRegistryEntry[] = [
  {
    id: 'vyborg',
    slug: 'vyborg',
    name: 'Выборг',
    kind: 'satellite-city',
    parentHubSlug: 'saint-petersburg',
    regionSlug: 'leningradskaya-oblast',
    catalogCitySlug: 'vyborg',
    editorial: {
      brief:
        'Средневековый шведский город у финской границы: замок на скале, парк Монрепо и гранитная брусчатка Старого города.',
      whyGo: 'Замок, Монрепо и старый город за один day-trip из Петербурга.',
      travel:
        'Из Петербурга удобнее «Ласточка» с Финляндского вокзала - около 1 часа 15 минут до станции Выборг.',
    },
    suburbCard: VYBORG_SUBURB_CARD,
    presentation: {
      showInParentHub: true,
      showStandalonePage: true,
      hubTeaserMaxChars: 180,
    },
    registryStatus: 'migrated',
  },
  {
    id: 'moscow-sergiev-posad',
    slug: 'sergiev-posad',
    name: 'Сергиев Посад',
    kind: 'suburb',
    parentHubSlug: 'moscow',
    editorial: {
      brief: SERGIEV_POSAD_SUBURB_CARD.desc,
      whyGo: 'Троице-Сергиева Лавра и Золотое кольцо за один день из Москвы.',
      travel: SERGIEV_POSAD_SUBURB_CARD.travelVectorBlurb,
    },
    suburbCard: SERGIEV_POSAD_SUBURB_CARD,
    presentation: { showInParentHub: true, showStandalonePage: false, hubTeaserMaxChars: 200 },
    registryStatus: 'migrated',
  },
  {
    id: 'moscow-istra',
    slug: 'istra',
    name: 'Истра / Новый Иерусалим',
    kind: 'suburb',
    parentHubSlug: 'moscow',
    editorial: {
      brief: ISTRA_SUBURB_CARD.desc,
      whyGo: 'Ново-Иерусалимский монастырь и музейный комплекс - классический северный day-trip.',
      travel: ISTRA_SUBURB_CARD.travelVectorBlurb,
    },
    suburbCard: ISTRA_SUBURB_CARD,
    presentation: { showInParentHub: true, showStandalonePage: false, hubTeaserMaxChars: 200 },
    registryStatus: 'migrated',
  },
  {
    id: 'moscow-kolomna',
    slug: 'kolomna',
    name: 'Коломна',
    kind: 'suburb',
    parentHubSlug: 'moscow',
    editorial: {
      brief: KOLOMNA_SUBURB_CARD.desc,
      whyGo: 'Кремль XVI века, пастила и калачи - юго-восточный вектор из Казанского вокзала.',
      travel: KOLOMNA_SUBURB_CARD.travelVectorBlurb,
    },
    suburbCard: KOLOMNA_SUBURB_CARD,
    presentation: { showInParentHub: true, showStandalonePage: false, hubTeaserMaxChars: 200 },
    registryStatus: 'migrated',
  },
  {
    id: 'moscow-zvenigorod',
    slug: 'zvenigorod',
    name: 'Звенигород',
    kind: 'suburb',
    parentHubSlug: 'moscow',
    editorial: {
      brief: ZVENIGOROD_SUBURB_CARD.desc,
      whyGo: 'Саввино-Сторожевский монастырь и «подмосковная Швейцария» за день.',
      travel: ZVENIGOROD_SUBURB_CARD.travelVectorBlurb,
    },
    suburbCard: ZVENIGOROD_SUBURB_CARD,
    presentation: { showInParentHub: true, showStandalonePage: false, hubTeaserMaxChars: 200 },
    registryStatus: 'migrated',
  },
  {
    id: 'moscow-arhangelskoe',
    slug: 'arhangelskoe',
    name: 'Архангельское',
    kind: 'suburb',
    parentHubSlug: 'moscow',
    editorial: {
      brief: ARHANGELSKOE_SUBURB_CARD.desc,
      whyGo: 'Дворец и парк «Архангельское» - полдня из Москвы.',
      travel: ARHANGELSKOE_SUBURB_CARD.travelVectorBlurb,
    },
    suburbCard: ARHANGELSKOE_SUBURB_CARD,
    presentation: { showInParentHub: true, showStandalonePage: false, hubTeaserMaxChars: 200 },
    registryStatus: 'migrated',
  },
  {
    id: 'moscow-abramtsevo',
    slug: 'abramtsevo',
    name: 'Абрамцево',
    kind: 'suburb',
    parentHubSlug: 'moscow',
    editorial: {
      brief: ABRAMTSEVO_SUBURB_CARD.desc,
      whyGo: 'Усадьба Мамонтовых - Серов, Врубель и «Избушка на курьих ножках».',
      travel: ABRAMTSEVO_SUBURB_CARD.travelVectorBlurb,
    },
    suburbCard: ABRAMTSEVO_SUBURB_CARD,
    presentation: { showInParentHub: true, showStandalonePage: false, hubTeaserMaxChars: 200 },
    registryStatus: 'migrated',
  },
  {
    id: 'moscow-borodino',
    slug: 'borodino',
    name: 'Бородино',
    kind: 'suburb',
    parentHubSlug: 'moscow',
    editorial: {
      brief: BORODINO_SUBURB_CARD.desc,
      whyGo: 'Бородинское поле и музей 1812 года - западный вектор из Москвы.',
      travel: BORODINO_SUBURB_CARD.travelVectorBlurb,
    },
    suburbCard: BORODINO_SUBURB_CARD,
    presentation: { showInParentHub: true, showStandalonePage: false, hubTeaserMaxChars: 200 },
    registryStatus: 'migrated',
  },
  {
    id: 'moscow-melihovo',
    slug: 'melihovo',
    name: 'Мелихово',
    kind: 'suburb',
    parentHubSlug: 'moscow',
    editorial: {
      brief: MELIHOVO_SUBURB_CARD.desc,
      whyGo: 'Музей-заповедник Чехова - дом, сад и аптека на южном направлении.',
      travel: MELIHOVO_SUBURB_CARD.travelVectorBlurb,
    },
    suburbCard: MELIHOVO_SUBURB_CARD,
    presentation: { showInParentHub: true, showStandalonePage: false, hubTeaserMaxChars: 200 },
    registryStatus: 'migrated',
  },
  {
    id: 'spb-peterhof',
    slug: 'peterhof',
    name: 'Петергоф',
    kind: 'suburb',
    parentHubSlug: 'saint-petersburg',
    editorial: {
      brief: PETERHOF_SUBURB_CARD.desc,
      whyGo: 'Фонтаны без насосов, Большой каскад и Нижний парк - классика за один день из Петербурга.',
      travel: PETERHOF_SUBURB_CARD.travelVectorBlurb,
    },
    suburbCard: PETERHOF_SUBURB_CARD,
    presentation: { showInParentHub: true, showStandalonePage: false, hubTeaserMaxChars: 200 },
    registryStatus: 'migrated',
  },
  {
    id: 'spb-pushkin',
    slug: 'pushkin',
    name: 'Царское Село / Пушкин',
    kind: 'suburb',
    parentHubSlug: 'saint-petersburg',
    editorial: {
      brief: PUSHKIN_SUBURB_CARD.desc,
      whyGo: 'Янтарная комната, Екатерининский дворец и Царскосельский лицей за один день.',
      travel: PUSHKIN_SUBURB_CARD.travelVectorBlurb,
    },
    suburbCard: PUSHKIN_SUBURB_CARD,
    presentation: { showInParentHub: true, showStandalonePage: false, hubTeaserMaxChars: 200 },
    registryStatus: 'migrated',
  },
  {
    id: 'spb-kronstadt',
    slug: 'kronstadt',
    name: 'Кронштадт',
    kind: 'suburb',
    parentHubSlug: 'saint-petersburg',
    editorial: {
      brief: KRONSTADT_SUBURB_CARD.desc,
      whyGo: 'Морской Никольский собор, форты и музей подлодки на острове Котлин.',
      travel: KRONSTADT_SUBURB_CARD.travelVectorBlurb,
    },
    suburbCard: KRONSTADT_SUBURB_CARD,
    presentation: { showInParentHub: true, showStandalonePage: false, hubTeaserMaxChars: 200 },
    registryStatus: 'migrated',
  },
  {
    id: 'spb-gatchina',
    slug: 'gatchina',
    name: 'Гатчина',
    kind: 'suburb',
    parentHubSlug: 'saint-petersburg',
    editorial: {
      brief: GATCHINA_SUBURB_CARD.desc,
      whyGo: 'Охотничий дворец, Приорат и подземный ход к Серебряному озеру.',
      travel: GATCHINA_SUBURB_CARD.travelVectorBlurb,
    },
    suburbCard: GATCHINA_SUBURB_CARD,
    presentation: { showInParentHub: true, showStandalonePage: false, hubTeaserMaxChars: 200 },
    registryStatus: 'migrated',
  },
  {
    id: 'spb-pavlovsk',
    slug: 'pavlovsk',
    name: 'Павловск',
    kind: 'suburb',
    parentHubSlug: 'saint-petersburg',
    editorial: {
      brief: PAVLOVSK_SUBURB_CARD.desc,
      whyGo: 'Дворец Камерона и один из крупнейших пейзажных парков Европы.',
      travel: PAVLOVSK_SUBURB_CARD.travelVectorBlurb,
    },
    suburbCard: PAVLOVSK_SUBURB_CARD,
    presentation: { showInParentHub: true, showStandalonePage: false, hubTeaserMaxChars: 200 },
    registryStatus: 'migrated',
  },
  {
    id: 'spb-oranienbaum',
    slug: 'oranienbaum',
    name: 'Ораниенбаум / Ломоносов',
    kind: 'suburb',
    parentHubSlug: 'saint-petersburg',
    editorial: {
      brief: ORANIENBAUM_SUBURB_CARD.desc,
      whyGo: 'Меншиковский дворец, Китайский дворец рококо и Катальная горка.',
      travel: ORANIENBAUM_SUBURB_CARD.travelVectorBlurb,
    },
    suburbCard: ORANIENBAUM_SUBURB_CARD,
    presentation: { showInParentHub: true, showStandalonePage: false, hubTeaserMaxChars: 200 },
    registryStatus: 'migrated',
  },
  {
    id: 'spb-strelna',
    slug: 'strelna',
    name: 'Стрельна',
    kind: 'suburb',
    parentHubSlug: 'saint-petersburg',
    editorial: {
      brief: STRELNA_SUBURB_CARD.desc,
      whyGo: 'Константиновский дворец конгрессов и путевой дом Петра I у залива.',
      travel: STRELNA_SUBURB_CARD.travelVectorBlurb,
    },
    suburbCard: STRELNA_SUBURB_CARD,
    presentation: { showInParentHub: true, showStandalonePage: false, hubTeaserMaxChars: 200 },
    registryStatus: 'migrated',
  },
  {
    id: 'spb-kurort-coast',
    slug: 'kurort-coast',
    name: 'Курортный район / Побережье',
    kind: 'suburb',
    parentHubSlug: 'saint-petersburg',
    editorial: {
      brief: KURORT_COAST_SUBURB_CARD.desc,
      whyGo: 'Сестрорецк, Репино и Комарово: дюны, экотропы и «Пенаты» за один день.',
      travel: KURORT_COAST_SUBURB_CARD.travelVectorBlurb,
    },
    suburbCard: KURORT_COAST_SUBURB_CARD,
    presentation: { showInParentHub: true, showStandalonePage: false, hubTeaserMaxChars: 200 },
    registryStatus: 'migrated',
  },
  {
    id: 'spb-shlisselburg',
    slug: 'shlisselburg',
    name: 'Шлиссельбург / Ладога',
    kind: 'suburb',
    parentHubSlug: 'saint-petersburg',
    editorial: {
      brief: SHLISSELBURG_SUBURB_CARD.desc,
      whyGo: 'Крепость Орешек на острове в истоке Невы и старая имперская тюрьма.',
      travel: SHLISSELBURG_SUBURB_CARD.travelVectorBlurb,
    },
    suburbCard: SHLISSELBURG_SUBURB_CARD,
    presentation: { showInParentHub: true, showStandalonePage: false, hubTeaserMaxChars: 200 },
    registryStatus: 'migrated',
  },
  {
    id: 'spb-sosnovy-bor',
    slug: 'sosnovy-bor',
    name: 'Сосновый Бор / Атомград',
    kind: 'suburb',
    parentHubSlug: 'saint-petersburg',
    editorial: {
      brief: SOSNOVY_BOR_SUBURB_CARD.desc,
      whyGo: 'Андерсенград, Липовский пляж и приморский лесопарк на юге залива.',
      travel: SOSNOVY_BOR_SUBURB_CARD.travelVectorBlurb,
    },
    suburbCard: SOSNOVY_BOR_SUBURB_CARD,
    presentation: { showInParentHub: true, showStandalonePage: false, hubTeaserMaxChars: 200 },
    registryStatus: 'migrated',
  },
  {
    id: 'tver-torzhok',
    slug: 'torzhok',
    name: 'Торжок',
    kind: 'satellite-city',
    parentHubSlug: 'tver',
    catalogCitySlug: 'torzhok',
    editorial: {
      brief:
        'Древнейший город Тверской земли: Борисоглебский монастырь, золотое шитье, пожарские котлеты и купеческий масштаб на холмах Тверцы.',
      whyGo: 'Монастырь XI века, золотое шитье и пожарская котлета за один день из Твери.',
      travel: 'Из Твери - «Ласточка» или авто около часа до вокзала Торжка.',
    },
    suburbCard: TORZHOK_SUBURB_CARD,
    presentation: {
      showInParentHub: true,
      showStandalonePage: false,
      hubTeaserMaxChars: 200,
    },
    registryStatus: 'migrated',
  },
  {
    id: 'kaliningrad-zelenogradsk',
    slug: 'zelenogradsk',
    name: 'Зеленоградск (Кранц)',
    kind: 'satellite-city',
    parentHubSlug: 'kaliningrad',
    regionSlug: 'kaliningradskaya-oblast',
    catalogCitySlug: 'zelenogradsk',
    editorial: {
      brief:
        'Главный курортный городок Балтики и «столица котов» с ухоженными улочками и длинным променадом.',
      whyGo: 'Курортный проспект, Мурариум и променад Кранца за один день из Калининграда.',
      travel:
        'Электричка от Калининграда-Северного до Зеленоградска - около 40 минут; дальше пешком по курортной линии.',
    },
    suburbCard: ZELENOGRADSK_SUBURB_CARD,
    presentation: {
      showInParentHub: true,
      showStandalonePage: true,
      hubTeaserMaxChars: 180,
    },
    registryStatus: 'migrated',
  },
  {
    id: 'kaliningrad-svetlogorsk',
    slug: 'svetlogorsk',
    name: 'Светлогорск (Раушен)',
    kind: 'satellite-city',
    parentHubSlug: 'kaliningrad',
    regionSlug: 'kaliningradskaya-oblast',
    catalogCitySlug: 'svetlogorsk',
    editorial: {
      brief:
        'Живописный курорт на высокой скале среди вековых сосен с атмосферой старого немецкого Раушена.',
      whyGo: 'Башня Раушена, променад и канатная дорога - классический балтийский day-trip.',
      travel:
        'Электричка до Светлогорска-2, затем пеший круг: архитектура наверху - спуск к морю - фуникулер обратно.',
    },
    suburbCard: SVETLOGORSK_SUBURB_CARD,
    presentation: {
      showInParentHub: true,
      showStandalonePage: true,
      hubTeaserMaxChars: 180,
    },
    registryStatus: 'migrated',
  },
  {
    id: 'nn-gorodets',
    slug: 'gorodets',
    name: 'Городец',
    kind: 'satellite-city',
    parentHubSlug: 'nizhny-novgorod',
    regionSlug: 'nizhegorodskaya-oblast',
    catalogCitySlug: 'gorodets',
    editorial: {
      brief:
        'Древний волжский город мастеров - роспись, пряники, самовары и набережная за ~1,5 часа от Нижнего.',
      whyGo: 'Музейный квартал мастеров и набережная Волги за один день из Нижнего.',
      travel:
        'Автобус с автовокзала Щербинки - около 1,5 часа; сквозная линия от автостанции до причала без возвратов.',
    },
    suburbCard: GORODETS_SUBURB_CARD,
    presentation: {
      showInParentHub: true,
      showStandalonePage: true,
      hubTeaserMaxChars: 200,
    },
    registryStatus: 'migrated',
  },
  {
    id: 'nn-semyonov',
    slug: 'semyonov',
    name: 'Семёнов',
    kind: 'satellite-city',
    parentHubSlug: 'nizhny-novgorod',
    regionSlug: 'nizhegorodskaya-oblast',
    catalogCitySlug: 'semyonov',
    editorial: {
      brief: 'Столица золотой хохломы - фабрика, музей и компактный центр за день.',
      whyGo: 'Фабрика «Хохломская роспись» и МТЦ «Золотая хохлома» - главный промысловый маршрут Поволжья.',
      travel:
        'Электричка или автобус от Нижнего - около 1,5-2 часов; кольцо вокзал - фабрика - центр - вокзал.',
    },
    suburbCard: SEMYONOV_SUBURB_CARD,
    presentation: {
      showInParentHub: true,
      showStandalonePage: true,
      hubTeaserMaxChars: 200,
    },
    registryStatus: 'migrated',
  },
  {
    id: 'kaliningrad-kurshskaya-kosa',
    slug: 'kurshskaya-kosa',
    name: 'Куршская коса',
    kind: 'suburb',
    parentHubSlug: 'kaliningrad',
    editorial: {
      brief:
        'Уникальный природный песчаный заповедник ЮНЕСКО между Балтийским морем и Куршским заливом - отдельная поездка на день из города.',
      whyGo: 'Танцующий лес, дюна Эфа и орнитологическая станция «Фрингилла» за один день с косы.',
      travel:
        'Авто от Зеленоградска через въезд на косу; закладывайте сеанс «Фрингиллы» на возврате к 15:00-16:00.',
    },
    suburbCard: KURSHKAYA_KOSA_SUBURB_CARD,
    presentation: {
      showInParentHub: true,
      showStandalonePage: false,
      hubTeaserMaxChars: 200,
    },
    registryStatus: 'migrated',
  },
  {
    id: 'kaliningrad-baltiysk',
    slug: 'baltiysk',
    name: 'Балтийск (Пиллау)',
    kind: 'satellite-city',
    parentHubSlug: 'kaliningrad',
    regionSlug: 'kaliningradskaya-oblast',
    catalogCitySlug: 'baltiysk',
    editorial: {
      brief: 'Самый западный город России и главная база Военно-морского флота РФ на Балтике.',
      whyGo: 'Крепость Пиллау, маяк и паром на Балтийскую косу - западная точка страны за один день.',
      travel: 'Авто или автобус из Калининграда около часа; утро в городе, после обеда - паром на косу.',
    },
    suburbCard: BALTIYSK_SUBURB_CARD,
    presentation: {
      showInParentHub: true,
      showStandalonePage: true,
      hubTeaserMaxChars: 180,
    },
    registryStatus: 'migrated',
  },
  {
    id: 'kaliningrad-yantarny',
    slug: 'yantarnyy',
    name: 'Янтарный (Пальмикен)',
    kind: 'satellite-city',
    parentHubSlug: 'kaliningrad',
    regionSlug: 'kaliningradskaya-oblast',
    catalogCitySlug: 'yantarnyy',
    editorial: {
      brief:
        'Поселок у единственного в мире комбината открытой добычи янтаря и пляжей с международным Голубым флагом.',
      whyGo: 'Карьер комбината, замок и пляж «Шахта Анна» с «Голубым флагом».',
      travel: 'Авто к смотровой комбината к открытию; дальше пеший круг по центру и променаду.',
    },
    suburbCard: YANTARNY_SUBURB_CARD,
    presentation: {
      showInParentHub: true,
      showStandalonePage: true,
      hubTeaserMaxChars: 180,
    },
    registryStatus: 'migrated',
  },
  {
    id: 'nn-diveevo',
    slug: 'diveevo',
    name: 'Дивеево',
    kind: 'satellite-city',
    parentHubSlug: 'nizhny-novgorod',
    regionSlug: 'nizhegorodskaya-oblast',
    catalogCitySlug: 'diveevo',
    editorial: {
      brief:
        'Одна из главных православных святынь России - Серафимо-Дивеевский монастырь (длинный day-trip / с ночёвкой).',
      whyGo: 'Серафимо-Дивеевский монастырь, источники и Канавка - главная паломническая точка Поволжья.',
      travel: 'Автобус из Нижнего или через Арзамас - от 3 часов; выезд не позже 7:00.',
    },
    suburbCard: DIVEEVO_SUBURB_CARD,
    presentation: {
      showInParentHub: true,
      showStandalonePage: true,
      hubTeaserMaxChars: 200,
    },
    registryStatus: 'migrated',
  },
  {
    id: 'nn-makaryev',
    slug: 'makaryev',
    name: 'Макарьевский монастырь',
    kind: 'suburb',
    parentHubSlug: 'nizhny-novgorod',
    editorial: {
      brief: 'Желтоводский Макариев монастырь на Волге - компактный day-trip к речным просторам.',
      whyGo: 'Укреплённый монастырь на Волге и вид с крепостных стен - короткий речной выезд из Нижнего.',
      travel: 'До Лыскова автобус или авто, далее паром на Макарьево (~30 мин в навигацию).',
    },
    suburbCard: MAKARYEV_SUBURB_CARD,
    presentation: {
      showInParentHub: true,
      showStandalonePage: false,
      hubTeaserMaxChars: 200,
    },
    registryStatus: 'migrated',
  },
];

const REGISTRY_BY_ID = new Map<string, DestinationRegistryEntry>(
  DESTINATION_REGISTRY.map((entry) => [entry.id, entry]),
);

/** Bulk-register remaining hub suburbs from CITY_INFO (P3 auto migration). */
export function hydrateDestinationRegistryFromCityInfo(
  cityInfo: Record<string, CityInfoEntry>,
): number {
  return hydrateAutoRegistryEntries(DESTINATION_REGISTRY, REGISTRY_BY_ID, cityInfo);
}

export type DestinationPageGuide = {
  entry: DestinationRegistryEntry;
  name: string;
  brief: string;
  whyGo?: string;
  travel?: string;
  places: CitySuburbPlace[];
  suburbCard: CitySuburbItem;
  regionPageHref: string | null;
  parentHubHref: string | null;
  parentHubLabel: string | null;
};

function namesMatch(left: string, right: string): boolean {
  return String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase();
}

function slugMatches(left?: string | null, right?: string | null): boolean {
  const a = String(left || '').trim().toLowerCase();
  const b = String(right || '').trim().toLowerCase();
  return Boolean(a && b && a === b);
}

export function resolveDestination(id: string): DestinationRegistryEntry | null {
  return REGISTRY_BY_ID.get(id) || null;
}

export function resolveDestinationByCatalogSlug(catalogCitySlug?: string | null): DestinationRegistryEntry | null {
  const slug = String(catalogCitySlug || '').trim().toLowerCase();
  if (!slug) return null;
  return DESTINATION_REGISTRY.find((entry) => slugMatches(entry.catalogCitySlug, slug) || slugMatches(entry.slug, slug)) || null;
}

export function resolveDestinationForHubSuburb(
  parentHubSlug?: string | null,
  suburbName?: string | null,
): DestinationRegistryEntry | null {
  const hub = String(parentHubSlug || '').trim().toLowerCase();
  const name = String(suburbName || '').trim();
  if (!hub || !name) return null;
  return (
    DESTINATION_REGISTRY.find(
      (entry) => slugMatches(entry.parentHubSlug, hub) && namesMatch(entry.name, name),
    ) || null
  );
}

export function resolveDestinationForRegionChild(input: {
  childSlug?: string | null;
  childName?: string | null;
  regionSlug?: string | null;
}): DestinationRegistryEntry | null {
  const regionSlug = String(input.regionSlug || '').trim().toLowerCase();
  const childSlug = String(input.childSlug || '').trim().toLowerCase();
  const childName = String(input.childName || '').trim();

  return (
    DESTINATION_REGISTRY.find((entry) => {
      if (!entry.presentation.showStandalonePage || !entry.regionSlug) return false;
      if (regionSlug && !slugMatches(entry.regionSlug, regionSlug)) return false;
      if (childSlug && (slugMatches(entry.catalogCitySlug, childSlug) || slugMatches(entry.slug, childSlug))) {
        return true;
      }
      if (childName && namesMatch(entry.name, childName)) return true;
      return false;
    }) || null
  );
}

export function buildDestinationRegionPageHref(entry: DestinationRegistryEntry): string | null {
  if (!entry.regionSlug || !entry.presentation.showStandalonePage) return null;
  const citySlug = entry.catalogCitySlug || entry.slug;
  return regionChildCityHref(entry.regionSlug, citySlug);
}

export function buildDestinationParentHubHref(entry: DestinationRegistryEntry): string | null {
  if (!entry.parentHubSlug) return null;
  const label = PARENT_HUB_LABELS[entry.parentHubSlug] || entry.parentHubSlug;
  const focus = entry.catalogCitySlug || entry.slug;
  return `${cityHref({ slug: entry.parentHubSlug, name: label })}?suburb=${encodeURIComponent(focus)}#city-suburbs`;
}

export function buildDestinationPageGuide(entry: DestinationRegistryEntry): DestinationPageGuide {
  return {
    entry,
    name: entry.name,
    brief: entry.editorial.brief,
    whyGo: entry.editorial.whyGo,
    travel: entry.editorial.travel || entry.suburbCard.travelVectorBlurb,
    places: entry.suburbCard.places || [],
    suburbCard: entry.suburbCard,
    regionPageHref: buildDestinationRegionPageHref(entry),
    parentHubHref: buildDestinationParentHubHref(entry),
    parentHubLabel: entry.parentHubSlug ? PARENT_HUB_LABELS[entry.parentHubSlug] || entry.parentHubSlug : null,
  };
}

export function resolveDestinationPageGuideForRegionChild(input: {
  childSlug?: string | null;
  childName?: string | null;
  regionSlug?: string | null;
}): DestinationPageGuide | null {
  const entry = resolveDestinationForRegionChild(input);
  if (!entry) return null;
  return buildDestinationPageGuide(entry);
}

export function buildDestinationRegionLinkLabel(cityName: string): string {
  const base = String(cityName || '')
    .trim()
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();
  const genitive = childCityTitleGenitive(base || cityName);
  return `Афиша и события ${genitive}`;
}

export function resolveDestinationRegionLinkForSuburb(
  parentHubSlug?: string | null,
  suburbName?: string | null,
): { href: string; label: string } | null {
  const entry = resolveDestinationForHubSuburb(parentHubSlug, suburbName);
  if (!entry?.regionSlug || !entry.presentation.showStandalonePage) return null;
  const href = buildDestinationRegionPageHref(entry);
  if (!href) return null;
  return { href, label: buildDestinationRegionLinkLabel(entry.name) };
}

export function resolveDestinationsForHub(parentHubSlug: string): DestinationRegistryEntry[] {
  return DESTINATION_REGISTRY.filter((entry) => entry.parentHubSlug === parentHubSlug);
}

export function destinationSuburbCard(entry: DestinationRegistryEntry): CitySuburbItem {
  return entry.suburbCard;
}

function suburbNamesMatch(left: string, right: string): boolean {
  return String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase();
}

/**
 * Replace migrated suburb cards in CITY_INFO with registry versions.
 * Keeps suburb order; only swaps matching names on configured parent hubs.
 */
export function applyDestinationRegistryToCityInfo(cityInfo: Record<string, CityInfoEntry>): void {
  for (const entry of DESTINATION_REGISTRY) {
    if (!entry.parentHubSlug || !entry.presentation.showInParentHub) continue;
    const hub = cityInfo[entry.parentHubSlug];
    if (!hub?.significantSuburbs?.length) continue;

    hub.significantSuburbs = hub.significantSuburbs.map((suburb) =>
      suburbNamesMatch(suburb.name, entry.name) ? entry.suburbCard : suburb,
    );
  }
}

export type DestinationCoverageRow = {
  hubSlug: string;
  suburbName: string;
  destinationId: string;
  kind: DestinationKind;
  catalogSlug: string | null;
  regionSlug: string | null;
  hasStandalonePage: boolean;
  registryStatus: DestinationRegistryEntry['registryStatus'];
  wiredInHub: boolean;
  placeCount: number;
};

export function listDestinationCoverageRows(
  cityInfo: Record<string, CityInfoEntry>,
): DestinationCoverageRow[] {
  const rows: DestinationCoverageRow[] = [];

  for (const entry of DESTINATION_REGISTRY) {
    const hub = entry.parentHubSlug ? cityInfo[entry.parentHubSlug] : null;
    const wired = Boolean(
      hub?.significantSuburbs?.some((suburb) => suburbNamesMatch(suburb.name, entry.name)),
    );
    rows.push({
      hubSlug: entry.parentHubSlug || '-',
      suburbName: entry.name,
      destinationId: entry.id,
      kind: entry.kind,
      catalogSlug: entry.catalogCitySlug || null,
      regionSlug: entry.regionSlug || null,
      hasStandalonePage: entry.presentation.showStandalonePage,
      registryStatus: entry.registryStatus,
      wiredInHub: wired,
      placeCount: entry.suburbCard.places?.length || 0,
    });
  }

  for (const [hubSlug, info] of Object.entries(cityInfo)) {
    for (const suburb of info.significantSuburbs || []) {
      const alreadyListed = rows.some(
        (row) => row.hubSlug === hubSlug && suburbNamesMatch(row.suburbName, suburb.name),
      );
      if (alreadyListed) continue;
      rows.push({
        hubSlug,
        suburbName: suburb.name,
        destinationId: '-',
        kind: 'suburb',
        catalogSlug: suburb.locationSlug || null,
        regionSlug: null,
        hasStandalonePage: false,
        registryStatus: 'pending',
        wiredInHub: true,
        placeCount: suburb.places?.length || 0,
      });
    }
  }

  return rows.sort((a, b) => {
    const hub = a.hubSlug.localeCompare(b.hubSlug, 'ru');
    if (hub !== 0) return hub;
    return a.suburbName.localeCompare(b.suburbName, 'ru');
  });
}
