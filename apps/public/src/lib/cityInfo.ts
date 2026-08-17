import { mergeMonumentMustSeeIntoCityInfo } from './city-monuments-must-see';
import {
  EKB_DAY_ROUTE_PRESETS,
  EKB_FAQ,
  EKB_MUST_SEE,
  EKB_SUBURBS,
  EKB_TRAVEL,
} from './ekaterinburg-hub';
import {
  KAZAN_DAY_ROUTE_PRESETS,
  KAZAN_FAQ,
  KAZAN_MUST_SEE,
  KAZAN_SUBURBS,
  KAZAN_TRAVEL,
} from './kazan-hub';
import {
  SAMARA_DAY_ROUTE_PRESETS,
  SAMARA_FAQ,
  SAMARA_MUST_SEE,
  SAMARA_SUBURBS,
  SAMARA_TRAVEL,
} from './samara-hub';
import {
  KRASNODAR_DAY_ROUTE_PRESETS,
  KRASNODAR_FAQ,
  KRASNODAR_MUST_SEE,
  KRASNODAR_SUBURBS,
  KRASNODAR_TRAVEL,
} from './krasnodar-hub';
import {
  KRASNOYARSK_DAY_ROUTE_PRESETS,
  KRASNOYARSK_FAQ,
  KRASNOYARSK_MUST_SEE,
  KRASNOYARSK_SUBURBS,
  KRASNOYARSK_TRAVEL,
} from './krasnoyarsk-hub';
import {
  NOVOSIBIRSK_DAY_ROUTE_PRESETS,
  NOVOSIBIRSK_FAQ,
  NOVOSIBIRSK_MUST_SEE,
  NOVOSIBIRSK_SUBURBS,
  NOVOSIBIRSK_TRAVEL,
} from './novosibirsk-hub';
import { MOSCOW_LINE_DAY_ROUTE_PRESETS } from './moscow-line-presets';
import { NIZHNY_NOVGOROD_LINE_DAY_ROUTE_PRESETS } from './nizhny-novgorod-line-presets';
import { SAINT_PETERSBURG_LINE_DAY_ROUTE_PRESETS } from './saint-petersburg-line-presets';
import { KALININGRAD_LINE_DAY_ROUTE_PRESETS } from './kaliningrad-line-presets';

/** Ссылка на venue/location для пункта «Главные места». Без slug - заголовок не линкуем. */
export type CityPlaceLinkFields = {
  /** Явный public path (`/venues/...` или `/locations/...`). */
  href?: string;
  /** Institution / музей / театр - `/venues/{slug}`. */
  venueSlug?: string;
  /** Outdoor / park / monument / embankment - `/locations/{slug}`. */
  locationSlug?: string;
};

export type CityMustSeeItem = CityPlaceLinkFields & {
  name: string;
  desc: string;
  /** Адрес для хаба / my-day, если у Venue ещё нет address. */
  address?: string | null;
  /** Стабильный editorial id для остановки без публичной entity-карточки. */
  dayRouteId?: string;
  /** Optional day-route coords when hub venues omit the place. */
  latitude?: number | null;
  longitude?: number | null;
  /**
   * Optional hub chip override (Главные места / Музеи / Парки / Храмы / Гастро).
   * When set, wins over name/slug heuristics in must-see-filters.
   */
  mustSeeFilter?:
    | 'main'
    | 'gastro'
    | 'museum'
    | 'science'
    | 'literature'
    | 'views'
    | 'street'
    | 'park'
    | 'temple'
    | 'creative'
    | 'secret'
    | 'houses'
    | 'mansions';
  themeTags?: string[];
  seasonLabel?: string;
  /**
   * Typical visit duration in minutes (hub chip «2 часа»).
   * Optional: hide chip when missing. Editorial only - do not invent from API.
   */
  visitMinutes?: number | string;
  places?: CitySuburbPlace[];
  travelVector?: string;
  travelVectorBlurb?: string;
  stationHub?: string;
  /** @deprecated Prefer logisticsExit; kept as fallback for «Где выходить». */
  stationName?: string;
  /** Станция / причал выхода (блок «Логистика»). */
  logisticsExit?: string;
  /**
   * Legacy one-line gastro («Название - текст»).
   * Prefer structured gastroStop for suburb cards.
   */
  gastroHint?: string;
  /** Структурированная гастро-остановка (название + короткий текст). */
  gastroStop?: CitySuburbGastroStop;
  /**
   * Краткое примечание по времени дня (выезд / сеанс / возврат).
   * Для suburbs - в карточке рядом с логистикой; для presets - см. CityDayRoutePreset.
   */
  timingNote?: string;
  /**
   * Совет по перемещению к этой точке от предыдущей (или от станции для первой).
   * UI: серая строка между пунктами «Что посмотреть» / timeline.
   */
  transitTip?: string;
};

/** Гастро-пауза внутри day-trip пригорода. */
export type CitySuburbGastroStop = {
  name: string;
  blurb?: string;
};

/** Вложенная точка внутри significantSuburb (мини-локация day-trip). */
export type CitySuburbPlace = CityPlaceLinkFields & {
  name: string;
  /** Краткое описание для блока «Что посмотреть». */
  desc?: string;
  address?: string | null;
  seasonLabel?: string;
  /** Typical visit duration in minutes; hide chip when missing. */
  visitMinutes?: number | string;
  /** Стабильный editorial id для остановки без публичной entity-карточки. */
  dayRouteId?: string;
  /** Day-route / OSM coords when hub venues omit the nested POI. */
  latitude?: number | null;
  longitude?: number | null;
  /**
   * Совет по перемещению к этой точке от предыдущей (или от станции для первой).
   * UI: серая строка между пунктами «Что посмотреть».
   */
  transitTip?: string;
  /**
   * Заголовок дня над этой точкой (и последующими до следующего dayLabel).
   * Для multi-day suburb cards вроде «Губаха / Усьва».
   */
  dayLabel?: string;
};

/** Пригород / мини-destination с опциональным списком POI. */
export type CitySuburbItem = CityMustSeeItem & {
  places?: CitySuburbPlace[];
};

export type CitySightItem = CityPlaceLinkFields & {
  title: string;
  text: string;
  visitMinutes?: number | string;
};

/** Компактная сезонная подсказка в блоке «Советы» city hub. */
export type CitySeasonalTip = {
  title: string;
  description: string;
  href: string;
  linkLabel: string;
};

/** Именованный шаблон «Мой день» на хабе города /my-day. */
export type CityDayRoutePreset = {
  id: string;
  title: string;
  description?: string;
  /**
   * Краткое примечание по времени: когда выезжать / быть на первой точке.
   * Особенно для пригородов и длинных дней. Подробности - в статье (`blogSlug`).
   * Пустое / отсутствует - UI не рендерит блок.
   */
  timingNote?: string;
  /** Slug статьи блога (`/blog/{blogSlug}`), если есть companion-гайд. */
  blogSlug?: string;
  /**
   * Обложка карточки «Готовые сценарии» (hub magazine / my-day snap).
   * Приоритетнее фото первой остановки и выше blog cover.
   * Нужна, когда у остановок только label-card stubs или нет blogSlug.
   */
  coverImageUrl?: string;
  /** Optional day-trip logistics (same canon as significantSuburbs). */
  travelVector?: string;
  travelVectorBlurb?: string;
  stationHub?: string;
  stationName?: string;
  logisticsExit?: string;
  gastroStop?: CitySuburbGastroStop;
  gastroHint?: string;
  stops: CityMustSeeItem[];
};

export interface CityInfoEntry {
  brief: string;
  /** Яркий хук «Зачем ехать» под hero. */
  hookFact?: string;
  mustSee: CityMustSeeItem[];
  /**
   * Значимые пригороды / day-trip якоря хаба (Петергоф, Царское, Кронштадт…).
   * Отдельный блок на city hub, не смешивать с mustSee «в городе».
   * Опционально `places` - локации внутри мини-destination.
   * Объём nested POI - по насыщенности пригорода (не жёсткие 5):
   * дворец+парк+якоря - 7–9; короткие / точечные day-trip - 4–6.
   */
  significantSuburbs?: CitySuburbItem[];
  /** Топ достопримечательностей (редакционный). */
  sights?: CitySightItem[];
  /** Готовые именованные маршруты (кнопки пресетов). */
  dayRoutePresets?: CityDayRoutePreset[];
  /** Как добраться и лучший сезон (единый блок). */
  travel?: string;
  /** Практичный сезонный факт со ссылкой на тематическую подборку. */
  seasonalTip?: CitySeasonalTip;
  /** Редакционный FAQ города (не билетный). */
  faq?: Array<{ q: string; a: string }>;
}

/** Резолв href пункта city guide. Не выдумывает path без явных полей. */
export function resolveCityPlaceHref(place: CityPlaceLinkFields | null | undefined): string | null {
  if (!place) return null;
  const href = String(place.href || '').trim();
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  const venueSlug = String(place.venueSlug || '').trim();
  if (venueSlug) return `/venues/${venueSlug}`;
  const locationSlug = String(place.locationSlug || '').trim();
  if (locationSlug) return `/locations/${locationSlug}`;
  return null;
}

const SLUG_ALIASES: Record<string, string> = {
  moskva: 'moscow',
  'sankt-peterburg': 'saint-petersburg',
  'nizhniy-novgorod': 'nizhny-novgorod',
  'нижний-новгород': 'nizhny-novgorod',
  'нижнии-новгород': 'nizhny-novgorod',
  'velikiy-novgorod': 'veliky-novgorod',
  'rostov-on-don': 'rostov-na-donu',
  arkhangelsk: 'arhangelsk',
  astrakhan: 'astrahan',
  blagoveshchensk: 'blagoveschensk-amurskaya-oblast',
  'blagoveshchensk-amurskaya-oblast': 'blagoveschensk-amurskaya-oblast',
  'yuzhno-sakhalinsk': 'yuzhno-sahalinsk',
  kirov: 'kirov-kirovskaya-oblast',
  lipetsk: 'lipeck',
  khabarovsk: 'habarovsk'
};

/** Компактная editorial-точка для preset. Основной mustSee остаётся источником ссылок и координат. */
const spbPresetStop = (
  name: string,
  route?: Pick<
    CityMustSeeItem,
    | 'dayRouteId'
    | 'latitude'
    | 'longitude'
    | 'venueSlug'
    | 'locationSlug'
    | 'address'
    | 'desc'
    | 'transitTip'
    | 'mustSeeFilter'
  >,
): CityMustSeeItem => ({
  name,
  desc: route?.desc || 'Точка маршрута по Санкт-Петербургу.',
  ...route
});

/** Компактная editorial-точка для preset Москвы. */
const mskPresetStop = (
  name: string,
  route?: Pick<
    CityMustSeeItem,
    'dayRouteId' | 'latitude' | 'longitude' | 'venueSlug' | 'locationSlug' | 'address' | 'desc'
  >,
): CityMustSeeItem => ({
  name,
  desc: route?.desc || 'Точка маршрута по Москве.',
  ...route
});

export const CITY_INFO: Record<string, CityInfoEntry> = {
  'saint-petersburg': {
    brief:
      'Санкт-Петербург - город белых ночей, разводных мостов, строгой архитектуры и сотен рек и каналов. От гранитных набережных центра до Лахта Центра, от глубокого метро до фонтанов Петергофа здесь легко собрать маршрут на несколько дней.',
    hookFact:
      'А вы знали, что Петергофские фонтаны работают за счет естественного перепада высот без насосов, а Лахта Центр стал самым высоким зданием Европы? Петербургское метро при этом входит в число самых глубоких в мире.',
    mustSee: [

      { name: 'Государственный Эрмитаж (Зимний дворец)', desc: 'Один из величайших художественных музеев планеты, чья колоссальная коллекция из трех миллионов экспонатов охраняется официальной штатной службой эрмитажных котов со времен императрицы Елизаветы Петровны.', mustSeeFilter: 'main', venueSlug: 'ermitazh', address: 'Дворцовая наб., 34', latitude: 59.939864, longitude: 30.314566 },
      { name: 'Петропавловская крепость', desc: 'Историческое военное ядро города на Заячьем острове, которое ни разу не участвовало в реальных боях, став главной политической тюрьмой империи и местом традиционного ежедневного полуденного выстрела.', mustSeeFilter: 'main', locationSlug: 'saint-petersburg-petropavlovskaya-krepost', address: 'Территория Петропавловская Крепость, 3', latitude: 59.950239, longitude: 30.316472 },
      { name: 'Дворцовая площадь', desc: 'Главное парадное пространство Петербурга, в центре которого высится монументальная 47-метровая Александровская колонна, удерживаемая на своем гранитном постаменте исключительно за счет собственного веса в 600 тонн.', mustSeeFilter: 'main', locationSlug: 'saint-petersburg-dvortsovaya-ploschad', address: 'Дворцовая площадь', latitude: 59.939095, longitude: 30.315868 },
      { name: 'Исаакиевский собор', desc: 'Грандиозный купольный гигант, на золочение которого ушло более 100 килограммов чистого золота, а его массивные гранитные колонны до сих пор хранят глубокие шрамы и выбоины от осколков снарядов времен блокады.', mustSeeFilter: 'main', locationSlug: 'saint-petersburg-isaakievskiy-sobor', address: 'Исаакиевская площадь, 4', latitude: 59.934084, longitude: 30.306103 },
      { name: 'Спас на Крови', desc: 'Невероятный собор-памятник в неорусском стиле, возведенный на месте смертельного ранения императора Александра II и знаменитый своей уникальной внутренней отделкой из 7500 квадратных метров сложнейшей мозаики.', mustSeeFilter: 'main', locationSlug: 'saint-petersburg-spas-na-krovi', address: 'наб. канала Грибоедова, 2Б', latitude: 59.940114, longitude: 30.328886 },
      { name: 'Казанский собор', desc: 'Величественный ампирный собор с грандиозной полукруглой колоннадой, ставший главным мемориалом отечественной войны 1812 года, где хранятся трофейные французские ключи и покоится прах фельдмаршала Михаила Кутузова.', mustSeeFilter: 'main', locationSlug: 'saint-petersburg-kazanskiy-sobor', address: 'Казанская площадь, 2', latitude: 59.934165, longitude: 30.324513 },
      { name: 'Невский проспект', desc: 'Главная четырехкилометровая артерия города, получившая свой знаменитый излом из-за навигационной ошибки строителей, шедших навстречу друг другу с двух сторон сквозь глухие болота.', mustSeeFilter: 'main' , seasonLabel: 'Зимний эксклюзив: иллюминация - ноябрь-апрель', locationSlug: 'saint-petersburg-nevskiy-prospekt', address: 'Невский проспект', latitude: 59.934271, longitude: 30.334460 },
      { name: 'Адмиралтейство', desc: 'Историческая корабельная верфь в стиле ампир, чей знаменитый золоченый шпиль с 65-килограммовым корабликом-флюгером служит точкой отсчета для трех главных лучей-улиц городского центра.', mustSeeFilter: 'main', locationSlug: 'saint-petersburg-admiralteystvo', address: 'Адмиралтейский проезд, 1', latitude: 59.937390, longitude: 30.308560 },
      { name: 'Медный всадник (Сенатская площадь)', desc: 'Легендарный памятник Петру Великому, отлитый из бронзы и установленный на гигантском монолитном Гром-камне, который тащили к побережью Невы на специальных металлических шарах более девяти месяцев.', mustSeeFilter: 'main', locationSlug: 'saint-petersburg-mednyy-vsadnik', address: 'Сенатская площадь', latitude: 59.936384, longitude: 30.302194 },
      { name: 'Стрелка Васильевского острова', desc: 'Один из самых узнаваемых водных фасадов мира, где величественные Ростральные колонны в XIX веке выполняли роль портовых маяков, освещая путь заходящим в Неву торговым судам огнем из чаш с конопляным маслом.', mustSeeFilter: 'main', locationSlug: 'saint-petersburg-strelka-vasilevskogo-ostrova', address: 'Биржевая площадь', latitude: 59.944200, longitude: 30.306894 },
      { name: 'Михайловский замок', desc: 'Мрачный розовый дворец-крепость, окруженный оборонительными рвами, который не смог спасти своего параноидального создателя императора Павла I, задушенного заговорщиками в собственной спальне спустя сорок дней после новоселья.', mustSeeFilter: 'main', locationSlug: 'saint-petersburg-mihaylovskiy-zamok', address: 'Садовая ул., 2', latitude: 59.940156, longitude: 30.338576 },
      { name: 'Аничков мост', desc: 'Историческая переправа через реку Фонтанку, получившая мировую известность благодаря четырем бронзовым скульптурным группам Петра Клодта, наглядно показывающим последовательные стадии укрощения дикого коня человеком.', mustSeeFilter: 'main', locationSlug: 'saint-petersburg-anichkov-most', address: 'Невский проспект (через р. Фонтанку)', latitude: 59.933215, longitude: 30.343276 },
      { name: 'Государственный Русский музей', desc: 'Главное собрание русского искусства в Михайловском дворце.', mustSeeFilter: 'museum',
        venueSlug: 'saint-petersburg-russkiy-muzey', address: 'Инженерная ул., 4', latitude: 59.938634, longitude: 30.332170 },
      { name: 'Главный штаб (Эрмитаж)', desc: 'Импрессионисты и панорама площади через арку.', mustSeeFilter: 'museum', venueSlug: 'saint-petersburg-glavnyy-shtab-ermitazh', address: 'Дворцовая площадь, 6-8', latitude: 59.937243, longitude: 30.320140 },
      { name: 'Кунсткамера', desc: 'Петровский кабинет редкостей и глобус.', mustSeeFilter: 'museum',
        venueSlug: 'saint-petersburg-kunstkamera', address: 'Университетская наб., 3', latitude: 59.941434, longitude: 30.304561 },
      { name: 'Музей Фаберже', desc: 'Яйца и ювелирка в Шуваловском дворце.', mustSeeFilter: 'museum', venueSlug: 'saint-petersburg-muzey-faberzhe', address: 'наб. реки Фонтанки, 21', latitude: 59.934488, longitude: 30.342111 },
      { name: 'Эрарта', desc: 'Крупный частный музей современного искусства.', mustSeeFilter: 'museum', venueSlug: 'erarta', address: '29-я линия В.О., 2', latitude: 59.932230, longitude: 30.251411 },
      { name: 'Юсуповский дворец', desc: 'Один из самых пышных частных дворцов Петербурга, известный парадными интерьерами и легендой о Распутине.', mustSeeFilter: 'museum',
        locationSlug: 'saint-petersburg-yusupovskiy-dvorets', address: 'наб. реки Мойки, 94', latitude: 59.929112, longitude: 30.302302 },
      { name: 'Центральный военно-морской музей', desc: 'Флотская история у Синего моста / новый корпус.', mustSeeFilter: 'museum', venueSlug: 'saint-petersburg-tsentralnyy-voenno-morskoy-muzey', address: 'ул. Труда, 5', latitude: 59.930491, longitude: 30.294154 },
      { name: 'Музей обороны и блокады Ленинграда', desc: 'Блокадная память без прикрас.', mustSeeFilter: 'museum', venueSlug: 'saint-petersburg-muzey-oborony-i-blokady-leningrada', address: 'Соляной пер., 9', latitude: 59.943187, longitude: 30.340798 },
      { name: 'Зоологический музей РАН', desc: 'Кит в зале и классическая натуралистика.', mustSeeFilter: 'museum', venueSlug: 'saint-petersburg-zoologicheskiy-muzey-ran', address: 'Университетская наб., 1', latitude: 59.942183, longitude: 30.305630 },
      { name: 'Музей политической истории (особняк Кшесинской)', desc: 'XX век в модерне у Петропавловки.', mustSeeFilter: 'museum' , themeTags: ['Северный модерн'], venueSlug: 'saint-petersburg-muzey-politicheskoy-istorii-osobnyak-kshesinskoy', address: 'ул. Куйбышева, 2-4', latitude: 59.954848, longitude: 30.327694 },
      { name: 'Музей Анны Ахматовой в Фонтанном доме', desc: 'Уютная, но трагичная квартира-коммуналка в южном флигеле Шереметевского дворца, сохранившая атмосферу Серебряного века и зафиксировавшая тридцать лет жизни великой поэтессы.', mustSeeFilter: 'museum', venueSlug: 'saint-petersburg-muzey-anny-ahmatovoy-v-fontannom-dome', address: 'наб. реки Фонтанки, 34', latitude: 59.936081, longitude: 30.345869 },
      { name: 'Литературно-мемориальный музей Достоевского', desc: 'Угловая квартира на Кузнечном переулке, в которой писатель провел свои последние годы и создал финальный литературный шедевр - роман «Братья Карамазовы».', mustSeeFilter: 'museum', venueSlug: 'saint-petersburg-literaturno-memorialnyy-muzey-dostoevskogo', address: 'Кузнечный пер., 5/2', latitude: 59.926941, longitude: 30.350325 },
      { name: 'Мраморный дворец', desc: 'Филиал Русского музея, редкий облицованный фасад.', mustSeeFilter: 'museum', locationSlug: 'saint-petersburg-mramornyy-dvorets', address: 'Миллионная ул., 5/1', latitude: 59.944983, longitude: 30.327092 },
      { name: 'Артиллерийский музей', desc: 'Пушки во дворе у кронверка.', mustSeeFilter: 'museum', venueSlug: 'saint-petersburg-artilleriyskiy-muzey', address: 'Александровский парк, 7', latitude: 59.953835, longitude: 30.313888 },
      { name: 'Дворцовая набережная', desc: 'Фасад Зимнего дворца и истинное зеркало Невы.', mustSeeFilter: 'views', locationSlug: 'saint-petersburg-dvortsovaya-naberezhnaya', address: 'Дворцовая набережная', latitude: 59.943105, longitude: 30.321685 },
      { name: 'Дворцовый мост в развод', desc: 'Ночной ритуал навигации.', mustSeeFilter: 'views' , seasonLabel: 'Летняя навигация - май-октябрь', locationSlug: 'saint-petersburg-dvortsovyy-most', address: 'Дворцовый мост', latitude: 59.941031, longitude: 30.308256 },
      { name: 'Банковский мост', desc: 'Пешеходный мост с золотыми грифонами на канале Грибоедова - один из самых узнаваемых видов города.', mustSeeFilter: 'views', locationSlug: 'saint-petersburg-bankovskiy-most', address: 'наб. канала Грибоедова (у ФИНЭКа)', latitude: 59.932204, longitude: 30.324976 },
      { name: 'Набережная канала Грибоедова', desc: 'Изгибы к Спасу и Казанскому.', mustSeeFilter: 'views', locationSlug: 'saint-petersburg-naberezhnaya-kanala-griboedova', address: 'наб. канала Грибоедова', latitude: 59.931210, longitude: 30.312984 },
      { name: 'Университетская набережная', desc: 'Сфинксы у Академии художеств и широкий вид на стрелку Васильевского острова через Неву.', mustSeeFilter: 'views', locationSlug: 'saint-petersburg-universitetskaya-naberezhnaya', address: 'Университетская набережная', latitude: 59.938722, longitude: 30.297491 },
      { name: 'Английская набережная', desc: 'Парадные особняки по соседству с Сенатской площадью.', mustSeeFilter: 'views', locationSlug: 'saint-petersburg-angliyskaya-naberezhnaya', address: 'Английская набережная', latitude: 59.934149, longitude: 30.289389 },
      { name: 'Набережная реки Мойки', desc: 'Камерный маршрут дворцов и мостов.', mustSeeFilter: 'views', locationSlug: 'saint-petersburg-naberezhnaya-reki-moyki', address: 'наб. реки Мойки', latitude: 59.932906, longitude: 30.318469 },
      { name: 'Набережная Фонтанки', desc: 'Длинный городской променад вдоль реки.', mustSeeFilter: 'views', locationSlug: 'saint-petersburg-naberezhnaya-fontanki', address: 'наб. реки Фонтанки', latitude: 59.930438, longitude: 30.334057 },
      { name: 'Петроградская набережная', desc: 'Аврора и вид на Петропавловку.', mustSeeFilter: 'views', locationSlug: 'saint-petersburg-petrogradskaya-naberezhnaya', address: 'Петроградская набережная', latitude: 59.957580, longitude: 30.337090 },
      { name: 'Колоннада Исаакия', desc: 'Платная смотровая, лучший обзор крыш центра.', mustSeeFilter: 'views',
        locationSlug: 'saint-petersburg-kolonnada-isaakiya', address: 'Исаакиевская площадь, 4 (вход с юга)', latitude: 59.933946, longitude: 30.306440 },
      { name: 'Смотровая Лахта Центра', desc: 'Современная высота и Финский залив.', mustSeeFilter: 'views', locationSlug: 'saint-petersburg-smotrovaya-lahta-tsentra', address: 'Высотная ул., 1', latitude: 59.987178, longitude: 30.177242 },
      { name: 'Приморский проспект / парк 300-летия', desc: 'Залив, закаты, небоскрёб в кадре.', mustSeeFilter: 'views',
        locationSlug: 'saint-petersburg-primorskiy-prospekt-park-300-letiya', address: 'Приморский пр., 74', latitude: 59.983056, longitude: 30.205216 },
      { name: 'Троицкий мост', desc: 'Классический ракурс на Петропавловскую крепость и ростральные колонны со стороны Троицкой площади.', mustSeeFilter: 'views', locationSlug: 'saint-petersburg-troitskiy-most', address: 'Троицкий мост', latitude: 59.948792, longitude: 30.327533 },
      { name: 'Улица Зодчего Росси', desc: 'Идеальная театральная перспектива к Александринскому театру, эталон петербургской регулярной застройки.', mustSeeFilter: 'street', locationSlug: 'saint-petersburg-ulitsa-zodchego-rossi', address: 'ул. Зодчего Росси', latitude: 59.930064, longitude: 30.336495 },
      { name: 'Малая Садовая', desc: 'Короткий пешеходный карман у Невского.', mustSeeFilter: 'street', locationSlug: 'saint-petersburg-malaya-sadovaya-ulitsa', address: 'Малая Садовая ул.', latitude: 59.934375, longitude: 30.337968 },
      { name: 'Большая Морская', desc: 'Банки, особняки, тише Невского.', mustSeeFilter: 'street',
        locationSlug: 'saint-petersburg-bolshaya-morskaya', address: 'Большая Морская ул.', latitude: 59.933857, longitude: 30.309088 },
      { name: 'Улица Рубинштейна', desc: 'Вечерняя жизнь центра: бары, рестораны и старый доходный фонд между Владимирским и Фонтанкой.', mustSeeFilter: 'street', locationSlug: 'saint-petersburg-ulitsa-rubinshteyna', address: 'ул. Рубинштейна', latitude: 59.931393, longitude: 30.344445 },
      { name: 'Коломна', desc: 'Тихие каналы и литературный маршрут «Пиковой дамы».', mustSeeFilter: 'street',
        locationSlug: 'saint-petersburg-kolomna', address: 'Исторический район Коломна', latitude: 59.923184, longitude: 30.285885 },
      { name: 'Линии Васильевского острова', desc: 'Сетка дворов и повседневная жизнь острова.', mustSeeFilter: 'street', locationSlug: 'saint-petersburg-linii-vasilevskogo-ostrova', address: 'Васильевский остров (от 1-й до 29-й линии)', latitude: 59.938171, longitude: 30.276451 },
      { name: 'Открытые дворы-колодцы (экскурсии по дворам)', desc: 'Классический петербургский код.', mustSeeFilter: 'secret',
        locationSlug: 'saint-petersburg-otkrytye-dvory-kolodtsy-ekskursii-po-dvoram'
      },
      { name: 'Гостиный двор / Пассаж', desc: 'Торговые пассажи XIX века.', mustSeeFilter: 'street',
        locationSlug: 'saint-petersburg-gostinyy-dvor-passazh', address: 'Невский пр., 35 / Невский пр., 48', latitude: 59.934447, longitude: 30.332995 },
      { name: 'Каменноостровский проспект', desc: 'Модерн и зелень Петроградской стороны.', mustSeeFilter: 'street' , themeTags: ['Северный модерн'],
        locationSlug: 'saint-petersburg-kamennoostrovskiy-prospekt', address: 'Каменноостровский проспект', latitude: 59.964257, longitude: 30.312959 },
      { name: 'Пешеходная Малая Конюшенная', desc: 'Церковь св. Анны и камерный центр.', mustSeeFilter: 'street',
        locationSlug: 'saint-petersburg-peshehodnaya-malaya-konyushennaya', address: 'Малая Конюшенная ул.', latitude: 59.936647, longitude: 30.324836 },
      { name: 'Лофт Проект Этажи', desc: 'Дворик, крыша и независимая культура.', mustSeeFilter: 'street', locationSlug: 'saint-petersburg-loft-proekt-etazhi', address: 'Лиговский пр., 74', latitude: 59.922112, longitude: 30.355675 },
      { name: 'Летний сад', desc: 'Старейший регулярный ансамбль города, заложенный Петром I, со знаменитой кованой решеткой Фельтена, фонтанами и венецианскими мраморными статуями.', mustSeeFilter: 'park',
        locationSlug: 'saint-petersburg-letniy-sad', address: 'Летний сад', latitude: 59.944903, longitude: 30.335552 },
      { name: 'Михайловский сад', desc: 'Уникальный парк-трансформер, сочетающий черты строгого французского и пейзажного английского садоводства.', mustSeeFilter: 'park',
        locationSlug: 'saint-petersburg-mihaylovskiy-sad', address: 'Михайловский сад', latitude: 59.940713, longitude: 30.332304 },
      { name: 'Новая Голландия', desc: 'Рукотворный остров-парк внутри бывших складов корабельного леса, превращенный в самое стильное общественное пространство города.', mustSeeFilter: 'park' , themeTags: ['Ленинградский рок и андеграунд'], seasonLabel: 'Зимний эксклюзив: каток в Новой Голландии', locationSlug: 'saint-petersburg-novaya-gollandiya', address: 'наб. Адмиралтейского канала, 2', latitude: 59.930030, longitude: 30.289389 },
      { name: 'Таврический сад', desc: 'Исторический парк вокруг резиденции Потемкина со знаменитой кирпичной теплой оранжереей.', mustSeeFilter: 'park',
        locationSlug: 'saint-petersburg-tavricheskiy-sad', address: 'Таврический сад', latitude: 59.944955, longitude: 30.373400 },
      { name: 'ЦПКиО им. Кирова (Елагин остров)', desc: 'Бывшая царская резиденция, превращенная в зеленый остров-заповедник с ручными белками.', mustSeeFilter: 'park',
        locationSlug: 'saint-petersburg-tspkio-im-kirova-elagin-ostrov', address: 'Елагин остров, 4', latitude: 59.979679, longitude: 30.259972 },
      { name: 'Приморский парк Победы (Крестовский остров)', desc: 'Огромный зеленый массив с центральной двухкилометровой аллеей, ведущей к суперсовременному стадиону, и парком аттракционов «Диво-Остров».', mustSeeFilter: 'park',
        locationSlug: 'saint-petersburg-primorskiy-park-pobedy-krestovskiy-ostrov', address: 'Крестовский остров', latitude: 59.971034, longitude: 30.245842 },
      { name: 'Марсово поле', desc: 'Бывший военный плац, превращенный в сквер с сиренью и одним из первых мемориалов с Вечным огнем.', mustSeeFilter: 'park',
        locationSlug: 'saint-petersburg-marsovo-pole', address: 'Марсово поле', latitude: 59.943180, longitude: 30.331580 },
      { name: 'Юсуповский сад', desc: 'Небольшой парк с извилистыми прудами, ставший колыбелью и школой советского фигурного катания.', mustSeeFilter: 'park',
        locationSlug: 'saint-petersburg-yusupovskiy-sad', address: 'Садовая ул., 54', latitude: 59.924294, longitude: 30.317506 },
      { name: 'Ботанический сад Петра Великого', desc: 'Старейшие высотные оранжереи Аптекарского острова с уникальной коллекцией тропических пальм.', mustSeeFilter: 'park',
        locationSlug: 'saint-petersburg-botanicheskiy-sad-petra-velikogo', address: 'ул. Профессора Попова, 2', latitude: 59.970221, longitude: 30.337033 },
      { name: 'Каменный остров', desc: 'Тихий парковый архипелаг, исторически застроенный номенклатурными государственными и купеческими дачами.', mustSeeFilter: 'park',
        locationSlug: 'saint-petersburg-kamennyy-ostrov', address: 'Каменный остров', latitude: 59.977464, longitude: 30.301546 },
      { name: 'Александровский парк', desc: 'Первый публичный парк города, проложенный на месте гласиса Петропавловской крепости.', mustSeeFilter: 'park',
        locationSlug: 'saint-petersburg-aleksandrovskiy-park', address: 'Александровский парк', latitude: 59.955519, longitude: 30.312959 },
      { name: 'Смольный собор', desc: 'Праздничный бело-голубой шедевр барокко работы Франческо Бартоломео Растрелли с колокольней, служащей самой высокой обзорной точкой центра.', mustSeeFilter: 'temple',
        locationSlug: 'saint-petersburg-smolnyy-sobor', address: 'пл. Растрелли, 1', latitude: 59.948958, longitude: 30.395724 },
      { name: 'Александро-Невская лавра', desc: 'Первый и крупнейший мужской монастырь города, основанный Петром Великим, с историческими некрополями мастеров искусств.', mustSeeFilter: 'temple',
        locationSlug: 'saint-petersburg-aleksandro-nevskaya-lavra', address: 'наб. реки Монастырки, 1', latitude: 59.920803, longitude: 30.387920 },
      { name: 'Николо-Богоявленский морской собор', desc: 'Изящный двухэтажный барочный храм в Коломне, традиционное место молебнов и памяти российских моряков.', mustSeeFilter: 'temple',
        locationSlug: 'saint-petersburg-nikolo-bogoyavlenskiy-morskoy-sobor', address: 'Никольская пл., 13', latitude: 59.922115, longitude: 30.300067 },
      { name: 'Владимирский собор', desc: 'Барочно-классический собор, постоянным прихожанином которого в конце жизни был Ф. М. Достоевский.', mustSeeFilter: 'temple',
        locationSlug: 'saint-petersburg-vladimirskiy-sobor', address: 'Владимирская пл., 20', latitude: 59.927649, longitude: 30.348128 },
      { name: 'Чесменская церковь', desc: 'Уникальный розовый «пряничный» храм в стиле ложной готики, построенный в честь морской победы над турками.', mustSeeFilter: 'temple' , themeTags: ['Неоготика и псевдоготика'],
        locationSlug: 'saint-petersburg-chesmenskaya-tserkov', address: 'ул. Ленсовета, 12', latitude: 59.856985, longitude: 30.329712 },
      { name: 'Буддийский дацан Гунзэчойнэй', desc: 'Самый северный буддийский храм в Европе, построенный из колотого гранита с витражами Рериха.', mustSeeFilter: 'temple',
        venueSlug: 'saint-petersburg-buddiyskiy-datsan-gunzechoyney', address: 'Приморский пр., 91', latitude: 59.983935, longitude: 30.256247 },
      {
        name: 'Санкт-Петербургская соборная мечеть',
        desc: 'Монументальное здание с лазурным майоликовым куполом, повторяющим контуры усыпальницы Тамерлана.',
        mustSeeFilter: 'temple',
        locationSlug: 'saint-petersburg-sobornaya-mechet',
        latitude: 59.9552,
        longitude: 30.3239
      },
      { name: 'Анненкирхе (Церковь Святой Анны)', desc: 'Старинная лютеранская кирха на Кирочной, чьи опаленные после разрушительного пожара интерьеры стали культовой арт-площадкой города.', mustSeeFilter: 'temple',
        locationSlug: 'saint-petersburg-annenkirhe-tserkov-svyatoy-anny', address: 'Кирочная ул., 8В', latitude: 59.944645, longitude: 30.352101 },
      { name: 'Гранд Макет Россия', desc: 'Гигантский интерактивный шоу-макет всей страны в масштабе 1:87, где на площади 800 кв. м живут тысячи крошечных персонажей и циклично меняются день и ночь.', mustSeeFilter: 'science',
        locationSlug: 'saint-petersburg-grand-maket-rossiya', address: 'Цветочная ул., 16Л', latitude: 59.887532, longitude: 30.329107 },
      { name: 'Петровская Акватория', desc: 'Большой исторический макет Петербурга и его пригородов XVIII века, воссозданный по архивным чертежам, с настоящей водной системой, по которой ходят миниатюрные корабли.', mustSeeFilter: 'science',
        locationSlug: 'saint-petersburg-petrovskaya-akvatoriya', address: 'Малая Морская ул., 4-6 (ТК Адмирал)', latitude: 59.936081, longitude: 30.314811 },
      { name: 'Музей Железных Дорог России', desc: 'Масштабный европейский хаб с поворотным кругом и подлинными дореволюционными паровозами.', mustSeeFilter: 'science',
        venueSlug: 'saint-petersburg-muzey-zheleznyh-dorog-rossii', address: 'Библиотечный пер., 4, корп. 2', latitude: 59.907080, longitude: 30.307399 },
      { name: 'Планетарий №1', desc: 'Проекционный купол диаметром 37 метров, вмонтированный внутрь огромного кирпичного газгольдера XIX века.', mustSeeFilter: 'science', venueSlug: 'planetarii-1', address: 'наб. Обводного канала, 74Ц', latitude: 59.907297, longitude: 30.319717 },
      { name: 'Океанариум', desc: 'Подземный научно-развлекательный комплекс с 35-метровым движущимся тоннелем внутри главного аквариума с акулами.', mustSeeFilter: 'science',
        locationSlug: 'saint-petersburg-okeanarium', address: 'ул. Марата, 86 (ТРК Нептун)', latitude: 59.919131, longitude: 30.338575 },
      { name: 'Ленинградский зоопарк', desc: 'Один из старейших зоосадов страны, непрерывно работавший даже в годы блокады.', mustSeeFilter: 'science',
        locationSlug: 'saint-petersburg-leningradskiy-zoopark', address: 'Александровский парк, 1', latitude: 59.952541, longitude: 30.307842 },
      { name: 'Диво-Остров', desc: 'Парк экстремальных аттракционов на Крестовском острове с высотными горками у залива.', mustSeeFilter: 'science',
        locationSlug: 'saint-petersburg-divo-ostrov', address: 'Кемская ул., 1А', latitude: 59.972237, longitude: 30.245084 },
      { name: 'Музей советских игровых автоматов', desc: 'Интерактивное пространство, где можно поиграть на оригинальных действующих советских автоматах по 15-копеечным монетам.', mustSeeFilter: 'science',
        venueSlug: 'saint-petersburg-muzey-sovetskih-igrovyh-avtomatov', address: 'Конюшенная пл., 2В', latitude: 59.941617, longitude: 30.326886 },
      { name: 'Цирк Чинизелли', desc: 'Первый в России стационарный каменный цирк, открытый в 1877 году, сохранивший царское оформление лож.', mustSeeFilter: 'science',
        locationSlug: 'saint-petersburg-tsirk-chinizelli', address: 'наб. реки Фонтанки, 3А', latitude: 59.938363, longitude: 30.341496 },
      { name: 'Музей магии', desc: 'Интерактивное пространство на Невском проспекте, раскрывающее секреты знаменитых трюков и иллюзий Гудини.', mustSeeFilter: 'science',
        venueSlug: 'saint-petersburg-muzey-magii', address: 'Невский пр., 74-76', latitude: 59.932822, longitude: 30.349940 },
      { name: 'Севкабель Порт', desc: 'Главное культурное пространство на Васильевском острове, развернувшееся в цехах исторического кабельного завода Siemens & Halske прямо у кромки Финского залива.', mustSeeFilter: 'creative', locationSlug: 'saint-petersburg-sevkabel-port', address: 'Кожевенная линия, 40', latitude: 59.924403, longitude: 30.240763 },
      { name: 'Бертгольд Центр', desc: 'Творческий квартал в зданиях бывшей словолитни, знаменитый своим внутренним двориком с подвесными зонтиками и винтовой металлической лестницей на крышу.', mustSeeFilter: 'creative', locationSlug: 'saint-petersburg-bertgold-tsentr', address: 'Гражданская ул., 13-15', latitude: 59.928495, longitude: 30.312959 },
      { name: 'Третье место', desc: 'Исторический особняк Гурьевых с концептуальным неотреставрированным двором и современным искусством.', mustSeeFilter: 'creative',
        locationSlug: 'saint-petersburg-trete-mesto', address: 'Литейный пр., 62', latitude: 59.934898, longitude: 30.349141 },
      { name: 'Ротонда на Гороховой', desc: 'Мистический круглый подъезд доходного дома конца XVIII века с шестью колоннами и винтовой лестницей, ставший центром питерского рок-андеграунда 1980-х.', mustSeeFilter: 'creative' , themeTags: ['Ленинградский рок и андеграунд'], locationSlug: 'saint-petersburg-rotonda-na-gorohovoy', address: 'Гороховая ул., 57А', latitude: 59.925488, longitude: 30.326261 },
      { name: 'Мозаичный дворик', desc: 'Сказочная уличная инсталляция на Фонтанке, где стены, поребрики и скульптуры вручную покрыты цветной смальтовой мозаикой художником Владимиром Лубенко.', mustSeeFilter: 'creative', locationSlug: 'saint-petersburg-mozaichnyy-dvorik', address: 'наб. реки Фонтанки, 2', latitude: 59.946055, longitude: 30.340051 },
      { name: 'Витебский вокзал', desc: 'Шедевр стиля модерн с коваными дебаркадерами и старинными интерьерами, полностью сохранивший атмосферу вокзалов начала XX века.', mustSeeFilter: 'creative' , themeTags: ['Северный модерн'],
        locationSlug: 'saint-petersburg-vitebskiy-vokzal', address: 'Загородный пр., 52', latitude: 59.919782, longitude: 30.328325 },
      { name: 'Смоленское лютеранское кладбище', desc: 'Исторический немецкий некрополь на Васильевском острове, известный старинными склепами и беседой из культового фильма «Брат».', mustSeeFilter: 'creative' , themeTags: ['Ленинградский рок и андеграунд'],
        locationSlug: 'saint-petersburg-smolenskoe-lyuteranskoe-kladbische', address: 'наб. реки Смоленки, 27', latitude: 59.943187, longitude: 30.254394 },

      { name: 'Чижик-Пыжик', desc: 'Самый маленький городской памятник, всего 11 см, установленный на гранитном выступе набережной у Фонтанки.', mustSeeFilter: 'creative',
        locationSlug: 'saint-petersburg-chizhik-pyzhik', address: 'наб. реки Фонтанки (у Инженерного моста)', latitude: 59.941785, longitude: 30.338012 },
      { name: 'Доходный дом Бака', desc: 'Знаменитое здание на Кирочной улице, скрывающее внутри двора-колодца уникальные сквозные подвесные галереи-переходы, соединяющие лицевой и дворовый флигели на уровне второго и четвертого этажей.', mustSeeFilter: 'houses', locationSlug: 'saint-petersburg-dohodnyy-dom-baka', address: 'Кирочная ул., 24', latitude: 59.944322, longitude: 30.360051 },
      { name: 'Толстовский дом', desc: 'Монументальный жилой комплекс работы Федора Лидваля, визитной карточкой которого стали три последовательные ренессансные арки, образующие внутреннюю проходную улицу от Рубинштейна до Фонтанки.', mustSeeFilter: 'houses', locationSlug: 'saint-petersburg-tolstovskiy-dom', address: 'ул. Рубинштейна, 15-17', latitude: 59.929845, longitude: 30.342416 },
      { name: 'Доходный дом Мурузи', desc: 'Шедевр неомавританского стиля, украшенный арабской вязью, терракотовыми изразцами и подковами арок, ставший главным литературным адресом города, где жили Гиппиус, Гумилев и Иосиф Бродский.', mustSeeFilter: 'houses', locationSlug: 'saint-petersburg-dohodnyy-dom-muruzi', address: 'Литейный пр., 24', latitude: 59.942917, longitude: 30.348633 },
      { name: 'Доходный дом Ратькова-Рожнова (на Пестеля)', desc: 'Грандиозное здание, поражающее колоссальной четырехэтажной парадной аркой, которая раскрывает перспективу вытянутого двора-улицы со стеклянной крышей.', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-dohodnyy-dom-ratkova-rozhnova-na-pestelya', address: 'Пестеля ул., 13-15', latitude: 59.942183, longitude: 30.344445 },
      { name: 'Доходный дом Бубыря', desc: 'Эталонный образец сурового северного модерна, фасад которого облицован грубым финским гранитом и украшен загадочными барельефами сказочных птиц, рыб и лесных существ.', mustSeeFilter: 'houses' , themeTags: ['Северный модерн'],
        locationSlug: 'saint-petersburg-dohodnyy-dom-bubyrya', address: 'Стремянная ул., 11', latitude: 59.930438, longitude: 30.351657 },
      { name: 'Дом с совами', desc: 'Здание на Карповке, привлекающее внимание массивным угловым эркером и огромными скульптурами полярных сов, которые словно охраняют покой жильцов Петроградской стороны.', mustSeeFilter: 'houses' , themeTags: ['Северный модерн'],
        locationSlug: 'saint-petersburg-dom-s-sovami', address: 'Большой пр. П.С., 44', latitude: 59.960249, longitude: 30.301546 },
      { name: 'Доходный дом Иоффа (Пять углов)', desc: 'Архитектурная доминанта знаменитого перекрестка, чей узкий, похожий на нос корабля фасад увенчан изящной круглой башней с куполом.', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-dohodnyy-dom-ioffa-pyat-uglov', address: 'Загородный пр., 11', latitude: 59.926941, longitude: 30.341496 },
      { name: 'Доходный дом Полежаева', desc: 'Огромный замок в стиле неовизантийского модерна со множеством башенок и шпилей, ставший декорациями квартиры Воланда в экранизации «Мастера и Маргариты» Владимира Бортко.', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-dohodnyy-dom-polezhaeva', address: 'Старо-Петергофский пр., 3-5', latitude: 59.913349, longitude: 30.276451 },
      { name: 'Доходный дом Елисеевых (на Фонтанке)', desc: 'Здание, скрывающее одну из самых красивых парадных города - «Ромашковую», названную так за уникальную форму желтых оконных рам и изящную винтовую лестницу.', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-dohodnyy-dom-eliseevyh-na-fontanke', address: 'наб. реки Фонтанки, 64', latitude: 59.928424, longitude: 30.334057 },
      { name: 'Египетский дом (Дом Захарова)', desc: 'Доходный дом на Захарьевской, чей фасад и парадный въезд полностью декорированы монументальными скульптурами бога Ра, пилястрами в виде папирусов и ликами богини Хатхор.', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-egipetskiy-dom-dom-zaharova', address: 'Захарьевская ул., 23', latitude: 59.948242, longitude: 30.360051 },
      { name: 'Доходный дом Станового', desc: 'Яркий пример неорусского стиля с башенками-теремами, чьи парадные двери и фасады украшены барельефами с изображением русских крестьян в традиционных рубахах.', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-dohodnyy-dom-stanovogo', address: 'Мытнинская ул., 5', latitude: 59.934898, longitude: 30.373400 },
      { name: 'Доходный дом Розенштейна (Дом с башнями)', desc: 'Величественное здание на площади Льва Толстого, стилизованное под английский средневековый замок с двумя мощными шестигранными башнями и элементами готики.', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-dohodnyy-dom-rozenshteyna-dom-s-bashnyami', address: 'Большой пр. П.С., 75 / пл. Льва Толстого', latitude: 59.966455, longitude: 30.312959 },
      { name: 'Доходный дом Веге', desc: 'Монументальный неоклассический дом у Крюкова канала, парадный въезд во двор которого охраняют колоссальные атланты из темного гранита.', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-dohodnyy-dom-vege', address: 'наб. Крюкова канала, 14', latitude: 59.923835, longitude: 30.300067 },
      { name: 'Доходный дом Дернова (Дом с башней)', desc: 'Знаменитое здание на углу Таврической, в круглой башне которого в начале XX века находилась квартира поэта Вячеслава Иванова, служившая главным салоном для символистов Серебряного века.', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-dohodnyy-dom-dernova-dom-s-bashney', address: 'Таврическая ул., 35', latitude: 59.941031, longitude: 30.380045 },
      { name: 'Доходный дом Кирилловых', desc: 'Малоизвестный шедевр эклектики на Большой Пушкарской, фасад которого буквально усыпан лепниной, кариатидами и фигурами ангелов.', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-dohodnyy-dom-kirillovyh', address: 'Большая Пушкарская ул., 3', latitude: 59.954605, longitude: 30.301476 },
      { name: 'Доходный дом Бернштейна', desc: 'Здание на 3-й Советской, примечательное парадным вестибюлем, полностью облицованным подлинной старинной метлахской плиткой и изразцами изумрудного цвета.', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-dohodnyy-dom-bernshteyna', address: 'Каменноостровский пр., 54', latitude: 59.972322, longitude: 30.304561 },
      { name: 'Доходный дом Лялевича', desc: 'Элегантный неоклассический дом на улице Розенштейна с огромной въездной аркой и сохранившимися барельефами римских воинов на фасаде.', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-dohodnyy-dom-lyalevicha', address: 'Розенштейна ул., 39', latitude: 59.897455, longitude: 30.283120 },
      { name: 'Доходный дом Мельцера', desc: 'Архитектурный комплекс на Большой Конюшенной, сочетающий элементы модерна и классицизма, построенный владельцем знаменитой мебельной фабрики.', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-dohodnyy-dom-meltsera', address: 'Большая Конюшенная ул., 19', latitude: 59.938175, longitude: 30.323041 },
      { name: 'Доходный дом герцога Лейхтенбергского', desc: 'Здание на Большой Зелениной, верхний этаж которого украшен масштабными мозаичными панно с изображением индустриальных пейзажей, пашен и морских портов.', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-dohodnyy-dom-gertsoga-leyhtenbergskogo', address: 'Большая Зеленина ул., 28', latitude: 59.963489, longitude: 30.292311 },
      { name: 'Доходный дом Колобовых', desc: 'Огромный жилой квартал на Петроградской стороне с глубоким парадным двором-курдонером, отделенным от улицы изящной гранитной колоннадой.', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-dohodnyy-dom-kolobovyh', address: 'Ленина ул., 8 / Пушкарский пер., 2', latitude: 59.960144, longitude: 30.308254 },
      { name: 'Доходный дом Никонова', desc: 'Сказочный дом-терем на Коломенской улице, сплошь покрытый разноцветными изразцами, майоликой и сложной кирпичной кладкой в русском стиле.', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-dohodnyy-dom-nikonova', address: 'Колокольная ул., 11', latitude: 59.927115, longitude: 30.347312 },
      { name: 'Доходный дом Бадаева', desc: 'Здание на углу Восстания, знаменитое угловым эркером, который венчает барельеф крылатой нимфы, прозванной горожанами «печальным ангелом».', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-dohodnyy-dom-badaeva', address: 'ул. Восстания, 19 / Жуковского, 53', latitude: 59.937215, longitude: 30.359871 },
      { name: 'Доходный дом Клейнмихель', desc: 'Изящное здание на Каменном острове, перестроенное из старого особняка и напоминающее романтическую готическую виллу с элементами фахверка.', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-dohodnyy-dom-kleynmihel', address: 'Миллионная ул., 3', latitude: 59.945233, longitude: 30.328325 },
      { name: 'Доходный дом Степнова', desc: 'Дом на 11-й линии Васильевского острова, скрывающий круглую парадную-ротонду с радиально расходящимися ступенями лестницы.', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-dohodnyy-dom-stepnova', address: 'Гагаринская ул., 3', latitude: 59.944983, longitude: 30.342416 },
      { name: 'Доходный дом Танского', desc: 'Здание на улице Куйбышева, известное своей парадной с камином, лепными грифонами и огромным световым фонарем в потолке.', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-dohodnyy-dom-tanskogo', address: 'ул. Куйбышева, 21', latitude: 59.956715, longitude: 30.334057 },
      { name: 'Доходный дом Хренова', desc: 'Дом на Таврической улице, фасад которого украшен редким для Петербурга лепным декором в виде гигантских чертополохов.', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-dohodnyy-dom-hrenova', address: 'Таврическая ул., 17', latitude: 59.943187, longitude: 30.378900 },
      { name: 'Доходный дом Шрейбера', desc: 'Здание на Захарьевской улице с роскошной парадной, где сохранились подлинные кариатиды, поддерживающие марши дубовой лестницы.', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-dohodnyy-dom-shreybera', address: 'Загородный пр., 32', latitude: 59.924822, longitude: 30.334057 },
      { name: 'Доходный дом Граббе', desc: 'Элегантное здание в стиле модерн на Лесном проспекте, построенное для управляющего пороховыми заводами.', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-dohodnyy-dom-grabbe', address: 'Моховая ул., 26', latitude: 59.941031, longitude: 30.345869 },
      { name: 'Доходный дом Смирнова', desc: 'Здание на Пяти углах с редкой круглой лестничной клеткой и сохранившимися коваными лифтовыми шахтами начала XX века.', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-dohodnyy-dom-smirnova', address: '5-я Линия В.О., 16', latitude: 59.940713, longitude: 30.285885 },
      { name: 'Парадная «Ромашка» (Дом Елисеева)', desc: 'Круглый вестибюль на улице Ломоносова: центральный пилон и радиальные рамы окон складываются в образ раскрытого цветка.', mustSeeFilter: 'houses',
        locationSlug: 'saint-petersburg-paradnaya-romashka-dom-eliseeva', address: 'ул. Ломоносова, 14', latitude: 59.928731, longitude: 30.338575 },
      { name: 'Дворец Великого князя Владимира Александровича (Дом ученых)', desc: 'Великолепное палаццо на Дворцовой набережной в стиле флорентийского ренессанса, полностью сохранившее аутентичные царские залы и дубовую гостиную.', mustSeeFilter: 'mansions',
        locationSlug: 'saint-petersburg-dvorets-velikogo-knyazya-vladimira-aleksandrovicha-dom-', address: 'Дворцовая наб., 26', latitude: 59.943615, longitude: 30.320140 },
      { name: 'Особняк Кельха', desc: 'Один из самых дорогих частных домов города на улице Чайковского, скрывающий во дворе готический павильон, а внутри - потрясающий Белый зал с гигантским камином.', mustSeeFilter: 'mansions', locationSlug: 'saint-petersburg-osobnyak-kelha', address: 'Чайковского ул., 28', latitude: 59.944645, longitude: 30.354394 },
      { name: 'Особняк Брусницыных', desc: 'Особняк на Кожевенной линии: за сдержанным фасадом - парадные залы в духе ренессанса и богатая история дома.', mustSeeFilter: 'mansions',
        locationSlug: 'saint-petersburg-osobnyak-brusnitsynyh', address: 'Кожевенная линия, 27', latitude: 59.922115, longitude: 30.251411 },
      { name: 'Шереметевский дворец (Фонтанный дом)', desc: 'Старинная дворянская усадьба, бывшее родовое гнездо графов Шереметевых, ставшее крупным музеем музыки с колоссальной коллекцией инструментов.', mustSeeFilter: 'mansions',
        locationSlug: 'saint-petersburg-sheremetevskiy-dvorets-fontannyy-dom', address: 'наб. реки Фонтанки, 34', latitude: 59.936384, longitude: 30.346894 },
      { name: 'Строгановский дворец', desc: 'Барочный шедевр Франческо Растрелли на углу Невского и Мойки, уцелевший в советские годы и сохранивший уникальный плафон «Минерва» работы Торелли.', mustSeeFilter: 'mansions',
        locationSlug: 'saint-petersburg-stroganovskiy-dvorets', address: 'Невский пр., 17', latitude: 59.935835, longitude: 30.321685 },
      { name: 'Особняк Половцова (Дом архитектора)', desc: 'Строгое снаружи здание на Большой Морской, поражающее своими скрытыми интерьерами: Бронзовым залом без окон со световым фонарем и Белым залом в стиле Людовика XVI.', mustSeeFilter: 'mansions',
        locationSlug: 'saint-petersburg-osobnyak-polovtsova-dom-arhitektora', address: 'Большая Морская ул., 52', latitude: 59.931210, longitude: 30.304561 },
      { name: 'Дворец Белосельских-Белозерских', desc: 'Роскошный розовый дворец на углу Невского проспекта и Фонтанки, построенный Штакеншнейдером в стиле необарокко и украшенный мощными фигурами атлантов.', mustSeeFilter: 'mansions', locationSlug: 'saint-petersburg-dvorets-beloselskih-belozerskih', address: 'Невский пр., 41', latitude: 59.933215, longitude: 30.344445 },
      { name: 'Особняк Кочубея (Дом с маврами)', desc: 'Здание на Конногвардейском бульваре, знаменитое своей оградой с четырьмя бюстами мавров, выполненными из редкого черного и белого мрамора.', mustSeeFilter: 'mansions',
        locationSlug: 'saint-petersburg-osobnyak-kochubeya-dom-s-mavrami', address: 'Конногвардейский бульвар, 7', latitude: 59.933857, longitude: 30.297491 },
      { name: 'Особняк Румянцева', desc: 'Историческое здание на Английской набережной с мощным портиком, внутри которого был открыт первый в России частный публичный музей древностей.', mustSeeFilter: 'mansions',
        locationSlug: 'saint-petersburg-osobnyak-rumyantseva', address: 'Английская наб., 44', latitude: 59.933946, longitude: 30.289389 },
      { name: 'Усадьба Демидовых', desc: 'Скрытый жилой комплекс в переулке Гривцова, знаменитый своим уникальным внутренним садом с чугунной верандой на яблоневых столбах и первым в городе частным манежем.', mustSeeFilter: 'mansions',
        locationSlug: 'saint-petersburg-usadba-demidovyh', address: 'пер. Гривцова, 1-3', latitude: 59.931393, longitude: 30.316472 },
      { name: 'Николаевский дворец (Дворец Труда)', desc: 'Грандиозная резиденция сына Николая I, построенная Штакеншнейдером, монументальная парадная лестница которой повторяет контуры лестниц Зимнего дворца.', mustSeeFilter: 'mansions',
        locationSlug: 'saint-petersburg-nikolaevskiy-dvorets-dvorets-truda', address: 'пл. Труда, 4', latitude: 59.930491, longitude: 30.294154 },
      { name: 'Особняк Форша (Дача Гаусвальд)', desc: 'Первое в России здание в стиле деревянного модерна на Каменном острове, послужившее домом Ирен Адлер в советском фильме о Шерлоке Холмсе.', mustSeeFilter: 'mansions',
        locationSlug: 'saint-petersburg-osobnyak-forsha-dacha-gausvald', address: 'Большая аллея, 14 (Каменный остров)', latitude: 59.977464, longitude: 30.283120 },
      { name: 'Елагиноостровский дворец', desc: 'Изящная летняя императорская резиденция на Елагином острове, возведенная Карлом Росси для матери Александра I среди регулярного парка.', mustSeeFilter: 'mansions',
        locationSlug: 'saint-petersburg-elaginoostrovskiy-dvorets', address: 'Елагин остров, 1', latitude: 59.979679, longitude: 30.259972 },
      { name: 'Ново-Михайловский дворец', desc: 'Величественное здание на Дворцовой набережной, построенное для великого князя Михаила Николаевича с использованием передовых для XIX века металлических балок.', mustSeeFilter: 'mansions',
        locationSlug: 'saint-petersburg-novo-mihaylovskiy-dvorets', address: 'Дворцовая наб., 18', latitude: 59.943180, longitude: 30.323041 },
      { name: 'Особняк Мясникова', desc: 'Отреставрированный необарокко-особняк на Восстания с нарядным белым фасадом, ставший популярным частным культурным пространством.', mustSeeFilter: 'mansions',
        locationSlug: 'saint-petersburg-osobnyak-myasnikova', address: 'ул. Восстания, 45', latitude: 59.942183, longitude: 30.364257 },
      { name: 'Особняк Зива', desc: 'Образец раннего модерна на Рижском проспекте, построенный для крупного суконного магната архитектором Барановским.', mustSeeFilter: 'mansions',
        locationSlug: 'saint-petersburg-osobnyak-ziva', address: 'Рижский пр., 26', latitude: 59.914257, longitude: 30.276451 },
      { name: 'Усадьба Е. Р. Дашковой (Кирьяново)', desc: 'Историческая подковообразная дача сподвижницы Екатерины II на старой Петергофской дороге, построенная в стиле строгого классицизма.', mustSeeFilter: 'mansions',
        locationSlug: 'saint-petersburg-usadba-e-r-dashkovoy-kiryanovo', address: 'Стачек пр., 45', latitude: 59.887532, longitude: 30.264257 },
      { name: 'Особняк Чаева', desc: 'Необычный дом на Петроградской стороне с асимметричным фасадом и цилиндрическим объемом зимнего сада, шедевр позднего модерна.', mustSeeFilter: 'mansions',
        locationSlug: 'saint-petersburg-osobnyak-chaeva', address: 'Рентгена ул., 9', latitude: 59.964257, longitude: 30.323041 },
      { name: 'Особняк Трубецких-Нарышкиных', desc: 'Здание на улице Чайковского, где во время реставрации в 2012 году был найден крупнейший в истории города клад из нескольких тысяч предметов царского серебра.', mustSeeFilter: 'mansions',
        locationSlug: 'saint-petersburg-osobnyak-trubetskih-naryshkinyh', address: 'ул. Чайковского, 29', latitude: 59.944322, longitude: 30.352101 },
      { name: 'Особняк Новинских', desc: 'Элегантное классическое здание на 4-й линии Васильевского острова с сохранившимися резными дубовыми потолками в библиотеке.', mustSeeFilter: 'mansions',
        locationSlug: 'saint-petersburg-osobnyak-novinskih', address: '3-я Линия В.О., 46', latitude: 59.942917, longitude: 30.276451 },
      { name: 'Особняк Форостовского', desc: 'Один из первых чистых образцов модерна в городе на 1-й линии Васильевского острова с гранитным цоколем и асимметричными окнами.', mustSeeFilter: 'mansions',
        locationSlug: 'saint-petersburg-osobnyak-forostovskogo', address: '4-я Линия В.О., 9', latitude: 59.941031, longitude: 30.283120 },
      { name: 'Мариинский дворец', desc: 'Подарок Николая I своей дочери Марии Николаевне, ставший «дворцом трех императоров» и резиденцией Государственного совета империи.', mustSeeFilter: 'mansions',
        locationSlug: 'saint-petersburg-mariinskiy-dvorets', address: 'Исаакиевская пл., 6', latitude: 59.931210, longitude: 30.308256 },
      { name: 'Пышечная на Большой Конюшенной', desc: 'Старейшая непрерывно действующая пышечная города (с 1958 года), занесенная в Красную книгу Петербурга, где пышки до сих пор жарят на советских автоматах по неизменному ГОСТу.', mustSeeFilter: 'gastro', locationSlug: 'saint-petersburg-pyshechnaya-na-bolshoy-konyushennoy', address: 'Большая Конюшенная ул., 25', latitude: 59.938363, longitude: 30.322886 },
      { name: 'Литературное кафе (Вольф и Беранже)', desc: 'Историческая кондитерская на Невском проспекте, где Александр Пушкин встретился со своим секундантом Данзасом перед роковой дуэлью на Черной речке.', mustSeeFilter: 'gastro', locationSlug: 'saint-petersburg-literaturnoe-kafe-volf-i-beranzhe', address: 'Невский пр., 18', latitude: 59.936384, longitude: 30.319717 },
      { name: 'Василеостровский рынок', desc: 'Масштабное гастрономическое пространство в реконструированных каменных корпусах Андреевского рынка XVIII века, объединившее кухни со всего мира.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-vasileostrovskiy-rynok', address: 'Большой пр. В.О., 16', latitude: 59.938634, longitude: 30.285885 },
      { name: 'Фудмолл «Vokzal 1853»', desc: 'Крупнейший фудмолл в Европе, развернувшийся на трех этажах исторического здания Варшавского вокзала и оформленный в эстетике грандиозного вокзала XIX века.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-fudmoll-vokzal-1853', address: 'наб. Обводного канала, 118С', latitude: 59.907080, longitude: 30.297491 },
      { name: 'Арт-кафе «Бродячая собака»', desc: 'Исторический подвал на площади Искусств, бывший в начале XX века главным ночным клубом и трибуной для поэтов Серебряного века.', mustSeeFilter: 'gastro', locationSlug: 'saint-petersburg-art-kafe-brodyachaya-sobaka', address: 'Итальянская ул., 4', latitude: 59.937243, longitude: 30.331580 },
      { name: 'Кондитерская «Север-Метрополь»', desc: 'Главный сладкий бренд города на Невском проспекте, чьи пирожные «Буше» и торты ручной работы являлись главным сувениром из Ленинграда.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-konditerskaya-sever-metropol', address: 'Невский пр., 44', latitude: 59.934447, longitude: 30.334057 },
      { name: 'Ресторан «Корюшка»', desc: 'Панорамный ресторан холдинга Ginza Project прямо у стен Петропавловской крепости, специализирующийся на приготовлении главного гастросимвола города круглый год.', mustSeeFilter: 'gastro', locationSlug: 'saint-petersburg-restoran-koryushka', address: 'Петропавловская крепость, 3З', latitude: 59.948792, longitude: 30.316472 },
      { name: 'Спикизи-бар «El Copitas»', desc: 'Скрытый во дворах Владимирской площади мексиканский бар без вывески, ставший легендой благодаря многократному попаданию в топ-50 лучших баров мира.', mustSeeFilter: 'gastro', locationSlug: 'saint-petersburg-spikizi-bar-el-copitas', address: 'Колокольная ул., 2/18', latitude: 59.928424, longitude: 30.345869 },
      { name: 'Ресторан «Блок»', desc: 'Главный мясной ресторан города от Александра Раппопорта, расположенный на крыше «Ленинград Центра» в Таврическом саду и оформленный в стиле русского авангарда.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-restoran-blok', address: 'Потемкинская ул., 4', latitude: 59.944955, longitude: 30.368576 },
      { name: 'Бар «Хроники»', desc: 'Интеллектуальная рюмочная на улице Некрасова, возродившая культуру ленинградских питейных заведений для новой творческой интеллигенции.', mustSeeFilter: 'gastro' , themeTags: ['Ленинградский рок и андеграунд'],
        locationSlug: 'saint-petersburg-bar-hroniki', address: 'Некрасова ул., 26', latitude: 59.939864, longitude: 30.354394 },
      { name: 'Ресторан «Палкинъ»', desc: 'Историческое заведение на Невском проспекте, возродившее традиции дореволюционной русской высокой кухни с подачей блюд в формате фламбе.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-restoran-palkin', address: 'Невский пр., 47', latitude: 59.932822, longitude: 30.347312 },
      { name: 'Гастробар «Harvest»', desc: 'Проект Дмитрия Блинова, признанный одним из лучших ресторанов страны за уникальный фокус на высокую кухню из локальных овощей и экологичное потребление.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-gastrobar-harvest', address: 'пр. Добролюбова, 11', latitude: 59.948242, longitude: 30.297491 },
      { name: 'Ресторан «Метрополь»', desc: 'Исторический ресторан на Садовой, открытый в XIX веке, где проходили официальные банкеты во время визитов Жака Ширака и королевы Маргрете II.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-restoran-metropol', address: 'Садовая ул., 22/2', latitude: 59.932822, longitude: 30.331201 },
      { name: 'Коктейльный бар «Xander»', desc: 'Изысканный бар в отеле Four Seasons в здании Дома со львами, знаменитый своей каминной зоной и сложной картой концептуальных миксов.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-kokteylnyy-bar-xander', address: 'Вознесенский пр., 1 (отель Four Seasons)', latitude: 59.934898, longitude: 30.306894 },
      { name: 'Гранд Отель Европа (Лобби-бар)', desc: 'Аристократичный бар со старинными витражами в стиле модерн, помнящий визиты Петра Чайковского, Игоря Стравинского и сэра Элтона Джона.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-grand-otel-evropa-lobbi-bar', address: 'Михайловская ул., 1/7', latitude: 59.935835, longitude: 30.331580 },
      { name: 'Ресторан «Строганов Стейк Хаус»', desc: 'Огромный стейк-хаус в здании бывших казарм Конногвардейского полка со столетней кирпичной кладкой и массивной дубовой мебелью.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-restoran-stroganov-steyk-haus', address: 'Конногвардейский бульвар, 4', latitude: 59.933215, longitude: 30.300067 },
      { name: 'Бар «Жан-Жак»', desc: 'Уютное французское бистро на Петроградской стороне, ставшее главным местом встреч петербургских художников, журналистов и критиков.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-bar-zhan-zhak', address: 'ул. Марата, 10', latitude: 59.929845, longitude: 30.354394 },
      { name: 'Рюмочная «Маяк»', desc: 'Культовое заведение на улице Маяковского, сохранившее аутентичную советскую атмосферу с бюстами Ленина и бутербродами со шпротами.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-ryumochnaya-mayak', address: 'ул. Маяковского, 20', latitude: 59.938363, longitude: 30.352101 },
      { name: 'Ресторан «Percorso»', desc: 'Премиальный итальянский ресторан во дворце Лобанова-Ростовского, разделенный на пять залов с открытой кухней и винным погребом.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-restoran-percorso', address: 'Вознесенский пр., 1 (отель Four Seasons)', latitude: 59.934898, longitude: 30.306894 },
      { name: 'Кафе «Рубинштейн»', desc: 'Интеллектуальное заведение на набережной Фонтанки, тесно связанное с театральной жизнью города и Малым драматическим театром Льва Додина.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-kafe-rubinshteyn', address: 'ул. Рубинштейна, 20 / Графский пер., 9', latitude: 59.930438, longitude: 30.342416 },
      { name: 'Кафе «Zoom»', desc: 'Одно из первых концептуальных арт-кафе города на Гороховой улице, объединившее библиотеку, выставочное пространство и домашнюю кухню.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-kafe-zoom', address: 'Гороховая ул., 22', latitude: 59.932204, longitude: 30.319717 },
      { name: 'Бар «Orthodox»', desc: 'Концептуальный бар на улице Рубинштейна, где все коктейли создаются исключительно на основе российских дистиллятов и названы в честь произведений русских классиков.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-bar-orthodox', address: 'ул. Рубинштейна, 2', latitude: 59.934149, longitude: 30.345869 },
      { name: 'Ресторан «Кококо»', desc: 'Знаменитый проект Матильды Шнуровой, ставший пионером русского нью-вейва в кулинарии благодаря переосмыслению фермерских продуктов региона.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-restoran-kokoko', address: 'наб. Адмиралтейского канала, 2 (Новая Голландия)', latitude: 59.930030, longitude: 30.289389 },
      { name: 'Общественное пространство «Двор Гостинки»', desc: 'Внутренний двор Большого Гостиного двора - летнее открытое пространство с кафе и зонами отдыха.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-obschestvennoe-prostranstvo-dvor-gostinki', address: 'Невский пр., 35 (внутренний двор)', latitude: 59.933946, longitude: 30.332995 },
      { name: 'Ресторан «Il Lago dei Cigni»', desc: 'Роскошный ресторан высокой итальянской кухни на берегу Лебяжьего пруда Крестовского острова с люстрой из селенита и панорамными окнами.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-restoran-il-lago-dei-cigni', address: 'Крестовский остров, Северная дорога, 21', latitude: 59.977464, longitude: 30.231201 },
      { name: 'Сидрерия «Сидр и Нэнси»', desc: 'Главная точка концентрации любителей локальных и импортных сидров на улице Некрасова с огромной коллекцией редких сортов.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-sidreriya-sidr-i-nensi', address: 'ул. Некрасова, 28', latitude: 59.939131, longitude: 30.354394 },
      { name: 'Бар «Mishka»', desc: 'Легендарный хипстерский бар музыканта Кирилла Иванова (СБПЧ), сформировавший ночную жизнь набережной реки Фонтанки в 2010-х годах.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-bar-mishka', address: 'Конногвардейский бульвар, 4', latitude: 59.933215, longitude: 30.300067 },
      { name: 'Московский рынок', desc: 'Модернизированный по образцу Даниловского исторический рынок у метро «Электросила» под массивным сталинским неоклассическим куполом.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-moskovskiy-rynok', address: 'ул. Решетникова, 12', latitude: 59.879679, longitude: 30.323041 },
      { name: 'Ресторан «Тепло»', desc: 'Уютный семейный ресторан-гостиная в Большой Морской улице со внутренним тихим двориком, настольными играми и домашней выпечкой.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-restoran-teplo', address: 'Большая Морская ул., 45', latitude: 59.931393, longitude: 30.302194 },
      { name: 'Бар «Imbibe»', desc: 'Известный коктейльный бар на Жуковского, славящийся своими экспериментальными подачами и авторскими шотами со сложными вкусовыми профилями.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-bar-imbibe', address: 'ул. Жуковского, 6', latitude: 59.936081, longitude: 30.350325 },
      { name: 'Кофейня «Тчк»', desc: 'Миниатюрная скрытая во дворах Петроградской стороны кофейня в старинном кирпичном гараже, ставшая культовым местом среди любителей альтернативного кофе.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-kofeynya-tchk', address: 'Каменноостровский пр., 18/11 (во дворе)', latitude: 59.960249, longitude: 30.316472 },
      { name: 'Ресторан «Мансарда»', desc: 'Видовой ресторан холдинга Ginza Project, с террасы которого открывается один из самых близких и монументальных ракурсов на купол Исаакиевского собора.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-restoran-mansarda', address: 'Почтамтская ул., 3-5', latitude: 59.933857, longitude: 30.304561 },
      { name: 'Чебуречная «Салхино»', desc: 'Историческое заведение на Кронверкском проспекте, работающее с 1962 года и знаменитое своими легендарными чебуреками «по-чегемски».', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-cheburechnaya-salhino', address: 'Кронверкский пр., 25', latitude: 59.954848, longitude: 30.321685 },
      { name: 'Бар «Dead Poets»', desc: 'Строгий бар-вискитека на Жуковского, оформленный в стиле классического европейского паба для писателей и журналистов.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-bar-dead-poets', address: 'ул. Жуковского, 12', latitude: 59.936384, longitude: 30.351657 },
      { name: 'Кондитерская «Тройка»', desc: 'Легендарное советское кафе на Загородном проспекте, прославившееся на весь город своими огромными фирменными пирожными со взбитыми сливками.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-konditerskaya-troyka', address: 'Загородный пр., 27', latitude: 59.924822, longitude: 30.338575 },
      { name: 'Ресторан «Мама Тута»', desc: 'Концептуальный ресторан грузинской кухни Арама Мнацаканова на Петроградской стороне с утонченным дизайном и современным прочтением классических блюд.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-restoran-mama-tuta', address: 'Зоологический пер., 2-4', latitude: 59.948242, longitude: 30.304561 },
      { name: 'Ресторан «Синтез»', desc: 'Экспериментальная гастрономическая лаборатория на Васильевском острове, совмещающая блюда молекулярной кухни с арт-перформансами.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-restoran-sintez', address: 'наб. Обводного канала, 136', latitude: 59.907080, longitude: 30.285885 },
      { name: 'Пивной бар «Диккенс»', desc: 'Огромный двухэтажный классический английский паб на набережной Фонтанки с антикварной мебелью и огромной коллекцией британского эля.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-pivnoy-bar-dikkens', address: 'наб. реки Фонтанки, 108', latitude: 59.923835, longitude: 30.323041 },
      { name: 'Пушкинская 10', desc: 'Культовый арт-центр и музыкальный адрес ленинградского андеграунда.', mustSeeFilter: 'creative', themeTags: ['Ленинградский рок и андеграунд'],
        locationSlug: 'saint-petersburg-pushkinskaya-10', address: 'ул. Пушкинская, 10 (вход с Лиговского пр., 53)', latitude: 59.928731, longitude: 30.357580 },
      { name: 'Ресторан «Birch»', desc: 'Абсолютный хит петербургской гастрономической сцены, предлагающий авторские сеты мирового уровня в формате лаконичного гастротеатра.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-restoran-birch', address: 'Кирочная ул., 3', latitude: 59.944322, longitude: 30.349141 },
      { name: 'Бар «Коллектив»', desc: 'Скрытый спикизи-бар на улице Некрасова с винтажным интерьером банковского хранилища и сложнейшими историческими коктейлями.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-bar-kollektiv', address: 'ул. Некрасова, 1/38', latitude: 59.941031, longitude: 30.350325 },
      { name: 'Ресторан «Animals»', desc: 'Концептуальное заведение на Суворовском проспекте, работающее по принципу «от фермы до стола» и закупающее продукты с собственного огорода в Ленобласти.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-restoran-animals', address: 'ул. Некрасова, 60', latitude: 59.937243, longitude: 30.364257 },
      { name: 'Бар «Баланс Белого»', desc: 'Популярный крафтовый бар в креативном кластере «Севкабель Порт» с видом на залив и огромной ротацией локальных пивоварен.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-bar-balans-belogo', address: 'Лиговский пр., 74 (Лофт Проект Этажи)', latitude: 59.922112, longitude: 30.355675 },
      { name: 'Вегетарианское кафе «Рада & К»', desc: 'Старейшее концептуальное вегетарианское заведение города на Гороховой улице, ставшее отправной точкой для развития эко-кухни в Петербурге.', mustSeeFilter: 'gastro',
        locationSlug: 'saint-petersburg-vegetarianskoe-kafe-rada-k', address: 'Гороховая ул., 36', latitude: 59.929112, longitude: 30.324976 }
    ],
    significantSuburbs: [
      {
        name: 'Петергоф',
        desc: 'Парадная резиденция Петра I на заливе: фонтаны без насосов, Большой каскад и Нижний парк.',
        mustSeeFilter: 'main',
        places: [
          { name: 'Нижний парк Петергофа', seasonLabel: 'Летняя навигация - май-октябрь', desc: 'регулярный парадный сад Петра I на берегу Финского залива со знаменитой системой фонтанов, работающей вообще без насосов.', locationSlug: 'saint-petersburg-nizhniy-park-petergofa', latitude: 59.885112, longitude: 29.908214, transitTip: 'От ст. Новый Петергоф автобус' },
          { name: 'Большой каскад', seasonLabel: 'Летняя навигация - май-октябрь', desc: 'монументальное фонтанное сооружение с гротами и позолоченной фигурой Самсона, разрывающего пасть льва, символизирующей победу над Швецией.', latitude: 59.88935, longitude: 29.90855},
          { name: 'Большой дворец Петергофа', desc: 'парадная барочная резиденция Петра I и Елизаветы над каскадом, с тронным залом и анфиладой парадных покоев.', locationSlug: 'saint-petersburg-bolshoy-dvorets-petergofa', latitude: 59.89055, longitude: 29.90785},
          { name: 'Верхний сад', desc: 'регулярный партер перед фасадом Большого дворца с тремя главными фонтанами и видом на Морской канал.', latitude: 59.89185, longitude: 29.90845},
          { name: 'Дворец Монплезир', desc: 'любимый приморский дворец Петра Великого со старинной голландской плиткой, где царь лично принимал иностранных послов.', latitude: 59.8879, longitude: 29.9184},
          { name: 'Павильон Марли', desc: 'камерный голландский павильон Петра I у прудов западной части Нижнего парка, любимое место уединения царя.', latitude: 59.88685, longitude: 29.89655},
          { name: 'Парк Александрия', desc: 'уединенная пейзажная резиденция четырех поколений Романовых, оформленная в стиле романтической английской неоготики.', latitude: 59.8808, longitude: 29.9212, transitTip: '~10-15 мин переход в Александрию' },
          { name: 'Готическая капелла', desc: 'домашняя церковь императорской семьи в Александрии, являющаяся шедевром ложной готики работы архитектора Шинкеля.', latitude: 59.8786, longitude: 29.9261},
        ],
        travelVector: 'Юго-Западный и Морской вектор',
        travelVectorBlurb: 'Направление вдоль южного побережья Финского залива. Доступно на электричках от метро «Балтийская» или на скоростных водных судах «Метеор» от причалов Эрмитажа.',
        stationHub: 'Балтийский вокзал',
        stationName: 'Станция Новый Петергоф',
        logisticsExit: 'Станция Новый Петергоф',
        gastroStop: { name: 'Кафе-кондитерская «Оранжерея»', blurb: 'Десерты ручной работы и кофе с видом на императорские конюшни.' },
        gastroHint: 'Кафе-кондитерская «Оранжерея» (Петергоф) - Уютное заведение в историческом здании придворных оранжерей, знаменитое своими десертами ручной работы и возможностью выпить кофе с видом на парадные императорские конюшни.'
      },
      {
        name: 'Царское Село / Пушкин',
        desc: 'Барочный Екатерининский дворец с Янтарной комнатой и парками в Пушкине.',
        mustSeeFilter: 'main',
        places: [
          { name: 'Екатерининский дворец', desc: 'грандиозный барочный замок Франческо Растрелли, внутри которого находится знаменитая, полностью восстановленная Янтарная комната.', locationSlug: 'saint-petersburg-ekaterininskiy-dvorets', latitude: 59.715911, longitude: 30.395812 },
          { name: 'Екатерининский парк', desc: 'парадный регулярный сад и пейзажная часть вокруг дворца с прудами, мостами и павильонами XVIII века.', latitude: 59.71455, longitude: 30.39685 },
          { name: 'Царскосельский лицей', desc: 'мемориальный музей, сохранивший подлинную обстановку комнат и классов, где учился и писал первые стихи Александр Пушкин.', locationSlug: 'saint-petersburg-tsarskoselskiy-litsey', latitude: 59.716912, longitude: 30.397114 },
          { name: 'Камеронова галерея', desc: 'видовая колоннада Чарльза Камерона над склоном к пруду - классический смотровой акцент Царского Села.', latitude: 59.71415, longitude: 30.39455 },
          { name: 'Павильон «Эрмитаж»', desc: 'барочный парковый павильон Екатерининского парка, оборудованный потайными подъемными механизмами для обеденных столов.', latitude: 59.71345, longitude: 30.39865 },
          { name: 'Александровский дворец', desc: 'любимый уединенный дом последнего императора Николая II, откуда вся царская семья была навсегда отправлена в ссылку в Сибирь.', latitude: 59.71855, longitude: 30.39135 },
          { name: 'Китайская деревня', desc: 'живописный ансамбль псевдокитайских домиков в Александровском парке, задуманный Екатериной II.', latitude: 59.71985, longitude: 30.38565 },
          { name: 'Ратная палата', desc: 'уникальный комплекс в неорусском стиле, где сегодня открыт единственный в России музей истории Первой мировой войны.', latitude: 59.71235, longitude: 30.40585 },
        ],
        travelVector: 'Южный вектор',
        travelVectorBlurb: 'Базовый узел для классических дворцово-пейзажных маршрутов. Электрички «Ласточки» и стандартные пригородные поезда отходят от Витебского вокзала у метро «Пушкинская».',
        stationHub: 'Витебский вокзал / метро «Пушкинская»',
        stationName: 'Станция Царское Село',
        logisticsExit: 'Станция Царское Село'
      },
      {
        name: 'Кронштадт',
        desc: 'Остров-крепость на Котлине: Морской Никольский собор, форты и музей военно-морской славы.',
        mustSeeFilter: 'main',
        places: [
          { name: 'Морской Никольский собор', desc: 'колоссальный ставропигиальный храм на Якорной площади, построенный по образу Софии Константинопольской как мемориал погибшим морякам.', locationSlug: 'saint-petersburg-morskoy-nikolskiy-sobor', latitude: 59.993412, longitude: 29.777414 },
          { name: 'Якорная площадь', desc: 'главная площадь Кронштадта с исторической чугунной мостовой, Морским Никольским собором и памятником адмиралу Макарову.', latitude: 59.99185, longitude: 29.77645 },
          { name: 'Парк «Остров фортов»', desc: 'масштабное общественное пространство, посвященное истории флота, с Аллеей героев, маяком памяти и панорамными качелями.', latitude: 59.9952, longitude: 29.7018 },
          { name: 'Музей военно-морской славы', desc: 'ультрасовременный павильон, главным экспонатом которого стала первая советская атомная подлодка К-3, размещенная прямо внутри здания.', venueSlug: 'saint-petersburg-muzey-voenno-morskoy-slavy', latitude: 59.989211, longitude: 29.761512 },
          { name: 'Петровский док', desc: 'исторический сухой док петровской эпохи, один из ключевых инженерных памятников острова Котлин.', latitude: 59.99095, longitude: 29.76635 },
          { name: 'Форт «Константин»', desc: 'исторический береговой форт на южном берегу Кронштадта с панорамой на фарватер и музейной экспозицией.', latitude: 59.99555, longitude: 29.70125 },
          { name: 'Петровский парк', desc: 'городской парк у Петровского дока с памятником Петру I и видом на гавань Кронштадта.', latitude: 59.98955, longitude: 29.76785 },
        ],
        travelVector: 'Финский залив и Балтийский вектор',
        travelVectorBlurb:
          'Как добраться: метеоры/катамараны из центра СПб, на авто или автобусе по КАД',
        stationHub: 'Дамба/к западу от СПБ',
        stationName: 'остров Котлин',
        logisticsExit: 'остров Котлин',
        logisticsExitLabel: 'Где расположен',
        gastroStop: { name: '«Голландская кухня»', blurb: 'Кухня в духе голландских мастеров верфей Петра у Петровского дока.' },
        gastroHint: '«Голландская кухня» (Кронштадт, у Петровского дока) - Историческое заведение, переосмыслившее кулинарные традиции голландских мастеров верфей Петра.'
      },
      {
        name: 'Гатчина',
        desc: 'Охотничий замок Павла I из пудостского камня, Приоратский дворец и пейзажный парк.',
        mustSeeFilter: 'main',
        places: [
          { name: 'Большой Гатчинский дворец', desc: 'суровый охотничий замок Антонио Ринальди из пудостского камня, скрывающий 130-метровый подземный ход к Серебряному озеру.', locationSlug: 'saint-petersburg-bolshoy-gatchinskiy-dvorets', latitude: 59.564112, longitude: 30.108114 },
          { name: 'Приоратский дворец', desc: 'уникальный миниатюрный замок Мальтийского ордена на берегу Черного озера, полностью построенный из прессованной земли по технологии землебита.', locationSlug: 'saint-petersburg-prioratskiy-dvorets', latitude: 59.558311, longitude: 30.120812 },
          { name: 'Дворцовый парк в Гатчине', desc: 'старейший пейзажный парк региона с Водным лабиринтом, павильоном Венеры и регулярными Садами на островах.', latitude: 59.56585, longitude: 30.11145 },
          { name: 'Серебряное озеро', desc: 'живописный пруд у Большого дворца, куда выходит знаменитый подземный ход из дворцовых подвалов.', latitude: 59.56685, longitude: 30.10555 },
          { name: 'Павильон Орла', desc: 'монументальная каменная колоннада-ротонда на берегу Белого озера, построенная по проекту Бренны для императора Павла I.', latitude: 59.56915, longitude: 30.10785 },
          { name: 'Гатчинский гейзер (Источник)', desc: 'необычная природно-техногенная аттракция в лесах под Гатчиной, где из старых скважин бьют настоящие водяные фонтаны.', latitude: 59.5512, longitude: 30.0685 },
        ],
        travelVector: 'Южный вектор',
        travelVectorBlurb: 'Электрички от Балтийского вокзала (метро «Балтийская») до станции Гатчина-Балтийская - удобный полудневный маршрут к дворцу и парку.',
        stationHub: 'Балтийский вокзал',
        stationName: 'Станция Гатчина-Балтийская',
        logisticsExit: 'Станция Гатчина-Балтийская'
      },
      {
        name: 'Павловск',
        desc: 'Классический дворец Камерона и один из самых больших пейзажных парков Европы.',
        mustSeeFilter: 'main',
        places: [
          { name: 'Павловский парк', seasonLabel: 'Зимний эксклюзив: заснеженный парк', desc: 'один из самых больших пейзажных парков Европы (600 гектаров), славящийся своими живописными районами «Белая береза» и «Старая Сильвия».', latitude: 59.6875, longitude: 30.4485 },
          { name: 'Павловский дворец', desc: 'золотисто-белый классический дворец Чарльза Камерона, возведенный на высоком холме над извилистой рекой Славянкой.', locationSlug: 'saint-petersburg-pavlovskiy-dvorets', latitude: 59.685911, longitude: 30.453912 },
          { name: 'Долина реки Славянки', desc: 'самый поэтичный прогулочный маршрут Павловска со множеством изящных мостиков, Колоннадой Аполлона и павильоном «Храм Дружбы».', latitude: 59.68385, longitude: 30.44715 },
          { name: 'Храм Дружбы', desc: 'круглый классический павильон Камерона в долине Славянки - один из главных символов Павловского парка.', latitude: 59.68455, longitude: 30.44585 },
          { name: 'Колоннада Аполлона', desc: 'полукруглая колоннада на холме над Славянкой, открывающая один из лучших видов Павловска.', latitude: 59.68295, longitude: 30.44955 },
          { name: 'Павильон «Пиль-башня»', desc: 'необычная парковая постройка в виде замшелой водяной мельницы с соломенной крышей, внутри которой скрывается роскошный парадный салон.', latitude: 59.68245, longitude: 30.44185 },
          { name: 'Собственный садик императрицы', desc: 'скрытый регулярный мини-сад у южного фасада дворца, украшенный статуями и редкими сортами голландских цветов.', latitude: 59.68545, longitude: 30.45335 },
        ],
        travelVector: 'Южный вектор',
        travelVectorBlurb: 'Базовый узел для классических дворцово-пейзажных маршрутов. Электрички «Ласточки» и стандартные пригородные поезда отходят от Витебского вокзала у метро «Пушкинская».',
        stationHub: 'Витебский вокзал / метро «Пушкинская»',
        stationName: 'Станция Павловск',
        logisticsExit: 'Станция Павловск',
        gastroStop: { name: 'Ресторан «Подворье»', blurb: 'Русская кухня в бревенчатом тереме усадебного масштаба у парка.' },
        gastroHint: 'Ресторан «Подворье» (Павловск) - Огромный бревенчатый терем русской кухни усадебного масштаба, прозванный «самым русским рестораном страны», где гостей кормят блюдами по старинным рецептам и домашними наливками в окружении аутентичного резного дерева.'
      },
      {
        name: 'Ораниенбаум / Ломоносов',
        desc: 'Барочный Меншиковский дворец, Китайский дворец рококо и павильон Катальной горки.',
        mustSeeFilter: 'main',
        places: [
          { name: 'Большой Меншиковский дворец', desc: 'грандиозная барочная резиденция фаворита Петра I, которая по своим масштабам изначально превосходила даже строящийся в то же время Петергоф.', latitude: 59.91485, longitude: 29.75365 },
          { name: 'Китайский дворец', desc: 'подлинный шедевр стиля рококо архитектора Антонио Ринальди, уцелевший в войну и знаменитый своим уникальным Стеклярусным кабинетом с мерцающими панно.', latitude: 59.90895, longitude: 29.75085 },
          { name: 'Павильон Катальной горки', desc: 'уцелевшая часть огромного императорского аттракциона XVIII века, откуда царская знать спускалась на специальных колясочках с высоты 20 метров.', latitude: 59.90785, longitude: 29.75345 },
          { name: 'Дворец Петра III', desc: 'миниатюрный каменный замок-крепость «Петерштадт», построенный для уединенных военных игр и отдыха несчастного императора.', latitude: 59.91055, longitude: 29.75515 },
          { name: 'Кавалерский корпус', desc: 'служебный флигель ансамбля рядом с Китайским дворцом, часть дворцово-паркового комплекса Ораниенбаума.', latitude: 59.90955, longitude: 29.74985 },
          { name: 'Нижний сад Ораниенбаума', desc: 'регулярный сад у Меншиковского дворца с каналами и видом на залив - парадный вход в ансамбль.', latitude: 59.91555, longitude: 29.75485 },
          { name: 'Парк Ораниенбаум', desc: 'огромный пейзажный массив с вековыми деревьями, мостиками Ринальди и прудами, разделенный на Верхний и Нижний регулярные сады.', latitude: 59.91185, longitude: 29.75245 },
        ],
        travelVector: 'Юго-Западный и Морской вектор',
        travelVectorBlurb: 'Направление вдоль южного побережья Финского залива. Доступно на электричках от метро «Балтийская» или на скоростных водных судах «Метеор» от причалов Эрмитажа.',
        stationHub: 'Балтийский вокзал',
        stationName: 'Станция Ораниенбаум-1',
        logisticsExit: 'Станция Ораниенбаум-1'
      },
      {
        name: 'Стрельна',
        desc: 'Константиновский дворец конгрессов у залива и путевой дом Петра I.',
        mustSeeFilter: 'main',
        places: [
          { name: 'Константиновский дворец', desc: 'величественная парадная резиденция Романовых у самой воды, полностью восстановленная в XXI веке как действующий Государственный комплекс «Дворец конгрессов».', latitude: 59.85585, longitude: 30.05765 },
          { name: 'Путевой дворец Петра I', desc: 'скромный деревянный дом царя, заложенный у реки Стрелки, где были обустроены первые в России опытные грядки для картофеля и лекарственных трав.', latitude: 59.85195, longitude: 30.04285 },
          { name: 'Константиновский парк', desc: 'масштабный гидротехнический парк с каналами и разводными мостами, открывающий парадную панораму на Финский залив.', latitude: 59.85455, longitude: 30.05615 },
          { name: 'Львовский дворец', desc: 'изящная неоготическая усадьба с зубчатыми башнями, построенная для генерал-адъютанта князя Львова прямо на Петергофской дороге.', latitude: 59.84985, longitude: 30.04845 },
          { name: 'Орловский парк', desc: 'заброшенный романтический парк с прудом, готической башней-руиной и конюшнями, принадлежавший некогда графу Орлову.', latitude: 59.84755, longitude: 30.06125 },
        ],
        travelVector: 'Юго-Западный и Морской вектор',
        travelVectorBlurb: 'Направление вдоль южного побережья Финского залива. Доступно на электричках от метро «Балтийская» или на скоростных водных судах «Метеор» от причалов Эрмитажа.',
        stationHub: 'Балтийский вокзал',
        stationName: 'Станция Стрельна',
        logisticsExit: 'Станция Стрельна'
      },
      {
        name: 'Выборг',
        desc: 'Средневековый шведский город у финской границы: замок на скале, парк Монрепо и гранитная брусчатка Старого города.',
        mustSeeFilter: 'main',
        places: [
          { name: 'Выборгский замок', desc: 'единственный в России полностью сохранившийся средневековый шведский рыцарский замок, основанный на скалистом острове в 1293 году.', locationSlug: 'saint-petersburg-vyborgskiy-zamok', latitude: 60.7158, longitude: 28.7292 },
          { name: 'Башня Святого Олафа', desc: 'монументальная замковая доминанта с толщиной стен до четырех метров, служащая главной смотровой площадкой на историческую брусчатку города.', latitude: 60.71595, longitude: 28.72855 },
          { name: 'Скальный парк Монрепо', desc: 'редкий по красоте скальный пейзажный парк на берегу Выборгского залива с гранитными валунами ледникового периода и Островом мертвых.', locationSlug: 'saint-petersburg-skalnyy-park-monrepo', latitude: 60.7321, longitude: 28.7245 },
          { name: 'Часовая башня', desc: 'старинная колокольня разрушенного собора XV века, на которой до сих пор исправно работают тяжелые часовые механизмы часового мастера.', latitude: 60.71285, longitude: 28.73145 },
          { name: 'Круглая башня', desc: 'мощная средневековая башня на Рыночной площади, сохранившаяся часть городских укреплений XVI века.', latitude: 60.71355, longitude: 28.73285 },
          { name: 'Анненские укрепления', desc: 'бастионный пояс XVIII века на мысе, откуда открывается вид на замок и Выборгский залив.', latitude: 60.71785, longitude: 28.72655 },
          { name: 'Ратуша (Старая ратуша)', desc: 'историческое здание городского самоуправления на площади Старой Ратуши в сердце средневекового Выборга.', latitude: 60.71235, longitude: 28.73055 },
          { name: 'Библиотека Алвара Аалто', desc: 'шедевр мирового архитектурного функционализма с уникальным волнообразным деревянным потолком и системой бестеневого освещения.', latitude: 60.709, longitude: 28.7478 },
        ],
        travelVector: 'Северный и Выборгский вектор',
        travelVectorBlurb: 'Скоростные электрички «Ласточки» от метро «Площадь Ленина» связывают центр с курортным побережьем и Выборгом.',
        stationHub: 'Финляндский вокзал',
        stationName: 'Станция Выборг',
        logisticsExit: 'Станция Выборг',
        gastroStop: { name: 'Ресторан «Таверна»', blurb: 'Средневековая атмосфера: эль, мясо в хлебе, глиняная посуда.' },
        gastroHint: 'Ресторан «Таверна» (Выборг) - Аутентичный средневековый ресторан в центре старого города, блюда в глиняной посуде, эль и мясо в хлебной булке.'
      },
      {
        name: 'Курортный район / Побережье',
        desc: 'Сестрорецк, Репино и Комарово: дюны, экотропы и репинские «Пенаты».',
        mustSeeFilter: 'main',
        places: [
          { name: 'Сестрорецкий Рубеж', desc: 'выставочный комплекс на месте оборонительного Карельского укрепрайона с подлинным железобетонным ДОТом «Миллионер» внутри.', latitude: 60.11295, longitude: 29.9712 },
          { name: 'Экотропа «Комаровский берег»', desc: 'пешеходный деревянный маршрут сквозь вековой таежный лес, дюны и муравейники-гиганты прямо к песчаному пляжу залива.', latitude: 60.1825, longitude: 29.7855 },
          { name: 'Музей-усадьба И. Е. Репина «Пенаты»', desc: 'деревянный дом художника в Репино с уникальной стеклянной крышей-куполом, где он провел последние тридцать лет жизни.', latitude: 60.15586, longitude: 29.89661 },
          { name: 'Комаровский некрополь', desc: 'тихое лесное мемориальное кладбище, ставшее местом упокоения Анны Ахматовой, Дмитрия Лихачева и других деятелей науки и культуры.', latitude: 60.20462, longitude: 29.79991 },
          { name: 'Заказник «Сестрорецкое болото»', desc: 'масштабная болотная экосистема с длинной пешеходной тропой на сваях, проложенной через нетронутые дикие топи.', latitude: 60.1055, longitude: 30.0155 },
        ],
        travelVector: 'Северный и Выборгский вектор',
        travelVectorBlurb: 'Скоростные электрички «Ласточки» от метро «Площадь Ленина» связывают центр с курортным побережьем и Выборгом.',
        stationHub: 'Финляндский вокзал',
        stationName: 'Станции Сестрорецк, Репино, Комарово',
        logisticsExit: 'Станции Сестрорецк, Репино, Комарово'
      },
      {
        name: 'Шлиссельбург / Ладога',
        desc: 'Крепость Орешек на острове в истоке Невы и старая имперская тюрьма.',
        mustSeeFilter: 'main',
        places: [
          { name: 'Крепость Орешек', seasonLabel: 'Летняя навигация - май-октябрь', desc: 'древняя новгородская фортеция XIV века на Ореховом острове в истоке Невы, выдержавшая жестокие штурмы шведов и ставшая главной тюрьмой империи.', latitude: 59.9535, longitude: 31.0385 },
          { name: 'Секретный дом (Старая тюрьма)', desc: 'сохранившийся крепостной корпус, где в одиночных камерах десятилетиями содержались декабристы, народовольцы и полярник шекспировед Морозов.', latitude: 59.9538, longitude: 31.0392 },
          { name: 'Королевская башня', desc: 'мощная угловая башня крепости, построенная шведами по последнему слову средневековой фортификации во время оккупации острова.', latitude: 59.9541, longitude: 31.0375 },
          { name: 'Староладожский канал', desc: 'грандиозное гидротехническое сооружение первой половины XVIII века, строившееся по приказу Петра I для безопасного обхода бурной Ладоги.', latitude: 59.9395, longitude: 31.0285 },
          { name: 'Памятник Петру I в Шлиссельбурге', desc: 'один из немногих советских памятников царю, установленный на пристани, откуда катера отправляются на остров.', latitude: 59.9485, longitude: 31.0335 },
        ],
        travelVector: 'Островной и Ладожский вектор',
        travelVectorBlurb: 'Водная логистика, катера от Невы или КАД/Дамба.',
        stationHub: 'Дамба / Водный транспорт',
        stationName: 'Катера от Невы',
        logisticsExit: 'Катера от Невы'
      },
      {
        name: 'Сосновый Бор / Атомград',
        desc: 'Детский Андерсенград, Липовский пляж и приморский лесопарк на юге залива.',
        mustSeeFilter: 'main',
        places: [
          { name: 'Андерсенград', desc: 'уникальный детский игровой городок из камня, построенный к 175-летию Ханса Кристиана Андерсена в стиле средневековой западноевропейской архитектуры с ратушей, подземным ходом и бастионами.', locationSlug: 'saint-petersburg-andersengrad-sosnovyy-bor', latitude: 59.897811, longitude: 29.086412 },
          { name: 'Природный парк «Липовский пляж»', desc: 'многокилометровый песчаный берег Финского залива с вековыми соснами и дюнами, обрамляющий уникальное соленое озеро Липово.', latitude: 59.9055, longitude: 29.0455 },
          { name: 'Парк «Приморский»', desc: 'благоустроенный прибрежный лесопарк с современными деревянными набережными, экотропами на сваях и панорамными смотровыми площадками на залив.', latitude: 59.9015, longitude: 29.0725 },
          { name: 'Копорская крепость', desc: 'расположенная неподалеку древнерусская каменная фортеция XIII века, возведенная на высокой скале и частично сохранившая средневековые башни и оборонительные стены.', latitude: 59.7085, longitude: 29.0325 },
          { name: 'Ранчо «Эвелон»', desc: 'популярный загородный эко-комплекс и конный клуб в окрестностях города, предлагающий прогулки по хвойным лесам побережья.', latitude: 59.8755, longitude: 29.1255 },
        ],
        travelVector: 'Южный Атомный вектор',
        travelVectorBlurb: 'Дальнее прибрежное направление юга залива. Поезда до конечной станции Калище.',
        stationHub: 'Балтийский вокзал / Калище',
        stationName: 'Станция Калище',
        logisticsExit: 'Станция Калище',
        gastroStop: { name: 'Кафе «Тайм-аут»', blurb: 'Бургеры и рыба Финского залива на видовой террасе у Приморского парка.' },
        gastroHint: 'Кафе «Тайм-аут» (Сосновый Бор) - Популярный локальный гастро-спот у Приморского парка, где подают отличные бургеры и блюда из свежевыловленной рыбы Финского залива на видовой террасе.'
      },
    ],
    dayRoutePresets: [
      ...SAINT_PETERSBURG_LINE_DAY_ROUTE_PRESETS,
      {
        id: 'spb-1',
        title: 'Золотой треугольник / парадный центр',
        description:
          'Маршрут по «Золотому треугольнику»: дуга от Сенатской вдоль Невы через Исаакий и Большую Морскую к Дворцовой, затем дворы и Конюшенные к Невскому.',
        timingNote:
          'Старт утром у Медного всадника. Один большой интерьер (Исаакий или Эрмитаж) - 2-3 часа; второй оставьте на другой день.',
        blogSlug: 'spb-zolotoy-treugolnik-za-1-den',
        travelVector: 'Пешеходная дуга центра',
        travelVectorBlurb:
          'Сенатская - Нева/Адмиралтейство - сад - Исаакий - Синий мост - Большая Морская - Дворцовая - дворы Капеллы - Конюшенная - Невский у Зингера.',
        gastroStop: {
          name: 'Литературное кафе (Вольф и Беранже)',
          blurb: 'Гастро-пауза на Большой Морской - кофе/перекус перед Дворцовой.'
        },
        stops: [
          spbPresetStop('Медный всадник / Сенатская площадь', {
            dayRouteId: 'spb-senatskaya-ploschad',
            latitude: 59.9364,
            longitude: 30.3023,
            desc: 'Главный символ города, запечатленный в поэме Пушкина. Памятник Петру I установлен на гигантском «Гром-камне» прямо у берега Невы.',
            transitTip: 'Старт у Невы - Сенатская площадь'
          }),
          spbPresetStop('Адмиралтейство', {
            desc: 'Колыбель российского флота со знаменитым позолоченным шпилем-иглой и корабликом-флюгером. Фасад украшен монументальной классической скульптурой.'
          }),
          spbPresetStop('Александровский сад', {
            desc: 'Сквозь тенистый сад вдоль фасада Адмиралтейства - плавный подход к куполу Исаакия.',
            transitTip: 'Сквозь сад - без возврата на Неву'
          }),
          spbPresetStop('Исаакиевский собор', {
            dayRouteId: 'spb-isaakievskiy-sobor',
            latitude: 59.9343,
            longitude: 30.3061,
            desc: 'Крупнейший православный храм Петербурга, на возведение которого ушло 40 лет. Внутри поражает отделкой из малахита, лазурита и мозаик.'
          }),
          spbPresetStop('Колоннада Исаакия', {
            desc: 'Лучшая смотровая в центре на высоте 43 метров - круговая панорама на 360 градусов. Поднимайтесь сейчас, если ясно и без длинной очереди.',
            transitTip: 'Колоннада при хорошей видимости - иначе в другой день'
          }),
          spbPresetStop('Синий мост', {
            desc: 'У Мариинского дворца - один из самых широких мостов города (~100 м). Удобный разворот с Исаакиевской площади к Большой Морской.',
            transitTip: 'Коротко к Синему мосту'
          }),
          spbPresetStop('Большая Морская', {
            desc: 'Фешенебельная историческая улица, где селились ювелиры и банкиры. Здесь дом Фаберже и старейшие кондитерские; гастро-пауза у Литературного кафе.',
            transitTip: 'По Большой Морской; гастро у Литературного кафе'
          }),
          spbPresetStop('Дворцовая площадь', {
            dayRouteId: 'spb-dvortsovaya-ploschad',
            latitude: 59.939,
            longitude: 30.3158,
            desc: 'Главная площадь города, превосходящая по размерам Красную площадь в Москве. В центре - 600-тонная Александровская колонна, удерживаемая только собственным весом.'
          }),
          spbPresetStop('Государственный Эрмитаж (Зимний дворец)', {
            desc: 'Один из величайших художественных музеев мира в Зимнем дворце. Хранит миллионы шедевров от античности до Леонардо. Один музейный блок 2-3 часа - второй день для другого крыла.',
            transitTip: 'Один музей 2-3 часа - второй день для Зимнего'
          }),
          spbPresetStop('Главный штаб (Эрмитаж)', {
            desc: 'Арка и восточное крыло - альтернатива Зимнему, если Эрмитаж оставляете на другой день.',
            transitTip: 'Через арку - если Эрмитаж пропускаете'
          }),
          spbPresetStop('Двор Капеллы', {
            desc: 'Тихий поворот с парадной оси к Мойке и Конюшенным - передышка после площадей.'
          }),
          spbPresetStop('Пышечная на Большой Конюшенной', {
            desc: 'Легендарное советское кафе с 1958 года. Пышки по ГОСТу, кофе из ведерного титана - простая пауза после дворцов.',
            transitTip: 'К Большой Конюшенной - пышка и кофе'
          }),
          spbPresetStop('Храм Святой Екатерины', {
            desc: 'На Большой Конюшенной к Невскому - католический храм на пути к финалу дуги.'
          }),
          spbPresetStop('Дом компании «Зингер»', {
            desc: 'Дом книги на Невском - финал пешеходной дуги. Дальше канал Грибоедова по желанию.',
            transitTip: 'Финал у Зингера - дальше канал по желанию'
          }),
        ]
      },
      {
        id: 'spb-2',
        title: 'Васильевский остров',
        description: 'Музеи, набережные и гастрономия Васильевского острова.',
        blogSlug: 'spb-vasilevskiy-ostrov-marshrut',
        stops: [
          spbPresetStop('Стрелка Васильевского острова', {
            desc: 'Один из главных архитектурных ансамблей города со знаменитыми Ростральными колоннами и величественным зданием Биржи.',
            address: 'Биржевая площадь',
            dayRouteId: 'spb-strelka-vasilevskogo-ostrova',
            locationSlug: 'saint-petersburg-strelka-vasilevskogo-ostrova',
            latitude: 59.9442,
            longitude: 30.306894
          }),
          spbPresetStop('Зоологический музей РАН', {
            desc: 'Один из старейших и крупнейших зоологических музеев в мире с уникальной коллекцией скелетов мамонтов и чучел животных.',
            address: 'Университетская наб., 1',
            venueSlug: 'saint-petersburg-zoologicheskiy-muzey-ran',
            latitude: 59.942183,
            longitude: 30.30563
          }),
          spbPresetStop('Кунсткамера', {
            desc: 'Первый публичный музей России, основанный Петром I, знаменитый своими анатомическими редкостями и этнографическими коллекциями.',
            address: 'Университетская наб., 3',
            dayRouteId: 'spb-kunstkamera',
            venueSlug: 'saint-petersburg-kunstkamera',
            latitude: 59.941434,
            longitude: 30.304561
          }),
          spbPresetStop('Университетская набережная', {
            desc: 'Историческая гранитная набережная Невы, украшенная подлинными древнеегипетскими сфинксами напротив здания Академии художеств.',
            address: 'Университетская набережная',
            locationSlug: 'saint-petersburg-universitetskaya-naberezhnaya',
            latitude: 59.938722,
            longitude: 30.297491
          }),
          spbPresetStop('Академия художеств', {
            desc: 'Старейшее в России высшее учебное заведение изобразительных искусств, расположенное в грандиозном здании эпохи классицизма.',
            address: 'Университетская наб., 17',
            locationSlug: 'saint-petersburg-akademiya-hudozhestv',
            latitude: 59.937464,
            longitude: 30.290033
          }),
          spbPresetStop('Линии Васильевского острова', {
            desc: 'Уникальная параллельная система улиц-линий, задуманная Петром I как каналы для прообраза русской Венеции.',
            address: 'Васильевский остров (от 1-й до 29-й линии)',
            locationSlug: 'saint-petersburg-linii-vasilevskogo-ostrova',
            latitude: 59.938171,
            longitude: 30.276451
          }),
          spbPresetStop('Аптека доктора Пеля', {
            desc: 'Старинная действующая аптека-музей с алхимической лабораторией, овеянная городскими легендами о Башне грифонов во дворе.',
            address: '7-я линия В.О., 16-18',
            locationSlug: 'saint-petersburg-apteka-doktora-pelya',
            latitude: 59.939221,
            longitude: 30.285411
          }),
          spbPresetStop('Василеостровский рынок', {
            desc: 'Модное гастрономическое пространство в историческом здании Андреевского рынка с кухнями разных стран мира и фермерскими лавками.',
            address: 'Большой пр. В.О., 16',
            dayRouteId: 'spb-vasileostrovskiy-rynok',
            locationSlug: 'saint-petersburg-vasileostrovskiy-rynok',
            latitude: 59.938634,
            longitude: 30.285885
          }),
          spbPresetStop('Набережная Макарова', {
            desc: 'Набережная Малой Невы, открывающая красивые виды на Тучков мост, Петроградскую сторону и стадион «Петровский».',
            address: 'Набережная Макарова',
            locationSlug: 'saint-petersburg-naberezhnaya-makarova',
            latitude: 59.949031,
            longitude: 30.28312
          }),
          spbPresetStop('Эрарта', {
            desc: 'Крупнейший в России частный музей современного искусства, представляющий интерактивные инсталляции и работы актуальных художников.',
            address: '29-я линия В.О., 2',
            venueSlug: 'erarta',
            latitude: 59.93223,
            longitude: 30.251411
          }),
          spbPresetStop('Севкабель Порт', {
            desc: 'Популярный общественный культурный кластер у моря на территории бывшего кабельного завода с набережной, барами и выставками.',
            address: 'Кожевенная линия, 40',
            locationSlug: 'saint-petersburg-sevkabel-port',
            latitude: 59.924403,
            longitude: 30.240763
          }),
          spbPresetStop('Брусницын', {
            desc: 'Современное культурное пространство в кирпичных зданиях бывшей кожевенной фабрики купцов Брусницыных со стильным променадом у залива.',
            address: 'Кожевенная линия, 30',
            locationSlug: 'saint-petersburg-osobnyak-brusnitsynyh',
            latitude: 59.922115,
            longitude: 30.251411
          }),
        ]
      },
      {
        id: 'spb-3',
        title: 'Петроградская сторона',
        description:
          'По часовой: Троицкий мост - Аврора - мечеть/Кшесинская - Каменноостровский - парк - артиллерия - крепость - Корюшка.',
        timingNote:
          'Начинать с Авроры утром; крепость и ужин у воды - вечер.',
        blogSlug: 'spb-petrogradskaya-storona',
        travelVector: 'По часовой от Авроры к крепости',
        travelVectorBlurb:
          'Троицкий мост - Петроградская набережная / Аврора - мечеть и Кшесинская (~10 мин по Куйбышева) - Каменноостровский - парк/зоопарк - Артиллерия - крепость - Корюшка у пляжа.',
        gastroStop: {
          name: 'Ресторан «Корюшка»',
          blurb: 'Гастро-финал у пляжа крепости - вечер у воды.'
        },
        stops: [
          spbPresetStop('Троицкий мост', {
            desc: 'Старт / панорама Невы',
            transitTip: 'Старт у Троицкого моста - панорама Невы'
          }),
          spbPresetStop('Петроградская набережная', {
            desc: 'Утро у Невы к Авроре'
          }),
          spbPresetStop('Крейсер «Аврора»', {
            desc: 'Утренний якорь маршрута',
            transitTip: 'Утро у Авроры - дальше внутрь Петроградки'
          }),
          spbPresetStop('Санкт-Петербургская соборная мечеть', {
            dayRouteId: 'spb-sobornaya-mechet',
            locationSlug: 'saint-petersburg-sobornaya-mechet',
            latitude: 59.9552,
            longitude: 30.3239,
            desc: 'Мечеть на Куйбышева'
          }),
          spbPresetStop('Музей политической истории (особняк Кшесинской)', {
            desc: 'Особняк рядом с мечетью'
          }),
          spbPresetStop('Каменноостровский проспект', {
            desc: 'Проспект внутрь острова'
          }),
          spbPresetStop('Павловский дом-музей', {
            desc: 'Дом-музей на линии проспекта'
          }),
          spbPresetStop('Александровский парк', {
            dayRouteId: 'spb-aleksandrovskiy-park',
            latitude: 59.9528,
            longitude: 30.3131,
            desc: 'Тень середины дня'
          }),
          spbPresetStop('Ленинградский зоопарк', {
            desc: 'Опционально в парковой зоне',
            transitTip: 'Рядом с парком - зоопарк по желанию'
          }),
          spbPresetStop('Артиллерийский музей', {
            desc: 'Кронверк; двор техники бесплатно'
          }),
          spbPresetStop('Петропавловская крепость', {
            dayRouteId: 'spb-petropavlovskaya-krepost',
            latitude: 59.9502,
            longitude: 30.3164,
            desc: 'Вечерний финал ансамбля',
            transitTip: 'Через Иоанновский мост в крепость; Невские ворота'
          }),
          spbPresetStop('Петропавловский собор', {
            desc: 'Собор внутри крепости'
          }),
          spbPresetStop('Ресторан «Корюшка»', {
            desc: 'Гастро-финал у пляжа крепости',
            transitTip: 'Ужин у воды / пляж крепости - Корюшка'
          }),
        ]
      },
      {
        id: 'spb-4',
        title: 'От Бертгольда к Новой Голландии',
        description:
          'Линия Сенная - каналы Коломны - Новая Голландия; вечером такси к El Copitas.',
        timingNote:
          'Линия Сенная - каналы - Новая Голландия; бар такси вечером.',
        blogSlug: 'spb-kolomna-kanaly',
        travelVector: 'Сенная - каналы - Новая Голландия',
        travelVectorBlurb:
          'Бертгольд у Сенной/Садовой - Грибоедова / Львиный - Никольский / Семимостье / Коломна - Крюков / ВММ - Поцелуев / Юсуповский - Новая Голландия на закат; El Copitas - такси ~15 мин к Владимирской.',
        gastroStop: {
          name: 'Коктейльный бар «El Copitas»',
          blurb: 'Секретный двор у Владимирской - такси ~15 мин к 20:00-21:00.'
        },
        stops: [
          spbPresetStop('Бертгольд-центр', {
            desc: 'Старт у Сенной/Садовой - кофе/крыша утром',
            transitTip: 'Старт у Сенной / Садовой - Бертгольд утром',
            locationSlug: 'saint-petersburg-bertgold-tsentr',
            latitude: 59.9258,
            longitude: 30.3164,
          }),
          spbPresetStop('Набережная канала Грибоедова', {
            desc: 'Канал к Львиному мосту',
            locationSlug: 'saint-petersburg-naberezhnaya-kanala-griboedova',
            latitude: 59.935111,
            longitude: 30.326814,
          }),
          spbPresetStop('Львиный мост', {
            desc: 'Мост на линии Грибоедова',
            locationSlug: 'saint-petersburg-lvinyy-most',
            latitude: 59.926944,
            longitude: 30.301111,
          }),
          spbPresetStop('Николо-Богоявленский морской собор', {
            desc: 'Никольский ансамбль у Крюкова канала / Никольской площади',
            locationSlug: 'saint-petersburg-nikolo-bogoyavlenskiy-morskoy-sobor',
            address: 'Никольская пл., 1/3',
            latitude: 59.9225,
            longitude: 30.3005,
          }),
          spbPresetStop('Семимостье', {
            desc: 'Семь мостов у слияния каналов',
            transitTip: 'Пикалов мост / Семимостье - ракурс на 7 мостов',
            locationSlug: 'saint-petersburg-semimoste',
            latitude: 59.9275,
            longitude: 30.2958,
          }),
          spbPresetStop('Коломна', {
            desc: 'Квартал между каналами',
            locationSlug: 'saint-petersburg-kolomna',
            latitude: 59.9252,
            longitude: 30.2935,
          }),
          spbPresetStop('Крюков канал', {
            desc: 'Канал мимо Мариинки',
            transitTip: 'По Крюкову каналу мимо Мариинки',
            locationSlug: 'saint-petersburg-kryukov-kanal',
            latitude: 59.9268,
            longitude: 30.2952,
          }),
          spbPresetStop('Центральный военно-морской музей', {
            desc: 'ВММ на линии канала',
            venueSlug: 'saint-petersburg-tsentralnyy-voenno-morskoy-muzey',
            latitude: 59.929811,
            longitude: 30.294124,
          }),
          spbPresetStop('Поцелуев мост', {
            desc: 'К Юсуповскому',
            locationSlug: 'saint-petersburg-poceluev-most',
            latitude: 59.928889,
            longitude: 30.295833,
          }),
          spbPresetStop('Юсуповский дворец', {
            desc: 'Дворец; внутри лучше с аудиоэкскурсией',
            transitTip: 'Внутри Юсуповского - аудиоэкскурсия',
            locationSlug: 'saint-petersburg-yusupovskiy-dvorets',
            latitude: 59.929532,
            longitude: 30.303912,
          }),
          spbPresetStop('Новая Голландия (парк-остров)', {
            desc: 'Закат / предвечерний отдых',
            locationSlug: 'saint-petersburg-novaya-gollandiya',
            latitude: 59.929112,
            longitude: 30.289214,
          }),
          spbPresetStop('Коктейльный бар «El Copitas»', {
            desc: 'Секретный двор у Владимирской',
            transitTip: 'Такси ~15 мин к Владимирской ~20:00-21:00 - секретный двор',
            locationSlug: 'saint-petersburg-spikizi-bar-el-copitas',
            latitude: 59.927114,
            longitude: 30.347112,
          }),
        ]
      },
      {
        id: 'spb-5',
        title: 'Литературный Петербург',
        description:
          'Достоевский и Пять углов утром - Рубинштейна и Фонтанка днём - Ахматова и «Бродячая собака» вечером.',
        timingNote:
          'Достоевский утром - Рубинштейна / Фонтанка днём - «Бродячая собака» вечером.',
        blogSlug: 'spb-vladimirskaya-gastro',
        travelVector: 'Владимирская - Рубинштейна - Фонтанка - пл. Искусств',
        travelVectorBlurb:
          'Кузнечный - Владимирский - Пять углов - Рубинштейна (Довлатов) - Толстовский дом на Фонтанку - Ахматова - Итальянская к «Бродячей собаке».',
        gastroStop: {
          name: 'Кафе «Рубинштейн»',
          blurb: 'Экватор маршрута - кофе и лёгкий обед перед арками Толстовского дома.'
        },
        stops: [
          spbPresetStop('Литературно-мемориальный музей Достоевского', {
            venueSlug: 'saint-petersburg-literaturno-memorialnyy-muzey-dostoevskogo',
            latitude: 59.927611,
            longitude: 30.350312,
            desc: 'Кузнечный пер., 5 - старт у квартиры «Карамазовых»',
            transitTip: 'Старт у метро «Владимирская» / «Достоевская» - Кузнечный 5'
          }),
          spbPresetStop('Владимирский собор', {
            locationSlug: 'saint-petersburg-vladimirskiy-sobor',
            desc: 'Приход Достоевского - ~2 мин от музея'
          }),
          spbPresetStop('Пять углов', {
            locationSlug: 'saint-petersburg-dohodnyy-dom-ioffa-pyat-uglov',
            desc: 'По Б. Московской; дом Иоффа - Чуковская / Ахматова',
            transitTip: 'По Большой Московской к Пяти углам - дом Иоффа с башенкой'
          }),
          spbPresetStop('Улица Рубинштейна', {
            locationSlug: 'saint-petersburg-ulitsa-rubinshteyna',
            latitude: 59.931211,
            longitude: 30.342914,
            desc: 'Памятник Довлатову у дома 23 - не Гумилёв',
            transitTip: 'На Рубинштейна к дому 23 - памятник Сергею Довлатову'
          }),
          spbPresetStop('Кафе «Рубинштейн»', {
            locationSlug: 'saint-petersburg-kafe-rubinshteyn',
            desc: 'Гастро-пауза - экватор литературного дня',
            transitTip: 'Гастро-пауза в кафе «Рубинштейн» - кофе / лёгкий обед'
          }),
          spbPresetStop('Толстовский дом', {
            locationSlug: 'saint-petersburg-tolstovskiy-dom',
            latitude: 59.931114,
            longitude: 30.340912,
            desc: 'Арки Лидваля - Куприн / Булгаков; выход на Фонтанку',
            transitTip: 'Сквозь три арки Толстовского дома - выход на набережную'
          }),
          spbPresetStop('Набережная Фонтанки', {
            locationSlug: 'saint-petersburg-naberezhnaya-fontanki',
            latitude: 59.931241,
            longitude: 30.338914,
            desc: 'Влево по Фонтанке к Невскому',
            transitTip: 'Влево по Фонтанке к Невскому / Аничкову'
          }),
          spbPresetStop('Аничков мост', {
            locationSlug: 'saint-petersburg-anichkov-most',
            latitude: 59.932912,
            longitude: 30.342931,
            desc: 'Клодт - «Укрощение коня»',
            transitTip: 'Через Аничков мост - скульптуры Клодта'
          }),
          spbPresetStop('Музей Анны Ахматовой в Фонтанном доме', {
            venueSlug: 'saint-petersburg-muzey-anny-ahmatovoy-v-fontannom-dome',
            latitude: 59.936122,
            longitude: 30.347514,
            desc: 'Шереметевский / Южный флигель - сад Фонтанного дома',
            transitTip: 'Дальше по Фонтанке до д. 34 - арка в Южный флигель'
          }),
          spbPresetStop('Арт-кафе «Бродячая собака»', {
            locationSlug: 'saint-petersburg-art-kafe-brodyachaya-sobaka',
            latitude: 59.937142,
            longitude: 30.331411,
            desc: 'Итальянская 4 - финал Серебряного века',
            transitTip: '~10 мин через Итальянские к пл. Искусств - вечерний финал'
          }),
        ]
      },
      {
        id: 'spb-barnyy-peterburg',
        title: 'Барный Петербург: рюмочные и спикизи',
        description:
          'Некрасова - Синий Пушкин - El Copitas - Рубинштейна/Евгенич - такси к Новой Голландии; финал у Коломны / Малой Морской.',
        timingNote:
          'Некрасова - Рубинштейна - такси к Новой Голландии вечером.',
        blogSlug: 'spb-barnyy-peterburg-ryumochnye-spikizi',
        travelVector: 'Некрасова - Владимирская - Новая Голландия',
        travelVectorBlurb:
          'Рюмочные на Некрасова - Синий Пушкин (~5 мин) - El Copitas (бронь ~20:00) - Рубинштейна/Евгенич (~10 мин) - такси ~15 мин к Новой Голландии ~23:00; финал «Кабинет» или «Полторы комнаты» вместо далекой Гражданки.',
        gastroStop: {
          name: 'Рюмочные «Залив» / «Хроники»',
          blurb: 'Некрасова 26 - настойки и бутерброды; якорь вечера.'
        },
        stops: [
          spbPresetStop('Улица Некрасова / рюмочные «Залив» и «Хроники»', {
            desc: 'Некрасова 26 - настойки и бутерброды',
            transitTip: 'Старт на Некрасова'
          }),
          spbPresetStop('Синий Пушкин', {
            dayRouteId: 'spb-sinii-pushkin',
            latitude: 59.936511,
            longitude: 30.351214,
            venueSlug: 'sinii-pushkin-bar-shnurova',
            desc: 'Жуковского 3'
          }),
          spbPresetStop('El Copitas', {
            dayRouteId: 'spb-el-copitas',
            latitude: 59.927114,
            longitude: 30.347112,
            locationSlug: 'saint-petersburg-spikizi-bar-el-copitas',
            desc: 'Достоевского / Владимирская - секретный двор'
          }),
          spbPresetStop('Улица Рубинштейна', {
            dayRouteId: 'spb-rubinshteyna',
            latitude: 59.931211,
            longitude: 30.342914,
            locationSlug: 'saint-petersburg-ulitsa-rubinshteyna',
            desc: 'Барная улица'
          }),
          spbPresetStop('Евгенич', {
            dayRouteId: 'spb-evgenich',
            latitude: 59.931811,
            longitude: 30.342112,
            venueSlug: 'evgenich-na-rubinshteina-6930909cfc27bb700696490f',
            desc: 'Рубинштейна 23',
            transitTip: 'Рядом - Рубинштейна 23'
          }),
          spbPresetStop('Новая Голландия', {
            dayRouteId: 'spb-novaya-gollandiya',
            latitude: 59.929112,
            longitude: 30.289214,
            locationSlug: 'saint-petersburg-novaya-gollandiya',
            desc: 'Вечер у острова / Коломны',
            transitTip: 'такси ~15 мин'
          }),
          spbPresetStop('«Кабинет» (Малая Морская) / «Полторы комнаты»', {
            desc: 'Финал у центра / Коломны - вместо далекой Гражданки'
          }),
        ]
      },
    ],
    travel:
      "Международный аэропорт Пулково принимает сотни рейсов со всей России, а из Москвы до Московского вокзала за рекордные 3,5–4 часа долетают скоростные поезда «Сапсан». Также развито автомобильное сообщение по современной платной трассе М-11 «Нева». Идеальный туристический сезон длится с конца мая по июль, когда в городе наступают знаменитые Белые ночи, открывается навигация по каналам и запускаются грандиозные фонтаны Петергофа. Вторая половина осени и зима с частыми оттепелями и балтийскими ветрами отлично подходят для бюджетного музейного туризма без очередей.",
    seasonalTip: {
      title: 'Развод мостов: коротко',
      description:
        'Основной сезон - с мая по октябрь. Дворцовый мост удобно смотреть с Дворцовой или Университетской набережной, а время разводки каждый год уточняйте по актуальному графику. Для ночного маршрута с несколькими мостами выберите прогулку по Неве.',
      href: '/saint-petersburg/night-bridges',
      linkLabel: 'Развод мостов'
    },
    faq: [
    { q: "Как выгоднее всего оплачивать проезд в общественном транспорте Петербурга?", a: "Для экономии на метро и наземном транспорте туристам рекомендуется сразу приобрести в кассе метрополитена пополняемую карту «Подорожник»." },
    { q: "В какое время ночью разводят мосты на Неве?", a: "График разводки мостов меняется каждый год. В основной сезон с мая по октябрь Дворцовый и Благовещенский мосты обычно разводят после часа ночи, поэтому время стоит проверить перед поездкой." },
    { q: "Нужно ли покупать билеты в Эрмитаж заранее?", a: "Чтобы гарантированно попасть в музей в высокий летний сезон и не стоять часами в кассах, билеты с фиксированным временем входа необходимо приобретать онлайн на официальном сайте." },
    ]
  },
  moscow: {
    brief: "Огненный супермегаполис с тысячелетней историей, где древние кремлевские стены соседствуют с зеркальными небоскребами Сити. Город невероятных скоростей, безумной культурной жизни, лучших театров планеты и парков мирового уровня.",
    hookFact: "А вы знали, что московское метро - это не просто транспорт, а самая большая подземная арт-галерея в мире? Более 40 станций признаны официальными памятниками архитектуры, а для их отделки использовались десятки видов редчайшего мрамора и гранита со всего СССР.",
    mustSee: [
      {
        name: "Московский Кремль",
        desc: "Главный общественно-политический и историко-художественный комплекс столицы, являющийся официальной резиденцией Президента РФ.",
        address: "Кремлевская наб.",
        latitude: 55.752004,
        longitude: 37.617456,
        mustSeeFilter: "main",
        locationSlug: "moscow-moskovskiy-kreml",
      },
      {
        name: "Красная площадь",
        desc: "Центральная и самая известная площадь Москвы, ставшая главным символом страны и местом проведения ключевых торжеств.",
        address: "Красная площадь",
        latitude: 55.753544,
        longitude: 37.621049,
        mustSeeFilter: "main",
        locationSlug: "moscow-krasnaya-ploschad",
      },
      {
        name: "Большой театр",
        desc: "Один из главных и старейших театров оперы и балета в мире, являющийся шедевром русского классицизма.",
        address: "Театральная площадь, 1",
        latitude: 55.760156,
        longitude: 37.61858,
        mustSeeFilter: "main",
        venueSlug: "moscow-bol-shoy-teatr",
      },
      {
        name: "Деловой центр «Москва-Сити»",
        desc: "Современный квартал ультранебоскребов из стекла и стали, ставший главным деловым центром и визитной карточкой новой Москвы.",
        address: "Пресненская наб.",
        latitude: 55.74758,
        longitude: 37.538575,
        mustSeeFilter: "main",
        locationSlug: "moscow-moskva-siti",
      },
      {
        name: "ГУМ",
        desc: "Легендарный исторический универмаг с роскошной архитектурой, знаменитым мороженым и советским фонтаном.",
        address: "Красная площадь, 3",
        latitude: 55.754714,
        longitude: 37.621481,
        mustSeeFilter: "main",
        locationSlug: "moscow-gum",
      },
      {
        name: "Храм Христа Спасителя",
        desc: "Главный и самый грандиозный кафедральный собор Русской православной церкви, монументально воссозданный в 1990-х годах.",
        address: "ул. Волхонка, 15",
        latitude: 55.7447,
        longitude: 37.6053,
        mustSeeFilter: "main",
        locationSlug: "moscow-hram-hrista-spasitelya",
      },
      {
        name: "Новодевичий монастырь",
        desc: "Прекрасно сохранившийся ансамбль крепости-монастыря в стиле московского барокко, включенный в список Всемирного наследия ЮНЕСКО.",
        address: "Новодевичий проезд, 1",
        latitude: 55.7275,
        longitude: 37.5561,
        mustSeeFilter: "main",
        locationSlug: "moscow-novodevichiy-monastyr",
      },
      {
        name: "Парк «Зарядье»",
        desc: "Современный ландшафтный парк в самом центре столицы, объединивший в себе инновационные медиакомплексы и разные природные зоны России.",
        address: "ул. Варварка, 6, стр. 1",
        latitude: 55.7513,
        longitude: 37.628312,
        mustSeeFilter: "main",
        locationSlug: "moscow-park-zaryad-e",
      },
      {
        name: "ВДНХ",
        desc: "Крупнейший экспозиционный и парковый комплекс страны, знаменитый монументальными советскими павильонами и фонтанами.",
        address: "проспект Мира, 119",
        latitude: 55.829845,
        longitude: 37.6334,
        mustSeeFilter: "main",
        locationSlug: "moscow-vdnh",
      },
      {
        name: "Воробьевы горы",
        desc: "Главная классическая панорамная точка города с каноническим видом на Лужники, излучину Москвы-реки и столичные высотки.",
        address: "улица Косыгина",
        latitude: 55.7093,
        longitude: 37.5422,
        mustSeeFilter: "main",
        locationSlug: "moscow-vorobevy-gory",
      },
      {
        name: "Останкинская телебашня",
        desc: "Высочайшее сооружение в Европе, предлагающее экскурсии на закрытые и открытые смотровые площадки со стеклянным полом.",
        address: "ул. Академика Королева, 15, корп. 2",
        latitude: 55.820803,
        longitude: 37.611647,
        mustSeeFilter: "main",
        locationSlug: "moscow-ostankinskaya-telebashnya",
      },
      {
        name: "Главное здание МГУ",
        desc: "Самая высокая из семи сталинских высоток столицы, увенчанная 57-метровым шпилем и окруженная университетским парком.",
        address: "Ленинские горы, 1",
        latitude: 55.7028,
        longitude: 37.5308,
        mustSeeFilter: "main",
        locationSlug: "moscow-mgu",
      },
      {
        name: "Государственная Третьяковская галерея",
        desc: "Главный музей национального искусства России, хранящий величайшие шедевры русских художников от икон до классики.",
        address: "Лаврушинский пер., 10",
        latitude: 55.741434,
        longitude: 37.62014,
        mustSeeFilter: "museum",
        venueSlug: "moscow-tret-yakovskaya-galereya",
      },
      {
        name: "Государственный музей изобразительных искусств им. А. С. Пушкина",
        desc: "Крупнейший музей европейского и мирового искусства в России с уникальной коллекцией слепков и французского импрессионизма.",
        address: "ул. Волхонка, 12",
        latitude: 55.7472,
        longitude: 37.6051,
        mustSeeFilter: "museum",
        venueSlug: "moscow-gmii-imeni-pushkina",
      },
      {
        name: "Государственный Исторический музей",
        desc: "Монументальный терем из красного кирпича на Красной площади, хранящий реликвии от мамонтовых бивней до личных вещей царей.",
        address: "Красная площадь, 1",
        latitude: 55.7553,
        longitude: 37.6178,
        mustSeeFilter: "museum",
        locationSlug: "moscow-gim",
      },
      {
        name: "Музей космонавтики",
        desc: "Один из крупнейших научно-технических музеев мира, расположенный в основании монумента «Покорителям космоса».",
        address: "проспект Мира, 111",
        latitude: 55.822115,
        longitude: 37.639871,
        mustSeeFilter: "museum",
        venueSlug: "moscow-muzey-kosmonavtiki",
      },
      {
        name: "Новая Третьяковка",
        desc: "XX век русского искусства на Крымском Валу рядом с Музеоном.",
        address: "ул. Крымский Вал, 10",
        latitude: 55.7345,
        longitude: 37.6059,
        mustSeeFilter: "museum",
        venueSlug: "moscow-novaya-tretyakovka",
      },
      {
        name: "Музей современного искусства «Гараж»",
        desc: "Современное искусство в Парке Горького в здании бывшего ресторана «Времена года».",
        address: "ул. Крымский Вал, 9, стр. 32",
        latitude: 55.7278,
        longitude: 37.6014,
        mustSeeFilter: "museum",
        venueSlug: "moscow-muzey-garazh",
      },
      {
        name: "Еврейский музей и центр толерантности",
        desc: "Высокотехнологичный интерактивный музей, подробно рассказывающий об истории еврейского народа в России.",
        address: "ул. Образцова, 11, стр. 1А",
        latitude: 55.790221,
        longitude: 37.607842,
        mustSeeFilter: "museum",
        venueSlug: "moscow-evreyskiy-muzey",
      },
      {
        name: "Музей Москвы",
        desc: "Городская история в Провиантских складах на Зубовском бульваре.",
        address: "Зубовский бульвар, 2",
        latitude: 55.7368,
        longitude: 37.5925,
        mustSeeFilter: "museum",
        venueSlug: "moscow-muzey-moskvy",
      },
      {
        name: "Бункер-42 на Таганке",
        desc: "Военно-исторический музей, расположенный на глубине 65 метров в бывшем секретном противоатомном убежище СССР.",
        address: "5-й Котельнический пер., 11",
        latitude: 55.741617,
        longitude: 37.648633,
        mustSeeFilter: "museum",
        venueSlug: "moscow-bunker-42",
      },
      {
        name: "Музей-квартира М.А. Булгакова",
        desc: "Мемориальный музей писателя на Большой Садовой - прообраз «нехорошей квартиры» из «Мастера и Маргариты».",
        address: "Большая Садовая ул., 10, кв. 50",
        latitude: 55.7669,
        longitude: 37.5928,
        mustSeeFilter: "museum",
        venueSlug: "moscow-muzey-bulgakova",
      },
      {
        name: "Музей русского импрессионизма",
        desc: "Частное собрание в бережно реконструированных корпусах фабрики «Большевик».",
        address: "Ленинградский проспект, 15, стр. 11",
        latitude: 55.7889,
        longitude: 37.5615,
        mustSeeFilter: "museum",
        venueSlug: "moscow-muzey-russkogo-impressionizma",
      },
      {
        name: "Политехнический музей (Открытая коллекция)",
        desc: "Фондохранилище легендарного техно-музея с редчайшими автомобилями, первыми советскими ЭВМ и аналоговыми роботами.",
        address: "Волгоградский проспект, 42, корп. 5",
        latitude: 55.7114,
        longitude: 37.7183,
        mustSeeFilter: "museum",
        venueSlug: "moscow-politehnicheskiy-muzey",
      },
      {
        name: "Дарвиновский музей",
        desc: "Крупнейший естественнонаучный музей Европы об эволюции жизни с аудиовизуальными инсталляциями и моделями динозавров.",
        address: "ул. Вавилова, 57",
        latitude: 55.6906,
        longitude: 37.5619,
        mustSeeFilter: "museum",
        locationSlug: "moscow-darvinovskiy-muzey",
      },
      {
        name: "Палеонтологический музей им. Ю.А. Орлова",
        desc: "Монументальный замок из красного кирпича с подлинными полными скелетами динозавров и древних млекопитающих.",
        address: "Профсоюзная ул., 123",
        latitude: 55.6239,
        longitude: 37.5142,
        mustSeeFilter: "museum",
        locationSlug: "moscow-paleontologicheskiy-muzey",
      },
      {
        name: "Музей криптографии",
        desc: "Единственный в России интерактивный музей, посвященный истории шифрования, кодам и секретным технологиям связи.",
        address: "Ботаническая ул., 25, стр. 4",
        latitude: 55.828424,
        longitude: 37.592311,
        mustSeeFilter: "museum",
        locationSlug: "moscow-muzey-kriptografii",
      },
      {
        name: "Дом-музей Виктора Васнецова",
        desc: "Сказочный деревянный терем по эскизам художника, где хранятся его главные монументальные сказочные полотна.",
        address: "переулок Васнецова, 13",
        latitude: 55.7761,
        longitude: 37.6289,
        mustSeeFilter: "museum",
        locationSlug: "moscow-dom-muzey-vasnetsova",
      },
      {
        name: "Музей кино на ВДНХ",
        desc: "Пространство с богатыми коллекциями костюмов, афиш и техники, рассказывающее историю отечественного кинематографа.",
        address: "проспект Мира, 119, стр. 36 (Павильон №36)",
        latitude: 55.834488,
        longitude: 37.628886,
        mustSeeFilter: "museum",
        locationSlug: "moscow-muzey-kino-vdnh",
      },
      {
        name: "Парк Горького",
        desc: "Главный центральный парк культуры и отдыха столицы с набережными, коворкингами и масштабными спортивными зонами.",
        address: "ул. Крымский Вал, 9",
        latitude: 55.7294,
        longitude: 37.6019,
        mustSeeFilter: "park",
        locationSlug: "moscow-park-gorkogo",
      },
      {
        name: "Музей-заповедник «Царицыно»",
        desc: "Романтический дворцово-парковый ансамбль в стиле русской готики Баженова и Казакова для Екатерины II.",
        address: "Дольская ул., 1",
        latitude: 55.6146,
        longitude: 37.6811,
        mustSeeFilter: "park",
        locationSlug: "moscow-tsaritsyno",
      },
      {
        name: "Музей-заповедник «Коломенское»",
        desc: "Древняя царская резиденция на крутом берегу реки с шатровым храмом XVI века и теремом Алексея Михайловича.",
        address: "проспект Андропова, 39",
        latitude: 55.6698,
        longitude: 37.6644,
        mustSeeFilter: "park",
        locationSlug: "moscow-kolomenskoe",
      },
      {
        name: "Музей-усадьба «Кусково»",
        desc: "Летняя загородная резиденция Шереметевых с деревянным дворцом, французским регулярным парком и прудами.",
        address: "ул. Юности, 2",
        latitude: 55.7352,
        longitude: 37.8073,
        mustSeeFilter: "park",
        locationSlug: "moscow-kuskovo",
      },
      {
        name: "Нескучный сад",
        desc: "Старейший пейзажный парк Москвы с историческими мостиками и павильонами, где проходят съемки игры «Что? Где? Когда?».",
        address: "Ленинский проспект, 30",
        latitude: 55.717034,
        longitude: 37.585885,
        mustSeeFilter: "park",
        locationSlug: "moscow-neskuchnyy-sad",
      },
      {
        name: "Национальный парк «Лосиный Остров»",
        desc: "Первозданный таежный лес в черте мегаполиса, где на воле живут лоси, кабаны и пятнистые олени.",
        address: "Поперечный просек, 1г",
        latitude: 55.8286,
        longitude: 37.6917,
        mustSeeFilter: "park",
        locationSlug: "moscow-losinyy-ostrov",
      },
      {
        name: "Серебряный Бор",
        desc: "Островной памятник природы на западе столицы с вековыми соснами, песчаными пляжами и экологическими тропами.",
        address: "ул. Таманская",
        latitude: 55.7828,
        longitude: 37.4331,
        mustSeeFilter: "park",
        locationSlug: "moscow-serebryanyy-bor",
      },
      {
        name: "Битцевский лес",
        desc: "Второй по величине парк Москвы с речными долинами, курганными группами и густыми широколиственными лесами.",
        address: "Новоясеневский тупик, 1, стр. 2",
        latitude: 55.6139,
        longitude: 37.5858,
        mustSeeFilter: "park",
        locationSlug: "moscow-bitsevskiy-les",
      },
      {
        name: "Главный ботанический сад РАН",
        desc: "Живой музей природы с коллекциями растений всех континентов и Новой фондовой оранжереей.",
        address: "Ботаническая ул., 4",
        latitude: 55.8364,
        longitude: 37.6019,
        mustSeeFilter: "park",
        locationSlug: "moscow-botanicheskiy-sad-ran",
      },
      {
        name: "Парк «Ходынское поле»",
        desc: "Урбанистический ландшафтный парк на территории бывшего аэродрома с холмами, зеркальным лабиринтом и сухим фонтаном.",
        address: "Ходынский бульвар, 1",
        latitude: 55.7872,
        longitude: 37.5344,
        mustSeeFilter: "park",
        locationSlug: "moscow-hodynskoe-pole",
      },
      {
        name: "Измайловский парк и кремль",
        desc: "Огромный лесопарк и деревянный Измайловский кремль у рынка.",
        address: "Измайловское шоссе, 73ж",
        latitude: 55.7915,
        longitude: 37.7495,
        mustSeeFilter: "park",
        locationSlug: "moscow-izmaylovskiy-park",
      },
      {
        name: "Сокольники",
        desc: "Классический парк с лучами аллей и павильонами на северо-востоке.",
        address: "Сокольнический Вал, 1, стр. 1",
        latitude: 55.8045,
        longitude: 37.6775,
        mustSeeFilter: "park",
        locationSlug: "moscow-sokolniki",
      },
      {
        name: "Аптекарский огород",
        desc: "Ботанический сад МГУ у Проспекта Мира - оранжереи и сезонные выставки.",
        address: "проспект Мира, 26, стр. 1",
        latitude: 55.7785,
        longitude: 37.6355,
        mustSeeFilter: "park",
        locationSlug: "moscow-aptekarskiy-ogorod",
      },
      {
        name: "Парк Победы на Поклонной горе",
        desc: "Мемориальный комплекс Великой Отечественной войны с высоким обелиском и фонтанами.",
        address: "площадь Победы, 3",
        latitude: 55.7317,
        longitude: 37.5044,
        mustSeeFilter: "park",
        locationSlug: "moscow-park-pobedy",
      },
      {
        name: "Московский зоопарк",
        desc: "Один из старейших зоопарков Европы с огромной коллекцией животных со всего мира и центром реабилитации панд.",
        address: "Большая Грузинская ул., 1",
        latitude: 55.762112,
        longitude: 37.577242,
        mustSeeFilter: "science",
        locationSlug: "moscow-zoopark",
      },
      {
        name: "Московский Планетарий",
        desc: "Научно-просветительский центр с самым большим куполом-экраном в Европе и интерактивным залом «Лунариум».",
        address: "Садовая-Кудринская ул., 5, стр. 1",
        latitude: 55.761031,
        longitude: 37.58312,
        mustSeeFilter: "science",
        venueSlug: "moscow-planetariy",
      },
      {
        name: "Колесо обозрения «Солнце Москвы»",
        desc: "Самое большое колесо обозрения в Европе высотой 140 метров с закрытыми кабинами для панорамного обзора столицы.",
        address: "2-я Останкинская ул., 3",
        latitude: 55.826941,
        longitude: 37.627092,
        mustSeeFilter: "science",
        locationSlug: "moscow-solntse-moskvy",
      },
      {
        name: "Парк развлечений «Остров Мечты»",
        desc: "Огромный крытый всесезонный тематический парк с променадом, стилизованным под улицы мировых столиц.",
        address: "проспект Андропова, 1",
        latitude: 55.6942,
        longitude: 37.6636,
        mustSeeFilter: "science",
        locationSlug: "moscow-ostrov-mechty",
      },
      {
        name: "Экспериментаниум",
        desc: "Интерактивный музей занимательных наук, где все экспонаты можно и нужно трогать руками для изучения физики и химии.",
        address: "Ленинградский проспект, 80, корп. 11",
        latitude: 55.80708,
        longitude: 37.512959,
        mustSeeFilter: "science",
        venueSlug: "moscow-eksperimentanium",
      },
      {
        name: "Москвариум на ВДНХ",
        desc: "Крупный океанариум и шоу у главного входа ВДНХ.",
        address: "проспект Мира, 119",
        latitude: 55.8325,
        longitude: 37.6215,
        mustSeeFilter: "science",
        venueSlug: "moscow-moskvarium",
      },
      {
        name: "Музей оптических иллюзий",
        desc: "Развлекательное пространство с трехмерными фотозонами, лабиринтами и комнатами с нарушенной гравитацией.",
        address: "Малый Николопесковский переулок, 4",
        latitude: 55.7508,
        longitude: 37.5919,
        mustSeeFilter: "science",
        locationSlug: "moscow-muzey-opticheskih-illyuziy",
      },
      {
        name: "Крымская набережная и Парк «Музеон»",
        desc: "Пешеходная ландшафтная набережная с волнообразными дорожками, соединенная с крупнейшим в России музеем скульптур под открытым небом.",
        address: "Крымский Вал, влад. 2",
        latitude: 55.734898,
        longitude: 37.606894,
        mustSeeFilter: "views",
        locationSlug: "moscow-krymskaya-naberezhnaya",
      },
      {
        name: "Парящий мост в Зарядье",
        desc: "Уникальная смотровая площадка в виде консольной петли, парящая над Москвой-рекой без единой опоры.",
        address: "Парк «Зарядье»",
        latitude: 55.75013,
        longitude: 37.628886,
        mustSeeFilter: "views",
        locationSlug: "moscow-paryaschiy-most-zaryadya",
      },
      {
        name: "Смотровая площадка Panorama360",
        desc: "Самая высокая смотровая площадка Европы под крышей, где работает безлимитная фабрика мороженого и шоколада.",
        address: "Пресненская наб., 12 (башня Федерация-Восток, 89 этаж)",
        latitude: 55.748792,
        longitude: 37.53709,
        mustSeeFilter: "views",
        locationSlug: "moscow-smotrovaya-moskva-siti",
      },
      {
        name: "Крыша Центрального детского магазина",
        desc: "Бесплатная панорамная площадка в центре города, открывающая красивый вид на Кремль, Лубянку и Политехнический музей.",
        address: "Театральный проезд, 5, стр. 1",
        latitude: 55.759679,
        longitude: 37.625345,
        mustSeeFilter: "views",
        locationSlug: "moscow-krysha-cdm",
      },
      {
        name: "Смотровая площадка РАН",
        desc: "Бесплатная открытая площадка у «Золотых мозгов» с видом на Андреевский монастырь и Фрунзенскую набережную.",
        address: "Ленинский проспект, 32А",
        latitude: 55.7111,
        longitude: 37.5786,
        mustSeeFilter: "views",
        locationSlug: "moscow-smotrovaya-ran",
      },
      {
        name: "Смотровая Останкинской телебашни",
        desc: "Закрытая площадка на высоте 337 метров со стеклянным полом.",
        address: "ул. Академика Королева, 15, корп. 2",
        latitude: 55.8197,
        longitude: 37.6117,
        mustSeeFilter: "views",
        locationSlug: "moscow-smotrovaya-ostankino",
      },
      {
        name: "Смотровая площадка башни «Око»",
        desc: "Одна из самых высоких открытых смотровых в Европе на крыше небоскреба около 354 метров.",
        address: "1-й Красногвардейский проезд, 21, стр. 2",
        latitude: 55.7481,
        longitude: 37.5344,
        mustSeeFilter: "views",
        locationSlug: "moscow-smotrovaya-oko",
      },
      {
        name: "Видовая точка Живописного моста",
        desc: "Футуристический подвесной мост в Серебряном бору со стеклянной эллипсоидной капсулой над рекой.",
        address: "проспект Маршала Жукова",
        latitude: 55.7775,
        longitude: 37.4442,
        mustSeeFilter: "views",
        locationSlug: "moscow-zhivopisnyy-most",
      },
      {
        name: "Патриарший мост",
        desc: "Вечерний променад от ХХС к Болотной с видом на Кремль.",
        address: "Патриарший мост",
        latitude: 55.7435,
        longitude: 37.6085,
        mustSeeFilter: "views",
        locationSlug: "moscow-patriarshiy-most",
      },
      {
        name: "Жилой дом на Котельнической набережной",
        desc: "Монументальный сталинский высотный замок у слияния Яузы и Москвы-реки.",
        address: "Котельническая набережная, 1/15",
        latitude: 55.7472,
        longitude: 37.6428,
        mustSeeFilter: "views",
        locationSlug: "moscow-kotelnicheskaya-naberezhnaya",
      },
      {
        name: "Смотровой мост парка «Фили»",
        desc: "Деревянная консольная площадка над Москвой-рекой посреди реликтового парка на западе столицы.",
        address: "Большая Филёвская ул., 22, стр. 1",
        latitude: 55.7486,
        longitude: 37.4725,
        mustSeeFilter: "views",
        locationSlug: "moscow-smotrovoy-most-fili",
      },
      {
        name: "Мост Багратион",
        desc: "Торгово-пешеходный застекленный мост через Москву-реку, соединяющий станцию метро Выставочная с Кутузовским проспектом.",
        address: "Краснопресненская наб., 16, стр. 1",
        latitude: 55.744955,
        longitude: 37.544445,
        mustSeeFilter: "views",
        locationSlug: "moscow-most-bagration",
      },
      {
        name: "Улица Старый Арбат",
        desc: "Главный пешеходный символ старой Москвы с уличными художниками, особняками, сувенирами и духом Вахтангова.",
        address: "ул. Арбат",
        latitude: 55.7497,
        longitude: 37.5921,
        mustSeeFilter: "street",
        locationSlug: "moscow-staryy-arbat",
      },
      {
        name: "Никольская улица",
        desc: "Пешеходная старинная улица в Китай-городе, знаменитая своей яркой праздничной иллюминацией и обилием кафе.",
        address: "Никольская ул.",
        latitude: 55.757049,
        longitude: 37.622533,
        mustSeeFilter: "street",
        locationSlug: "moscow-nikolskaya-ulitsa",
      },
      {
        name: "Улица Варварка",
        desc: "Одна из старейших улиц Москвы с уникальным ансамблем древнерусских храмов и купеческих палат.",
        address: "ул. Варварка",
        latitude: 55.752533,
        longitude: 37.626573,
        mustSeeFilter: "street",
        locationSlug: "moscow-varvarka",
      },
      {
        name: "Патриаршие пруды",
        desc: "Исторический сквер с прудом, воспетый Булгаковым, ставший центром самого престижного и оживленного ресторанного района столицы.",
        address: "Большой Патриарший пер.",
        latitude: 55.763489,
        longitude: 37.592311,
        mustSeeFilter: "street",
        locationSlug: "moscow-patriarshie-prudy",
      },
      {
        name: "Камергерский переулок",
        desc: "Полностью пешеходная театрально-ресторанная улочка у МХТ им. Чехова.",
        address: "Камергерский переулок",
        latitude: 55.7597,
        longitude: 37.6136,
        mustSeeFilter: "street",
        locationSlug: "moscow-kamergerskiy-pereulok",
      },
      {
        name: "Пятницкая улица",
        desc: "Одна из ключевых исторических и ресторанных улиц Замоскворечья, сохранившая атмосферу купеческой Москвы.",
        address: "Пятницкая ул.",
        latitude: 55.740114,
        longitude: 37.629107,
        mustSeeFilter: "street",
        locationSlug: "moscow-pyatnitskaya-ulitsa",
      },
      {
        name: "Кузнецкий Мост",
        desc: "Историческая торговая улица между Неглинной и Петровкой.",
        address: "ул. Кузнецкий Мост",
        latitude: 55.7615,
        longitude: 37.6245,
        mustSeeFilter: "street",
        locationSlug: "moscow-kuznetskiy-most",
      },
      {
        name: "Улица Большая Никитская",
        desc: "Одна из самых гастрономических улиц Москвы, связывающая Кремль с Садовым кольцом и наполненная модными заведениями.",
        address: "Большая Никитская ул.",
        latitude: 55.757533,
        longitude: 37.601546,
        mustSeeFilter: "street",
        locationSlug: "moscow-bolshaya-nikitskaya",
      },
      {
        name: "Манежная площадь",
        desc: "Огромное пешеходное пространство у стен Кремля со стеклянными куполами и фонтанным ансамблем.",
        address: "Манежная площадь",
        latitude: 55.7558,
        longitude: 37.6147,
        mustSeeFilter: "street",
        locationSlug: "moscow-manezhnaya-ploschad",
      },
      {
        name: "Пушкинская площадь",
        desc: "Культовое место встреч у памятника Пушкину, окруженное зданиями бывших советских кинотеатров.",
        address: "Пушкинская площадь",
        latitude: 55.7656,
        longitude: 37.6042,
        mustSeeFilter: "street",
        locationSlug: "moscow-pushkinskaya-ploschad",
      },
      {
        name: "Храм Василия Блаженного",
        desc: "Шедевр средневекового зодчества с узорчатыми куполами-луковицами, воздвигнутый в честь взятия Казани Иваном Грозным.",
        address: "Красная площадь, 7",
        latitude: 55.7525,
        longitude: 37.6231,
        mustSeeFilter: "temple",
        locationSlug: "moscow-sobor-vasiliya-blazhennogo",
      },
      {
        name: "Крутицкое Патриаршее подворье",
        desc: "Уголок допетровской Москвы с булыжной мостовой, теремами и редчайшими поливными изразцами XVII века.",
        address: "Крутицкая ул., 11",
        latitude: 55.7281,
        longitude: 37.6586,
        mustSeeFilter: "temple",
        locationSlug: "moscow-krutitskoe-podvore",
      },
      {
        name: "Церковь Климента Папы Римского",
        desc: "Грандиозный и один из красивейших барочных храмов столицы, поражающий своим величественным убранством.",
        address: "Пятницкая ул., 26, стр. 1",
        latitude: 55.741031,
        longitude: 37.628325,
        mustSeeFilter: "temple",
        locationSlug: "moscow-tserkov-klimenta",
      },
      {
        name: "Римско-католический собор Непорочного Зачатия",
        desc: "Величественный неоготический собор из красного кирпича со шпилями и крупнейшим в России духовым органом.",
        address: "ул. Малая Грузинская, 27/13",
        latitude: 55.7669,
        longitude: 37.5714,
        mustSeeFilter: "temple",
        locationSlug: "moscow-katolicheskiy-sobor",
      },
      {
        name: "Англиканская церковь Святого Андрея",
        desc: "Единственная англиканская церковь в Москве, выстроенная в викторианском готическом стиле, известная своими органными концертами.",
        address: "Вознесенский пер., 8/5, стр. 2",
        latitude: 55.757243,
        longitude: 37.60563,
        mustSeeFilter: "temple",
        locationSlug: "moscow-anglikanskaya-andrey",
      },
      {
        name: "Храм Григория Неокесарийского в Дербицах",
        desc: "Нарядная «огненная» Посадская церковь, опоясанная ковром изразцов «павлиний глаз» Степана Полубеса.",
        address: "ул. Большая Полянка, 29А",
        latitude: 55.7381,
        longitude: 37.6189,
        mustSeeFilter: "temple",
        locationSlug: "moscow-grigoriy-neokesariyskiy",
      },
      {
        name: "Церковь Рождества Богородицы в Путинках",
        desc: "Один из последних шатровых храмов Москвы - белокаменное резное кружево из шести остроконечных шатров.",
        address: "ул. Малая Дмитровка, 2, стр. 2",
        latitude: 55.7656,
        longitude: 37.6064,
        mustSeeFilter: "temple",
        locationSlug: "moscow-putinki",
      },
      {
        name: "Храм Симеона Столпника на Поварской",
        desc: "Миниатюрная белокаменная пятиглавая церковь XVII века на контрасте с высотками Нового Арбата.",
        address: "ул. Поварская, 5, стр. 1",
        latitude: 55.7528,
        longitude: 37.5975,
        mustSeeFilter: "temple",
        locationSlug: "moscow-simeon-stolpnik",
      },
      {
        name: "Спасский Андроников монастырь",
        desc: "Один из старейших монастырей Москвы на Яузе, чей собор расписывал Андрей Рублев.",
        address: "Андроньевская площадь, 10",
        latitude: 55.7492,
        longitude: 37.6703,
        mustSeeFilter: "temple",
        locationSlug: "moscow-andronikov-monastyr",
      },
      {
        name: "Высоко-Петровский монастырь",
        desc: "Белокаменный ансамбль на Петровке с центрическим храмом Петра Митрополита работы Алевиза Нового.",
        address: "ул. Петровка, 28",
        latitude: 55.7664,
        longitude: 37.6144,
        mustSeeFilter: "temple",
        locationSlug: "moscow-vysoko-petrovskiy",
      },
      {
        name: "Зачатьевский монастырь",
        desc: "Первая девичья обитель столицы на Остоженке, возрожденная из руин с подземным археологическим музеем.",
        address: "2-й Зачатьевский переулок, 2",
        latitude: 55.7406,
        longitude: 37.6019,
        mustSeeFilter: "temple",
        locationSlug: "moscow-zachatevskiy-monastyr",
      },
      {
        name: "Московская соборная мечеть",
        desc: "Крупнейший в Европе мусульманский храм с шестидесятиметровыми минаретами и позолоченным куполом.",
        address: "Выползов переулок, 7",
        latitude: 55.7794,
        longitude: 37.6267,
        mustSeeFilter: "temple",
        locationSlug: "moscow-sobornaya-mechet",
      },
      {
        name: "Московская хоральная синагога",
        desc: "Старейшее еврейское культовое сооружение столицы на Китай-городе с неоклассическим фасадом.",
        address: "Большой Спасоглинищевский переулок, 10",
        latitude: 55.7539,
        longitude: 37.6358,
        mustSeeFilter: "temple",
        locationSlug: "moscow-horalnaya-sinagoga",
      },
      {
        name: "Церковь Знамения в Дубровицах",
        desc: "Шедевр зодчества на южной окраине, увенчанный вместо купола массивной золотой короной в стиле европейского барокко.",
        address: "Московская обл., Подольск, пос. Дубровицы, 45",
        latitude: 55.4414,
        longitude: 37.4942,
        mustSeeFilter: "temple",
        locationSlug: "moscow-znamenie-dubrovitsy",
      },
      {
        name: "Казанский собор на Красной площади",
        desc: "Восстановленный храм у Никольских ворот - камерная точка парадного центра.",
        address: "Красная площадь, 4",
        latitude: 55.7553,
        longitude: 37.619,
        mustSeeFilter: "temple",
        locationSlug: "moscow-kazanskiy-sobor-krasnaya",
      },
      {
        name: "Донской монастырь",
        desc: "Тихий некрополь и стены у Шаболовки с уникальной коллекцией горельефов ХХС.",
        address: "Донская площадь, 1",
        latitude: 55.7142,
        longitude: 37.6014,
        mustSeeFilter: "temple",
        locationSlug: "moscow-donskoy-monastyr",
      },
      {
        name: "Марфо-Мариинская обитель",
        desc: "Обитель великой княгини Елизаветы на Большой Ордынке.",
        address: "ул. Большая Ордынка, 34",
        latitude: 55.7385,
        longitude: 37.6235,
        mustSeeFilter: "temple",
        locationSlug: "moscow-marfo-mariinskaya-obitel",
      },
      {
        name: "Доходный дом Страхового общества «Россия»",
        desc: "Шедевр эклектики с готической башней, кованой системой вентиляции и парадными вестибюлями с лепными фигурами.",
        address: "Сретенский бульвар, 6/1, стр. 2",
        latitude: 55.7656,
        longitude: 37.6338,
        mustSeeFilter: "houses",
        locationSlug: "moscow-dom-strahovogo-rossiya",
      },
      {
        name: "Доходный дом Перцовой",
        desc: "Неорусское «дом-сказка» с майоликовыми панно Малютина - славянские мифы и звездное небо.",
        address: "Курсовой переулок, 1",
        latitude: 55.7441,
        longitude: 37.6019,
        mustSeeFilter: "houses",
        locationSlug: "moscow-dom-pertsovoy",
      },
      {
        name: "Доходный дом Исакова на Пречистенке",
        desc: "Эталон французского модерна Кекушева со сложнейшим кружевным декором окон и фигурами муз.",
        address: "ул. Пречистенка, 28",
        latitude: 55.7411,
        longitude: 37.5939,
        mustSeeFilter: "houses",
        locationSlug: "moscow-dom-isakova-prechistenka",
      },
      {
        name: "Доходный дом Шугаевых",
        desc: "Северный модерн с фигурами средневековых рыцарей в латах и крылатых львов на фасаде и в парадных.",
        address: "Большой Казённый переулок, 5",
        latitude: 55.7592,
        longitude: 37.6521,
        mustSeeFilter: "houses",
        locationSlug: "moscow-dom-shugaevyh",
      },
      {
        name: "Доходный дом М. И. Алексеева",
        desc: "Массивное парадное здание с круглым угловым вестибюлем-ротондой и винтовыми лестничными маршами.",
        address: "ул. Большая Полянка, 42",
        latitude: 55.7364,
        longitude: 37.6189,
        mustSeeFilter: "houses",
        locationSlug: "moscow-dom-alekseeva",
      },
      {
        name: "Доходный дом братьев Грибовых",
        desc: "Неоклассицизм с великолепным внутренним оформлением - здесь долгие годы жил Олег Табаков.",
        address: "ул. Чаплыгина, 1А",
        latitude: 55.7628,
        longitude: 37.6453,
        mustSeeFilter: "houses",
        locationSlug: "moscow-dom-gribovyh",
      },
      {
        name: "Доходный дом И. П. Исакова на Пятницкой",
        desc: "Элегантный пятиэтажный дом с маскаронами львиных морд и женских голов и коваными перилами подъезда.",
        address: "Пятницкая ул., 53",
        latitude: 55.7344,
        longitude: 37.6291,
        mustSeeFilter: "houses",
        locationSlug: "moscow-dom-isakova-pyatnitskaya",
      },
      {
        name: "Доходный дом М.О. Эпштейна",
        desc: "Московский модерн с купольным вестибюлем и редчайшими подлинными росписями Нивинского на потолке.",
        address: "Гусятников переулок, 11",
        latitude: 55.7644,
        longitude: 37.6394,
        mustSeeFilter: "houses",
        locationSlug: "moscow-dom-epshteyna",
      },
      {
        name: "Дом Пашкова",
        desc: "Величественный классический дворец на Ваганьковском холме напротив Кремля - одно из самых красивых гражданских зданий города.",
        address: "ул. Воздвиженка, 3/5, стр. 1",
        latitude: 55.7498,
        longitude: 37.6094,
        mustSeeFilter: "mansions",
        locationSlug: "moscow-dom-pashkova",
      },
      {
        name: "Особняк Арсения Морозова",
        desc: "Сказочный дом-дворец в мавританском стиле с ракушками на фасаде, вдохновленный португальской Синтрой.",
        address: "ул. Воздвиженка, 16",
        latitude: 55.7533,
        longitude: 37.6033,
        mustSeeFilter: "mansions",
        locationSlug: "moscow-osobnyak-morozova",
      },
      {
        name: "Особняк Рябушинского",
        desc: "Шедевр московского модерна архитектора Шехтеля со знаменитой тающей лестницей, где сейчас расположен музей-квартира М. Горького.",
        address: "Малая Никитская ул., 6/2, стр. 5",
        latitude: 55.759403,
        longitude: 37.595724,
        mustSeeFilter: "mansions",
        locationSlug: "moscow-osobnyak-ryabushinskogo",
      },
      {
        name: "Дом-яйцо на Чистых прудах",
        desc: "Один из самых ярких памятников лужковской архитектуры в форме пасхального яйца Фаберже.",
        address: "ул. Машкова, 1",
        latitude: 55.7634,
        longitude: 37.6517,
        mustSeeFilter: "mansions",
        locationSlug: "moscow-dom-yaytso",
      },
      {
        name: "Усадьба Черткова",
        desc: "Яркий лазурный особняк в стиле рококо, известный своими роскошными интерьерами и проведением иммерсивных выставок.",
        address: "Мясницкая ул., 7, стр. 2",
        latitude: 55.759131,
        longitude: 37.63158,
        mustSeeFilter: "mansions",
        locationSlug: "moscow-usadba-chertkova",
      },
      {
        name: "Особняк Миндовского",
        desc: "Творение Льва Кекушева на Поварской с изогнутыми линиями фасада, витражами и барельефом Авроры.",
        address: "ул. Поварская, 44/2",
        latitude: 55.7569,
        longitude: 37.5892,
        mustSeeFilter: "mansions",
        locationSlug: "moscow-osobnyak-mindovskogo",
      },
      {
        name: "Особняк Дерожинской",
        desc: "Авангардное творение Шехтеля с циклопическим камином и гигантским 11-метровым окном-витражом.",
        address: "Кропоткинский переулок, 13, стр. 1",
        latitude: 55.7394,
        longitude: 37.5908,
        mustSeeFilter: "mansions",
        locationSlug: "moscow-osobnyak-derozhinskoy",
      },
      {
        name: "Особняк Смирнова на Тверском",
        desc: "Реконструкция Шехтеля в стиле ампирного модерна с анфиладой Египетского, Готического и Рокайльного залов.",
        address: "Тверской бульвар, 18, стр. 1",
        latitude: 55.7619,
        longitude: 37.6022,
        mustSeeFilter: "mansions",
        locationSlug: "moscow-osobnyak-smirnova",
      },
      {
        name: "Усадьба Барышникова",
        desc: "Классический дворец Матвея Казакова с курдонером, где Грибоедов писал «Горе от ума».",
        address: "ул. Мясницкая, 42",
        latitude: 55.7661,
        longitude: 37.6433,
        mustSeeFilter: "mansions",
        locationSlug: "moscow-usadba-baryshnikova",
      },
      {
        name: "Особняк Коробковой",
        desc: "Утонченный особняк нежно-чешуйчатого сиреневого цвета в стиле эклектики с богатым лепным декором.",
        address: "Пятницкая ул., 33-35, стр. 1",
        latitude: 55.738634,
        longitude: 37.629389,
        mustSeeFilter: "mansions",
        locationSlug: "moscow-osobnyak-korobkovoy",
      },
      {
        name: "Палаты Мазепы",
        desc: "Образец гражданской архитектуры XVII века с нарядными наличниками, ошибочно связываемый с именем гетмана Мазепы.",
        address: "Колпачный пер., 10/7, стр. 2",
        latitude: 55.755519,
        longitude: 37.642416,
        mustSeeFilter: "mansions",
        locationSlug: "moscow-palaty-mazepy",
      },
      {
        name: "Палаты Волковых-Юсуповых",
        desc: "Редкий красно-белый образец допетровского жилого зодчества XVII века с росписями знаков зодиака.",
        address: "Большой Харитоньевский переулок, 21, стр. 4",
        latitude: 55.7663,
        longitude: 37.6492,
        mustSeeFilter: "mansions",
        locationSlug: "moscow-palaty-volkovyh-yusupovyh",
      },
      {
        name: "Саввинское подворье",
        desc: "Сказочный терем в псевдорусском стиле, который в 1939 году передвинули вглубь квартала прямо во время сна жильцов.",
        address: "Тверская ул., 6, стр. 6 (во дворе)",
        latitude: 55.759434,
        longitude: 37.612959,
        mustSeeFilter: "secret",
        locationSlug: "moscow-savvinskoe-podvore",
      },
      {
        name: "Иоанно-Предтеченский монастырь (дворик)",
        desc: "Старинный монастырь на Ивановской горке с тихим внутренним двориком, напоминающим уголок старой Европы.",
        address: "Малый Ивановский пер., 2",
        latitude: 55.754983,
        longitude: 37.640051,
        mustSeeFilter: "secret",
        locationSlug: "moscow-ioanno-predatechenskiy-dvorik",
      },
      {
        name: "Хохловская площадь («Яма»)",
        desc: "Популярный городской амфитеатр со стеклянной стеной, внутри которого законсервирован фрагмент стены Белого города XVI века.",
        address: "Хохловская площадь",
        latitude: 55.756081,
        longitude: 37.645869,
        mustSeeFilter: "secret",
        locationSlug: "moscow-hohlovskaya-yama",
      },
      {
        name: "Английское подворье в Зарядье",
        desc: "Белокаменные палаты XVI века, служившие резиденцией английской торговой компании и сохранившие дух допетровской Москвы.",
        address: "ул. Варварка, 4А",
        latitude: 55.752044,
        longitude: 37.625345,
        mustSeeFilter: "secret",
        locationSlug: "moscow-angliyskoe-podvore",
      },
      {
        name: "Арт-двор «Хитровка»",
        desc: "Камерное творческое пространство в подвалах старинных палат на месте легендарного криминального Хитрова рынка.",
        address: "Подколокольный пер., 8, стр. 2",
        latitude: 55.752183,
        longitude: 37.641496,
        mustSeeFilter: "secret",
        locationSlug: "moscow-hitrovka",
      },
      {
        name: "Двор дома со львами на Пятницкой",
        desc: "Тихий старомосковский дворик усадьбы фон Рекк со скульптурами спящих львов.",
        address: "Пятницкая ул., 64, стр. 1",
        latitude: 55.7317,
        longitude: 37.6272,
        mustSeeFilter: "secret",
        locationSlug: "moscow-dvor-so-lvami",
      },
      {
        name: "Сад имени Баумана",
        desc: "Исторический парк-оазис за фасадами Старой Басманной с гротом «Бельведер» и деревянной эстрадой.",
        address: "Старая Басманная ул., 15А, стр. 4",
        latitude: 55.7675,
        longitude: 37.6631,
        mustSeeFilter: "secret",
        locationSlug: "moscow-sad-baumana",
      },
      {
        name: "Плоский дом на Пресне",
        desc: "Архитектурная иллюзия доходного дома, который под углом кажется абсолютно плоским.",
        address: "ул. Пресненский Вал, 36",
        latitude: 55.7675,
        longitude: 37.5564,
        mustSeeFilter: "secret",
        locationSlug: "moscow-ploskiy-dom",
      },
      {
        name: "Центр современного искусства «Винзавод»",
        desc: "Первое в России частное арт-пространство на территории бывшего завода, объединившее ведущие галереи современного искусства.",
        address: "4-й Сыромятнический пер., 1/8, стр. 6",
        latitude: 55.756455,
        longitude: 37.664257,
        mustSeeFilter: "creative",
        locationSlug: "moscow-vinzavod",
      },
      {
        name: "Центр дизайна Artplay",
        desc: "Крупный креативный кластер для дизайнеров и архитекторов, известный своими масштабными мультимедийными выставками.",
        address: "Нижняя Сыромятническая ул., 10",
        latitude: 55.75121,
        longitude: 37.668576,
        mustSeeFilter: "creative",
        locationSlug: "moscow-artplay",
      },
      {
        name: "Дизайн-завод «Флакон»",
        desc: "Креативное пространство старейшего хрустального завода с граффити, мастерскими и фестивалями.",
        address: "ул. Большая Новодмитровская, 36",
        latitude: 55.8053,
        longitude: 37.5847,
        mustSeeFilter: "creative",
        locationSlug: "moscow-flakon",
      },
      {
        name: "Хлебозавод № 9",
        desc: "Общественное пространство вокруг конструктивистского цилиндрического хлебозавода с локальными брендами и кофейнями.",
        address: "Новодмитровская ул., 1",
        latitude: 55.8058,
        longitude: 37.5878,
        mustSeeFilter: "creative",
        locationSlug: "moscow-hlebozavod-9",
      },
      {
        name: "Культурный центр ЗИЛ",
        desc: "Масштабный памятник эпохи конструктивизма братьев Весниных, работающий как современная творческая площадка.",
        address: "Восточная ул., 4, корп. 1",
        latitude: 55.714257,
        longitude: 37.654394,
        mustSeeFilter: "creative",
        locationSlug: "moscow-zil",
      },
      {
        name: "Бизнес-квартал «Арма»",
        desc: "Деловое и досуговое пространство в отреставрированных круглых зданиях бывшего Московского газового завода.",
        address: "Нижний Сусальный пер., 5",
        latitude: 55.760144,
        longitude: 37.662547,
        mustSeeFilter: "creative",
        locationSlug: "moscow-arma",
      },
      {
        name: "Суперметалл",
        desc: "Стильное общественно-деловое пространство в бруталистском здании бывшего НИИ черной металлургии.",
        address: "2-я Бауманская ул., 9/23, стр. 3",
        latitude: 55.767464,
        longitude: 37.68312,
        mustSeeFilter: "creative",
        locationSlug: "moscow-supermetall",
      },
      {
        name: "Пространство «Поле»",
        desc: "Креативное комьюнити-плейс и клубный проект, объединяющий музыку, цифровое искусство и гастрономию.",
        address: "3-я ул. Ямского Поля, 2, корп. 25",
        latitude: 55.782115,
        longitude: 37.58312,
        mustSeeFilter: "creative",
        locationSlug: "moscow-pole",
      },
      {
        name: "Дом Наркомфина",
        desc: "Легендарный памятник советского конструктивизма и архитектуры авангарда, отреставрированный жилой дом-коммуна.",
        address: "Новинский бульвар, 25-27, стр. 12",
        latitude: 55.753835,
        longitude: 37.580456,
        mustSeeFilter: "creative",
        locationSlug: "moscow-dom-narkomfina",
      },
      {
        name: "Дом Мельникова",
        desc: "Всемирно известный одноквартирный жилой дом-мастерская в виде двух пересекающихся цилиндров, шедевр авангарда.",
        address: "Кривоарбатский пер., 10",
        latitude: 55.748242,
        longitude: 37.589389,
        mustSeeFilter: "creative",
        locationSlug: "moscow-dom-melnikova",
      },
      {
        name: "Дом культуры им. И.В. Русакова",
        desc: "Знаменитое здание рабочего клуба архитектора Константина Мельникова, напоминающее по форме гигантскую шестеренку.",
        address: "Стромынка, 6",
        latitude: 55.791031,
        longitude: 37.68312,
        mustSeeFilter: "creative",
        locationSlug: "moscow-dk-rusakova",
      },
      {
        name: "Бахметьевский гараж",
        desc: "Архитектурный памятник советского авангарда по проекту Мельникова и Шухова, где сегодня располагается Еврейский музей.",
        address: "ул. Образцова, 11, стр. 1А",
        latitude: 55.790438,
        longitude: 37.608254,
        mustSeeFilter: "creative",
        locationSlug: "moscow-bahmetevskiy-garazh",
      },
      {
        name: "Чайный дом Перлова",
        desc: "Исторический магазин конца XIX века в виде китайской пагоды с драконами и восточными орнаментами.",
        address: "ул. Мясницкая, 19",
        latitude: 55.7628,
        longitude: 37.6358,
        mustSeeFilter: "creative",
        locationSlug: "moscow-chaynyy-dom-perlova",
      },
      {
        name: "Киностудия «Мосфильм»",
        desc: "Главная киноплощадка страны с колоссальными декорациями старой Москвы и Петербурга под открытым небом.",
        address: "Мосфильмовская ул., 1",
        latitude: 55.7208,
        longitude: 37.5258,
        mustSeeFilter: "creative",
        locationSlug: "moscow-mosfilm",
      },
      {
        name: "Даниловская мануфактура",
        desc: "Квартал бывшей текстильной фабрики из красного кирпича - эталон индустриального лофта.",
        address: "Варшавское шоссе, 9",
        latitude: 55.6983,
        longitude: 37.6247,
        mustSeeFilter: "creative",
        locationSlug: "moscow-danilovskaya-manufaktura",
      },
      {
        name: "Депо.Москва на Лесной",
        desc: "Крупнейший фудмолл Европы, открытый в отреставрированном здании старейшего Миусского трамвайного депо.",
        address: "Лесная ул., 20, стр. 3",
        latitude: 55.779679,
        longitude: 37.592311,
        mustSeeFilter: "gastro",
        locationSlug: "moscow-depo-lesnaya",
      },
      {
        name: "Даниловский рынок",
        desc: "Исторический рынок под куполом-ромашкой - пионер объединения торговых рядов с модными бистро.",
        address: "ул. Мытная, 74",
        latitude: 55.7119,
        longitude: 37.6206,
        mustSeeFilter: "gastro",
        locationSlug: "moscow-danilovskiy-rynok",
      },
      {
        name: "Ресторан «Кафе Пушкинъ»",
        desc: "Легендарный ресторан высокой дворянской кухни с атмосферой и интерьерами старинного особняка XIX века.",
        address: "Тверской бульвар, 26А",
        latitude: 55.764257,
        longitude: 37.604561,
        mustSeeFilter: "gastro",
        locationSlug: "moscow-kafe-pushkin",
      },
      {
        name: "Гастро-квартал «Красный Октябрь»",
        desc: "Культовое место из красного кирпича на территории бывшей кондитерской фабрики, объединившее ночные клубы, рестораны и студии.",
        address: "Берсеневская наб., 6, стр. 3",
        latitude: 55.741785,
        longitude: 37.60856,
        mustSeeFilter: "gastro",
        locationSlug: "moscow-krasnyy-oktyabr",
      },
      {
        name: "Столовая №57 в ГУМе",
        desc: "Культовое заведение в стиле советского общепита с классическим домашним меню и ностальгической атмосферой.",
        address: "Красная площадь, 3 (3-я линия, 3-й этаж)",
        latitude: 55.754407,
        longitude: 37.621949,
        mustSeeFilter: "gastro",
        locationSlug: "moscow-stolovaya-57",
      },
      {
        name: "Три вокзала. Депо",
        desc: "Гастрономический квартал в отреставрированном Рязанском трамвайном парке у площади Трех вокзалов.",
        address: "Новорязанская ул., 23, стр. 5",
        latitude: 55.7744,
        longitude: 37.6633,
        mustSeeFilter: "gastro",
        locationSlug: "moscow-tri-vokzala-depo",
      },
      {
        name: "Усачевский рынок",
        desc: "Нарядный премиальный гастрорынок Хамовников с верандами, морепродуктами и крафтовыми сыроварнями.",
        address: "ул. Усачёва, 26",
        latitude: 55.7272,
        longitude: 37.5683,
        mustSeeFilter: "gastro",
        locationSlug: "moscow-usachevskiy-rynok",
      },
      {
        name: "Ресторан «White Rabbit»",
        desc: "Знаменитый панорамный ресторан авторской кухни, неоднократно входивший в число лучших ресторанов мира.",
        address: "Смоленская площадь, 3 (ТЦ Смоленский пассаж, 16-й этаж)",
        latitude: 55.748958,
        longitude: 37.58312,
        mustSeeFilter: "gastro",
        locationSlug: "moscow-white-rabbit",
      },
      {
        name: "Гранд-кафе «Dr. Живаго»",
        desc: "Концептуальный ресторан на первом этаже гостиницы «Националь» с видом на Кремль и современной русской кухней.",
        address: "ул. Моховая, 15, стр. 1",
        latitude: 55.7572,
        longitude: 37.6142,
        mustSeeFilter: "gastro",
        locationSlug: "moscow-dr-zhivago",
      },
      {
        name: "Ресторан «Северяне»",
        desc: "Модный ресторан с мистическим темным интерьером, где блюда готовятся в настоящих русских печах на открытом огне.",
        address: "Большая Никитская ул., 12",
        latitude: 55.756715,
        longitude: 37.604561,
        mustSeeFilter: "gastro",
        locationSlug: "moscow-severyane",
      },
      {
        name: "Центральный рынок на Рождественском",
        desc: "Многоуровневый гастромаркет в историческом центре с кухнями мира и летней верандой.",
        address: "Рождественский бульвар, 1",
        latitude: 55.7664,
        longitude: 37.6247,
        mustSeeFilter: "gastro",
        locationSlug: "moscow-tsentralnyy-rynok",
      },
      {
        name: "Петровский пассаж",
        desc: "Элегантный дореволюционный торговый пассаж на Петровке с галереями и коваными мостиками.",
        address: "ул. Петровка, 10",
        latitude: 55.7622,
        longitude: 37.6181,
        mustSeeFilter: "gastro",
        locationSlug: "moscow-petrovskiy-passazh",
      }
    ],
    significantSuburbs: [
      {
        name: "Сергиев Посад",
        desc: "Главный духовный центр России и единственное подмосковное знамение Золотого кольца с белокаменной крепостью-монастырем XIV века.",
        address: "Московская область, Сергиев Посад",
        latitude: 56.3105,
        longitude: 38.1305,
        travelVector: "Северный и Ярославский вектор",
        travelVectorBlurb: "Пригородные экспрессы или электрички от Ярославского вокзала (метро «Комсомольская»). В пути около 1-1,5 часов.",
        stationHub: "Ярославский вокзал",
        logisticsExit: "Станция Сергиев Посад",
        gastroStop: {
          name: "Ресторан «Гостевая изба»",
          blurb: "Трапеза в купеческих деревянных интерьерах у стен Лавры: монастырские рецепты, настойки, пироги и сбитень.",
        },
        places: [
          {
            name: "Свято-Троицкая Сергиева Лавра",
            desc: "Действующий монастырь-крепость - духовное сердце Руси, объект ЮНЕСКО",
            locationSlug: "moscow-troitse-sergieva-lavra",
            latitude: 56.3105,
            longitude: 38.1305,
          },
          {
            name: "Троицкий собор",
            desc: "Древнейший белокаменный храм Лавры (1422) с мощами Сергия и фресками Рублева",
            latitude: 56.3106,
            longitude: 38.1307,
          },
          {
            name: "Успенский собор",
            desc: "Пятиглавый собор со звездными куполами по повелению Ивана Грозного",
            latitude: 56.3108,
            longitude: 38.131,
          },
          {
            name: "Пятиярусная Лаврская колокольня",
            desc: "Барочная 88-метровая звонница с 72-тонным Царь-колоколом",
            latitude: 56.3109,
            longitude: 38.1312,
          },
          {
            name: "Святой источник и Пятницкий колодезь",
            desc: "Часовня над целебным ключом у собора",
            latitude: 56.3108,
            longitude: 38.1315,
          },
          {
            name: "Келарский пруд и Пафнутьев сад",
            desc: "Пешеходная зона у стен для лучших панорамных кадров",
            latitude: 56.3095,
            longitude: 38.1285,
          },
          {
            name: "Сергиево-Посадский музей игрушки",
            desc: "Исторический особняк на горе напротив Лавры - первая русская матрешка",
            latitude: 56.3085,
            longitude: 38.1355,
          },
          {
            name: "Гефсиманский Черниговский скит",
            desc: "Уединенное подворье в 3 км с подземными пещерами и кельями",
            transitTip: "Авто или такси ~10-15 мин от Лавры",
            latitude: 56.295,
            longitude: 38.145,
          }
        ],
      },
      {
        name: "Истра / Новый Иерусалим",
        desc: "Грандиозный духовный и ландшафтный проект патриарха Никона XVII века - святыни Святой Земли на реке Истре.",
        address: "Московская область, г. Истра",
        latitude: 55.9215,
        longitude: 36.8455,
        travelVector: "Северо-Западный и Рижский вектор",
        travelVectorBlurb: "Электрички МЦД-2 от Курского или Рижского вокзалов и станций метро «Тушинская», «Дмитровская», «Войковская». В пути около 1 часа 15 минут.",
        stationHub: "Рижский вокзал / МЦД-2",
        logisticsExit: "Станция Истра или Новоиерусалимская",
        gastroStop: {
          name: "Кафе-чебуречная «У Горы» / Трапезные палаты",
          blurb: "Традиционная выпечка, монастырский квас, соленья и горячие обеды после долгой прогулки.",
        },
        places: [
          {
            name: "Ново-Иерусалимский монастырь",
            desc: "Белокаменный ансамбль с оборонительными стенами, повторяющий очертания Иерусалима",
            locationSlug: "moscow-novo-ierusalimskiy",
            latitude: 55.9215,
            longitude: 36.8455,
          },
          {
            name: "Воскресенский собор",
            desc: "Главный храм с изразцовым шатром ротонды Гроба Господня без аналогов в мире",
            latitude: 55.9218,
            longitude: 36.8458,
          },
          {
            name: "Подземная церковь Константина и Елены",
            desc: "Углубленный белокаменный храм со святым источником внутри",
            latitude: 55.9217,
            longitude: 36.8456,
          },
          {
            name: "Крепостные стены и башни",
            desc: "Прогулка по верхнему ярусу с видами на реку Истру",
            latitude: 55.9212,
            longitude: 36.845,
          },
          {
            name: "Скит Патриарха Никона",
            desc: "Потайной четырехэтажный каменный столп XVII века на берегу реки",
            latitude: 55.9225,
            longitude: 36.8445,
          },
          {
            name: "Музейно-выставочный комплекс «Новый Иерусалим»",
            desc: "Современный хай-тек музей рядом со стенами - Айвазовский, Шагал, Фаберже",
            latitude: 55.9195,
            longitude: 36.8485,
          },
          {
            name: "Музей деревянного зодчества",
            desc: "Этнографическая зона в парке: изба, мельница и церковь из русских деревень",
            latitude: 55.92,
            longitude: 36.847,
          }
        ],
      },
      {
        name: "Коломна",
        desc: "Один из старейших городов Подмосковья с фрагментами красного кремля XVI века, купеческим духом, пастилой и калачами.",
        address: "Московская область, г. Коломна",
        latitude: 55.1035,
        longitude: 38.7525,
        travelVector: "Юго-Восточный и Рязанский вектор",
        travelVectorBlurb: "Скоростные экспрессы «РЭКС» или электрички от Казанского вокзала (метро «Комсомольская»). В пути около 1,5-2 часов.",
        stationHub: "Казанский вокзал",
        logisticsExit: "Станция Коломна (старый город) или Голутвин",
        gastroStop: {
          name: "Литературное кафе «Лажечников»",
          blurb: "Ресторан-музей по купеческим рецептам из книг; к заказу - гусиный паштет и чай с коломенской пастилой.",
        },
        places: [
          {
            name: "Коломенский кремль",
            desc: "Монументальные фрагменты кирпичной крепости с Пятницкой надвратной башней",
            locationSlug: "moscow-kolomenskiy-kreml",
            latitude: 55.1035,
            longitude: 38.7525,
          },
          {
            name: "Маринкина башня",
            desc: "Самая высокая башня кремля - легенда о Марине Мнишек",
            latitude: 55.1038,
            longitude: 38.7528,
          },
          {
            name: "Соборная площадь",
            desc: "Парадный центр с Успенским собором и шатровой колокольней",
            latitude: 55.104,
            longitude: 38.7535,
          },
          {
            name: "Музей «Коломенская пастила»",
            desc: "Интерактивный музей в купеческом доме с дегустацией и актерами XIX века",
            latitude: 55.1045,
            longitude: 38.7555,
          },
          {
            name: "Музей «Калачная»",
            desc: "Действующая пекарня у стен кремля - калачи с ручкой из дровяной печи",
            latitude: 55.1042,
            longitude: 38.754,
          },
          {
            name: "Пятницкие ворота и купеческий Посад",
            desc: "Тихие улочки с резными палисадами, церквями и лавками",
            latitude: 55.103,
            longitude: 38.7515,
          },
          {
            name: "Богоявленский Старо-Голутвин монастырь",
            desc: "Обитель у слияния Москвы и Оки, основанная Сергием Радонежским",
            transitTip: "Отдельный выезд к Голутвину",
            latitude: 55.09,
            longitude: 38.78,
          }
        ],
      },
      {
        name: "Звенигород",
        desc: "«Подмосковная Швейцария»: холмистый лесной ландшафт, крутые берега Москвы-реки и Саввино-Сторожевский монастырь.",
        address: "Московская область, г. Звенигород",
        latitude: 55.7285,
        longitude: 36.8155,
        travelVector: "Западный и Белорусский вектор",
        travelVectorBlurb: "Электрички от Белорусского вокзала или автобусы от метро «Строгино» / «Кунцевская». В пути около 1 часа 10 минут.",
        stationHub: "Белорусский вокзал",
        logisticsExit: "Станция Звенигород",
        gastroStop: {
          name: "Монастырская чайная и пекарня",
          blurb: "Звенигородский ржаной хлеб на закваске, квас на изюме по чертежам XVII века, коврижки и выпечка.",
        },
        places: [
          {
            name: "Саввино-Сторожевский монастырь",
            desc: "Белокаменная царская крепость-резиденция на горе Сторожи",
            locationSlug: "moscow-savvino-storozhevskiy",
            latitude: 55.7285,
            longitude: 36.8155,
          },
          {
            name: "Рождественский собор",
            desc: "Древнейший белокаменный храм Подмосковья (1405) с узорчатой резьбой",
            latitude: 55.7288,
            longitude: 36.8158,
          },
          {
            name: "Дворец царя Алексея Михайловича",
            desc: "Узорчатый терем XVII века с воссозданными царскими покоями",
            latitude: 55.7287,
            longitude: 36.816,
          },
          {
            name: "Царицыны палаты",
            desc: "Красно-белое крыльцо и покои царицы с изразцовыми печами",
            latitude: 55.7286,
            longitude: 36.8157,
          },
          {
            name: "Звенигородский Городок",
            desc: "Земляное городище с Успенским собором и фресками круга Рублева",
            latitude: 55.7295,
            longitude: 36.8545,
          },
          {
            name: "Скит преподобного Саввы",
            desc: "Часовня и пещера в лесу, выкопанная основателем для молитв",
            latitude: 55.727,
            longitude: 36.812,
          },
          {
            name: "Дом-музей М.М. Пришвина в Дунино",
            desc: "Деревянная дача писателя-натуралиста на берегу реки",
            transitTip: "Несколько километров от города",
            latitude: 55.735,
            longitude: 36.78,
          }
        ],
      },
      {
        name: "Архангельское",
        desc: "Роскошный дворцово-парковый ансамбль XVIII-XIX веков, получивший неофициальное название «Подмосковный Версаль».",
        address: "МО, г.о. Красногорск, пос. Архангельское",
        latitude: 55.784903,
        longitude: 37.2834,
        travelVector: "Западный и Новорижский вектор",
        travelVectorBlurb: "Автобусы и маршрутки от метро «Тушинская» / «Строгино» - удобная полудневная поездка.",
        stationHub: "Метро Тушинская / Строгино",
        logisticsExit: "Остановка «Архангельское»",
        places: [
          {
            name: "Большой дворец",
            desc: "Парадные залы и колоннада усадьбы",
            locationSlug: "moscow-usadba-arhangelskoe",
            latitude: 55.7865,
            longitude: 37.2835,
          },
          {
            name: "Храм Архангела Михаила",
            desc: "Усадебная церковь над склоном к реке",
            latitude: 55.7855,
            longitude: 37.2825,
          },
          {
            name: "Парк Архангельского",
            desc: "Террасы, статуи и виды на пойму",
            latitude: 55.7875,
            longitude: 37.2845,
          },
          {
            name: "Колоннада",
            desc: "Классический фасад для открытки",
            latitude: 55.7868,
            longitude: 37.2838,
          }
        ],
      },
      {
        name: "Абрамцево",
        desc: "Центр русской художественной жизни XIX века - Серов, Врубель, Васнецов и Репин у Мамонтовых.",
        address: "Московская обл., Сергиево-Посадский г.о., с. Абрамцево",
        latitude: 56.2339,
        longitude: 37.9867,
        travelVector: "Северный и Ярославский вектор",
        travelVectorBlurb: "Ярославское направление до Хотьково / Абрамцево, далее пешком или на такси к музею-заповеднику.",
        stationHub: "Ярославский вокзал",
        logisticsExit: "Станция Абрамцево / Хотьково",
        places: [
          {
            name: "Усадебный дом",
            desc: "Главный дом музея-заповедника с мемориальными комнатами",
            locationSlug: "moscow-abramtsevo",
            latitude: 56.2335,
            longitude: 37.9675,
          },
          {
            name: "Церковь Спаса Нерукотворного",
            desc: "Храм кружка Мамонтовых в усадебном парке",
            latitude: 56.2345,
            longitude: 37.9685,
          },
          {
            name: "Беседка «Избушка на курьих ножках»",
            desc: "Сказочный павильон Васнецова",
            latitude: 56.234,
            longitude: 37.967,
          },
          {
            name: "Парк Абрамцева",
            desc: "Аллеи и речка Воря вокруг усадьбы",
            latitude: 56.233,
            longitude: 37.9665,
          }
        ],
      },
      {
        name: "Бородино",
        desc: "Поле Бородинского сражения и музей-заповедник 1812 года.",
        address: "Московская область, Можайский городской округ",
        latitude: 55.5255,
        longitude: 35.8215,
        travelVector: "Западный и Белорусский вектор",
        travelVectorBlurb: "Электрички на Можайск с Белорусского вокзала, далее трансфер к музею на поле.",
        stationHub: "Белорусский вокзал",
        logisticsExit: "Станция Бородино / Можайск",
        places: [
          {
            name: "Бородинское поле",
            desc: "Мемориальный ландшафт 1812 года",
            locationSlug: "moscow-borodinskoe-pole",
            latitude: 55.5255,
            longitude: 35.8215,
          },
          {
            name: "Главный монумент",
            desc: "Памятник на батарее Раевского",
            latitude: 55.5265,
            longitude: 35.8225,
          },
          {
            name: "Спасо-Бородинский монастырь",
            desc: "Женский монастырь на поле сражения",
            latitude: 55.5185,
            longitude: 35.8155,
          },
          {
            name: "Музей Бородина",
            desc: "Экспозиция войны 1812 года",
            latitude: 55.5275,
            longitude: 35.8205,
          }
        ],
      },
      {
        name: "Мелихово",
        desc: "Музей-заповедник А. П. Чехова - сад, аптека и дом, где родились «Чайка» и «Дядя Ваня».",
        address: "Московская обл., г.о. Чехов, с. Мелихово",
        latitude: 55.1147,
        longitude: 37.6483,
        travelVector: "Южный и Курский вектор",
        travelVectorBlurb: "Курское направление до Чехова, далее автобус или такси в Мелихово.",
        stationHub: "Курский вокзал",
        logisticsExit: "Станция Чехов",
        places: [
          {
            name: "Дом Чехова",
            desc: "Главный усадебный дом писателя",
            locationSlug: "moscow-melihovo",
            latitude: 55.1185,
            longitude: 37.6485,
          },
          {
            name: "Флигель «Чеховская аптека»",
            desc: "Мемориальная аптека и кабинет",
            latitude: 55.1188,
            longitude: 37.6488,
          },
          {
            name: "Сад Мелихова",
            desc: "Аллеи и пруд усадьбы",
            latitude: 55.1182,
            longitude: 37.6475,
          },
          {
            name: "Школа Чехова",
            desc: "Школа, построенная на средства писателя",
            latitude: 55.1195,
            longitude: 37.6495,
          }
        ],
      }
    ],
    dayRoutePresets: [
      ...MOSCOW_LINE_DAY_ROUTE_PRESETS,
      {
        id: "msk-1",
        title: "Классический парадный центр",
        description: "Кремль, Красная площадь, Зарядье и Большой театр - идеальный первый день без лишних переездов.",
        timingNote: "10:00 старт у Кремля; вечер - Большой театр.",
        blogSlug: "moscow-2-dnya-samostoyatelno-marshrut",
        stops: [
          {
            name: "Московский Кремль",
            desc: "Главный общественно-политический и историко-художественный комплекс столицы, являющийся официальной резиденцией Президента РФ.",
            locationSlug: "moscow-moskovskiy-kreml",
            latitude: 55.752004,
            longitude: 37.617456,
            address: "Кремлевская наб.",
          },
          {
            name: "Красная площадь",
            desc: "Центральная и самая известная площадь Москвы, ставшая главным символом страны и местом проведения ключевых торжеств.",
            locationSlug: "moscow-krasnaya-ploschad",
            latitude: 55.753544,
            longitude: 37.621049,
            address: "Красная площадь",
          },
          {
            name: "Никольская улица",
            desc: "Пешеходная старинная улица в Китай-городе, знаменитая своей яркой праздничной иллюминацией и обилием кафе.",
            locationSlug: "moscow-nikolskaya-ulitsa",
            latitude: 55.757049,
            longitude: 37.622533,
            address: "Никольская ул.",
          },
          {
            name: "ГУМ",
            desc: "Легендарный исторический универмаг с роскошной архитектурой, знаменитым мороженым и советским фонтаном.",
            locationSlug: "moscow-gum",
            latitude: 55.754714,
            longitude: 37.621481,
            address: "Красная площадь, 3",
          },
          {
            name: "Столовая №57 в ГУМе",
            desc: "Культовое заведение в стиле советского общепита с классическим домашним меню и ностальгической атмосферой.",
            locationSlug: "moscow-stolovaya-57",
            latitude: 55.754407,
            longitude: 37.621949,
            address: "Красная площадь, 3 (3-я линия, 3-й этаж)",
          },
          {
            name: "Парк «Зарядье»",
            desc: "Современный ландшафтный парк в самом центре столицы, объединивший в себе инновационные медиакомплексы и разные природные зоны России.",
            locationSlug: "moscow-park-zaryad-e",
            latitude: 55.7513,
            longitude: 37.628312,
            address: "ул. Варварка, 6, стр. 1",
          },
          {
            name: "Парящий мост в Зарядье",
            desc: "Уникальная смотровая площадка в виде консольной петли, парящая над Москвой-рекой без единой опоры.",
            locationSlug: "moscow-paryaschiy-most-zaryadya",
            latitude: 55.75013,
            longitude: 37.628886,
            address: "Парк «Зарядье»",
          },
          {
            name: "Улица Варварка",
            desc: "Одна из старейших улиц Москвы с уникальным ансамблем древнерусских храмов и купеческих палат.",
            locationSlug: "moscow-varvarka",
            latitude: 55.752533,
            longitude: 37.626573,
            address: "ул. Варварка",
          },
          {
            name: "Английское подворье в Зарядье",
            desc: "Белокаменные палаты XVI века, служившие резиденцией английской торговой компании и сохранившие дух допетровской Москвы.",
            locationSlug: "moscow-angliyskoe-podvore",
            latitude: 55.752044,
            longitude: 37.625345,
            address: "ул. Варварка, 4А",
          },
          {
            name: "Большой театр",
            desc: "Один из главных и старейших театров оперы и балета в мире, являющийся шедевром русского классицизма.",
            venueSlug: "moscow-bol-shoy-teatr",
            latitude: 55.760156,
            longitude: 37.61858,
            address: "Театральная площадь, 1",
          }
        ],
      },
      {
        id: "msk-2",
        title: "Модный и светский",
        description: "Патриаршие, Никитская и панорамный ужин - атмосфера светской Москвы.",
        timingNote: "11:00 завтрак в «Северянах»; вечер - White Rabbit и бар на Патриарших.",
        stops: [
          {
            name: "Ресторан «Северяне»",
            desc: "Модный ресторан с мистическим темным интерьером, где блюда готовятся в настоящих русских печах на открытом огне.",
            locationSlug: "moscow-severyane",
            latitude: 55.756715,
            longitude: 37.604561,
            address: "Большая Никитская ул., 12",
          },
          {
            name: "Особняк Рябушинского",
            desc: "Шедевр московского модерна архитектора Шехтеля со знаменитой тающей лестницей, где сейчас расположен музей-квартира М. Горького.",
            locationSlug: "moscow-osobnyak-ryabushinskogo",
            latitude: 55.759403,
            longitude: 37.595724,
            address: "Малая Никитская ул., 6/2, стр. 5",
          },
          {
            name: "Патриаршие пруды",
            desc: "Исторический сквер с прудом, воспетый Булгаковым, ставший центром самого престижного и оживленного ресторанного района столицы.",
            locationSlug: "moscow-patriarshie-prudy",
            latitude: 55.763489,
            longitude: 37.592311,
            address: "Большой Патриарший пер.",
          },
          {
            name: "Улица Большая Никитская",
            desc: "Одна из самых гастрономических улиц Москвы, связывающая Кремль с Садовым кольцом и наполненная модными заведениями.",
            locationSlug: "moscow-bolshaya-nikitskaya",
            latitude: 55.757533,
            longitude: 37.601546,
            address: "Большая Никитская ул.",
          },
          {
            name: "Ресторан «White Rabbit»",
            desc: "Знаменитый панорамный ресторан авторской кухни, неоднократно входивший в число лучших ресторанов мира.",
            locationSlug: "moscow-white-rabbit",
            latitude: 55.748958,
            longitude: 37.58312,
            address: "Смоленская площадь, 3 (ТЦ Смоленский пассаж, 16-й этаж)",
          }
        ],
      },
      {
        id: "msk-3",
        title: "Советский авангард и конструктивизм",
        description: "Наркомфин, Мельников, Бахметьевский гараж, Русаков и ЗИЛ - день для ценителей архитектуры.",
        timingNote: "10:00 Наркомфин; день завершить в ЗИЛе.",
        stops: [
          {
            name: "Дом Наркомфина",
            desc: "Легендарный памятник советского конструктивизма и архитектуры авангарда, отреставрированный жилой дом-коммуна.",
            locationSlug: "moscow-dom-narkomfina",
            latitude: 55.753835,
            longitude: 37.580456,
            address: "Новинский бульвар, 25-27, стр. 12",
          },
          {
            name: "Дом Мельникова",
            desc: "Всемирно известный одноквартирный жилой дом-мастерская в виде двух пересекающихся цилиндров, шедевр авангарда.",
            locationSlug: "moscow-dom-melnikova",
            latitude: 55.748242,
            longitude: 37.589389,
            address: "Кривоарбатский пер., 10",
          },
          {
            name: "Депо.Москва на Лесной",
            desc: "Крупнейший фудмолл Европы, открытый в отреставрированном здании старейшего Миусского трамвайного депо.",
            locationSlug: "moscow-depo-lesnaya",
            latitude: 55.779679,
            longitude: 37.592311,
            address: "Лесная ул., 20, стр. 3",
          },
          {
            name: "Бахметьевский гараж",
            desc: "Архитектурный памятник советского авангарда по проекту Мельникова и Шухова, где сегодня располагается Еврейский музей.",
            locationSlug: "moscow-bahmetevskiy-garazh",
            latitude: 55.790438,
            longitude: 37.608254,
            address: "ул. Образцова, 11, стр. 1А",
          },
          {
            name: "Еврейский музей и центр толерантности",
            desc: "Высокотехнологичный интерактивный музей, подробно рассказывающий об истории еврейского народа в России.",
            venueSlug: "moscow-evreyskiy-muzey",
            latitude: 55.790221,
            longitude: 37.607842,
            address: "ул. Образцова, 11, стр. 1А",
          },
          {
            name: "Дом культуры им. И.В. Русакова",
            desc: "Знаменитое здание рабочего клуба архитектора Константина Мельникова, напоминающее по форме гигантскую шестеренку.",
            locationSlug: "moscow-dk-rusakova",
            latitude: 55.791031,
            longitude: 37.68312,
            address: "Стромынка, 6",
          },
          {
            name: "Культурный центр ЗИЛ",
            desc: "Масштабный памятник эпохи конструктивизма братьев Весниных, работающий как современная творческая площадка.",
            locationSlug: "moscow-zil",
            latitude: 55.714257,
            longitude: 37.654394,
            address: "Восточная ул., 4, корп. 1",
          }
        ],
      },
      {
        id: "msk-4",
        title: "Творческий и креативный",
        description: "Винзавод, Artplay, Арма, Суперметалл и «Поле» - лофты и галереи без гонки.",
        timingNote: "11:00 Винзавод; вечер - пространство «Поле».",
        stops: [
          {
            name: "Центр современного искусства «Винзавод»",
            desc: "Первое в России частное арт-пространство на территории бывшего завода, объединившее ведущие галереи современного искусства.",
            locationSlug: "moscow-vinzavod",
            latitude: 55.756455,
            longitude: 37.664257,
            address: "4-й Сыромятнический пер., 1/8, стр. 6",
          },
          {
            name: "Центр дизайна Artplay",
            desc: "Крупный креативный кластер для дизайнеров и архитекторов, известный своими масштабными мультимедийными выставками.",
            locationSlug: "moscow-artplay",
            latitude: 55.75121,
            longitude: 37.668576,
            address: "Нижняя Сыромятническая ул., 10",
          },
          {
            name: "Бизнес-квартал «Арма»",
            desc: "Деловое и досуговое пространство в отреставрированных круглых зданиях бывшего Московского газового завода.",
            locationSlug: "moscow-arma",
            latitude: 55.760144,
            longitude: 37.662547,
            address: "Нижний Сусальный пер., 5",
          },
          {
            name: "Суперметалл",
            desc: "Стильное общественно-деловое пространство в бруталистском здании бывшего НИИ черной металлургии.",
            locationSlug: "moscow-supermetall",
            latitude: 55.767464,
            longitude: 37.68312,
            address: "2-я Бауманская ул., 9/23, стр. 3",
          },
          {
            name: "Пространство «Поле»",
            desc: "Креативное комьюнити-плейс и клубный проект, объединяющий музыку, цифровое искусство и гастрономию.",
            locationSlug: "moscow-pole",
            latitude: 55.782115,
            longitude: 37.58312,
            address: "3-я ул. Ямского Поля, 2, корп. 25",
          }
        ],
      },
      {
        id: "msk-5",
        title: "Усадебный и романтический",
        description: "Архангельское утром, «Пушкинъ» и Нескучный сад вечером - дворянская Москва.",
        timingNote: "10:00 выезд в Архангельское; к 15:00 - центр.",
        stops: [
          {
            name: "Государственный музей-усадьба «Архангельское»",
            desc: "Роскошный дворцово-парковый ансамбль XVIII-XIX веков, получивший неофициальное название «Подмосковный Версаль».",
            locationSlug: "moscow-usadba-arhangelskoe",
            latitude: 55.784903,
            longitude: 37.2834,
            address: "МО, г.о. Красногорск, пос. Архангельское",
          },
          {
            name: "Ресторан «Кафе Пушкинъ»",
            desc: "Легендарный ресторан высокой дворянской кухни с атмосферой и интерьерами старинного особняка XIX века.",
            locationSlug: "moscow-kafe-pushkin",
            latitude: 55.764257,
            longitude: 37.604561,
            address: "Тверской бульвар, 26А",
          },
          {
            name: "Усадьба Черткова",
            desc: "Яркий лазурный особняк в стиле рококо, известный своими роскошными интерьерами и проведением иммерсивных выставок.",
            locationSlug: "moscow-usadba-chertkova",
            latitude: 55.759131,
            longitude: 37.63158,
            address: "Мясницкая ул., 7, стр. 2",
          },
          {
            name: "Нескучный сад",
            desc: "Старейший пейзажный парк Москвы с историческими мостиками и павильонами, где проходят съемки игры «Что? Где? Когда?».",
            locationSlug: "moscow-neskuchnyy-sad",
            latitude: 55.717034,
            longitude: 37.585885,
            address: "Ленинский проспект, 30",
          }
        ],
      },
      {
        id: "msk-6",
        title: "Секретная и мистическая Москва",
        description: "Саввинское подворье, Ивановская горка, Хитровка и Бункер-42 - скрытый центр.",
        timingNote: "11:00 Саввинское подворье; вечер - Бункер-42.",
        stops: [
          {
            name: "Саввинское подворье",
            desc: "Сказочный терем в псевдорусском стиле, который в 1939 году передвинули вглубь квартала прямо во время сна жильцов.",
            locationSlug: "moscow-savvinskoe-podvore",
            latitude: 55.759434,
            longitude: 37.612959,
            address: "Тверская ул., 6, стр. 6 (во дворе)",
          },
          {
            name: "Англиканская церковь Святого Андрея",
            desc: "Единственная англиканская церковь в Москве, выстроенная в викторианском готическом стиле, известная своими органными концертами.",
            locationSlug: "moscow-anglikanskaya-andrey",
            latitude: 55.757243,
            longitude: 37.60563,
            address: "Вознесенский пер., 8/5, стр. 2",
          },
          {
            name: "Хохловская площадь («Яма»)",
            desc: "Популярный городской амфитеатр со стеклянной стеной, внутри которого законсервирован фрагмент стены Белого города XVI века.",
            locationSlug: "moscow-hohlovskaya-yama",
            latitude: 55.756081,
            longitude: 37.645869,
            address: "Хохловская площадь",
          },
          {
            name: "Иоанно-Предтеченский монастырь (дворик)",
            desc: "Старинный монастырь на Ивановской горке с тихим внутренним двориком, напоминающим уголок старой Европы.",
            locationSlug: "moscow-ioanno-predatechenskiy-dvorik",
            latitude: 55.754983,
            longitude: 37.640051,
            address: "Малый Ивановский пер., 2",
          },
          {
            name: "Арт-двор «Хитровка»",
            desc: "Камерное творческое пространство в подвалах старинных палат на месте легендарного криминального Хитрова рынка.",
            locationSlug: "moscow-hitrovka",
            latitude: 55.752183,
            longitude: 37.641496,
            address: "Подколокольный пер., 8, стр. 2",
          },
          {
            name: "Палаты Мазепы",
            desc: "Образец гражданской архитектуры XVII века с нарядными наличниками, ошибочно связываемый с именем гетмана Мазепы.",
            locationSlug: "moscow-palaty-mazepy",
            latitude: 55.755519,
            longitude: 37.642416,
            address: "Колпачный пер., 10/7, стр. 2",
          },
          {
            name: "Бункер-42 на Таганке",
            desc: "Военно-исторический музей, расположенный на глубине 65 метров в бывшем секретном противоатомном убежище СССР.",
            venueSlug: "moscow-bunker-42",
            latitude: 55.741617,
            longitude: 37.648633,
            address: "5-й Котельнический пер., 11",
          }
        ],
      },
      {
        id: "msk-7",
        title: "Имперский масштаб ВДНХ",
        description: "Главная аллея, космос, музей кино и «Солнце Москвы» - гранд-прогулка на весь день.",
        timingNote: "10:00 арка ВДНХ; закат на колесе обозрения.",
        stops: [
          {
            name: "ВДНХ",
            desc: "Крупнейший экспозиционный и парковый комплекс страны, знаменитый монументальными советскими павильонами и фонтанами.",
            locationSlug: "moscow-vdnh",
            latitude: 55.829845,
            longitude: 37.6334,
            address: "проспект Мира, 119",
          },
          {
            name: "Музей космонавтики",
            desc: "Один из крупнейших научно-технических музеев мира, расположенный в основании монумента «Покорителям космоса».",
            venueSlug: "moscow-muzey-kosmonavtiki",
            latitude: 55.822115,
            longitude: 37.639871,
            address: "проспект Мира, 111",
          },
          {
            name: "Музей кино на ВДНХ",
            desc: "Пространство с богатыми коллекциями костюмов, афиш и техники, рассказывающее историю отечественного кинематографа.",
            locationSlug: "moscow-muzey-kino-vdnh",
            latitude: 55.834488,
            longitude: 37.628886,
            address: "проспект Мира, 119, стр. 36 (Павильон №36)",
          },
          {
            name: "Колесо обозрения «Солнце Москвы»",
            desc: "Самое большое колесо обозрения в Европе высотой 140 метров с закрытыми кабинами для панорамного обзора столицы.",
            locationSlug: "moscow-solntse-moskvy",
            latitude: 55.826941,
            longitude: 37.627092,
            address: "2-я Останкинская ул., 3",
          },
          {
            name: "Останкинская телебашня",
            desc: "Высочайшее сооружение в Европе, предлагающее экскурсии на закрытые и открытые смотровые площадки со стеклянным полом.",
            locationSlug: "moscow-ostankinskaya-telebashnya",
            latitude: 55.820803,
            longitude: 37.611647,
            address: "ул. Академика Королева, 15, корп. 2",
          }
        ],
      },
      {
        id: "msk-8",
        title: "Семейный и интерактивный",
        description: "Зоопарк, Планетарий, крыша ЦДМ и Музей криптографии - день с детьми без перегруза.",
        timingNote: "10:00 зоопарк; после обеда - ЦДМ и криптография.",
        stops: [
          {
            name: "Московский зоопарк",
            desc: "Один из старейших зоопарков Европы с огромной коллекцией животных со всего мира и центром реабилитации панд.",
            locationSlug: "moscow-zoopark",
            latitude: 55.762112,
            longitude: 37.577242,
            address: "Большая Грузинская ул., 1",
          },
          {
            name: "Московский Планетарий",
            desc: "Научно-просветительский центр с самым большим куполом-экраном в Европе и интерактивным залом «Лунариум».",
            venueSlug: "moscow-planetariy",
            latitude: 55.761031,
            longitude: 37.58312,
            address: "Садовая-Кудринская ул., 5, стр. 1",
          },
          {
            name: "Крыша Центрального детского магазина",
            desc: "Бесплатная панорамная площадка в центре города, открывающая красивый вид на Кремль, Лубянку и Политехнический музей.",
            locationSlug: "moscow-krysha-cdm",
            latitude: 55.759679,
            longitude: 37.625345,
            address: "Театральный проезд, 5, стр. 1",
          },
          {
            name: "Музей криптографии",
            desc: "Единственный в России интерактивный музей, посвященный истории шифрования, кодам и секретным технологиям связи.",
            locationSlug: "moscow-muzey-kriptografii",
            latitude: 55.828424,
            longitude: 37.592311,
            address: "Ботаническая ул., 25, стр. 4",
          }
        ],
      },
      {
        id: "msk-9",
        title: "Индустриальный и технологичный",
        description: "Сити, Panorama360, мост Багратион и Экспериментаниум - взгляд вверх и в будущее.",
        timingNote: "День в Сити; вечер - Экспериментаниум на Соколе.",
        stops: [
          {
            name: "Деловой центр «Москва-Сити»",
            desc: "Современный квартал ультранебоскребов из стекла и стали, ставший главным деловым центром и визитной карточкой новой Москвы.",
            locationSlug: "moscow-moskva-siti",
            latitude: 55.74758,
            longitude: 37.538575,
            address: "Пресненская наб.",
          },
          {
            name: "Смотровая площадка Panorama360",
            desc: "Самая высокая смотровая площадка Европы под крышей, где работает безлимитная фабрика мороженого и шоколада.",
            locationSlug: "moscow-smotrovaya-moskva-siti",
            latitude: 55.748792,
            longitude: 37.53709,
            address: "Пресненская наб., 12 (башня Федерация-Восток, 89 этаж)",
          },
          {
            name: "Мост Багратион",
            desc: "Торгово-пешеходный застекленный мост через Москву-реку, соединяющий станцию метро Выставочная с Кутузовским проспектом.",
            locationSlug: "moscow-most-bagration",
            latitude: 55.744955,
            longitude: 37.544445,
            address: "Краснопресненская наб., 16, стр. 1",
          },
          {
            name: "Экспериментаниум",
            desc: "Интерактивный музей занимательных наук, где все экспонаты можно и нужно трогать руками для изучения физики и химии.",
            venueSlug: "moscow-eksperimentanium",
            latitude: 55.80708,
            longitude: 37.512959,
            address: "Ленинградский проспект, 80, корп. 11",
          }
        ],
      },
      {
        id: "msk-10",
        title: "Старомосковский Замоскворечье",
        description: "Третьяковка, Кадаши, Пятницкая, Музеон и «Красный Октябрь» - живописный южный берег.",
        timingNote: "10:00 Третьяковка; закат на Красном Октябре.",
        stops: [
          {
            name: "Государственная Третьяковская галерея",
            desc: "Главный музей национального искусства России, хранящий величайшие шедевры русских художников от икон до классики.",
            venueSlug: "moscow-tret-yakovskaya-galereya",
            latitude: 55.741434,
            longitude: 37.62014,
            address: "Лаврушинский пер., 10",
          },
          {
            name: "Церковь Климента Папы Римского",
            desc: "Грандиозный и один из красивейших барочных храмов столицы, поражающий своим величественным убранством.",
            locationSlug: "moscow-tserkov-klimenta",
            latitude: 55.741031,
            longitude: 37.628325,
            address: "Пятницкая ул., 26, стр. 1",
          },
          {
            name: "Пятницкая улица",
            desc: "Одна из ключевых исторических и ресторанных улиц Замоскворечья, сохранившая атмосферу купеческой Москвы.",
            locationSlug: "moscow-pyatnitskaya-ulitsa",
            latitude: 55.740114,
            longitude: 37.629107,
            address: "Пятницкая ул.",
          },
          {
            name: "Особняк Коробковой",
            desc: "Утонченный особняк нежно-чешуйчатого сиреневого цвета в стиле эклектики с богатым лепным декором.",
            locationSlug: "moscow-osobnyak-korobkovoy",
            latitude: 55.738634,
            longitude: 37.629389,
            address: "Пятницкая ул., 33-35, стр. 1",
          },
          {
            name: "Крымская набережная и Парк «Музеон»",
            desc: "Пешеходная ландшафтная набережная с волнообразными дорожками, соединенная с крупнейшим в России музеем скульптур под открытым небом.",
            locationSlug: "moscow-krymskaya-naberezhnaya",
            latitude: 55.734898,
            longitude: 37.606894,
            address: "Крымский Вал, влад. 2",
          },
          {
            name: "Гастро-квартал «Красный Октябрь»",
            desc: "Культовое место из красного кирпича на территории бывшей кондитерской фабрики, объединившее ночные клубы, рестораны и студии.",
            locationSlug: "moscow-krasnyy-oktyabr",
            latitude: 55.741785,
            longitude: 37.60856,
            address: "Берсеневская наб., 6, стр. 3",
          }
        ],
      }
    ],
    travel: "Москва является главным транспортным узлом России, куда ведут четыре международных аэропорта (Шереметьево, Домодедово, Внуково, Жуковский), десять железнодорожных вокзалов и современные скоростные автомагистрали. Столица предлагает колоссальное количество развлечений в любое время года, но идеальными сезонами для классического туризма считаются поздняя весна (май с цветущими парками), лето и начало осени (бабье лето в сентябре). Новогодние праздники - еще один мощный пик сезона, когда центр Москвы превращается в одну из самых красивых праздничных площадок мира.",
    seasonalTip: {
      title: "День города в Москве",
      description: "Главный городской праздник столицы - с водой, музыкой и салютом. В подборке уже собраны теплоходы и программы к Дню города, чтобы не искать их по всей афише.",
      href: "/moscow/den-goroda",
      linkLabel: "Открыть День города",
    },
    faq: [
      {
        q: "Как выгоднее всего перемещаться по Москве туристу?",
        a: "Самый быстрый и экономный способ - московское метро, МЦК и МЦД; для оплаты поездок лучше сразу приобрести транспортную карту «Тройка» и записать на нее безлимитный тариф на 1 или 3 суток.",
      },
      {
        q: "Правда ли, что вход на Красную площадь бесплатный?",
        a: "Да, вход на главную площадь страны бесплатный для всех, однако её могут временно закрывать во время масштабных государственных мероприятий или репетиций парадов.",
      },
      {
        q: "Где найти лучшие смотровые площадки с панорамой города?",
        a: "Виды на столицу открываются со смотровой на Воробьевых горах (бесплатно), с парящего моста в парке «Зарядье» и с высотных площадок в башнях «Москва-Сити».",
      }
    ],
  },
  kazan: {
    brief:
      'Яркая третья столица России, где в абсолютной гармонии переплелись древняя культура Востока и современные тренды Запада. Город гастрономических восторгов, грандиозных спортивных событий и тысячелетней истории.',
    hookFact:
      'А вы знали, что Казанский кремль - это единственная крепость в мире, где практически бок о бок стоят действующий православный Благовещенский собор и монументальная мусульманская мечеть Кул-Шариф?',
    mustSee: KAZAN_MUST_SEE as CityMustSeeItem[],
    significantSuburbs: KAZAN_SUBURBS as CitySuburbItem[],
    dayRoutePresets: KAZAN_DAY_ROUTE_PRESETS as CityDayRoutePreset[],
    travel: KAZAN_TRAVEL,
    faq: KAZAN_FAQ,
  },
  kaliningrad: {
    brief:
      'Калининград - город двух имен, янтарное сердце России и уникальный европейский эксклав. Здесь готика старого Кёнигсберга соседствует с набережными Преголи, морскими музеями, фортами и балтийским побережьем.',
    hookFact: 'В Калининградской области сосредоточено около 90% мировых запасов янтаря, а в Музее Мирового океана можно подняться на борт музейной флотилии и подводной лодки Б-413.',
    mustSee: [
      { name: 'Кафедральный собор', desc: 'Главный готический храм города XIV века на острове Канта, где находится самый большой органный комплекс в России',
        locationSlug: 'kaliningrad-kafedral-nyy-sobor',
        mustSeeFilter: 'main'
      },
      { name: 'Музей Мирового океана', desc: 'Масштабный маринистический центр с аквариумами, глубоководными аппаратами и научно-исследовательским судном «Витязь»',
        venueSlug: 'kaliningrad-muzey-mirovogo-okeana',
        mustSeeFilter: 'museum'
      },
      { name: 'Музей янтаря', desc: 'Уникальная экспозиция в крепостной башне Дона, хранящая многотонные самородки и шедевры ювелирного искусства',
        venueSlug: 'kaliningrad-muzey-yantarya',
        mustSeeFilter: 'museum'
      },
      { name: 'Калининградский музей изобразительных искусств', desc: 'Расположен в величественном здании бывшей Кёнигсбергской биржи, напоминающей флорентийское палаццо',
        venueSlug: 'kaliningrad-muzey-izobrazitelnyh-iskusstv',
        mustSeeFilter: 'museum'
        },
      { name: 'Музей «Бункер»', desc: 'Подземное бомбоубежище, в котором в апреле 1945 года немецкое командование подписало акт о капитуляции Кёнигсберга',
        venueSlug: 'kaliningrad-muzey-bunker',
        mustSeeFilter: 'museum'
        },
      { name: 'Форт № 5 «Король Фридрих Вильгельм III»', desc: 'Массивное оборонительное сооружение, принявшее на себя один из самых яростных ударов во время штурма города',
        venueSlug: 'kaliningrad-fort-5',
        mustSeeFilter: 'museum'
        },
      { name: 'Историко-художественный музей', desc: 'Главный архив памяти региона, расположенный в отреставрированном здании городского концертного зала Штадтхалле',
        venueSlug: 'kaliningrad-istoriko-hudozhestvennyy-muzey',
        mustSeeFilter: 'museum'
        },
      { name: 'Арт-пространство «Ворота»', desc: 'Креативный кластер в Закхаймских воротах, объединяющий выставки современных художников и кофейню',
        venueSlug: 'kaliningrad-art-prostranstvo-vorota',
        mustSeeFilter: 'museum'
        },
      { name: 'Музей-квартира «Альтес Хаус» (Altes Haus)', desc: 'Аутентичный музей-квартира в старинном доме, воссоздающий быт кёнигсбергского купца рубежа XIX-XX веков',
        venueSlug: 'kaliningrad-muzey-kvartira-altes-haus',
        mustSeeFilter: 'museum'
        },
      { name: 'Музей «Водоканал»', desc: 'Атмосферный музей в водонапорной башне 1879 года, рассказывающий об эволюции городских инженерных систем',
        venueSlug: 'kaliningrad-muzey-vodokanal',
        mustSeeFilter: 'museum'
        },
      { name: 'Рыбная деревня', desc: 'Современный этнографический и ремесленный комплекс на набережной, стилизованный под старинный квартал в немецком стиле',
        locationSlug: 'kaliningrad-rybnaya-derevnya',
        mustSeeFilter: 'main'
      },
      { name: 'Район Амалиенау', desc: 'Чудом уцелевший в войну престижный немецкий квартал роскошных вилл эпохи модерна, построенный по концепции «город-сад»',
        locationSlug: 'kaliningrad-rayon-vill-amalienau',
        mustSeeFilter: 'main'
      },
      { name: 'Район Марауненхоф', desc: 'Еще один старинный жилой квартал у Верхнего озера с самобытной немецкой застройкой начала XX века',
        locationSlug: 'kaliningrad-rayon-maraunenhof',
        mustSeeFilter: 'main'
        },
      { name: 'Королевские ворота', desc: 'Самые нарядные городские ворота Кёнигсберга в стиле неоготики, украшенные горельефами великих правителей',
        locationSlug: 'kaliningrad-korolevskie-vorota',
        mustSeeFilter: 'main'
        },
      { name: 'Бранденбургские ворота', desc: 'Единственные из семи сохранившихся городских ворот, которые до сих пор используются по прямому назначению - через них ездят машины и трамваи',
        locationSlug: 'kaliningrad-brandenburgskie-vorota',
        mustSeeFilter: 'main'
        },
      { name: 'Фридландские ворота', desc: 'Готические ворота, внутри которых работает интерактивный музей с виртуальной прогулкой по улицам старого Кёнигсберга',
        locationSlug: 'kaliningrad-fridlandskie-vorota',
        mustSeeFilter: 'main'
        },
      { name: 'Росгартенские ворота', desc: 'Исторические ворота с оборонительным рвом, в которых сегодня открыт знаменитый рыбный ресторан',
        locationSlug: 'kaliningrad-rosgartenskie-vorota',
        mustSeeFilter: 'main'
        },
      { name: 'Здание Кёнигсбергской биржи', desc: 'Шедевр неоренессанса на берегу Преголи, построенный по проекту знаменитого архитектора Генриха Мюллера',
        mustSeeFilter: 'main'
      },
      { name: 'Дом Советов', desc: 'Легендарный и монументальный долгострой в стиле брутализма, возведенный на месте разрушенного Королевского замка (главный символ советского периода)',
        locationSlug: 'kaliningrad-dom-sovetov',
        mustSeeFilter: 'main'
        },
      { name: 'Остров Канта (Кнайпхоф)', desc: 'Зеленый остров-парк посреди реки Преголи, где похоронен великий философ Иммануил Кант',
        locationSlug: 'kaliningrad-ostrov-kanta',
        mustSeeFilter: 'park'
        },
      { name: 'Верхнее озеро', desc: 'Благоустроенная рекреационная зона с многокилометровыми велодорожками, фонтанами и детскими площадками',
        locationSlug: 'kaliningrad-verhnee-ozero',
        mustSeeFilter: 'park'
        },
      { name: 'Нижнее озеро', desc: 'Старейший искусственный водоем города, созданный рыцарями Тевтонского ордена еще в XIII веке',
        locationSlug: 'kaliningrad-nizhnee-ozero',
        mustSeeFilter: 'park'
        },
      { name: 'Центральный парк культуры и отдыха', desc: 'Бывший парк Луизанваль, где находится необычная кирха памяти королевы Луизы (ныне кукольный театр)',
        locationSlug: 'kaliningrad-tsentralnyy-park',
        mustSeeFilter: 'park'
        },
      { name: 'Калининградский зоопарк', desc: 'Один из старейших и крупнейших зоопарков в России, основанный немецким предпринимателем Германом Клаассом в 1896 году',
        locationSlug: 'kaliningrad-zoopark',
        mustSeeFilter: 'park'
        },
      { name: 'Памятник «Борющиеся зубры»', desc: 'Знаменитая скульптурная композиция работы Августа Гауля, ставшая любимым местом встреч студентов',
        locationSlug: 'kaliningrad-pamyatnik-boruschiesya-zubry',
        mustSeeFilter: 'park'
        },
      { name: 'Памятник Иммануилу Канту', desc: 'Отреставрированный бронзовый монумент мыслителю, расположенный возле здания Балтийского федерального университета',
        locationSlug: 'kaliningrad-pamyatnik-immanuilu-kantu',
        mustSeeFilter: 'park'
        },
      { name: 'Крестовоздвиженский собор (Кирха Креста)', desc: 'Величественный храм начала XX века с уникальным иконостасом из местного янтаря',
        locationSlug: 'kaliningrad-krestovozdvizhenskiy-sobor',
        mustSeeFilter: 'temple'
        },
      { name: 'Храм Христа Спасителя', desc: 'Главный православный собор города на площади Победы, построенный в традициях владимиро-суздальского зодчества',
        locationSlug: 'kaliningrad-hram-hrista-spasitelya',
        mustSeeFilter: 'temple'
        },
      { name: 'Кирха Святой Семейства', desc: 'Неоготический шедевр архитектора Фридриха Хайтманна, в здании которого сейчас работает концертный зал филармонии',
        venueSlug: 'kaliningrad-kirkha-svyatogo-semeystva',
        mustSeeFilter: 'temple'
        },
      { name: 'Юдиттен-кирха', desc: 'Самая старая постройка в Калининграде (XIII век), дошедшая до нас из эпохи рыцарей Тевтонского ордена (ныне Свято-Никольский храм)',
        locationSlug: 'kaliningrad-yuditten-kirkha',
        mustSeeFilter: 'temple'
        },
      { name: 'Ресторан «Штайндамм 99»', desc: 'Гастрономическое место в старинном доме, специализирующееся на локальной балтийской кухне (оленина, клопсы, местная рыба)',
        locationSlug: 'kaliningrad-shtayndamm-99',
        mustSeeFilter: 'gastro'
      },
      { name: 'Гастробар «Соль»', desc: 'Стильное заведение с современной авторской кухней и сильным акцентом на локальные морепродукты',
        locationSlug: 'kaliningrad-gastrobar-sol',
        mustSeeFilter: 'gastro'
      },
      { name: 'Zotler Bier', desc: 'Классический пивной ресторан с баварскими традициями и огромным выбором импортного и крафтового пива',
        locationSlug: 'kaliningrad-zotler-bier',
        mustSeeFilter: 'gastro'
      },
      { name: 'Ресторан «Редюит»', desc: 'Ресторан-пивоварня, расположенный в аутентичном оборонительном редюите XIX века',
        locationSlug: 'kaliningrad-redyuit',
        mustSeeFilter: 'gastro'
      },
      { name: 'Магазин-музей «Кёнигсбергский марципан»', desc: 'Бранденбургские ворота стали домом для сладкого бренда города, где можно попробовать марципановый кофе и купить сувениры',
        locationSlug: 'kaliningrad-kenigsbergskiy-martsipan',
        mustSeeFilter: 'gastro'
      },
    ],
    significantSuburbs: [
      {
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
          { name: 'Лебединое озеро', desc: 'пресноводное озеро у Рыбачьего - спокойная пауза на обратном пути', latitude: 55.1535, longitude: 20.8485},
          { name: 'Орнитологическая станция «Фрингилла»', desc: '23 км на обратном пути - сеанс кольцевания птиц к 15:00-16:00', latitude: 55.1585, longitude: 20.8255, transitTip: 'Авто на возврате (~23 км) - к сеансу 15:00-16:00' },
        ]
      },
      {
        name: 'Зеленоградск (Кранц)',
        desc: 'Главный курортный городок Балтики и «столица котов» с ухоженными улочками и длинным променадом.',
        travelVector: 'Вокзал - центр - море',
        travelVectorBlurb:
          'Сквозная линия от вокзала: Курортный проспект - кот - музейный квартал Саратовская (Домик Ангелов, Мурариум) - бювет и выход к променаду.',
        logisticsExit: 'Ж/д вокзал Зеленоградск',
        timingNote: 'Сквозная линия вокзал - центр - море без возвратов.',
        places: [
          { name: 'Курортный проспект', desc: 'от вокзала - пешеходная улица со старой немецкой застройкой, гирляндами и кошачьими граффити', latitude: 54.9595, longitude: 20.4765},
          { name: 'Памятник зеленоградским котам', desc: 'вращающаяся скульптура кота - символ и фото-точка на линии проспекта', latitude: 54.9598, longitude: 20.4755},
          { name: 'Музей «Домик Ангелов»', desc: 'музейный квартал Саратовская - частная коллекция ангелов в деревянном доме', latitude: 54.9582, longitude: 20.4745},
          { name: 'Музей кошек «Мурариум»', desc: 'музейный квартал Саратовская - 40-метровая водонапорная башня со смотровой', venueSlug: 'kaliningrad-muzey-koshek-murarium', latitude: 54.958914, longitude: 20.481211},
          { name: 'Бювет «Королева Луиза»', desc: 'выход к променаду - бесплатная минеральная вода у набережной', latitude: 54.9615, longitude: 20.4785},
          { name: 'Променад и волнорез', desc: 'морской финал линии - длинный променад и волнорез Кранца', latitude: 54.9625, longitude: 20.4795},
          { name: 'Кирха Святого Адальберта', desc: 'неоготический силуэт курорта - доминанта старого Кранца рядом с центром', latitude: 54.9575, longitude: 20.4805},
        ]
      },
      {
        name: 'Светлогорск (Раушен)',
        desc: 'Живописный курорт на высокой скале среди вековых сосен с атмосферой старого немецкого Раушена.',
        travelVector: 'Спуск и легкий подъем',
        travelVectorBlurb:
          'Верх: архитектура у Светлогорск-2 (башня, вилла Порр, органный зал) - спуск к морю (Зодиак и променад) - канатка обратно к вокзалу.',
        logisticsExit: 'Светлогорск-2',
        timingNote: 'Верх архитектура - спуск к морю - канатка обратно.',
        places: [
          { name: 'Водонапорная башня Раушена', desc: 'у Светлогорск-2 - 25-метровый силуэт в стиле немецкого романтизма, визитная карточка города', locationSlug: 'kaliningrad-vodonapornaya-bashnya-raushena', latitude: 54.943112, longitude: 20.151214},
          { name: 'Вилла Порр', desc: 'роскошная немецкая вилла начала XX века с дендропарком - следующий шаг верхнего круга', latitude: 54.9455, longitude: 20.1555},
          { name: 'Органный зал «Макаров»', desc: 'концертный зал на месте капеллы Santa Maria Stella Maris - перед спуском к морю', latitude: 54.9445, longitude: 20.1525},
          { name: 'Променад и Солнечные часы «Зодиак»', desc: 'спуск к морю - набережная с мозаичными часами из Книги рекордов Гиннесса', latitude: 54.9405, longitude: 20.1485, transitTip: 'Спуск к морю / променад' },
          { name: 'Скульптура «Нимфея»', desc: 'русалка у променада - фото-точка у моря перед канаткой', latitude: 54.9398, longitude: 20.1475},
          { name: 'Пляж у фуникулера', desc: 'песчаный пляж у нижней станции - перед подъемом', latitude: 54.9408, longitude: 20.1488},
          { name: 'Канатная дорога', desc: 'финал наверх к вокзалу - ретро-фуникулер с желтыми кабинками от моря к скале', latitude: 54.9415, longitude: 20.1495, transitTip: 'Канатка обратно к вокзалу' },
        ]
      },
      {
        name: 'Балтийск (Пиллау)',
        desc: 'Самый западный город России и главная база Военно-морского флота РФ на Балтике.',
        travelVector: 'Утро город / день коса',
        travelVectorBlurb:
          'Утро в городе: крепость (~11:00-11:30) и казармы - маяк у парома - паром/катер на косу к Нойтифу - финал у Елизаветы на Северном молу после возврата.',
        logisticsExit: 'Паром на Балтийскую косу у маяка',
        timingNote: 'Крепость утром; коса после парома у маяка.',
        places: [
          { name: 'Шведская крепость Пиллау', desc: 'экскурсия ~11:00-11:30 - цитадель XVII века в форме звезды, действующий военный объект', locationSlug: 'kaliningrad-shvedskaya-krepost-pillau', latitude: 54.639411, longitude: 19.891114, transitTip: 'Утро в городе - экскурсия ~11:00-11:30' },
          { name: 'Пехотные казармы', desc: 'красный кирпич начала XX века, штаб Балтийского флота - городской блок до парома', latitude: 54.6405, longitude: 19.8935},
          { name: 'Маяк Пиллау и памятник Петру I', desc: 'у парома на косу - самый западный маяк России (Шинкель) и памятник Петру I', latitude: 54.6415, longitude: 19.8825},
          { name: 'Немецкий аэродром Нойтиф', desc: 'паром/катер на Балтийскую косу - заброшенные авиационные ангары на песке', latitude: 54.6125, longitude: 19.8755, transitTip: 'Паром / катер на Балтийскую косу' },
          { name: 'Памятник Елизавете Петровне', desc: 'финал после возврата - монумент на Северном молу у Балтийского пролива', latitude: 54.6385, longitude: 19.8855, transitTip: 'После парома обратно - Северный мол' },
        ]
      },
      {
        name: 'Янтарный (Пальмикен)',
        desc: 'Поселок у единственного в мире комбината открытой добычи янтаря и пляжей с международным Голубым флагом.',
        locationSlug: 'kaliningrad-yantarnyy-kombinat',
        travelVector: 'Авто окраина - пешком центр/пляж',
        travelVectorBlurb:
          'Смотровая комбината на авто к открытию; дальше пешком: замок - парк Беккера и променад - пляж «Шахта Анна».',
        logisticsExit: 'Смотровая Янтарного комбината',
        timingNote: 'Комбината на авто к открытию; дальше пешком парк - променад - пляж.',
        places: [
          { name: 'Смотровая площадка Янтарного комбината', desc: 'на авто к открытию - карьер открытой добычи и «янтарная песочница»',
            locationSlug: 'kaliningrad-smotrovaya-yantarnogo-kombinata', latitude: 54.869212, longitude: 19.94151, transitTip: 'Авто к смотровой комбината - к открытию' },
          { name: 'Музей янтаря / выставка комбината', desc: 'экспозиция у карьера - короткий контекст перед пешим кругом в центр', latitude: 54.8688, longitude: 19.9425},
          { name: 'Янтарный замок', desc: 'пешком в центр - замок XIV века, музей пыток, оружие и янтарная лавка', latitude: 54.8675, longitude: 19.9435},
          { name: 'Парк Беккера', desc: 'пешком к морю - парк Мориса Беккера с редкими деревьями; дальше выход на променад к пляжу', latitude: 54.8685, longitude: 19.9455},
          { name: 'Пляж «Шахта Анна»', desc: 'финал - широкий пляж с «Голубым флагом» после променада', latitude: 54.8725, longitude: 19.9355},
        ]
      },
    ],
    dayRoutePresets: [
      ...KALININGRAD_LINE_DAY_ROUTE_PRESETS,
      {
        id: 'kaliningrad-classic-one-day',
        title: 'Классический Калининград за 1 день',
        description: 'Рыбная деревня, остров Канта, немецкий квартал, музейная флотилия, Амалиенау и ужин.',
        stops: [
          { name: 'Рыбная деревня', desc: 'Старт у Преголи', locationSlug: 'kaliningrad-rybnaya-derevnya', transitTip: 'Старт у Преголи / Рыбной деревни' },
          { name: 'Кафедральный собор', desc: 'Готика и орган на острове Канта', locationSlug: 'kaliningrad-kafedral-nyy-sobor'},
          { name: 'Остров Канта (Кнайпхоф)', desc: 'Парк и могила философа', locationSlug: 'kaliningrad-ostrov-kanta'},
          { name: 'Ресторан «Штайндамм 99»', desc: 'Обед в историческом квартале', locationSlug: 'kaliningrad-shtayndamm-99'},
          { name: 'Музей Мирового океана', desc: 'Флотилия и Б-413', venueSlug: 'kaliningrad-muzey-mirovogo-okeana'},
          { name: 'Район Амалиенау', desc: 'Прогулка среди вилл', locationSlug: 'kaliningrad-rayon-vill-amalienau', transitTip: 'Авто / такси ~10-15 мин к виллам Амалиенау' },
          { name: 'Гастробар «Соль»', desc: 'Вечерняя гастро-пауза', locationSlug: 'kaliningrad-gastrobar-sol', transitTip: 'Такси к ужину в центре ~15 мин'},
        ]
      },
      {
        id: 'kaliningrad-coast-curonian-zelenogradsk',
        title: 'Приморский экспресс - коса и Зеленоградск',
        description: 'День на косе от Зеленоградска: Мюллер - Танцующий лес - Эфа; Фрингилла на возврате, затем Кранц.',
        timingNote: 'Старт с косы от Зеленоградска; Фрингилла на возврате к 15:00-16:00; Зеленоградск - вечерняя линия вокзал - море.',
        stops: [
          { name: 'Куршская коса', desc: 'Въезд с Зеленоградска, углубление к Эфе', locationSlug: 'kaliningrad-kurshskaya-kosa' },
          { name: 'Высота Мюллера', desc: '32 км, утро' },
          { name: 'Дюна Эфа', desc: '42 км, дальняя точка', locationSlug: 'kaliningrad-dyuna-efa' },
          { name: 'Орнитологическая станция «Фрингилла»', desc: 'На возврате к 15:00-16:00' },
          { name: 'Зеленоградск (Кранц)', desc: 'Курортный проспект - Мурариум - променад' },
        ]
      },
      {
        id: 'kaliningrad-coast-svetlogorsk-yantarny',
        title: 'Приморский экспресс - Светлогорск и Янтарный',
        description: 'Светлогорск: верх - море - канатка; Янтарный: комбинат авто, дальше пешком к пляжу.',
        timingNote: 'Светлогорск - спуск и канатка обратно; Янтарный - комбинат к открытию, затем пешком парк - променад - пляж.',
        stops: [
          { name: 'Светлогорск (Раушен)', desc: 'Башня - вилла Порр - Зодиак - канатка' },
          { name: 'Янтарный (Пальмикен)', desc: 'Комбинат - замок - парк - пляж' },
          { name: 'Смотровая площадка Янтарного комбината', desc: 'Авто к открытию', locationSlug: 'kaliningrad-yantarnyy-kombinat' },
        ]
      },
    ],
    travel:
      'Самый быстрый путь - самолет до аэропорта Храброво: из Москвы около 2,5 часов, из Санкт-Петербурга около 2 часов. Поезд через Литву требует документов для транзита, поэтому условия стоит проверить перед покупкой. Для побережья выбирайте июнь-август, а весной и осенью закладывайте запас на ветер, дождь и изменчивую балтийскую погоду.',
    faq: [
    { q: "Где в Калининграде послушать знаменитый органный концерт?", a: "Самые масштабные органные концерты на крупнейшем в России органном комплексе проходят ежедневно в Кафедральном соборе на острове Канта." },
    { q: "Как найти всех хомлинов в городе?", a: "Хомлины - это забавные крошечные бронзовые фигурки мифических существ, спрятанные на главных достопримечательностях города (у Музея янтаря, зоопарка, на Медовом мосту), их поиск превращается в увлекательный квест." },
    { q: "Что такое клопсы и где их попробовать?", a: "Калининградские клопсы - это традиционное восточнопрусское блюдо в виде нежных мясных тефтелей в белом соусе с каперсами, которое подают практически во всех ресторанах немецкой и балтийской кухни города." },
    ]
  },
  vladimir: {
    brief:
      'Древняя столица Северо-Восточной Руси и главный бриллиант в короне Золотого кольца. Город поражает туристов своими белокаменными соборами XII века, старинными оборонительными валами и захватывающими дух панорамами на реку Клязьма.',
    hookFact: 'Знаете ли вы, что знаменитые Золотые ворота во Владимире - это единственный сохранившийся элемент древнерусских городских крепостных укреплений в мире?',
    mustSee: [
      { name: 'Золотые ворота', desc: 'Триумфальная арка 1164 года - символ города',
        locationSlug: 'vladimir-zolotye-vorota'
      },
      { name: 'Успенский собор', desc: 'Шедевр XII века с фресками Андрея Рублёва (ЮНЕСКО)',
        locationSlug: 'vladimir-uspenskiy-sobor'
      },
      { name: 'Дмитриевский собор', desc: 'Белокаменная резьба XII века - 600 рельефов (ЮНЕСКО)',
        locationSlug: 'vladimir-dmitrievskiy-sobor'
      },
      { name: 'Патриаршие сады', desc: 'Живописный сад XVI века с видом на Клязьму',
        locationSlug: 'vladimir-patriarshie-sady'
      },
      { name: 'Водонапорная башня', desc: 'Музей «Старый Владимир» с панорамной площадкой',
        locationSlug: 'vladimir-vodonapornaya-bashnya'
      },
      { name: 'Георгиевская улица', desc: 'Пешеходный «владимирский Арбат» с ремесленными двориками',
        locationSlug: 'vladimir-georgievskaya-ulitsa'
      },
    ],
    travel:
      "Из Москвы до Владимира удобнее и быстрее всего добираться на скоростных поездах «Ласточка» или «Экспресс» с Курского вокзала, время в пути составит всего 1 час 40 минут. Также между городами курсируют регулярные автобусы, а автомобилисты используют федеральную трассу М-7 «Волга». Город прекрасен в любое время года, но идеальным сезоном считается период с мая по сентябрь, когда комфортно осматривать белокаменные памятники XII века и гулять по пешеходной Георгиевской улице. Зимой Владимир привлекает туристов уютными рождественскими ярмарками и сказочной подсветкой Золотых ворот.",
    faq: [
    { q: "Далеко ли от Владимира находится знаменитый храм Покрова на Нерли?", a: "Шедевр древнерусского зодчества расположен в 12 км от города в поселке Боголюбово; от ж/д станции до храма нужно пройти пешком около 1,5 км по живописному лугу." },
    { q: "Можно ли зайти внутрь Золотых ворот?", a: "Да, внутри этой уникальной оборонительной арки XII века сегодня открыта военно-историческая экспозиция с масштабной диорамой штурма города Батыем." },
    { q: "Что привезти из Владимира в качестве сувенира?", a: "Популярностью пользуются традиционная владимирская вишня (в виде варенья или наливок), изделия из суздальской глины и местный печатный пряник." },
    ]
  },
  yaroslavl: {
    brief:
      'Официальная столица Золотого кольца - великолепный тысячелетний город на Волге, чей исторический центр целиком включен в список всемирного наследия ЮНЕСКО. Город уникальных изразцовых церквей XVII века, красивейшей Стрелки и старейшего драматического театра страны.',
    hookFact: 'А вы знали, что Ярославль - это родина первого в мире коммерческого синтетического каучука? Именно на местном заводе в 1932 году ученый Сергей Лебедев впервые в истории запустил массовое производство искусственной резины, полностью изменив мировую автоиндустрию.',
    mustSee: [
      { name: 'Ярославский кремль (Спасо-Преображенский монастырь)', desc: 'Древнее укреплённое ядро города, где было найдено «Слово о полку Игореве»',
        locationSlug: 'yaroslavl-yaroslavskiy-kreml-spaso-preobrazhenskiy-monastyr'
      },
      { name: 'Стрелка рек Волги и Которосли', desc: 'Место основания города с ландшафтными садами, светомузыкальными фонтанами и памятником тысячелетия',
        locationSlug: 'yaroslavl-strelka-rek-volgi-i-kotorosli'
      },
      { name: 'Волжская набережная', desc: 'Одна из красивейших прибрежных улиц на Волге с беседками-ротондами и старинными усадьбами',
        locationSlug: 'yaroslavl-volzhskaya-naberezhnaya'
      },
      { name: 'Церковь Ильи Пророка', desc: 'Шедевр русской архитектуры XVII века в самом центре города, знаменитый своими уникальными фресками',
        locationSlug: 'yaroslavl-tserkov-il-i-proroka'
      },
      { name: 'Губернаторский сад', desc: 'Уютный регулярный парк при усадьбе с выставкой современной скульптуры под открытым небом',
        locationSlug: 'yaroslavl-gubernatorskiy-sad'
      },
      { name: 'Ярославский художественный музей', desc: 'Крупнейшая галерея провинциальной России с богатой коллекцией икон и русского авангарда',
        venueSlug: 'yaroslavl-yaroslavskiy-hudozhestvennyy-muzey'
      },
    ],
    travel:
      "Из Москвы до Ярославля быстрее и удобнее всего добираться на фирменных дневных экспресс-поездах, которые доезжают до вокзала «Ярославль-Главный» ровно за 3 часа 20 минут. Также город соединен регулярными автобусными рейсами со всей центральной Россией, а автомобилисты едут по федеральной трассе М-8 «Холмогоры». Идеальный сезон для посещения столицы Золотого кольца — период навигации с конца мая по сентябрь, когда можно совместить осмотр уникальных старинных храмов с речными прогулками по Волге и променадом по знаменитой Стрелке. Зимние праздники — второй пик сезона благодаря сказочной рождественской атмосфере исторического центра.",
    faq: [
    { q: "Правда ли, что весь исторический центр Ярославля находится под защитой ЮНЕСКО?", a: "Да, центральная часть города с уникальной регулярной радиальной планировкой XVIII века и десятками старинных каменных храмов официально включена в список Всемирного наследия ЮНЕСКО." },
    { q: "Какие достопримечательности Ярославля запечатлены на тысячерублевой купюре?", a: "На банкноте изображены знаменитый памятник Ярославу Мудрому на площади Богоявления, часовня Казанской иконы Божией Матери на набережной и величественная церковь Иоанна Предтечи в Толчкове." },
    { q: "Где находится знаменитая Стрелка и как до нее дойти?", a: "Стрелка — это живописный мыс у слияния рек Волги и Которосли с масштабным партером фонтанов и памятником 1000-летию города; до нее можно дойти пешком, двигаясь по Которосльной или Волжской набережной от Кремля." },
    ]
  },
  ekaterinburg: {
    brief:
      'Дерзкая и харизматичная столица Урала на границе Европы и Азии. Город конструктивизма, стрит-арта, уральского рока и небоскребов у Городского пруда.',
    hookFact:
      'Знаете ли вы, что знаменитая американская Статуя Свободы в Нью-Йорке покрыта медью, которая была выплавлена на уральских заводах в окрестностях Екатеринбурга?',
    mustSee: EKB_MUST_SEE as CityMustSeeItem[],
    significantSuburbs: EKB_SUBURBS as CitySuburbItem[],
    dayRoutePresets: EKB_DAY_ROUTE_PRESETS as CityDayRoutePreset[],
    travel: EKB_TRAVEL,
    faq: EKB_FAQ,
  },
  'nizhny-novgorod': {
    brief:
      'Город, где Волга встречается с Окой, а древняя каменная крепость ни разу в истории не сдалась врагу. Здесь соединились дух купеческого прошлого, масштабная стрит-арт культура и современные закатные набережные',
    hookFact: 'Знаете ли вы, что местная Чкаловская лестница построена в виде математической восьмерки, а её 560 ступеней - это почти в три раза больше, чем на знаменитой Потемкинской лестнице в Одессе? Отсюда открывается один из лучших панорамных видов в европейской части России.',
    mustSee: [
      { name: 'Нижегородский Кремль', desc: 'Древняя кирпичная крепость с 13 башнями и прогулочной зоной прямо по крепостной стене',
        locationSlug: 'nizhny-novgorod-nizhegorodskiy-kreml'
      },
      { name: 'Чкаловская лестница', desc: 'Монументальная лестница в виде восьмёрки, спускающаяся от Кремля к самой Волге',
        locationSlug: 'nizhny-novgorod-chkalovskaya-lestnitsa'
      },
      { name: 'Большая Покровская улица', desc: 'Пешеходный маршрут через исторический центр с купеческой архитектурой и уличными театрами',
        locationSlug: 'nizhny-novgorod-bol-shaya-pokrovskaya-ulitsa'
      },
      { name: 'Нижегородская канатная дорога', desc: 'Воздушная переправа через Волгу до города Бор с живописными видами на речные просторы',
        locationSlug: 'nizhny-novgorod-nizhegorodskaya-kanatnaya-doroga'
      },
      { name: 'Стрелка рек Волги и Оки', desc: 'Место слияния двух великих рек, где расположены собор Александра Невского и современные пакгаузы',
        locationSlug: 'nizhny-novgorod-strelka-rek-volgi-i-oki'
      },
      { name: 'Набережная Фёдоровского', desc: 'Лучшая смотровая площадка города с благоустроенными террасами для встречи закатов',
        locationSlug: 'nizhny-novgorod-naberezhnaya-fedorovskogo'
      },
      { name: 'Нижегородская ярмарка', desc: 'Главный ярмарочный дом - символ купеческого Нижнего', locationSlug: 'nizhny-novgorod-nizhegorodskaya-yarmarka' },
      { name: 'Усадьба Рукавишниковых', desc: 'Купеческий дворец-музей на Верхне-Волжской', locationSlug: 'nizhny-novgorod-usadba-rukavishnikovyh' },
      { name: 'Государственный банк', desc: 'Сказочный терем неорусского стиля на Покровке', locationSlug: 'nizhny-novgorod-gosudarstvennyy-bank' },
      { name: 'Площадь Минина и Пожарского', desc: 'Сердце города у стен Кремля', locationSlug: 'nizhny-novgorod-ploschad-minina-i-pozharskogo' },
      { name: 'Палаты Строгановых', desc: 'Белокаменные купеческие палаты XVII века', locationSlug: 'nizhny-novgorod-palaty-stroganovyh' },
      { name: 'Ромодановский вокзал', desc: 'Возрожденный вокзал у Оки', locationSlug: 'nizhny-novgorod-romodanovskiy-vokzal' },
      { name: 'Площадь Лядова', desc: 'Исторический транспортный узел', locationSlug: 'nizhny-novgorod-ploschad-lyadova' },
      { name: 'Домик Петра I', desc: 'Палаты купца Чатыгина XVII века', locationSlug: 'nizhny-novgorod-domik-petra-i' },
      { name: 'Нижне-Волжская набережная', desc: 'Главный променад у воды', locationSlug: 'nizhny-novgorod-nizhne-volzhskaya-naberezhnaya' },
      { name: 'Верхне-Волжская набережная', desc: 'Аристократический променад над Волгой', locationSlug: 'nizhny-novgorod-verhne-volzhskaya-naberezhnaya' },
      { name: 'Рождественская улица', desc: 'Гастрономический и исторический квартал', locationSlug: 'nizhny-novgorod-rozhdestvenskaya-ulitsa' },
      { name: 'Парк «Швейцария»', desc: 'Самый большой зеленый парк города', locationSlug: 'nizhny-novgorod-park-shveytsariya' },
      { name: 'Сормовский парк', desc: 'Сосновый бор, аттракционы и озера', locationSlug: 'nizhny-novgorod-sormovskiy-park' },
      { name: 'Почаинский бульвар', desc: 'Тихий променад над оврагом', locationSlug: 'nizhny-novgorod-pochainskiy-bulvar' },
      { name: 'Александровский сад', desc: 'Исторический парк на склоне', locationSlug: 'nizhny-novgorod-aleksandrovskiy-sad' },
      { name: 'Пакгаузы на Стрелке', desc: 'Индустриальная архитектура и концертный зал', locationSlug: 'nizhny-novgorod-pakgauzy-na-strelke' },
      { name: 'Щёлоковский хутор', desc: 'Заповедный лес и три озера', locationSlug: 'nizhny-novgorod-schelokovskiy-hutor' },
      { name: 'Собор Александра Невского', desc: 'Грандиозный храм у слияния рек', locationSlug: 'nizhny-novgorod-sobor-aleksandra-nevskogo' },
      { name: 'Строгановская церковь', desc: 'Вершина русского барокко', locationSlug: 'nizhny-novgorod-stroganovskaya-tserkov' },
      { name: 'Печерский монастырь', desc: 'Древняя обитель с наклонной колокольней', locationSlug: 'nizhny-novgorod-pecherskiy-monastyr' },
      { name: 'Благовещенский монастырь', desc: 'Древнейшая обитель Поволжья', locationSlug: 'nizhny-novgorod-blagoveschenskiy-monastyr' },
      { name: 'Михайло-Архангельский собор', desc: 'Древнейший храм Кремля', locationSlug: 'nizhny-novgorod-mihailo-arhangelskiy-sobor' },
      { name: 'Староярмарочный собор', desc: 'Классический шедевр Монферрана', locationSlug: 'nizhny-novgorod-staroyarmarochnyy-sobor' },
      { name: 'Арсенал ГЦСИ', desc: 'Центр современного искусства в Кремле', venueSlug: 'nizhny-novgorod-arsenal-gtsisi' },
      { name: 'Музей истории ГАЗ', desc: 'Легендарные советские автомобили', venueSlug: 'nizhny-novgorod-muzey-istorii-gaz' },
      { name: 'Домик Каширина', desc: 'Музей детства Максима Горького', venueSlug: 'nizhny-novgorod-domik-kashirina' },
      { name: 'Технический музей', desc: 'Старинные инструменты и механизмы', venueSlug: 'nizhny-novgorod-tehnicheskiy-muzey' },
      { name: 'Русский музей фотографии', desc: 'Дагерротипы и история русской съемки', venueSlug: 'nizhny-novgorod-russkiy-muzey-fotografii' },
      { name: 'Памятник Жюлю Верну', desc: 'Писатель на воздушном шаре', locationSlug: 'nizhny-novgorod-pamyatnik-zhyulyu-vernu' },
      { name: 'Катер «Герой»', desc: 'Судно-памятник у Чкаловской лестницы', locationSlug: 'nizhny-novgorod-kater-geroy' },
      { name: 'Селёдка и Кофе', desc: 'Культовое кафе-бар на Рождественской', venueSlug: 'nizhny-novgorod-seledka-i-kofe' },
      { name: 'Безухов', desc: 'Литературное кафе с волжской кухней', venueSlug: 'nizhny-novgorod-bezuhov-cafe' },
      { name: 'Лепи Тесто', desc: 'Авторские пельмени на Покровке', venueSlug: 'nizhny-novgorod-lepi-testo' },
      { name: 'Yale', desc: 'Высокая кухня в усадьбе XIX века', venueSlug: 'nizhny-novgorod-yale-restaurant' },
      { name: 'Red Wall', desc: 'Гастрономия у подножия Кремля', venueSlug: 'nizhny-novgorod-red-wall-restaurant' },
      { name: 'Пяткинъ', desc: 'Купеческий обед в старинной усадьбе', venueSlug: 'nizhny-novgorod-pyatkin-traktir' },
      { name: 'Mitrich', desc: 'Стейкхаус премиум-класса', venueSlug: 'nizhny-novgorod-mitrich-restaurant' },
      { name: 'РИБС', desc: 'Стейки и волжская рыба на Семашко', venueSlug: 'nizhny-novgorod-ribs-restaurant' },
      { name: 'Медные Трубы', desc: 'Секретный камерный коктейльный бар на Суетинской', venueSlug: 'nizhny-novgorod-mednye-truby-bar' },
      { name: 'Юла Pizza', desc: 'Неаполитанская пицца во дворе Покровки', venueSlug: 'nizhny-novgorod-yula-pizza' },
      { name: 'Фонотека', desc: 'Арт-бар с винилом и уличным артом на Большой Покровской', venueSlug: 'nizhny-novgorod-fonoteca-bar' },
      {
        name: 'Стрит-арт в Кварталах',
        desc: 'Легальные муралы и секретные дворы у Грузинской - старт от «Лепи Тесто»',
        locationSlug: 'nizhny-novgorod-street-art-kvartaly',
        latitude: 56.320225,
        longitude: 43.993579,
      },
      {
        name: 'Шаверма на Средном',
        desc: 'Легендарный стритфуд Поволжья на Костиной, 13',
        locationSlug: 'nizhny-novgorod-shaverma-na-srednom',
        address: 'ул. Костина, 13',
        latitude: 56.309147,
        longitude: 43.991085,
      },
      {
        name: 'Вечерняя речная прогулка',
        desc: 'Теплоход от причалов Речного вокзала с видом на подсвеченный Кремль',
        locationSlug: 'nizhny-novgorod-rechnaya-progulka',
        latitude: 56.329694,
        longitude: 43.988173,
      },
    ],
    significantSuburbs: [
      {
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
          {
            name: 'Феодоровский монастырь',
            desc: 'действующая обитель - первая точка после автостанции',
            latitude: 56.6505,
            longitude: 43.4685
          },
          {
            name: 'Торговая площадь / центр',
            desc: 'историческое ядро с купеческими домами и лавками',
            latitude: 56.644,
            longitude: 43.472
          },
          {
            name: 'Музей городецкого пряника',
            desc: 'пряничная традиция и мастер-классы - старт музейного квартала',
            latitude: 56.6442,
            longitude: 43.4715
          },
          {
            name: 'Музей самоваров',
            desc: 'одна из лучших коллекций самоваров в России',
            latitude: 56.6455,
            longitude: 43.4735
          },
          {
            name: 'Музей городецкой росписи',
            desc: 'классическая роспись по дереву - промысел города',
            latitude: 56.6438,
            longitude: 43.4708
          },
          {
            name: 'Набережная Волги / Революции',
            desc: 'променад с видами на Волгу и купеческую застройку',
            latitude: 56.6465,
            longitude: 43.4755
          },
          {
            name: 'Детский музейный центр «Город мастеров»',
            desc: 'интерактив и ремёсла - финал у причала',
            latitude: 56.6445,
            longitude: 43.4728,
            transitTip: 'Финал у причала; такси ~5 мин обратно на автостанцию'
          },
        ]
      },
      {
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
          {
            name: 'Фабрика «Хохломская роспись»',
            desc: 'действующее производство с экскурсиями; сувениры рядом',
            latitude: 56.7875,
            longitude: 44.4955,
            transitTip: 'От вокзала короткое такси к фабрике'
          },
          {
            name: 'Хохломские ряды / сувениры',
            desc: 'лакированные изделия и посуда у фабрики',
            latitude: 56.789,
            longitude: 44.493,
            transitTip: 'Сувениры рядом с фабрикой - без отдельного рейса'
          },
          {
            name: 'Музейно-туристический центр «Золотая хохлома»',
            desc: 'главная экспозиция о промысле и росписи',
            latitude: 56.7895,
            longitude: 44.4925
          },
          {
            name: 'Исторический центр / пл. Ленина',
            desc: 'компактная прогулка по центру после музея',
            latitude: 56.7885,
            longitude: 44.491
          },
          {
            name: 'Парк Победы',
            desc: 'зелёная пауза перед возвратом к вокзалу',
            latitude: 56.7905,
            longitude: 44.4895
          },
        ]
      },
      {
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
          {
            name: 'Источник Серафима в Цыгановке',
            desc: 'дальний источник - купель и набор воды утром',
            latitude: 55.0525,
            longitude: 43.2355,
            transitTip: 'Такси ~15 км утром из Дивеева / от автостанции'
          },
          {
            name: 'Музей истории Дивеевской обители',
            desc: 'контекст монастыря и жизни Серафима Саровского',
            latitude: 55.0482,
            longitude: 43.2435,
            transitTip: 'Возврат в обитель - музей у входа / рядом с ансамблем'
          },
          {
            name: 'Троицкий собор',
            desc: 'главный храм с мощами преподобного Серафима Саровского',
            latitude: 55.0488,
            longitude: 43.2418
          },
          {
            name: 'Преображенский собор',
            desc: 'второй крупный собор ансамбля',
            latitude: 55.0492,
            longitude: 43.2425
          },
          {
            name: 'Благовещенский собор',
            desc: 'новый крупный храм ансамбля',
            latitude: 55.0495,
            longitude: 43.2408
          },
          {
            name: 'Канавка Божьей Матери',
            desc: 'святая канавка - обход во второй половине дня',
            latitude: 55.0475,
            longitude: 43.2405,
            transitTip: 'Вторая половина дня - обход Канавки; ближние источники у обители'
          },
        ]
      },
      {
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
          {
            name: 'Желтоводский Макариев монастырь / Троицкий собор',
            desc: 'укреплённый ансамбль и главный храм на берегу Волги',
            latitude: 56.0835,
            longitude: 45.0615,
            transitTip: 'Паром из Лыскова (~30 мин)'
          },
          {
            name: 'Крепостные стены / волжская смотровая',
            desc: 'оборонительный контур и вид на Волгу с берега',
            latitude: 56.0842,
            longitude: 45.0605
          },
          {
            name: 'Посёлок Макарьево',
            desc: 'тихий посад у стен - короткая прогулка после обители',
            latitude: 56.0825,
            longitude: 45.0635,
            transitTip: 'Страусиная ферма - бонус отдельным такси/авто'
          },
        ]
      },
    ],
    dayRoutePresets: [
      ...NIZHNY_NOVGOROD_LINE_DAY_ROUTE_PRESETS,
      {
        id: 'nn-one-day',
        title: 'Нижний за 1 день',
        description:
          'Классический пешеходный трек для первого визита: весь сок Нижнего от крепости до реки.',
        travelVector: 'Главный пешеходный променад',
        blogSlug: 'nizhny-novgorod-za-24-chasa',
        coverImageUrl: '/images/blog/nizhny-novgorod-za-24-chasa.jpg',
        stops: [
          {
            name: 'Площадь Минина и Пожарского',
            desc: 'Отправная точка и сердце города у стен крепости.',
            locationSlug: 'nizhny-novgorod-ploschad-minina-i-pozharskogo',
            latitude: 56.328393,
            longitude: 44.007966,
          },
          {
            name: 'Нижегородский Кремль',
            desc: 'Древняя цитадель и прогулка по боевому ходу стены с видами на Стрелку.',
            locationSlug: 'nizhny-novgorod-nizhegorodskiy-kreml',
            latitude: 56.328033,
            longitude: 44.002105,
          },
          {
            name: 'Чкаловская лестница',
            desc: 'Спуск по монументальной лестнице-восьмерке от памятника Чкалову к реке.',
            locationSlug: 'nizhny-novgorod-chkalovskaya-lestnitsa',
            latitude: 56.330467,
            longitude: 44.009438,
          },
          {
            name: 'Нижне-Волжская набережная',
            desc: 'Прогулка вдоль реки мимо катера «Герой» к подножию холмов.',
            locationSlug: 'nizhny-novgorod-nizhne-volzhskaya-naberezhnaya',
            latitude: 56.330441,
            longitude: 43.996112,
          },
          {
            name: 'Рождественская улица',
            desc: 'Купеческий променад со старинными лавками и Строгановской церковью.',
            locationSlug: 'nizhny-novgorod-rozhdestvenskaya-ulitsa',
            latitude: 56.330008,
            longitude: 43.9967,
          },
          {
            name: 'Литературное кафе «Безухов»',
            desc: 'Обед и отдых в культовом концептуальном кафе на Рождественской.',
            venueSlug: 'nizhny-novgorod-bezuhov-cafe',
            latitude: 56.329584,
            longitude: 43.99455,
          },
          {
            name: 'Нижегородская канатная дорога',
            desc: 'Финальная воздушная переправа на другой берег Волги за панорамным закатом.',
            locationSlug: 'nizhny-novgorod-nizhegorodskaya-kanatnaya-doroga',
            latitude: 56.324209,
            longitude: 44.038758,
            transitTip: 'От Рождественской - такси/метро к станции канатной дороги у Сенной',
          },
        ]
      },
      {
        id: 'nn-instagram',
        title: 'Инстаграмный Нижний',
        description:
          'Маршрут по самым фотогеничным легальным стрит-арт точкам и современным хайтек-пространствам.',
        travelVector: 'Современная культура и лучшие виды',
        blogSlug: 'instagramnyi-nizhnii',
        coverImageUrl: '/images/blog/instagramnyi-nizhnii.jpg',
        stops: [
          {
            name: 'Стрит-арт в Кварталах',
            desc: 'Старт от «Лепи Тесто» в глубь дворов с муралами у Грузинской.',
            locationSlug: 'nizhny-novgorod-street-art-kvartaly',
            latitude: 56.320225,
            longitude: 43.993579,
            transitTip: 'Старт у «Лепи Тесто» / ул. Грузинская',
          },
          {
            name: 'Арт-бар «Фонотека»',
            desc: 'Кофе на Большой Покровской в окружении винила и уличного арта.',
            venueSlug: 'nizhny-novgorod-fonoteca-bar',
            latitude: 56.319874,
            longitude: 43.996841,
          },
          {
            name: 'Почаинский бульвар',
            desc: 'Скрытая набережная над оврагом с ракурсом на Кремль без толп.',
            locationSlug: 'nizhny-novgorod-pochainskiy-bulvar',
            latitude: 56.326305,
            longitude: 43.997233,
          },
          {
            name: 'Нижегородская ярмарка',
            desc: 'Главный ярмарочный дом с монументальной имперской архитектурой.',
            locationSlug: 'nizhny-novgorod-nizhegorodskaya-yarmarka',
            latitude: 56.3275,
            longitude: 43.962222,
            transitTip: 'Через Канавинский мост на Стрелку / к Ярмарке',
          },
          {
            name: 'Пакгаузы на Стрелке',
            desc: 'Ажурные конструкции XIX века с зеркальными павильонами концертного зала.',
            locationSlug: 'nizhny-novgorod-pakgauzy-na-strelke',
            latitude: 56.334936,
            longitude: 43.974804,
          },
          {
            name: 'Набережная Федоровского',
            desc: 'Финал дня на амфитеатре для встречи главного заката страны.',
            locationSlug: 'nizhny-novgorod-naberezhnaya-fedorovskogo',
            latitude: 56.326887,
            longitude: 43.980644,
            transitTip: 'Обратно на высокий берег к закатному амфитеатру',
          },
        ]
      },
      {
        id: 'nn-history-gastro',
        title: 'Купеческий вкус',
        description:
          'Историко-гастрономический гайд: купеческая история, премиальные рестораны и культовый локальный стритфуд.',
        travelVector: 'История города через гастрономию',
        blogSlug: 'nizhny-novgorod-marshrut-so-vkusom',
        coverImageUrl: '/images/blog/nizhny-novgorod-marshrut-so-vkusom.jpg',
        stops: [
          {
            name: 'Площадь Лядова',
            desc: 'Исторический транспортный узел купеческого города - точка старта.',
            locationSlug: 'nizhny-novgorod-ploschad-lyadova',
            latitude: 56.309238,
            longitude: 43.98555,
          },
          {
            name: 'Шаверма на Средном',
            desc: 'Дегустация главного стритфуд-феномена Поволжья на Костиной, 13.',
            locationSlug: 'nizhny-novgorod-shaverma-na-srednom',
            address: 'ул. Костина, 13',
            latitude: 56.309147,
            longitude: 43.991085,
          },
          {
            name: 'Музей истории ГАЗ',
            desc: 'Индустриальное советское прошлое и коллекция ретро-автомобилей.',
            venueSlug: 'nizhny-novgorod-muzey-istorii-gaz',
            latitude: 56.251919,
            longitude: 43.890692,
            transitTip: 'Метро/такси на Автозавод к музею ГАЗ',
          },
          {
            name: 'Бар «Медные Трубы»',
            desc: 'Секретный титулованный бар на Суетинской за авторскими коктейлями.',
            venueSlug: 'nizhny-novgorod-mednye-truby-bar',
            latitude: 56.326102,
            longitude: 43.983115,
            transitTip: 'Возврат в центр к Суетинской',
          },
          {
            name: 'Mitrich / РИБС',
            desc: 'Ужин высокой волжской кухни: стейки и премиальная локальная рыба (Mitrich или РИБС на Семашко).',
            venueSlug: 'nizhny-novgorod-mitrich-restaurant',
            latitude: 56.324541,
            longitude: 44.020114,
          },
          {
            name: 'Вечерняя речная прогулка',
            desc: 'Финал на теплоходе от причалов Речного вокзала с видом на подсвеченный Кремль.',
            locationSlug: 'nizhny-novgorod-rechnaya-progulka',
            latitude: 56.329694,
            longitude: 43.988173,
            transitTip: 'Причалы у Речного вокзала / Нижне-Волжской',
          },
        ]
      },
      {
        id: 'nn-gorodets-day',
        title: 'День в Городце',
        description:
          'Сквозная линия: монастырь - Торговая - музейный квартал - Волга - «Город мастеров».',
        timingNote:
          'Выезд к 8:30-9:00 - дорога ~1,5 часа. Финал у причала; такси ~5 мин обратно на автостанцию.',
        travelVector: 'Автостанция - монастырь - музейный квартал - Волга',
        coverImageUrl: '/images/venues/nizhny-novgorod/gorodets.jpg',
        stops: [
          { name: 'Феодоровский монастырь', desc: 'Старт после автостанции'},
          { name: 'Торговая площадь / центр', desc: 'Историческое ядро'},
          { name: 'Музей городецкого пряника', desc: 'Пряничная традиция'},
          { name: 'Музей самоваров', desc: 'Коллекция самоваров'},
          { name: 'Музей городецкой росписи', desc: 'Промысел'},
          { name: 'Набережная Волги / Революции', desc: 'Променад'},
          {
            name: 'Детский музейный центр «Город мастеров»',
            desc: 'Финал у причала',
            transitTip: 'Финал у причала; такси ~5 мин на автостанцию'
          },
        ]
      },
      {
        id: 'nn-semenov-day',
        title: 'День в Семёнове',
        description: 'Вокзал - фабрика - МТЦ - центр - Парк Победы - вокзал.',
        timingNote:
          'Выезд к 8:30-9:00 - ~1,5-2 часа. Музей Шарыгина - бонус по пути к вокзалу.',
        travelVector: 'Вокзал - фабрика - центр - вокзал',
        coverImageUrl: '/images/venues/nizhny-novgorod/semyonov.jpg',
        stops: [
          {
            name: 'Фабрика «Хохломская роспись»',
            desc: 'Производство и сувениры рядом', transitTip: 'Короткое такси от вокзала'
          },
          { name: 'Музейно-туристический центр «Золотая хохлома»', desc: 'Экспозиция промысла'},
          { name: 'Исторический центр / пл. Ленина', desc: 'Центр города'},
          {
            name: 'Парк Победы',
            desc: 'Зелёная пауза'
          },
        ]
      },
      {
        id: 'nn-diveevo-day',
        title: 'Дивеево за день',
        description: 'Источник в Цыгановке утром - монастырь - Канавка после обеда.',
        timingNote:
          'Выезд не позже 7:00 - в пути 3+ часа. Цыгановка такси ~15 км утром; Канавка - вторая половина дня.',
        travelVector: 'Источники утром - монастырь - Канавка',
        coverImageUrl: '/images/venues/nizhny-novgorod/diveevo.jpg',
        stops: [
          {
            name: 'Источник Серафима в Цыгановке',
            desc: 'Утренний дальний источник',
            transitTip: 'Такси ~15 км утром'
          },
          { name: 'Музей истории Дивеевской обители', desc: 'Контекст обители', transitTip: 'Возврат в монастырь' },
          { name: 'Троицкий собор', desc: 'Мощи Серафима'},
          { name: 'Преображенский собор', desc: 'Второй собор'},
          { name: 'Благовещенский собор', desc: 'Новый храм ансамбля'},
          {
            name: 'Канавка Божьей Матери',
            desc: 'Обход после обеда',
            transitTip: 'Вторая половина дня; ближние источники у обители'
          },
        ]
      },
      {
        id: 'nn-makaryev-day',
        title: 'Макарьево за день',
        description: 'Паром из Лыскова - монастырь - стены/смотровая - посёлок.',
        timingNote:
          'Паром Лысково (~30 мин в навигацию). Страусиная ферма - бонус, если остаётся время.',
        travelVector: 'Лысково паром - монастырь - село',
        coverImageUrl: '/images/venues/nizhny-novgorod/makaryev.jpg',
        stops: [
          {
            name: 'Желтоводский Макариев монастырь / Троицкий собор',
            desc: 'Ансамбль на Волге',
            transitTip: 'Паром из Лыскова ~30 мин'
          },
          {
            name: 'Крепостные стены / волжская смотровая',
            desc: 'Стены и вид на Волгу'
          },
          {
            name: 'Посёлок Макарьево',
            desc: 'Посад у стен'
          },
        ]
      },

    ],
    travel:
      "Из Москвы в Нижний Новгород удобнее всего добираться на скоростных поездах «Ласточка» и «Сапсан», которые долетают до города всего за 3,5-4 часа. Международный аэропорт имени В. П. Чкалова принимает регулярные авиарейсы со всей России, а автопутешественники могут доехать по федеральной трассе М-7 или скоростной М-12. Идеальный туристический сезон длится с мая по сентябрь, когда город по праву подтверждает статус неофициальной «столицы закатов», а на набережных Волги и Оки кипит фестивальная жизнь. Новогодние праздники - второй пик сезона, когда старинная Большая Покровская улица превращается в сказочный светящийся коридор.",
    faq: [
    { q: "Правда ли, что Нижегородский кремль можно обойти целиком по стене?", a: "Да, это единственный кремль в России, у которого полностью сохранился и доступен для туристов сквозной круговой пешеходный маршрут по боевому ходу стены протяженностью более 2 километров." },
    { q: "Как работает знаменитая Нижегородская канатная дорога?", a: "Она связывает Нижний Новгород с городом-спутником Бор через Волгу, выполняя роль общественного транспорта, и одновременно служит популярным аттракционом с потрясающими панорамными видами." },
    { q: "Сколько ступеней на Чкаловской лестнице и сложно ли по ней подняться?", a: "Лестница насчитывает 560 ступеней, выполненных в виде гигантской восьмерки; неспешный подъем от набережной к памятнику Чкалову занимает около 10-15 минут и требует базовой физической формы." },
    ]
  },
  novosibirsk: {
    brief:
      'Неофициальная столица Сибири, стремительно выросшая посреди тайги до размеров третьего по величине мегаполиса страны. Город передовой науки, масштабной конструктивистской архитектуры и бьющей через край энергии.',
    hookFact:
      'А вы знали, что местный Новосибирский театр оперы и балета - самый большой театральный комплекс в России? Под его гигантским куполом мог бы полностью поместиться московский Большой театр вместе со всей прилегающей площадью.',
    mustSee: NOVOSIBIRSK_MUST_SEE as CityMustSeeItem[],
    significantSuburbs: NOVOSIBIRSK_SUBURBS as CitySuburbItem[],
    dayRoutePresets: NOVOSIBIRSK_DAY_ROUTE_PRESETS as CityDayRoutePreset[],
    travel: NOVOSIBIRSK_TRAVEL,
    faq: NOVOSIBIRSK_FAQ,
  },
  krasnoyarsk: {
    brief:
      'Могучий сибирский мегаполис на берегах Енисея в окружении Саян: мосты, фонтаны и тайга у жилых кварталов, а Столбы - место силы прямо у города.',
    hookFact:
      'Знаете ли вы, что виды Красноярска каждый день у вас в кошельке? Коммунальный мост, часовня Параскевы Пятницы и Красноярская ГЭС изображены на десятирублевой купюре.',
    mustSee: KRASNOYARSK_MUST_SEE as CityMustSeeItem[],
    significantSuburbs: KRASNOYARSK_SUBURBS as CitySuburbItem[],
    dayRoutePresets: KRASNOYARSK_DAY_ROUTE_PRESETS as CityDayRoutePreset[],
    travel: KRASNOYARSK_TRAVEL,
    faq: KRASNOYARSK_FAQ,
  },
  tula: {
    brief:
      'Древний и харизматичный город мастеров, который старше Москвы и по праву считается оружейной столицей России. Сегодня Тула переживает мощный культурный ренессанс: здесь старинный кремль соседствует с ультрасовременными набережными и стильными креативными кластерами.',
    hookFact: 'Знаете ли вы, что в Туле выпекают самый большой печатный пряник в мире? Местные кондитеры попали в Книгу рекордов, создав пряничного гиганта весом рекордные 143 килограмма и длиной почти три метра.',
    mustSee: [
      { name: 'Тульский Кремль', desc: 'Старинная каменная крепость XVI века в низине, полностью сохранившая свои стены и башни',
        locationSlug: 'tula-tul-skiy-kreml'
      },
      { name: 'Музей оружия («Шлем»)', desc: 'Ультрасовременное здание в виде богатырского шлема с богатейшей интерактивной экспозицией',
        venueSlug: 'tula-muzey-oruzhiya-shlem'
      },
      { name: 'Казанская набережная', desc: 'Благоустроенная пешеходная зона вдоль стен Кремля с мостиками, качелями и зонами отдыха',
        locationSlug: 'tula-kazanskaya-naberezhnaya'
      },
      { name: 'Творческий индустриальный кластер «Октава»', desc: 'Современное креативное пространство на территории действующего завода микрофонов',
        locationSlug: 'tula-tvorcheskiy-industrial-nyy-klaster-oktava'
      },
      { name: 'Музей «Тульский пряник»', desc: 'Небольшая уютная экспозиция об истории главного сладкого промысла города с дегустацией',
        venueSlug: 'tula-muzey-tul-skiy-pryanik'
      },
      { name: 'Музей-усадьба Л. Н. Толстого «Ясная Поляна»', desc: 'Родовое имение писателя с сохранившейся обстановкой, парками и прудами (в пригороде)',
        venueSlug: 'tula-muzey-usad-ba-l-n-tolstogo-yasnaya-polyana'
      },
    ],
    travel:
      "Из Москвы до Тулы удобнее и быстрее всего доезжать на скоростных поездах «Ласточка» с Курского вокзала, время в пути составит ровно 2 часа. Также между городами курсируют регулярные автобусы, а автомобилисты используют комфортную федеральную трассу М-2 «Крым». Город является идеальным направлением для поездок на выходные в любое время года. Идеальный сезон для масштабных прогулок по Казанской набережной и поездок в усадьбу Ясная Поляна — период с мая по сентябрь, а зимой Тула манит уютными огнями Кремля, горячим чаем из самоваров и новогодними ярмарками.",
    faq: [
    { q: "Нужно ли покупать билет для входа на территорию Тульского кремля?", a: "Вход на саму историческую территорию кремля абсолютно бесплатный и открыт до позднего вечера, билеты требуются только для подъема на стены и в музеи внутри башен." },
    { q: "Далеко ли от Тулы находится усадьба Льва Толстого «Ясная Поляна»?", a: "Родовое имение великого писателя расположено в 15 км к югу от города; туда от автовокзала Тулы регулярно ходят пригородные маршрутные такси №114 и №280 (ехать около 30 минут)." },
    { q: "Где в Туле купить настоящий печатный пряник, который не зачерствеет на следующий день?", a: "Покупать знаменитые сувенирные пряники лучше всего в фирменных магазинах фабрик «Ясная Поляна» или «Старая Тула» прямо в центре города, обращая внимание на дату производства." },
    ]
  },
  samara: {
    brief:
      'Мощный волжский мегаполис, пленяющий туристов бесконечным песчаным пляжем и самой длинной набережной в России. Город, где дух купеческого модерна встречается с космической индустрией, а Жигулёвские горы подступают прямо к противоположному берегу реки.',
    hookFact:
      'Знаете ли вы, что в Самаре находится самый глубокий из рассекреченных бункеров мира - Бункер Сталина? Он уходит под землю на 37 метров (высота 12-этажного дома), был построен в режиме строжайшей тайны за 9 месяцев и способен выдержать прямое попадание авиабомбы.',
    mustSee: SAMARA_MUST_SEE as CityMustSeeItem[],
    significantSuburbs: SAMARA_SUBURBS as CitySuburbItem[],
    dayRoutePresets: SAMARA_DAY_ROUTE_PRESETS as CityDayRoutePreset[],
    travel: SAMARA_TRAVEL,
    faq: SAMARA_FAQ,
  },
  omsk: {
    brief:
      'Крупный культурный и промышленный центр Западной Сибири, сохранивший монументальный дух сибирского модерна. Город с богатой драматической историей, бывший в годы Гражданской войны официальной «белой столицей» России.',
    hookFact: 'Знаете ли вы, что Федор Достоевский провел в Омском остроге четыре года каторги? Именно этот суровый сибирский опыт лег в основу его знаменитого романа «Записки из Мертвого дома», полностью изменив писателя.',
    mustSee: [
      { name: 'Омская крепость', desc: 'Историко-культурный комплекс на месте основания города, где отбывал каторгу Фёдор Достоевский',
        locationSlug: 'omsk-omskaya-krepost'
      },
      { name: 'Улица Чокана Валиханова', desc: 'Современный технологичный пешеходный бульвар со стеклянными кристаллами-информационными киосками',
        locationSlug: 'omsk-ulitsa-chokana-valihanova'
      },
      { name: 'Любинский проспект (улица Ленина)', desc: 'Архитектурная жемчужина Сибири с цельным ансамблем купеческих зданий конца XIX века',
        locationSlug: 'omsk-lyubinskiy-prospekt-ulitsa-lenina'
      },
      { name: 'Памятник «Слесарь Степаныч»', desc: 'Один из самых известных сантехнических памятников в мире, выглядывающий из люка',
        locationSlug: 'omsk-pamyatnik-slesar-stepanych'
      },
      { name: 'Успенский кафедральный собор', desc: 'Величественный пятиглавый храм в самом центре города, входящий в число главных святынь Сибири',
        locationSlug: 'omsk-uspenskiy-kafedral-nyy-sobor'
      },
      { name: 'Иртышская набережная', desc: 'Длинная прогулочная зона вдоль могучей реки, популярное место для пробежек и закатов',
        locationSlug: 'omsk-irtyshskaya-naberezhnaya'
      },
    ],
    travel:
      "В международный аэропорт Омск-Центральный имени Д. М. Карбышева выполняются регулярные прямые рейсы из Москвы (время в полете — около 3,5 часов), Санкт-Петербурга и крупных сибирских городов. Через город проходит Транссибирская магистраль, обеспечивая плотное ж/д сообщение, а автомобилисты используют федеральные трассы Р-254 и Р-402. Идеальный сезон для визита — лето (с июня по август): Омск официально признан одним из самых солнечных городов России, и в это время здесь максимально комфортно гулять по Любинскому проспекту и Иртышской набережной. Май и сентябрь также хороши для экскурсий благодаря мягкой и сухой погоде.",
    faq: [
    { q: "Где в Омске находится знаменитый памятник «Степаныч»?", a: "Бронзовая скульптура сантехника, добродушно выглядывающего из канализационного люка, расположена на Любинском проспекте (улица Ленина) и является неофициальным символом города." },
    { q: "Связана ли история Омска с писателем Федором Достоевским?", a: "Да, великий писатель провел в Омском остроге четыре года каторги; сегодня в городе открыт Литературный музей его имени, а на месте крепости сохранились подлинные Тобольские ворота." },
    { q: "Правда ли, что в Омске есть метро из одной станции?", a: "Официально омский метрополитен так и не был запущен, но построенная подземная станция «Библиотека имени Пушкина» сейчас работает как пешеходный переход и является популярным городским арт-объектом." },
    ]
  },
  ufa: {
    brief:
      'Просторная, зеленая и холмистая столица Башкортостана, раскинувшаяся на полуострове между тремя крупными реками. Город мощной национальной культуры, знаменитого башкирского меда, рока, современных театров и грандиозных панорам Урала.',
    hookFact: 'Знаете ли вы, что уфимский памятник Салавату Юлаеву - это самая большая конная статуя в России и всей Европе? Этот уникальный 10-метровый бронзовый всадник весом 40 тонн уникален тем, что имеет всего три опорные точки на скале, нависающей над рекой Белой.',
    mustSee: [
      { name: 'Памятник Салавату Юлаеву', desc: 'Самая большая конная статуя в России, возвышающаяся на скалистом берегу реки Белой',
        locationSlug: 'ufa-pamyatnik-salavatu-yulaevu'
      },
      { name: 'Мечеть-медресе «Ляля-Тюльпан»', desc: 'Визитная карточка города, современный исламский центр с минаретами в виде бутонов тюльпанов',
        locationSlug: 'ufa-mechet-medrese-lyalya-tyul-pan'
      },
      { name: 'Фонтан «Семь девушек»', desc: 'Изящный музыкальный фонтан в Театральном сквере, созданный по мотивам башкирской легенды',
        locationSlug: 'ufa-fontan-sem-devushek'
      },
      { name: 'Арт-Квадрат', desc: 'Оживлённый городской творческий кластер в историческом центре с галереями, кафе и стрит-артом',
        locationSlug: 'ufa-art-kvadrat'
      },
      { name: 'Гостиный двор', desc: 'Отреставрированный торговый комплекс XIX века, исторический и общественный центр Уфы',
        locationSlug: 'ufa-gostinyy-dvor'
      },
      { name: 'Монумент Дружбы', desc: 'Величественная стела на холме, заложенная в честь 400-летия добровольного вхождения Башкирии в состав России',
        locationSlug: 'ufa-monument-druzhby'
      },
    ],
    travel:
      "Крупнейший международный аэропорт Уфы имени Мустая Карима принимает десятки ежедневных прямых рейсов из Москвы (всего 2 часа в воздухе), Санкт-Петербурга и курортных регионов. Уфа также является важным железнодорожным узлом на историческом ходу Транссиба, а автомобилисты используют федеральные трассы М-5 «Урал» и М-7 «Волга». Идеальный сезон для визита — лето (с июня по август), когда столица Башкирии буквально утопает в зелени липовых аллей, работают светомузыкальные фонтаны и комфортно осматривать панорамы реки Белой. Май и сентябрь также хороши для познавательного туризма без летней жары.",
    faq: [
    { q: "Где находится знаменитый памятник Салавату Юлаеву?", a: "Самая большая конная статуя в России установлена на высоком утесе над рекой Белой на площади имени Салавата Юлаева и является главной визитной карточкой города." },
    { q: "Что такое уфимская куница и где её искать?", a: "Куница — исторический символ города, изображенный на гербе Уфы; забавный бронзовый арт-объект «Дом куницы» установлен на площади перед Гостиным двором." },
    { q: "Какой башкирский мед самый лучший и где его купить?", a: "Самым ценным считается дикий бортевой мед (бурзянский капский); покупать сладкий сувенир рекомендуется в специализированных фирменных магазинах «Башкирская пасека» или «Мед Башкирии»." },
    ]
  },
  'veliky-novgorod': {
    brief:
      'Настоящая колыбель русской демократии и один из старейших городов страны. Здесь оживают древние былины, а на берегах седого Волхова стоят храмы, которые видели зарождение Руси и помнят вечевые колокола.',
    hookFact: 'Знаете ли вы, что Великий Новгород - единственный город древней Руси, который вообще не пострадал от монголо-татарского нашествия? Благодаря этому здесь полностью уцелела уникальная домонгольская архитектура XI века.',
    mustSee: [
      { name: 'Новгородский Детинец (Кремль)', desc: 'Один из старейших кремлей России, полностью сложенный из красного кирпича на берегу Волхова',
        locationSlug: 'veliky-novgorod-novgorodskiy-detinets-kreml'
      },
      { name: 'Памятник «Тысячелетие России»', desc: 'Монументальный бронзовый памятник в Кремле, на котором отлиты 129 главных фигур русской истории',
        locationSlug: 'veliky-novgorod-pamyatnik-tysyacheletie-rossii'
      },
      { name: 'Софийский собор', desc: 'Древнейший сохранившийся славянский храм на территории России, построенный в XI веке',
        locationSlug: 'veliky-novgorod-sofiyskiy-sobor'
      },
      { name: 'Ярославово Дворище', desc: 'Исторический торговый квартал на противоположном берегу от Кремля с уникальной высокой концентрацией старинных церквей',
        locationSlug: 'veliky-novgorod-yaroslavovo-dvorische'
      },
      { name: 'Музей деревянного зодчества «Витославлицы»', desc: 'Масштабный этнографический парк под открытым небом с избами, церквями и мельницами',
        locationSlug: 'veliky-novgorod-muzey-derevyannogo-zodchestva-vitoslavlitsy'
      },
      { name: 'Рюриково Городище', desc: 'Археологический памятник на истоке Волхова, бывшая резиденция первых новгородских князей',
        locationSlug: 'veliky-novgorod-ryurikovo-gorodische'
      },
    ],
    travel:
      "Прямого авиасообщения в городе нет, поэтому туристы прилетают в Санкт-Петербург, откуда до Новгорода всего за 2,5–3 часа доезжает скоростная «Ласточка». Из Москвы ходит комфортный ночной поезд (около 8 часов в пути), а автомобилисты могут быстро доехать по платной трассе М-11 «Нева». Лучший сезон для поездки — период с мая по сентябрь, когда можно с комфортом гулять по Кремлевскому парку, кататься на теплоходе по реке Волхов и осматривать древние монастыри. Золотая осень в октябре также невероятно идет старинным белокаменным храмам.",
    faq: [
    { q: "Где находится Ярославово Дворище относительно Кремля?", a: "Оно расположено прямо напротив Кремля, на противоположном (Торговом) берегу Волхова, соединенном пешеходным Горбатым мостом." },
    { q: "Правда ли, что новгородская София — старейший храм России?", a: "Да, Софийский собор, построенный в середине XI века, официально признан самым древним из сохранившихся славянских храмов на территории РФ." },
    { q: "Какое фирменное блюдо стоит попробовать?", a: "Обязательно отведайте новгородские серые щи (крошево), запеченного ильменского судака и аутентичный местный мёд-ставлень." },
    ]
  },
  tver: {
    brief:
      'Старинный город на Волге, расположенный на главном историческом тракте между Москвой и Петербургом. Город роскошной трехлучевой планировки улиц, Императорского путевого дворца и богатейшего купеческого прошлого, веками соперничавший с Москвой за право быть столицей.',
    hookFact: 'Знаете ли вы, что именно тверской купец Афанасий Никитин совершил свое легендарное «хождение за три моря» и открыл для европейцев Индию за 25 лет до того, как туда доплыл знаменитый португальский мореплаватель Васко да Гама?',
    mustSee: [
      { name: 'Императорский путевой дворец', desc: 'Роскошное барочное здание XVIII века, построенное для отдыха Екатерины II по пути из Петербурга в Москву',
        locationSlug: 'tver-imperatorskiy-putevoy-dvorets'
      },
      { name: 'Староволжский мост', desc: 'Визитная карточка города, ажурный консольный мост через Волгу, напоминающий мосты Будапешта',
        locationSlug: 'tver-starovolzhskiy-most'
      },
      { name: 'Набережная Степана Разина', desc: 'Парадный фасад города, застроенный по принципу «единой фасады» в стиле петербургской архитектуры',
        locationSlug: 'tver-naberezhnaya-stepana-razina'
      },
      { name: 'Памятник Афанасию Никитину', desc: 'Монумент знаменитому тверскому купцу-путешественнику, открывшему Индию задолго до Васко да Гамы',
        locationSlug: 'tver-pamyatnik-afanasiyu-nikitinu'
      },
      { name: 'Памятник Михаилу Кругу', desc: 'Бронзовая скульптура знаменитого шансонье, сидящего с гитарой на скамейке на бульваре Радищева',
        locationSlug: 'tver-pamyatnik-mihailu-krugu'
      },
      { name: 'Морозовский городок (Двор Пролетарки)', desc: 'Уникальный исторический комплекс фабричной краснокирпичной архитектуры рубежа XIX–XX веков',
        locationSlug: 'tver-morozovskiy-gorodok-dvor-proletarki'
      },
    ],
    travel:
      "Тверь расположена на главной транспортной артерии между двух столиц, поэтому быстрее всего сюда добираться из Москвы на скоростных поездах «Ласточка» (всего 1 час 40 минут в пути). Автомобилисты могут доехать по бесплатной трассе М-10 или скоростной М-11 «Нева» за 1,5–2 часа. Лучшее время для туристической поездки — с конца мая по начало сентября, когда по Волге ходят прогулочные теплоходы, работают фонтаны на Тверской площади и комфортно осматривать Императорский путевой дворец. Золотая осень в октябре также невероятно украшает набережную Афанасия Никитина.",
    faq: [
    { q: "Правда ли, что Тверь застраивали по принципу Санкт-Петербурга?", a: "Да, после грандиозного пожара XVIII века по указу Екатерины II город получил уникальную радиально-лучевую планировку («трезубец»), копирующую застройку парадного Петербурга." },
    { q: "Где находится знаменитый памятник Михаилу Кругу?", a: "Бронзовый монумент известному шансонье, родившемуся в Твери, установлен на скамейке в самом центре города на бульваре Радищева и является культовым местом у его поклонников." },
    { q: "Как попасть на экскурсию в Императорский путевой дворец?", a: "Грандиозный дворцово-парковый комплекс расположен на Советской улице; внутри работает Тверская картинная галерея, билеты в которую можно приобрести прямо в кассе дворца." },
    ]
  },
  krasnodar: {
    brief:
      'Бурлящая, залитая солнцем южная столица России с неповторимым кубанским колоритом, ароматом кофе и цветущих каштанов. Город, где казачья история пересекается с ультрасовременной гастрономией и лучшими парками страны.',
    hookFact:
      'Знаете ли вы, что краснодарский Парк Галицкого признан одним из лучших современных парков в Европе? Его ландшафтная архитектура и уникальные арт-объекты спроектированы немецким бюро, создававшим стадионы для чемпионатов мира.',
    mustSee: KRASNODAR_MUST_SEE as CityMustSeeItem[],
    significantSuburbs: KRASNODAR_SUBURBS as CitySuburbItem[],
    dayRoutePresets: KRASNODAR_DAY_ROUTE_PRESETS as CityDayRoutePreset[],
    travel: KRASNODAR_TRAVEL,
    faq: KRASNODAR_FAQ,
  },
  sochi: {
    brief:
      'Главный курортный локомотив страны, где субтропические пальмы и теплое Черное море соседствуют с заснеженными вершинами Кавказских гор. Город олимпийского триумфа, грандиозных развлечений, сочных хачапури и вечного лета.',
    hookFact: 'А вы знали, что Сочи - это самый длинный город в России и второй по длине в мире после Мехико? Он растянулся вдоль береговой линии Черного моря на рекордные 145 километров, вмещая в себя четыре огромных курортных района.',
    mustSee: [
      { name: 'Парк «Ривьера»', desc: 'Старейший курортный парк с вековыми платанами, розарием, аттракционами и дельфинарием',
        locationSlug: 'sochi-park-riv-era'
      },
      { name: 'Морской вокзал Сочи', desc: 'Шедевр сталинского ампира со шпилем, главная прогулочная зона у причалов с яхтами',
        locationSlug: 'sochi-morskoy-vokzal-sochi'
      },
      { name: 'Олимпийский парк', desc: 'Грандиозный комплекс прибрежного кластера Игр-2014 с поющим фонтаном в Сириусе',
        locationSlug: 'sochi-olimpiyskiy-park'
      },
      { name: 'Курорт Роза Хутор', desc: 'Горнолыжный и туристический комплекс в горах Красной Поляны с канатной дорогой до пика Роза',
        locationSlug: 'sochi-kurort-roza-hutor'
      },
      { name: 'Тисо-самшитовая роща', desc: 'Реликтовый первобытный лес с карстовыми каньонами и древними растениями в Хосте',
        locationSlug: 'sochi-tiso-samshitovaya-roscha'
      },
      { name: 'Дендрарий', desc: 'Уникальное собрание субтропической флоры и фауны на склоне горы с канатной дорогой',
        locationSlug: 'sochi-dendrariy'
      },
    ],
    travel:
      "Международный аэропорт Сочи имени В. И. Севастьянова (в Адлере) является главным действующим авиахабом юга России, принимающим сотни рейсов ежедневно. Также в город ходят регулярные фирменные поезда и скоростные «Ласточки», а автомобилисты едут по трассе М-4 «Дон» с выездом на живописный, но сложный горный серпантин А-147. Сочи — круглогодичный курорт: пляжный и экскурсионный сезон длится с июня по октябрь, а любители горнолыжного спорта оккупируют склоны Красной Поляны и Розы Хутор в период с конца декабря по апрель.",
    faq: [
    { q: "Далеко ли от центра Сочи находится Олимпийский парк?", a: "Олимпийский парк и трасса Формулы-1 расположены в Адлерском районе (Имеретинская низменность) примерно в 30 км от центра; быстрее всего туда доехать на скоростной «Ласточке» за 40 минут." },
    { q: "Где в городе увидеть уникальные субтропические растения?", a: "Главной зеленой сокровищницей Сочи является знаменитый парк «Дендрарий», где на огромной территории собраны тысячи редких экзотических растений со всего мира и работает канатная дорога." },
    { q: "Как подняться на смотровую башню горы Ахун?", a: "На самую высокую точку прибрежной части Сочи можно доехать на автомобиле, такси или в составе экскурсионных групп по извилистому шоссе; пешком подниматься от подножия слишком долго и тяжело." },
    ]
  },
  tyumen: {
    brief:
      'Гордая и богатая «столица Сибири», ставшая первым русским городом за Уральским хребтом. Сегодня это мегаполис с невероятным уровнем благоустройства, уникальной четырехъярусной набережной и знаменитыми на всю страну горячими термальными источниками.',
    hookFact: 'А вы знали, что в годы Великой Отечественной войны Тюмень стала самым секретным городом СССР? Именно сюда, в здание местной сельскохозяйственной академии, в обстановке строжайшей тайны было эвакуировано забальзамированное тело В. И. Ленина, которое охраняли лучшие ученые страны.',
    mustSee: [
      { name: 'Четырёхуровневая набережная', desc: 'Единственная в России многоуровневая гранитная набережная, главный символ современной Тюмени',
        locationSlug: 'tyumen-chetyrehurovnevaya-naberezhnaya'
      },
      { name: 'Мост Влюблённых', desc: 'Изящный вантовый пешеходный мост через реку Туру, ярко подсвечиваемый по вечерам',
        locationSlug: 'tyumen-most-vlyublennyh'
      },
      { name: 'Пешеходная улица Дзержинского', desc: 'Старинный квартал в центре, превращённый в уютный променад с деревянным зодчеством и ремесленниками',
        locationSlug: 'tyumen-peshehodnaya-ulitsa-dzerzhinskogo'
      },
      { name: 'Термальные источники', desc: 'Многочисленные загородные базы отдыха с открытыми бассейнами с горячей минеральной водой',
        locationSlug: 'tyumen-termal-nye-istochniki'
      },
      { name: 'Сквер сибирских кошек', desc: 'Небольшой сквер с золочеными тумбами-скульптурами кошек, спасших после блокады Эрмитаж от крыс',
        locationSlug: 'tyumen-skver-sibirskih-koshek'
      },
      { name: 'Знаменский кафедральный собор', desc: 'Яркий памятник сибирского барокко с необычной ярусной архитектурой',
        locationSlug: 'tyumen-znamenskiy-kafedral-nyy-sobor'
      },
    ],
    travel:
      "Международный аэропорт Рощино имени Д. И. Менделеева принимает десятки ежедневных прямых рейсов из Москвы (всего 2,5 часа в полете), Санкт-Петербурга и городов Севера. Тюмень также является крупным узлом Транссибирской магистрали, обеспечивая отличное ж/д сообщение со всей страной. Самый популярный сезон для посещения столицы термальных курортов — поздняя осень и зима (с ноября по март), когда купание в горячих минеральных источниках под открытым небом среди заснеженной тайги приносит максимум удовольствия. Лето (июнь–август) прекрасно подходит для классических экскурсий по четырехуровневой набережной.",
    faq: [
    { q: "Правда ли, что Тюменская набережная — единственная четырехъярусная в России?", a: "Да, это уникальное масштабное инженерное сооружение на берегу реки Туры, аналогов которому по высоте и количеству гранитных уровней со скульптурами в стране нет." },
    { q: "Где в Тюмени находятся знаменитые горячие источники?", a: "В черте города и ближайшем пригороде открыто более десятка современных благоустроенных термальных комплексов (например, «ЛетоЛето», «Верхний Бор», «Волна»), до которых можно доехать на городском автобусе или такси." },
    { q: "Что за необычный Сквер сибирских кошек открыт в центре?", a: "Это уютный сквер на улице Первомайской, где на пилонах установлены золоченые скульптуры кошек в память о тюменских мурлыках, которых после блокады отправили поездом для спасения залов Эрмитажа в Ленинграде от крыс." },
    ]
  },
  voronezh: {
    brief:
      'Крупный и динамичный мегаполис Черноземья, официально признанный родиной регулярного военно-морского флота России. Город студенческой энергии, современных театров, живописного водохранилища и удивительных арт-объектов.',
    hookFact: 'А вы знали, что именно в сухопутном Воронеже по приказу Петра I был построен и спущен на воду первый российский линейный корабль «Гото Предестинация»? Его точную копию сейчас можно посетить на городской набережной.',
    mustSee: [
      { name: 'Адмиралтейская площадь', desc: 'Место на берегу водохранилища, где зарождался регулярный военно-морской флот России',
        locationSlug: 'voronezh-admiralteyskaya-ploschad'
      },
      { name: 'Корабль-музей «Гото Предестинация»', desc: 'Точная действующая копия первого российского линейного корабля времён Петра I',
        venueSlug: 'voronezh-korabl-muzey-goto-predestinatsiya'
      },
      { name: 'Проспект Революции', desc: 'Главная историческая улица города с красивой архитектурой, театрами и ресторанами',
        locationSlug: 'voronezh-prospekt-revolyutsii'
      },
      { name: 'Памятник Белому Биму', desc: 'Трогательный бронзовый монумент знаменитой литературной собаке у театра кукол «Шут»',
        locationSlug: 'voronezh-pamyatnik-belomu-bimu'
      },
      { name: 'Дивногорье', desc: 'Уникальный природный музей-заповедник с меловыми столбами-дивами и пещерными храмами (в области)',
        locationSlug: 'voronezh-divnogor-e'
      },
      { name: 'Парк «Алые паруса»', desc: 'Благоустроенный сосновый парк на берегу с пляжной зоной и отличными видами на воду',
        locationSlug: 'voronezh-park-alye-parusa'
      },
    ],
    travel:
      "В связи с временным закрытием местного аэропорта основным способом передвижения стали комфортабельные двухэтажные поезда и экспрессы, которые доезжают из Москвы всего за 5–6 часов. На личном автомобиле путь займет около 6 часов по отличной скоростной платной трассе М-4 «Дон». Лучшее время для путешествия в Воронеж — с мая по сентябрь, когда на Воронежском водохранилище бьют фонтаны, открыта для посещений копия корабля «Гото Предестинация» и комфортно гулять по зеленым холмистым улицам центра.",
    faq: [
    { q: "Где в городе сидит знаменитый Котёнок с улицы Лизюкова?", a: "Бронзовый памятник герою известного советского мультфильма установлен на одноименной улице Лизюкова, прямо напротив кинотеатра «Мир»." },
    { q: "Правда ли, что Воронеж — родина русского военно-морского флота?", a: "Да, именно здесь на местных верфях в конце XVII века Петр I начал масштабное строительство первых регулярных боевых кораблей для Азовских походов." },
    { q: "Как добраться из Воронежа до замка принцессы Ольденбургской?", a: "Уникальный краснокирпичный замок в викторианском стиле расположен в поселке Рамонь в 40 км от города, туда регулярно ходят пригородные автобусы от Центрального автовокзала." },
    ]
  },
  'rostov-na-donu': {
    brief:
      'Харизматичная, шумная и невероятно колоритная южная столица, ласково именуемая «Ростовом-папой». Город купцов, донских раков, казачьей воли, залитых солнцем набережных и потрясающих гастрономических рынков.',
    hookFact: 'Знаете ли вы, что ростовский Театр драмы имени Горького построен в виде гигантского трактора? Это шедевр мирового конструктивизма, макет которого до сих пор хранится в Британском музее в Лондоне как эталон авангарда.',
    mustSee: [
      { name: 'Набережная реки Дон (Береговая улица)', desc: 'Оживлённое сердце Ростова с памятниками героям шолоховских книг и речными причалами',
        locationSlug: 'rostov-na-donu-naberezhnaya-reki-don-beregovaya-ulitsa'
      },
      { name: 'Большая Садовая улица', desc: 'Главная улица города, украшенная парадными старинными зданиями и купеческими особняками',
        locationSlug: 'rostov-na-donu-bol-shaya-sadovaya-ulitsa'
      },
      { name: 'Театральная площадь', desc: 'Центральная площадь, где находится Театр драмы им. Горького, построенный в виде трактора',
        venueSlug: 'rostov-na-donu-teatral-naya-ploschad'
      },
      { name: 'Парамоновские склады', desc: 'Живописные руины купеческих складов XIX века с бьющими из-под земли природными родниками',
        locationSlug: 'rostov-na-donu-paramonovskie-sklady'
      },
      { name: 'Парк Революции', desc: 'Популярный парк отдыха с колесом обозрения «Одно небо» и вольерами со стаями розовых фламинго',
        locationSlug: 'rostov-na-donu-park-revolyutsii'
      },
      { name: 'Центральный рынок (Старый базар)', desc: 'Колоритное гастрономическое место, где можно прочувствовать дух и вкусы южного города',
        locationSlug: 'rostov-na-donu-tsentral-nyy-rynok-staryy-bazar'
      },
    ],
    travel:
      "В связи с временным закрытием ростовского аэропорта Платов, основными транспортными артериями стали железная дорога и федеральная автотрасса М-4 «Дон». Из Москвы сюда ежедневно курсируют десятки поездов, включая скоростные двухэтажные составы, которые доезжают до станции «Ростов-Главный» за 15–18 часов. Лучшее время для посещения южной столицы — весна (апрель–май) и бархатная осень (сентябрь–октябрь), когда город благоухает, а температура идеальна для долгих прогулок и речных круизов по Дону. Летние месяцы могут быть слишком знойными для экскурсий под открытым небом.",
    faq: [
    { q: "Почему Ростов-на-Дону называют «портом пяти морей»?", a: "Благодаря развитой системе рек и каналов из городского порта речные суда имеют прямой водный выход к Азовскому, Черному, Каспийскому, Балтийскому и Белому морям." },
    { q: "Где в городе попробовать настоящие донские раки?", a: "Самые свежие раки, сваренные по старинным казачьим рецептам, подают в многочисленных ресторанах на левом берегу Дона (Левбердон) и на знаменитом Центральном рынке (Старый базар)." },
    { q: "Как устроен знаменитый ростовский подземный переход с мозаиками?", a: "На пересечении Большой Садовой улицы и Будённовского проспекта стены подземных переходов украшены уникальными панно из обычной советской кафельной плитки, детально изображающими жизнь донских казаков и сюжеты Шолохова." },
    ]
  },
  vladivostok: {
    brief:
      'Экспрессивная тихоокеанская столица России, расположенная на живописных сопках у Японского моря. Город гигантских вантовых мостов, морских деликатесов, праворульных машин и незабываемых романтичных туманов.',
    hookFact: 'А вы знали, что Владивосток находится на той же географической широте, что и курортный Сочи, но из-за холодного дыхания океана здесь можно за один день застать и тропический ливень, и плотный морской туман?',
    mustSee: [
      { name: 'Русский мост', desc: 'Самый длинный вантовый мост в мире - символ города',
        locationSlug: 'vladivostok-russkiy-most'
      },
      { name: 'Океанариум', desc: 'Крупнейший океанариум страны с туннелем среди акул',
        locationSlug: 'vladivostok-okeanarium'
      },
      { name: 'Остров Русский', desc: 'Остров с фортами, пляжами и панорамами залива',
        locationSlug: 'vladivostok-ostrov-russkiy'
      },
      { name: 'Маяк на Токаревской кошке', desc: 'Живописный мыс с видом на залив и мосты',
        locationSlug: 'vladivostok-mayak-na-tokarevskoy-koshke'
      },
      { name: 'Набережная Цесаревича', desc: 'Прогулочная зона с морским бризом и ресторанами',
        locationSlug: 'vladivostok-naberezhnaya-tsesarevicha'
      },
      { name: 'Фуникулёр и Орлиная сопка', desc: 'Короткий подъём на лучшую смотровую над бухтой Золотой Рог',
        locationSlug: 'vladivostok-funikulyor'
      },
    ],
    travel:
      "Прямой перелет из Москвы в международный аэропорт Кневичи занимает около 8–9 часов, также город является конечной точкой легендарной Транссибирской магистрали. Лучший и самый предсказуемый сезон для поездки — август, сентябрь и первая половина октября: в это время море максимально прогревается, уходят летние затяжные туманы и тайга вспыхивает яркими красками. Июнь и июль часто бывают дождливыми и пасмурными из-за муссонов. Зима здесь солнечная, но ветреная и очень морозная по ощущениям.",
    faq: [
    { q: "Нужен ли пропуск для посещения острова Русский?", a: "Нет, после открытия знаменитого Русского моста остров стал общедоступным районом города, куда ходят обычные городские автобусы." },
    { q: "Где во Владивостоке попробовать недорогие морепродукты?", a: "Свежих крабов, гребешков и креветок можно выгодно купить на Спортивной набережной или заказать в многочисленных кафе китайской и корейской кухни." },
    { q: "Как работает знаменитый владивостокский фуникулер?", a: "Он расположен на склоне Орлиной сопки, связывает улицу Суханова с Пушкинской и позволяет быстро подняться на лучшую смотровую площадку города." },
    ]
  },
  vologda: {
    brief:
      'Уютная душа Русского Севера, славящаяся своими резными палисадами, вологодским маслом и тончайшим кружевом. Город, где время словно замедлило свой ход среди старинных деревянных усадеб и величественных кремлевских стен.',
    hookFact: 'Знаете ли вы, что Иван Грозный планировал сделать Вологду столицей опричнины и всей Руси? Легенда гласит, что царь передумал из-за упавшего ему на голову кирпича в строящемся Софийском соборе.',
    mustSee: [
      { name: 'Вологодский кремль (Архиерейский двор)', desc: 'Мощный историко-архитектурный комплекс с величественным Софийским собором',
        locationSlug: 'vologda-vologodskiy-kreml-arhiereyskiy-dvor'
      },
      { name: 'Колокольня Софийского собора', desc: 'Высотная доминанта центра, на которую можно подняться ради круговой панорамы города и реки',
        locationSlug: 'vologda-kolokol-nya-sofiyskogo-sobora'
      },
      { name: 'Музей кружева', desc: 'Уникальная экспозиция, посвящённая главному вологодскому промыслу, признанная одной из лучших в Европе',
        venueSlug: 'vologda-muzey-kruzheva'
      },
      { name: 'Памятник букве «О»', desc: 'Кованый арт-объект в сквере, иронично обыгрывающий знаменитый вологодский говор («оканье»)',
        locationSlug: 'vologda-pamyatnik-bukve-o'
      },
      { name: 'Музей «Мир забытых вещей»', desc: 'Старинный деревянный особняк, воссоздающий быт и атмосферу дореволюционной городской усадьбы',
        venueSlug: 'vologda-muzey-mir-zabytyh-veschey'
      },
      { name: 'Центр народных промыслов «Резной палисад»', desc: 'Культурное пространство, окружённое тем самым знаменитым вологодским деревянным зодчеством',
        locationSlug: 'vologda-tsentr-narodnyh-promyslov-reznoy-palisad'
      },
    ],
    travel:
      "Прямой поезд из Москвы доезжает до Вологды примерно за 7–8 часов, а из Санкт-Петербурга — за 11–12 часов. Также в городе есть небольшой аэропорт, принимающий региональные рейсы, а автомобилисты используют удобную федеральную трассу М-8 «Холмогоры». Идеальный сезон для визита — лето (с июня по август), когда в городе проходят масштабные фестивали кружева и деревянного зодчества, а Кремлевская площадь залита солнцем. Зима — второй пик сезона, привлекающий любителей настоящей русской зимы, заснеженных деревянных палисадов и новогодних гуляний.",
    faq: [
    { q: "Где искать то самое вологодское кружево?", a: "Главная коллекция собрана в уникальном Музее кружева на Кремлевской площади, а приобрести сертифицированные изделия можно в фирменных магазинах «Снежинка»." },
    { q: "Правда ли, что в Вологде сохранился «резной палисад»?", a: "Да, в городе много отреставрированных деревянных купеческих особняков с резными наличниками и оградами, самый известный памятник находится на улице Благовещенской." },
    { q: "Чем отличается знаменитое вологодское масло от обычного?", a: "Настоящее вологодское масло изготавливается по особой технологии пастеризации сливок, что придается ему неповторимый ореховый привкус; покупать его лучше в фирменных точках местных учхозов." },
    ]
  },
  irkutsk: {
    brief:
      'Старинный сибирский город с неповторимым купеческим характером и роскошными кружевными домами из дерева. Культурный центр Сибири, чья история тесно связана с именами сосланных декабристов, и главная отправная точка к мистическому озеру Байкал.',
    hookFact: 'А вы знали, что в XIX веке Иркутск уважительно величали «Сибирским Парижем»? Всё из-за богатых купцов, которые выписывали модную одежду, вина и мебель напрямую из Франции.',
    mustSee: [
      { name: '130-й квартал', desc: 'Квартал деревянного зодчества - визитная карточка города',
        locationSlug: 'irkutsk-130-y-kvartal'
      },
      { name: 'Набережная Ангары', desc: 'Прогулочная зона с видами на реку и мосты',
        locationSlug: 'irkutsk-naberezhnaya-angary'
      },
      { name: 'Музей «Декабристы»', desc: 'История ссыльных декабристов в Сибири',
        venueSlug: 'irkutsk-muzey-dekabristy'
      },
      { name: 'Казанская церковь', desc: 'Яркий храм сибирского барокко - символ Иркутска',
        locationSlug: 'irkutsk-kazanskaya-tserkov'
      },
      { name: 'Листвянка', desc: 'Посёлок у Байкала - ворота к озеру и музею Байкала',
        locationSlug: 'irkutsk-listvyanka'
      },
      { name: 'Усадьба В. П. Сукачева', desc: 'Деревянный особняк мецената с садом и музеем быта',
        venueSlug: 'irkutsk-usadba-sukacheva'
      },
    ],
    travel:
      "Прямой перелет из Москвы в международный аэропорт Иркутска занимает около 5,5–6 часов, а поезда, следующие по Транссибирской магистрали, доезжают сюда из столицы за 3,5–4 суток. Лучшее время для посещения Иркутска в сочетании с поездкой на озеро Байкал зависит от ваших целей: для летнего отдыха, походов и круизов идеально подходит период с июля по август, когда вода максимально прогревается. За знаменитым чистейшим прозрачным байкальским льдом и катанием на коньках по бескрайним просторам нужно лететь строго с середины февраля по конец марта.",
    faq: [
    { q: "Сколько ехать от Иркутска до озера Байкал?", a: "Ближайшая точка к озеру — поселок Листвянка — находится всего в 65 км от города, туда можно доехать на маршрутке или такси по живописному Байкальскому тракту за 1 час." },
    { q: "Что такое «Иркутская слобода» (130-й квартал)?", a: "Это специально отреставрированный к юбилею города исторический квартал в центре, где собраны десятки деревянных усадеб, превращенных в уютные рестораны, музеи и сувенирные лавки." },
    { q: "Какую рыбу обязательно нужно попробовать в Иркутске?", a: "Гастрономическим символом региона является байкальский омуль (копченый или соленый), а также местная сочная рыба сиг и традиционные бурятские буузы." },
    ]
  },
  perm: {
    brief:
      'Масштабный культурный центр Прикамья, где суровая промышленная история Урала соединилась с авангардным современным искусством. Город бескрайней тайги, могучей Камы и знаменитого «пермского периода» в геологии.',
    hookFact: 'Знаете ли вы, что Пермь - родина знаменитых «реальных пацанов», но при этом местный Театр оперы и балета считается одним из лучших в России, а пермская балетная школа ценится наравне с петербургской?',
    mustSee: [
      // --- Главные прогулочные зоны ---
      { name: 'Набережная Камы', desc: 'Главный променад вдоль реки с амфитеатром, причалами и панорамой на Каму.', address: 'ул. Монастырская, 1Б', locationSlug: 'naberezhnaya-kamy', mustSeeFilter: 'main', visitMinutes: '1-2 ч', latitude: 58.01825, longitude: 56.2466 },
      { name: 'Арт-объект «Счастье не за горами»', desc: 'Красные буквы у Речного вокзала - самый узнаваемый фото-символ Перми.', address: 'ул. Берег Камы (у Речного вокзала)', locationSlug: 'perm-schaste-ne-za-gorami', mustSeeFilter: 'main', visitMinutes: 20, latitude: 58.01835, longitude: 56.25055 },
      { name: 'Городская эспланада', desc: 'Открытое пешеходное пространство в центре с фонтанами и событиями.', address: 'ул. Ленина (между ул. Попова и ул. Борчанинова)', locationSlug: 'permskaya-esplanada', mustSeeFilter: 'main', visitMinutes: 40, latitude: 58.0105, longitude: 56.2285 },
      { name: 'Соборная площадь', desc: 'Историческое ядро города у Петропавловского собора.', address: 'Соборная площадь', locationSlug: 'perm-sobornaya-ploschad', mustSeeFilter: 'main', visitMinutes: 30, latitude: 58.016205, longitude: 56.2338 },
      { name: 'Старокирпичный переулок', desc: 'Камерный прогулочный карман в центре с кирпичной застройкой.', address: 'ул. Ленина, 44', locationSlug: 'perm-starokirpichnyy-pereulok', mustSeeFilter: 'street', latitude: 58.0139, longitude: 56.2427 },
      { name: 'Парк Горького (и Ротонда)', desc: 'Классический городской парк с ротондой и аллеями.', address: 'ул. Сибирская, 49', locationSlug: 'perm-park-gorkogo', mustSeeFilter: 'park', latitude: 58.0051, longitude: 56.2524 },
      { name: 'Райский сад', desc: 'Зеленый уголок в Мотовилихе у музейного кластера.', address: 'ул. 1905 года, 2', locationSlug: 'perm-rayskiy-sad', mustSeeFilter: 'park', latitude: 58.0315, longitude: 56.3129 },
      // --- Музеи и театры ---
      { name: 'Пермская художественная галерея', desc: 'Уникальная коллекция пермской деревянной скульптуры - «пермские боги».', address: 'Комсомольский проспект, 4 (здание Спасо-Преображенского собора)', venueSlug: 'permskaya-galereya', mustSeeFilter: 'museum', visitMinutes: 120, latitude: 58.0164, longitude: 56.23465 },
      { name: 'Музей пермских древностей', desc: 'Археология и палеонтология Прикамья, пермский геологический период.', address: 'ул. Сибирская, 15', venueSlug: 'perm-muzey-permskikh-drevnostey', mustSeeFilter: 'museum', latitude: 58.0125, longitude: 56.2494 },
      { name: 'Дом Мешкова', desc: 'Исторический особняк на набережной, филиал краеведческого музея.', address: 'ул. Монастырская, 11', venueSlug: 'perm-dom-meshkova', mustSeeFilter: 'museum', latitude: 58.01875, longitude: 56.24655 },
      { name: 'PERMM', desc: 'Музей современного искусства в бывшем речного флота здании.', address: 'ул. Крисанова, 4', venueSlug: 'perm-permm', mustSeeFilter: 'museum', visitMinutes: 90, latitude: 58.0104, longitude: 56.2166 },
      { name: 'Театр оперы и балета им. Чайковского', desc: 'Один из сильнейших оперно-балетных театров страны.', address: 'ул. Петропавловская, 25А', venueSlug: 'perm-teatr-opery-i-baleta', mustSeeFilter: 'museum', latitude: 58.01602, longitude: 56.24581 },
      { name: 'Театр-Театр', desc: 'Драматическая сцена-трансформер и смелые постановки.', address: 'ул. Ленина, 53', venueSlug: 'teatr-teatr', mustSeeFilter: 'museum', latitude: 58.00811, longitude: 56.21598 },
      { name: 'Автомузей «Ретро-гараж»', desc: 'Единственный на Урале музей советского автопрома: Волги, Москвичи и редкие машины на ходу.', address: 'ул. Дружбы, 34А', venueSlug: 'perm-muzey-retro-garazh', mustSeeFilter: 'museum', latitude: 58.0151, longitude: 56.2796 },
      { name: 'Музей истории Мотовилихинских заводов', desc: 'Промышленная история Мотовилихи и оружейного производства: Царь-пушка, «Смерч» и открытая экспозиция техники.', address: 'ул. 1905 года, 20', venueSlug: 'perm-muzey-motovilihinskih-zavodov', mustSeeFilter: 'museum', latitude: 58.0339, longitude: 56.3155 },
      { name: 'Пермский музей кукол', desc: 'Тысячи кукол от антикварного фарфора до театральных и авторских работ.', address: 'ул. Пермская, 82А', venueSlug: 'perm-muzey-kukol', mustSeeFilter: 'museum', latitude: 58.0109, longitude: 56.2426 },
      { name: 'Музей истории связи', desc: 'Телеграф, дисковые телефоны и коммутаторы, которые можно трогать руками.', address: 'ул. Крупской, 2', venueSlug: 'perm-muzey-istorii-svyazi', mustSeeFilter: 'museum', latitude: 58.0232, longitude: 56.2711 },
      { name: 'Музей истории Пермского университета', desc: 'Египетские мумии и античные вазы в научной коллекции Пермского университета.', address: 'ул. Букирева, 15', venueSlug: 'perm-muzey-istorii-pgniu', mustSeeFilter: 'museum', latitude: 58.0086, longitude: 56.1878 },
      { name: 'Музей-диорама на горе Вышка', desc: 'Панорама Мотовилихи и диорама боевых действий Гражданской войны.', address: 'ул. Огородникова, 2', venueSlug: 'perm-muzey-diorama-vyshka', mustSeeFilter: 'museum', latitude: 58.0345, longitude: 56.3216 },
      { name: 'Центр городской культуры (ЦГК)', desc: 'Главное независимое пространство: выставки, лекции, кино и маркеты.', address: 'ул. Пушкина, 15', venueSlug: 'perm-cgk', mustSeeFilter: 'creative', latitude: 58.0108, longitude: 56.2494 },
      { name: 'Частная галерея «Марис-Арт»', desc: 'Камерная галерея: живопись, графика и скульптура мастеров Урала.', address: 'ул. Восстания, 35', venueSlug: 'perm-maris-art', mustSeeFilter: 'museum', latitude: 58.0305, longitude: 56.3023 },
      { name: 'Галерея «25\'17»', desc: 'Современная выставочная площадка: персональные и сборные экспозиции, аукционы.', address: 'ул. 25-го Октября, 17', venueSlug: 'perm-galereya-2517', mustSeeFilter: 'museum', latitude: 58.0138, longitude: 56.2497 },
      { name: 'Парк науки «НьюТон»', desc: 'Интерактивный научно-развлекательный центр для семьи.', address: 'ул. Чернышевского, 28', venueSlug: 'perm-park-nauki-nyuton', mustSeeFilter: 'science', latitude: 57.9995, longitude: 56.2625 },
      { name: 'Завод Шпагина', desc: 'Бывший метизно-ремонтный завод - главный фестивальный кластер Перми.', address: 'ул. Советская, 1Б', locationSlug: 'perm-zavod-shpagina', mustSeeFilter: 'creative', latitude: 58.0202, longitude: 56.2554 },
      // --- Памятники и архитектура ---
      { name: 'Пермяк - солёные уши', desc: 'Жанровый памятник у «Грибоедова»: фото с бронзовыми ушами.', address: 'Комсомольский проспект, 27', locationSlug: 'permsky-solenye-ushi', mustSeeFilter: 'main', visitMinutes: 15, latitude: 58.00974, longitude: 56.23973 },
      { name: 'Пермский медведь', desc: 'Бронзовый символ города на пешеходной Ленина.', address: 'ул. Ленина, 58', locationSlug: 'perm-permskiy-medved', mustSeeFilter: 'main', visitMinutes: 15, latitude: 58.01042, longitude: 56.23735 },
      { name: 'Дом Грибушина', desc: 'Особняк в стиле модерн с богатым фасадным декором.', address: 'ул. Ленина, 13', locationSlug: 'perm-dom-gribushina', mustSeeFilter: 'houses', visitMinutes: 20, latitude: 58.0164, longitude: 56.25389 },
      { name: 'Башня смерти', desc: 'Доминанта конструктивизма - бывшее здание НКВД.', address: 'Комсомольский проспект, 74', locationSlug: 'perm-bashnya-smerti', mustSeeFilter: 'main', visitMinutes: 20, latitude: 57.9944, longitude: 56.2573 },
      { name: 'Собор Петра и Павла', desc: 'Старейший каменный храм Перми на Соборной площади.', address: 'ул. 25-го Октября, 1', locationSlug: 'perm-sobor-petra-i-pavla', mustSeeFilter: 'temple', latitude: 58.0185, longitude: 56.2559 },
      { name: 'Вознесенская (Феодосьевская) церковь', desc: 'Краснокирпичный храм с узнаваемым силуэтом у эспланады.', address: 'ул. Борчанинова, 11', locationSlug: 'perm-voznesenskaya-tserkov', mustSeeFilter: 'temple', visitMinutes: 20, latitude: 58.00561, longitude: 56.22084 },
      { name: 'Парк камней / Пермские ворота', desc: 'Арт-объект из бревен у вокзала и геологическая экспозиция камней.', address: 'площадь Гайдара', locationSlug: 'perm-park-kamney-permskie-vorota', mustSeeFilter: 'main', visitMinutes: 40, latitude: 58.0035, longitude: 56.1916 },
      // --- Гастро ---
      { name: 'Чомга', desc: 'Локальная кухня у парка Горького.', address: 'ул. Сибирская, 47А', locationSlug: 'perm-chomga', mustSeeFilter: 'gastro', latitude: 58.0055, longitude: 56.2519 },
      { name: 'Пермские посикунчики', desc: 'Классика уличной пермской выпечки.', address: 'ул. Пермская, 56', locationSlug: 'perm-permskie-posikunchiki', mustSeeFilter: 'gastro', visitMinutes: 30, latitude: 58.0135, longitude: 56.2412 },
      { name: 'Nolan Wine & Kitchen', desc: 'Современный концептуальный ресторан в центре Перми с изысканной европейской кухней и богатой винной картой.', address: 'Пермь, Петропавловская ул., 59 (в отеле «Урал»)', locationSlug: 'perm-nolan-wine-kitchen', mustSeeFilter: 'gastro', latitude: 58.012115, longitude: 56.238415 },
      { name: 'Belka', desc: 'Камерное гастро-место на Сибирской.', address: 'ул. Сибирская, 19Б', locationSlug: 'perm-belka', mustSeeFilter: 'gastro', latitude: 58.0108, longitude: 56.2505 },
      { name: 'Партизан', desc: 'Гастробар на Комсомольском проспекте.', address: 'Комсомольский проспект, 1', locationSlug: 'perm-partizan', mustSeeFilter: 'gastro', latitude: 58.0169, longitude: 56.2345 },
      { name: 'Демидовская пивоварня', desc: 'Крафтовое пиво и кухня в центре.', address: 'ул. Ленина, 46А', locationSlug: 'perm-demidovskaya-pivovarnya', mustSeeFilter: 'gastro', latitude: 58.0133, longitude: 56.2435 },
      { name: 'Cup by Cup', desc: 'Популярная пермская кофейня третьей волны, известная спешелти-кофе собственной обжарки и уютной атмосферой.', address: 'Пермь, Сибирская ул., 30', locationSlug: 'perm-cup-by-cup', mustSeeFilter: 'gastro', latitude: 58.009415, longitude: 56.249415 },
      { name: 'Gastroport', desc: 'Гастропространство у Решетниковского спуска.', address: 'ул. Решетниковский спуск, 1', locationSlug: 'perm-gastroport', mustSeeFilter: 'gastro', latitude: 58.0183, longitude: 56.2163 },
    ],
    significantSuburbs: [
      {
        name: 'Хохловка',
        visitMinutes: 'полдня',
        desc: 'Архитектурно-этнографический музей на Каме - деревянное зодчество Прикамья.',
        address: 'Пермский край, Ильинский район',
        venueSlug: 'muzej-hohlovka',
        latitude: 58.26186,
        longitude: 56.26314,
        travelVector: 'Камский / Ильинский вектор',
        travelVectorBlurb:
          'Закладывайте на автобус ~1 час, чтобы приехать к 9 утра.',
        timingNote:
          'По маршруту двигайтесь против часовой стрелки, напоследок оставив Усть-Боровский сользавод и смотровую площадку над заливом.',
        places: [
          { name: 'Усадьба Баяндиных', desc: 'купеческая усадьба с жилым домом и надворными постройками.', latitude: 58.2612, longitude: 56.2642 },
          { name: 'Ветряная мельница', desc: 'классический ветряк среди изб и хозяйственных построек.', latitude: 58.2598, longitude: 56.2612 },
          { name: 'Богородицкая церковь', desc: 'деревянный храм экспозиции (+ Георгиевская церковь рядом в музейном секторе), перевезенный с берегов Камы.', latitude: 58.2609, longitude: 56.2621 },
          { name: 'Сторожевая башня', desc: 'оборонительная деревянная башня на холме над заливом.', latitude: 58.2624, longitude: 56.2639 },
          { name: 'Охотничий дом / Заимка', desc: 'деревянный охотничий дом и заимка в музейной экспозиции - быт промыслов Прикамья.', latitude: 58.2605, longitude: 56.2635 },
          { name: 'Усть-Боровский сользавод', desc: 'комплекс солеваренного промысла - визитная карточка музейной экспозиции; ближе к финалу круга.', latitude: 58.2632, longitude: 56.2648 },
          { name: 'Смотровая над заливом', desc: 'панорама Камского залива с холма музея - финальный кадр Хохловки.', latitude: 58.2628, longitude: 56.2618 },
        ]
      },
      {
        name: 'Кунгур',
        desc: 'Город купечества и ледяной пещеры в 90 км от Перми.',
        address: 'г. Кунгур, Пермский край',
        locationSlug: 'perm-kungur',
        latitude: 57.4333,
        longitude: 56.95,
        travelVector: 'Юго-восточный / Кунгурский вектор',
        travelVectorBlurb:
          'Пешком по центру Кунгура, затем на авто к ледяной пещере, на обратном пути - Вязовская пряничная.',
        places: [
          { name: 'Пуп Земли', desc: 'Необычный малый архитектурный памятник на набережной Кунгура, установленный в точке пересечения важнейших исторических дорог.', address: 'Пермский край, Кунгур, ул. Карла Маркса (на набережной реки Сылвы)', latitude: 57.428588, longitude: 56.938883 },
          { name: 'Набережная Сылвы', desc: 'прогулка вдоль реки в центре - часть пешеходного круга до авто-блока.', latitude: 57.4295, longitude: 56.9485 },
          { name: 'Тихвинская церковь', desc: 'храмовая доминанта старого Кунгура.', latitude: 57.4308, longitude: 56.9512 },
          { name: 'Гостиный двор', desc: 'купеческий центр старого Кунгура - торговые ряды и каменная застройка.', latitude: 57.4328, longitude: 56.9438 },
          { name: 'Музей истории купечества', desc: 'быт и история кунгурских купцов в историческом особняке.', latitude: 57.4335, longitude: 56.9455 },
          { name: 'Кунгурская ледяная пещера', desc: 'Одна из крупнейших и красивейших карстовых пещер в мире с подземными озерами и многовековыми ледяными гротами.', locationSlug: 'perm-kungurskaya-ledyanaya-peshchera', address: 'Пермский край, Кунгур, с. Филипповка', latitude: 57.440263, longitude: 57.006206, transitTip: 'Авто к пещере после центра (~15-20 мин)' },
          { name: 'Камень Ермак', desc: 'скальный останец на Сылве, связанный с маршрутами Ермака - экстра к кунгурскому дню.', latitude: 57.3736, longitude: 57.0667, transitTip: 'Авто к Сылве; не совмещать с Белой горой и Плакуном' },
          { name: 'Вязовская пряничная', desc: 'местная пряничная традиция - сладкий сувенир на выезде обратно в Пермь.', latitude: 57.4322, longitude: 56.9442, transitTip: 'На выезде обратно в Пермь - остановка у пряничной' },
        ]
      },
      {
        name: 'Православный Урал',
        desc: 'Белогорский монастырь, Царский крест, купель у горы и водопад Плакун за один день.',
        address: 'с. Белая Гора / Суксунский район',
        locationSlug: 'perm-belaya-gora',
        latitude: 57.39202,
        longitude: 56.229,
        travelVector: 'Южный / Суксунский вектор',
        travelVectorBlurb:
          'Трасса Р-242 / Суксун: монастырь - Царский крест - купель/источник у горы - Плакун. Не совмещать с камнем Ермак за один день - крюк под 100 км.',
        places: [
          { name: 'Белогорский Свято-Николаевский монастырь', desc: 'Величественный православный монастырь на вершине Белой горы, часто называемый «Уральским Афоном» за свою красоту и строгий устав.', locationSlug: 'perm-belogorskiy-monastyr', address: 'Пермский край, Кунгурский округ, д. Белая Гора, Монастырская ул., 1', latitude: 57.392398, longitude: 56.229415, transitTip: 'Авто по Р-242 / Суксун к монастырю' },
          { name: 'Царский крест', desc: 'Огромный памятный крест в Белогорском монастыре, установленный в память о спасении цесаревича Николая Александровича после покушения в Японии.', address: 'Пермский край, Кунгурский округ, д. Белая Гора (у монастыря)', latitude: 57.391745, longitude: 56.22905 },
          { name: 'Купель / источник', desc: 'святой источник и купель у подножия монастырской горы - в связке с обителью.', latitude: 57.3906, longitude: 56.2278, transitTip: 'Спуск к купели у подножия - в связке с монастырём' },
          { name: 'Водопад Плакун', desc: 'живописный известняковый водопад в Суксунском районе - финал православного дня.', latitude: 57.3481, longitude: 57.0506, transitTip: 'Авто к Плакуну (Суксун); Ермак - в день Кунгура' },
        ]
      },
      {
        name: 'Усьва / Губаха за 2 дня',
        desc: 'Горнозаводской край на 2 дня: Усьвинские столбы и «Сердце Пармы», затем Каменный город и гора Крестовая.',
        address: 'Губаха / Усьва, Пермский край',
        locationSlug: 'perm-gubakha-usva',
        latitude: 58.723,
        longitude: 57.633,
        travelVector: 'Горнозаводской / Чусовской вектор',
        travelVectorBlurb:
          'День 1 - Усьва (столбы, смотровая, Загубашка); день 2 - Губаха (Каменный город, пещера Российская, Крестовая на закат). Полюд (~250 км) с этой поездкой не совмещать.',
        places: [
          {
            name: 'Усьвинские столбы',
            visitMinutes: 180,
            desc: 'Величественная многометровая каменная стена на берегу реки Усьвы, знаменитая отдельно стоящей скалой Чёртов Палец.',
            locationSlug: 'perm-usvinskie-stolby',
            latitude: 58.653457,
            longitude: 57.568472,
            dayLabel: 'День 1 - Усьва',
            transitTip: 'Трек / авто к столбам',
            address: 'Пермский край, Гремячинский городской округ, близ поселка Усьва',
          },
          {
            name: 'Смотровая Усьвинских столбов',
            visitMinutes: 30,
            desc: 'площадка с видом на отвесные скалы над Усьвой - главная панорама дня.',
            latitude: 58.7168,
            longitude: 57.6145,
            transitTip: 'После трека - Загубашка; Каменный город оставьте на день 2',
          },
          {
            name: 'Сердце Пармы (Загубашка)',
            visitMinutes: 60,
            desc: 'декорации и виды фильма/книги о Парме - после трека, неторопясь.',
            latitude: 58.705,
            longitude: 57.602,
          },
          {
            name: 'Каменный город',
            visitMinutes: 120,
            desc: 'Уникальный природный памятник из причудливых скальных останцев, напоминающих улочки, дома и площади древнего заброшенного города.',
            locationSlug: 'perm-kamennyy-gorod',
            latitude: 58.723049,
            longitude: 57.633454,
            dayLabel: 'День 2 - Губаха',
            transitTip: 'Авто/трек к Каменному городу',
            address: 'Пермский край, Гремячинский городской округ, близ поселка Шумихинский',
          },
          {
            name: 'Пещера Российская',
            visitMinutes: 40,
            desc: 'карстовая пещера у Каменного города - осторожно на входе, без неоправданного риска и лишних приключений.',
            latitude: 58.7245,
            longitude: 57.636,
          },
          {
            name: 'Гора Крестовая',
            visitMinutes: 60,
            desc: 'отличный вид на закате.',
            latitude: 58.82861,
            longitude: 57.585,
            transitTip: 'К смотровой площадке',
          },
        ]
      },
    ],
    dayRoutePresets: [
      {
        id: 'perm-green-line',
        title: 'Зелёная линия (исторический маршрут)',
        description:
          'Около 3.5-4 км, 2-2.5 часа. Главное культурное и архитектурное наследие для первого визита.',
        timingNote: 'Пешком по зелёной разметке на тротуаре - гид не нужен. Порядок как на асфальте (старт у «солёных ушей», финал продления 2015 у Театра-Театра). Координаты сверены с Nominatim/адресами; «Счастье» и Пермь-I - южный берег, не центроид в Каме.',
        stops: [
          {
            name: 'Скульптура «Пермяк - солёные уши»',
            desc: 'Классический старт зелёной линии: самый знаменитый жанровый памятник города.',
            locationSlug: 'permsky-solenye-ushi',
            visitMinutes: 10,
            latitude: 58.00974,
            longitude: 56.23973,
          },
          {
            name: 'Часовня Стефана Великопермского',
            desc: 'Памятник в честь крестителя пермских земель.',
            dayRouteId: 'perm-green-chasovnya-stefana',
            address: 'Комсомольский проспект, 18',
            visitMinutes: 10,
            latitude: 58.01325,
            longitude: 56.23754,
          },
          {
            name: 'Спасо-Преображенский кафедральный собор',
            desc: 'Здание, где долгие годы располагалась Пермская художественная галерея и деревянные боги.',
            venueSlug: 'permskaya-galereya',
            visitMinutes: 20,
            latitude: 58.0164,
            longitude: 56.23465,
          },
          {
            name: 'Торговая баня мещанки Кашиной',
            desc: 'Колоритное дореволюционное кирпичное здание.',
            dayRouteId: 'perm-green-banya-kashinoy',
            address: 'ул. Монастырская, 19',
            visitMinutes: 10,
            latitude: 58.01738,
            longitude: 56.24165,
          },
          {
            name: 'Усадьба купца Камчатова',
            desc: 'Классическое купеческое подворье у набережной.',
            dayRouteId: 'perm-green-usadba-kamchatova',
            visitMinutes: 10,
            latitude: 58.0182,
            longitude: 56.2452,
          },
          {
            name: 'Дом Мешкова (Пермский краеведческий музей)',
            desc: 'Роскошный дворец в стиле позднего русского классицизма на набережной Камы.',
            venueSlug: 'perm-dom-meshkova',
            visitMinutes: 20,
            latitude: 58.01875,
            longitude: 56.24655,
          },
          {
            name: 'Железнодорожный вокзал Пермь-I',
            desc: 'Старинный вокзал, откуда начиналась Уральская железная дорога. Пин у южного фасада на Монастырской (не центроид у путей/воды).',
            dayRouteId: 'perm-green-perm-i',
            address: 'ул. Монастырская, 5',
            visitMinutes: 15,
            latitude: 58.0192,
            longitude: 56.251,
          },
          {
            name: 'Речной вокзал (+ «Счастье не за горами»)',
            desc: 'Здание в стиле сталинского ампира и знаменитый арт-объект. Пин на южном берегу у площади (wiki/OSM ~58.021 визуально уходит в Каму на тайлах).',
            locationSlug: 'perm-schaste-ne-za-gorami',
            visitMinutes: 15,
            latitude: 58.01835,
            longitude: 56.25055,
          },
          {
            name: 'Дом Смышляева (Городская библиотека)',
            desc: 'Историческое здание, где бывали Чехов и Пастернак.',
            dayRouteId: 'perm-green-dom-smyshlyaeva',
            visitMinutes: 10,
            latitude: 58.0155,
            longitude: 56.2445,
          },
          {
            name: 'Пермская мужская классическая гимназия',
            desc: 'Старейшее учебное заведение Урала.',
            dayRouteId: 'perm-green-muzhskaya-gimnaziya',
            address: 'ул. Сибирская, 13',
            visitMinutes: 10,
            latitude: 58.01452,
            longitude: 56.24426,
          },
          {
            name: 'Памятник Б. Пастернаку (Театральный сквер)',
            desc: 'Пермь стала прообразом города Юрятин в «Докторе Живаго».',
            locationSlug: 'perm-pamyatnik-borisu-pasternaku',
            visitMinutes: 10,
            latitude: 58.01443,
            longitude: 56.2461,
          },
          {
            name: 'Пермский театр оперы и балета',
            desc: 'Один из старейших и знаменитых оперных театров России.',
            venueSlug: 'perm-teatr-opery-i-baleta',
            visitMinutes: 15,
            latitude: 58.01602,
            longitude: 56.24581,
          },
          {
            name: 'Каменные палаты купцов Тупицыных',
            desc: 'Яркий образец пермского модерна.',
            dayRouteId: 'perm-green-palaty-tupitsynyh',
            visitMinutes: 10,
            latitude: 58.01558,
            longitude: 56.24842,
          },
          {
            name: 'Дом Дягилева',
            desc: 'Родовое гнездо великого импресарио Сергея Дягилева.',
            dayRouteId: 'perm-green-dom-dyagileva',
            address: 'ул. Сибирская, 33',
            visitMinutes: 10,
            latitude: 58.00888,
            longitude: 56.2503,
          },
          {
            name: 'Дом чекистов',
            desc: 'Монументальный памятник советского конструктивизма на Сибирской.',
            dayRouteId: 'perm-green-dom-chekistov',
            address: 'ул. Сибирская, 30',
            visitMinutes: 10,
            latitude: 58.00724,
            longitude: 56.2539,
          },
          {
            name: 'Памятник «Легенда о пермском медведе»',
            desc: 'Бронзовый мишка, которому принято тереть нос на удачу.',
            locationSlug: 'perm-permskiy-medved',
            visitMinutes: 10,
            latitude: 58.01042,
            longitude: 56.23735,
          },
          {
            name: 'ЦУМ',
            desc: 'Первый крупный советский универмаг города.',
            dayRouteId: 'perm-green-tsum',
            address: 'ул. Ленина, 45',
            visitMinutes: 10,
            latitude: 58.01166,
            longitude: 56.23762,
          },
          {
            name: 'Здание Губернских присутственных мест',
            desc: 'Административное сердце дореволюционной Перми.',
            dayRouteId: 'perm-green-gubernskie-prisutstvennye',
            visitMinutes: 10,
            latitude: 58.0126,
            longitude: 56.2386,
          },
          {
            name: 'Феодосьевская церковь',
            desc: 'Нарядный краснокирпичный храм в неорусском стиле.',
            locationSlug: 'perm-voznesenskaya-tserkov',
            visitMinutes: 15,
            latitude: 58.00561,
            longitude: 56.22084,
          },
          {
            name: 'Пермский академический Театр-Театр',
            desc: 'Финал продления 2015 года: современный символ театральной Перми.',
            venueSlug: 'teatr-teatr',
            visitMinutes: 15,
            latitude: 58.00811,
            longitude: 56.21598,
          },
        ],
      },
      {
        id: 'perm-red-line',
        title: 'Красная линия (романтический маршрут)',
        description:
          'Около 2.5 км, 1.5 часа. Литература, тайны, старинные особняки и тихие прогулки.',
        timingNote: 'Пешком по красной разметке - истории любви, связанные с Пермью. Порядок сверен с кольцом вики/Ураловеда, координаты - по адресам Nominatim.',
        stops: [
          {
            name: 'Королёвские номера',
            desc: 'Бывшая гостиница, где провёл свои последние дни великий князь Михаил Александрович Романов.',
            dayRouteId: 'perm-red-korolevskie-nomera',
            address: 'ул. Сибирская, 5',
            visitMinutes: 10,
            latitude: 58.01685,
            longitude: 56.24285,
          },
          {
            name: 'Пермская городская дума',
            desc: 'Дом Смышляева / библиотека Пушкина - визиты Чехова и линия Маяковского с Лилей Брик.',
            dayRouteId: 'perm-red-gorodskaya-duma',
            visitMinutes: 10,
            latitude: 58.0155,
            longitude: 56.2445,
          },
          {
            name: 'Аптека Бартминского',
            desc: 'Старейшая деревянная аптека Урала. История швейцарского провизора и его преданности семье.',
            dayRouteId: 'perm-red-apteka-bartminskogo',
            visitMinutes: 10,
            latitude: 58.0158,
            longitude: 56.2422,
          },
          {
            name: 'Пермская духовная семинария',
            desc: 'История писателя Павла Бажова и его будущей жены Валентины.',
            dayRouteId: 'perm-red-duhovnaya-seminariya',
            visitMinutes: 10,
            latitude: 58.0162,
            longitude: 56.2368,
          },
          {
            name: 'Дом губернатора',
            desc: 'Место, где разворачивалась история любви чиновника Ивана Попова и фрейлины Анны.',
            dayRouteId: 'perm-red-dom-gubernatora',
            visitMinutes: 10,
            latitude: 58.0152,
            longitude: 56.2492,
          },
          {
            name: 'Мариинская женская гимназия',
            desc: 'Здесь училась Августа Югова, муза и трагическая любовь революционера Якова Свердлова.',
            dayRouteId: 'perm-red-mariinskaya-gimnaziya',
            address: 'ул. Петропавловская, 23',
            visitMinutes: 10,
            latitude: 58.01606,
            longitude: 56.24814,
          },
          {
            name: 'Кинотеатр «Триумф»',
            desc: 'Старейший кинозал города, основанный предпринимателем Синакевичем как подарок любимой жене.',
            dayRouteId: 'perm-red-kinoteatr-triumf',
            visitMinutes: 10,
            latitude: 58.01351,
            longitude: 56.24695,
          },
          {
            name: 'Дом Грибушина',
            desc: 'Особняк в стиле модерн с лепными ликами (считается «домом с фигурами» из романа «Доктор Живаго»).',
            locationSlug: 'perm-dom-gribushina',
            address: 'ул. Ленина, 13',
            visitMinutes: 15,
            latitude: 58.0164,
            longitude: 56.25389,
          },
          {
            name: 'Дом купца Попова',
            desc: 'История платонической любви и переписки Александра Герцена и Натальи Захарьиной во время его ссылки.',
            dayRouteId: 'perm-red-dom-kupca-popova',
            address: 'ул. 25 Октября, 1',
            visitMinutes: 10,
            latitude: 58.01831,
            longitude: 56.24493,
          },
          {
            name: 'Сквер Решетникова',
            desc: 'Конечная точка с панорамным видом на Каму, место традиционных свиданий и прогулок.',
            dayRouteId: 'perm-red-skver-reshetnikova',
            visitMinutes: 15,
            latitude: 58.01827,
            longitude: 56.24297,
          },
        ],
      },
      {
        id: 'perm-classic-one-day',
        title: 'Классическая Пермь за 1 день',
        description: 'Набережная, Счастье, центр, галерея, эспланада и гастро-пауза.',
        stops: [
          { name: 'Набережная Камы', desc: 'Старт у Камы', locationSlug: 'naberezhnaya-kamy' },
          { name: 'Арт-объект «Счастье не за горами»', desc: 'Фото-символ города', locationSlug: 'perm-schaste-ne-za-gorami' },
          { name: 'Пермская художественная галерея', desc: 'Пермские боги', venueSlug: 'permskaya-galereya' },
          { name: 'Пермяк - солёные уши', desc: 'Жанровый памятник', locationSlug: 'permsky-solenye-ushi' },
          { name: 'Пермские посикунчики', desc: 'Обед', locationSlug: 'perm-permskie-posikunchiki' },
          { name: 'Городская эспланада', desc: 'Центр и фонтаны', locationSlug: 'permskaya-esplanada' },
          { name: 'Театр-Театр', desc: 'Вечерняя культура', venueSlug: 'teatr-teatr' },
        ]
      },
      {
        id: 'perm-art-cluster',
        title: 'Арт и креатив',
        description: 'Шпагин, PERMM, ЦГК, галереи и набережная.',
        stops: [
          { name: 'Завод Шпагина', desc: 'Фестивальный кластер', locationSlug: 'perm-zavod-shpagina' },
          { name: 'PERMM', desc: 'Современное искусство', venueSlug: 'perm-permm' },
          { name: 'Центр городской культуры (ЦГК)', desc: 'Независимая сцена', venueSlug: 'perm-cgk' },
          { name: 'Галерея «25\'17»', desc: 'Выставки', venueSlug: 'perm-galereya-2517' },
          { name: 'Набережная Камы', desc: 'Финал у воды', locationSlug: 'naberezhnaya-kamy' },
        ]
      },
      {
        id: 'perm-hohlovka-day',
        title: 'День в Хохловке',
        description: 'Архитектурно-этнографический музей на Каме - деревянное зодчество Прикамья.',
        timingNote:
          'По маршруту двигайтесь против часовой стрелки, напоследок оставив Усть-Боровский сользавод и смотровую площадку над заливом.',
        travelVector: 'Архитектурно-этнографический музей на Каме - деревянное зодчество Прикамья.',
        travelVectorBlurb:
          'Закладывайте на автобус ~1 час, чтобы приехать к 9 утра.',
        stops: [
          { name: 'Хохловка', desc: 'Въезд в музей-заповедник', venueSlug: 'muzej-hohlovka' },
          { name: 'Усадьба Баяндиных', desc: 'Старт круга' },
          { name: 'Ветряная мельница', desc: 'Ветряк среди изб' },
          { name: 'Богородицкая церковь', desc: 'Храм (+ Георгиевская в экспозиции)' },
          { name: 'Сторожевая башня', desc: 'Башня на холме' },
          { name: 'Охотничий дом / Заимка', desc: 'Промысловый быт' },
          { name: 'Усть-Боровский сользавод', desc: 'Солеварня - к финалу' },
          { name: 'Смотровая над заливом', desc: 'Панорама Камы' },
        ]
      },
      {
        id: 'perm-kungur-day',
        title: 'Кунгур: центр, пещера и Ермак',
        description: 'Город купечества и ледяной пещеры в 90 км от Перми.',
        travelVector: 'Город купечества и ледяной пещеры в 90 км от Перми.',
        travelVectorBlurb:
          'Пешком по центру Кунгура, затем на авто к ледяной пещере, на обратном пути - Вязовская пряничная.',
        stops: [
          { name: 'Пуп Земли', desc: 'Необычный малый архитектурный памятник на набережной Кунгура, установленный в точке пересечения важнейших исторических дорог.', address: 'Пермский край, Кунгур, ул. Карла Маркса (на набережной реки Сылвы)', latitude: 57.428588, longitude: 56.938883 },
          { name: 'Набережная Сылвы', desc: 'Прогулка у реки' },
          { name: 'Тихвинская церковь', desc: 'Храмовая доминанта' },
          { name: 'Гостиный двор', desc: 'Купеческий Кунгур' },
          { name: 'Музей истории купечества', desc: 'Купеческий быт' },
          { name: 'Кунгурская ледяная пещера', desc: 'Одна из крупнейших и красивейших карстовых пещер в мире с подземными озерами и многовековыми ледяными гротами.', locationSlug: 'perm-kungurskaya-ledyanaya-peshchera', address: 'Пермский край, Кунгур, с. Филипповка', latitude: 57.440263, longitude: 57.006206, transitTip: 'Авто к пещере после центра (~15-20 мин)' },
          { name: 'Камень Ермак', desc: 'Скала на Сылве - экстра к дню', transitTip: 'Авто к Сылве; не совмещать с Белой горой' },
          { name: 'Вязовская пряничная', desc: 'Сувенир на выезде в Пермь', transitTip: 'На выезде обратно в Пермь' },
        ]
      },
      {
        id: 'perm-orthodox-ural-day',
        title: 'Православный Урал',
        description: 'Белогорский монастырь, Царский крест, купель у горы и водопад Плакун за один день.',
        travelVector: 'Белогорский монастырь, Царский крест, купель у горы и водопад Плакун за один день.',
        travelVectorBlurb:
          'Трасса Р-242 / Суксун: монастырь - Царский крест - купель/источник у горы - Плакун. Не совмещать с камнем Ермак за один день - крюк под 100 км.',
        stops: [
          { name: 'Белогорский Свято-Николаевский монастырь', desc: 'Величественный православный монастырь на вершине Белой горы, часто называемый «Уральским Афоном» за свою красоту и строгий устав.', locationSlug: 'perm-belogorskiy-monastyr', address: 'Пермский край, Кунгурский округ, д. Белая Гора, Монастырская ул., 1', latitude: 57.392398, longitude: 56.229415 },
          { name: 'Царский крест', desc: 'Огромный памятный крест в Белогорском монастыре, установленный в память о спасении цесаревича Николая Александровича после покушения в Японии.', address: 'Пермский край, Кунгурский округ, д. Белая Гора (у монастыря)', latitude: 57.391745, longitude: 56.22905 },
          { name: 'Купель / источник', desc: 'У подножия горы' },
          { name: 'Водопад Плакун', desc: 'Финал дня' },
        ]
      },
      {
        id: 'perm-gubakha-usva',
        title: 'Усьва / Губаха за 2 дня',
        description:
          'Горнозаводской край на 2 дня: Усьвинские столбы и «Сердце Пармы», затем Каменный город и гора Крестовая.',
        travelVector:
          'Горнозаводской край на 2 дня: Усьвинские столбы и «Сердце Пармы», затем Каменный город и гора Крестовая.',
        travelVectorBlurb:
          'День 1 - Усьва (столбы, смотровая, Загубашка); день 2 - Губаха (Каменный город, пещера Российская, Крестовая на закат). Полюд (~250 км) с этой поездкой не совмещать.',
        stops: [
          { name: 'Усьвинские столбы', desc: 'Величественная многометровая каменная стена на берегу реки Усьвы, знаменитая отдельно стоящей скалой Чёртов Палец.', locationSlug: 'perm-usvinskie-stolby', address: 'Пермский край, Гремячинский городской округ, близ поселка Усьва', visitMinutes: 180, latitude: 58.653457, longitude: 57.568472, transitTip: 'Трек / авто к столбам' },
          { name: 'Смотровая Усьвинских столбов', desc: 'площадка с видом на отвесные скалы над Усьвой - главная панорама дня.', visitMinutes: 30, transitTip: 'После трека - Загубашка; Каменный город оставьте на день 2' },
          { name: 'Сердце Пармы (Загубашка)', desc: 'декорации и виды фильма/книги о Парме - после трека, неторопясь.', visitMinutes: 60 },
          { name: 'Каменный город', desc: 'Уникальный природный памятник из причудливых скальных останцев, напоминающих улочки, дома и площади древнего заброшенного города.', locationSlug: 'perm-kamennyy-gorod', address: 'Пермский край, Гремячинский городской округ, близ поселка Шумихинский', visitMinutes: 120, latitude: 58.723049, longitude: 57.633454, transitTip: 'Авто/трек к Каменному городу' },
          { name: 'Пещера Российская', desc: 'карстовая пещера у Каменного города - осторожно на входе, без неоправданного риска и лишних приключений.', visitMinutes: 40 },
          { name: 'Гора Крестовая', desc: 'отличный вид на закате.', visitMinutes: 60, transitTip: 'К смотровой площадке' },
        ]
      },
    ],
    travel:
      'Международный аэропорт Большое Савино принимает десятки ежедневных прямых рейсов из Москвы (около 2 часов в воздухе), Санкт-Петербурга и крупных региональных центров. Пермь также является важнейшей станцией на главном ходу Транссиба, а автопутешественники едут по федеральной трассе Р-242. Идеальный сезон для визита - лето (с июня по август), когда широкая Кама становится судоходной, на городской набережной проходят масштабные арт-фестивали, а погода комфортна для поездок на уральскую природу. Зима привлекает любителей горнолыжного спорта в Губаху и ценителей заснеженной уральской тайги.',
    faq: [
      { q: 'Почему жителей края называют «пермяки соленые уши»?', a: 'Это связано с промыслом соли в Соликамске. Рабочие носили тяжелые мешки с солью на плечах, отчего их уши всегда были в соли, краснели и шелушились.' },
      { q: 'Где загадать желание медведю в Перми?', a: 'Скульптура «Легенда о пермском медведе» («Шагающий медведь») расположена в самом центре, напротив ЦУМа. Ему принято тереть нос на удачу.' },
      { q: 'Где посмотреть знаменитую пермскую деревянную скульптуру?', a: 'Коллекция «пермских богов» находится в Пермской государственной художественной галерее.' },
      { q: 'Что такое PERMM и почему туда стоит сходить?', a: 'Это первый в России музей современного искусства за пределами Москвы и Санкт-Петербурга, известный своими смелыми выставками и инсталляциями.' },
      { q: 'Как доехать до ландшафтного памятника «Каменный город»?', a: 'Он находится примерно в 200 км от Перми. Проще всего добраться на машине или с экскурсионным автобусом через город Гремячинск и поселок Усьва.' },
      { q: 'Что посмотреть в этнографическом музее «Хохловка»?', a: 'Это музей деревянного зодчества под открытым небом на берегу Камы в 40 км от Перми. Там собраны старинные усадьбы, церкви и ветряная мельница.' },
    ]
  },
  sortavala: {
    brief:
      'Очаровательный карельский городок на берегу Ладожского озера, полностью сохранивший уникальный облик финского деревянного и каменного зодчества. Главная отправная точка для путешествий на святой остров Валаам и в знаменитый мраморный каньон Рускеала.',
    hookFact: 'Знаете ли вы, что Сортавала - единственный город в России, где можно сесть на настоящий, полностью аутентичный паровоз на паровой тяге? Исторический «Рускеальский экспресс» ежедневно отправляется отсюда, погружая туристов в атмосферу конца XIX века.',
    mustSee: [
      { name: 'Горный парк «Рускеала»', desc: 'Затопленный изумрудный мраморный каньон со скалами и экологическими тропами',
        locationSlug: 'sortavala-gornyy-park-ruskeala'
      },
      { name: 'Остров Валаам', desc: 'Древний действующий мужской монастырь на Ладожском озере',
        locationSlug: 'sortavala-ostrov-valaam'
      },
      { name: 'Парк Ваккосалми и гора Кухавуори', desc: 'Природный парк в черте города с видовой площадкой на скалистой вершине',
        locationSlug: 'sortavala-park-vakkosalmi-i-gora-kuhavuori'
      },
      { name: 'Ладожские шхеры', desc: 'Живописные скалистые необитаемые острова, куда организуют прогулки на катерах',
        locationSlug: 'sortavala-ladozhskie-shhery'
      },
      { name: 'Исторический парк «Бастионъ»', desc: 'Большой интерактивный музей живой истории эпохи викингов на берегу Ладоги',
        locationSlug: 'sortavala-istoricheskiy-park-bastion'
      },
      { name: 'Гора Паасонвуори (Паасо)', desc: 'Древнее городище на вершине скалы с панорамным видом на тайгу и проходящий внизу ретропоезд',
        locationSlug: 'sortavala-gora-paasonvuori-paaso'
      },
    ]
  },
  saratov: {
    brief:
      'Старинный купеческий город на Волге с богатейшей музыкальной и театральной историей, славящийся своей консерваторией, похожей на средневековый замок. Место, где узкие исторические улочки круто спускаются к реке, открывая вид на один из самых длинных мостов Европы.',
    hookFact: 'А вы знали, что именно в Саратове началась космическая судьба Юрия Гагарина? Здесь он учился в индустриальном техникуме, впервые поднялся в небо на самолете в местном аэроклубе, и именно на саратовскую землю приземлился его спускаемый аппарат после полета вокруг Земли.',
    mustSee: [
      { name: 'Проспект Столыпина', desc: 'Старейшая пешеходная улица России (бывший проспект Кирова) с фонтанами и купеческими особняками',
        locationSlug: 'saratov-prospekt-stolypina'
      },
      { name: 'Парк Победы на Соколовой горе', desc: 'Огромный мемориальный комплекс со знаменитым монументом «Журавли» и выставкой военной техники',
        locationSlug: 'saratov-park-pobedy-na-sokolovoy-gore'
      },
      { name: 'Набережная Космонавтов', desc: 'Многоярусная старинная набережная, ведущая к знаменитому мосту через Волгу',
        locationSlug: 'saratov-naberezhnaya-kosmonavtov'
      },
      { name: 'Автодорожный мост Саратов — Энгельс', desc: 'Грандиозный мост длиной почти 3 км, бывший на момент постройки самым длинным в Европе',
        locationSlug: 'saratov-avtodorozhnyy-most-saratov-engel-s'
      },
      { name: 'Храм «Утоли моя печали»', desc: 'Удивительная шатровая церковь, напоминающая московский собор Василия Блаженного в миниатюре',
        locationSlug: 'saratov-hram-utoli-moya-pechali'
      },
      { name: 'Саратовский художественный музей имени А. Н. Радищева', desc: 'Первый общедоступный художественный музей в Российской империи',
        venueSlug: 'saratov-saratovskiy-hudozhestvennyy-muzey-imeni-a-n-radischeva'
      },
    ],
    travel:
      "Суперсовременный международный аэропорт Гагарин, расположенный в пригороде Сабуровка, принимает ежедневные прямые рейсы из Москвы (около 1,5 часов в полете), Санкт-Петербурга и Сочи. Также до города курсируют регулярные поезда дальнего следования, а автомобилисты добираются по трассе Р-228. Лучшее время для визита — лето (с июня по август), когда можно оценить масштаб великой Волги на многокилометровой Набережной Космонавтов, отдохнуть на островных пляжах или отправиться в речной круиз. Сентябрь также хорош благодаря комфортному теплу и обилию знаменитых саратовских арбузов и фруктов.",
    faq: [
    { q: "Где находится то самое место приземления Юрия Гагарина?", a: "Историческое поле, где в 1961 году приземлился первый космонавт планеты, расположено в 40 км от Саратова под Энгельсом; сейчас там открыт масштабный Парк покорителей космоса." },
    { q: "Правда ли, что в Саратове находится старейший общедоступный музей России?", a: "Да, Радищевский музей, открытый в 1885 году, стал первым художественным музеем в провинции, его богатейшую коллекцию часто называют «поволжским Эрмитажем»." },
    { q: "Что за знаменитая Саратовская гармошка и где ее увидеть?", a: "Это уникальный музыкальный инструмент с колокольчиками; послушать её звучание и увидеть редкие экземпляры можно в музее гармоники на пешеходном проспекте Столыпина." },
    ]
  },
  'ulan-ude': {
    brief:
      'Колоритная столица Бурятии на берегах Селенги, где русское казачье прошлое смешалось с буддийскими традициями Востока. Город ярких дацанов, кочевой гастрономии, шаманских мест силы и близости к великому озеру Байкал.',
    hookFact: 'Знаете ли вы, что на главной площади Улан-Удэ установлен самый большой памятник-голова в мире? Гигантская бронзовая голова Ленина весит рекордные 42 тонны, имеет высоту почти 8 метров и занесена в Книгу рекордов Гиннесса.',
    mustSee: [
      { name: 'Голова Ленина', desc: 'Самый большой бюст Ленина в мире - символ города',
        locationSlug: 'ulan-ude-golova-lenina'
      },
      { name: 'Иволгинский дацан', desc: 'Главный буддийский храм России в окрестностях города',
        venueSlug: 'ulan-ude-ivolginskiy-datsan'
      },
      { name: 'Этнографический музей', desc: 'Под открытым небом - традиции народов Забайкалья',
        venueSlug: 'ulan-ude-etnograficheskiy-muzey'
      },
      { name: 'Площадь Советов', desc: 'Центральная площадь с театром и исторической застройкой',
        locationSlug: 'ulan-ude-ploschad-sovetov'
      },
      { name: 'Набережная Селенги', desc: 'Прогулочная зона вдоль главной реки Бурятии',
        locationSlug: 'ulan-ude-naberezhnaya-selengi'
      },
      { name: 'Улица Ленина', desc: 'Пешеходный арбат столицы Бурятии с купеческими фасадами',
        locationSlug: 'ulan-ude-ulitsa-lenina'
      },
    ],
    travel:
      "В международный аэропорт Байкал выполняются регулярные прямые рейсы из Москвы (около 6 часов в воздухе), Новосибирска, Иркутска и Владивостока. Также город является крупной станцией Транссибирской и Иволгинской ветвей ж/д путей, а автопутешественники едут по трассе Р-258. Лучший сезон для поездки в столицу Бурятии — лето (с июня по август), когда тепло и солнечно, открыт доступ к восточному побережью Байкала и комфортно посещать этно-фестивали. Конец зимы и начало весны (февраль–март) привлекают паломников и туристов на празднование буддийского Нового года — Сагаалгана.",
    faq: [
    { q: "Где находится та самая гигантская голова Ленина?", a: "Самый большой в мире монументальный памятник-голова В. И. Ленина высотой почти 8 метров установлен в самом центре города на площади Советов и является главным ориентиром для туристов." },
    { q: "Далеко ли от города находится Иволгинский дацан?", a: "Главный буддийский монастырский комплекс России и резиденция Хамбо-ламы расположены в 35 км от Улан-Удэ в селе Верхняя Иволга; туда регулярно ходят маршрутные такси №130 от площади Банзарова." },
    { q: "Что попробовать из традиционной бурятской кухни?", a: "Гастрономическим символом являются буузы (позы) — крупные мясные мешочки из теста с сочным бульоном внутри; также стоит заказать суп со шулэном и нежный творожный десерт хурууд." },
    ]
  },
  chelyabinsk: {
    brief:
      'Крупный и суровый уральский мегаполис с мощным характером, который сегодня трансформируется в стильный культурный и научный центр. Город красивых пешеходных бульваров, современных набережных и богатой индустриальной истории.',
    hookFact: 'Знаете ли вы, что в 2013 году Челябинск стал единственным мегаполисом в современной истории планеты, который принял на себя удар настоящего космического пришельца? Знаменитый челябинский метеорит взорвался в небе над регионом, а его крупнейший осколок весом более 500 кг теперь хранится в местном музее.',
    mustSee: [
      { name: 'Кировка (Челябинский Арбат)', desc: 'Пешеходная улица с историческими зданиями XIX века и многочисленными бронзовыми фигурами',
        locationSlug: 'chelyabinsk-kirovka-chelyabinskiy-arbat'
      },
      { name: 'Государственный исторический музей Южного Урала', desc: 'Современное здание на набережной, где хранится знаменитый Челябинский метеорит',
        venueSlug: 'chelyabinsk-gosudarstvennyy-istoricheskiy-muzey-yuzhnogo-urala'
      },
      { name: 'Парк культуры и отдыха им. Ю. А. Гагарина', desc: 'Огромный лесной массив с сосновым бором и карьерами прямо посреди мегаполиса',
        locationSlug: 'chelyabinsk-park-kul-tury-i-otdyha-im-yu-a-gagarina'
      },
      { name: 'Алое поле', desc: 'Исторический парк в центре города со старинным храмом Александра Невского и живописными аллеями',
        locationSlug: 'chelyabinsk-aloe-pole'
      },
      { name: 'Сфера любви', desc: 'Необычное романтичное архитектурное сооружение из стекла и металла, популярное место встреч',
        locationSlug: 'chelyabinsk-sfera-lyubvi'
      },
      { name: 'Набережная реки Миасс', desc: 'Новая благоустроенная пешеходная зона возле Филармонии и креативного кластера',
        locationSlug: 'chelyabinsk-naberezhnaya-reki-miass'
      },
    ],
    travel:
      "Международный аэропорт Челябинска имени Игоря Курчатова принимает регулярные прямые рейсы из Москвы (время в полете — около 2,5 часов), Санкт-Петербурга и крупных сибирских городов. Через город проходит Южно-Уральская железная дорога, обеспечивая плотное ж/д сообщение, а автопутешественники едут по федеральной трассе М-5. Лучшее время для посещения промышленного и культурного центра Урала — период с конца мая по сентябрь, когда комфортно гулять по пешеходной улице Кировке, посещать реликтовый городской бор и выезжать к живописным озерам региона (Тургояк, Увильды).",
    faq: [
    { q: "Где в городе можно вживую увидеть знаменитый Челябинский метеорит?", a: "Самый крупный осколок космического суперболида, взорвавшегося над областью в 2013 году, хранится под специальным стеклянным куполом в Государственном историческом музее Южного Урала на набережной реки Миасс." },
    { q: "Что за пешеходная улица Кировка и чем она интересна?", a: "Это челябинский Арбат — полностью пешеходный благоустроенный участок улицы Кирова, украшенный десятками оригинальных бронзовых скульптур (Левша, нищий, городовой, купец) и старинными купеческими особняками." },
    { q: "Правда ли, что в Челябинске прямо в центре города растет вековой лес?", a: "Да, уникальный Челябинский городской бор площадью более 1000 гектаров является реликтовым сосновым лесом естественного происхождения, который граничит с центральными жилыми кварталами." },
    ]
  },
  ryazan: {
    brief:
      'Древний и богатый город к юго-востоку от Москвы, выросший из героической Переяславля-Рязанской крепости. Край белокаменных соборов, березовых рощ, есенинской поэзии и отважных десантников.',
    hookFact: 'А вы знали, откуда пошла знаменитая поговорка «А в Рязани - грибы с глазами: их едят, они глядят»?',
    mustSee: [
      { name: 'Рязанский Кремль', desc: 'Историческое сердце города с величественным Успенским собором',
        locationSlug: 'ryazan-ryazanskiy-kreml'
      },
      { name: 'Улица Почтовая', desc: 'Пешеходный «рязанский Арбат» со старинными зданиями и кафе',
        locationSlug: 'ryazan-ulitsa-pochtovaya'
      },
      { name: 'Музей-заповедник С. А. Есенина в Константиново', desc: 'Живописная родина поэта на высоком берегу Оки',
        venueSlug: 'ryazan-muzey-zapovednik-s-a-esenina-v-konstantinovo'
      },
      { name: 'Музей истории рязанского леденца', desc: 'Интерактивное пространство о сахароварении на Руси',
        venueSlug: 'ryazan-muzey-istorii-ryazanskogo-ledentsa'
      },
      { name: 'Памятник «Грибы с глазами»', desc: 'Забавный мини-символ города по мотивам известной поговорки',
        locationSlug: 'ryazan-pamyatnik-griby-s-glazami'
      },
      { name: 'Музей-усадьба академика И. П. Павлова', desc: 'Сохранившийся деревянный усадебный комплекс первого русского нобелевского лауреата',
        venueSlug: 'ryazan-muzey-usad-ba-akademika-i-p-pavlova'
      },
    ],
    travel:
      "Рязань расположена очень близко к столице, поэтому быстрее всего сюда добираться из Москвы на фирменных экспресс-электричках с Казанского вокзала, которые доезжают до места всего за 2 часа 40 минут. Также развито автобусное сообщение, а автомобилисты используют федеральную трассу М-5 «Урал». Город прекрасен для поездок на выходные в любое время года, но идеальным сезоном считается период с мая по сентябрь, когда открыта навигация по Оке и комфортно гулять по территории Кремля. Зима привлекает путешественников уютной атмосферой родины «грибов с глазами» и заснеженными улочками деревянной Рязани.",
    faq: [
    { q: "Откуда пошла знаменитая поговорка «А в Рязани — грибы с глазами»?", a: "Исторически поговорка связана с приграничным статусом Рязанского княжества: по подрезанным или сбитым чужаками грибам в суровых местных лесах рязанские дозорные вычисляли продвижение вражеских татарских лазутчиков." },
    { q: "Где в городе искать те самые фигурки грибов с глазами?", a: "Маленькие забавные бронзовые фигурки грибов (гриб-бородавик, грибная команда, гриб-путешественник) спрятаны в знаковых местах центра города (в Нижнем городском саду, у филармонии), создавая увлекательный пешеходный квест." },
    { q: "Далеко ли от Рязани до родины Сергея Есенина в селе Константиново?", a: "Государственный музей-заповедник С. А. Есенина с потрясающими панорамами на Оку расположен в 45 км от Рязани, туда ежедневно ходят рейсовые автобусы и маршрутные такси с автовокзала «Центральный»." },
    ]
  },
  stavropol: {
    brief:
      'Цветущий и невероятно зеленый город на юге России, выросший из форпоста Азово-Моздокской оборонительной линии. Город каскадных фонтанов, уникальных затененных бульваров и богатой кавказской истории, расположенный на равном расстоянии от Черного и Каспийского морей.',
    hookFact: 'А вы знали, что Ставрополь расположен ровно на 45-й параллели северной широты? Это значит, что город находится на идеальном географическом экваторе - на одинаковом расстоянии как от Северного полюса, так и от экватора Земли, что дарит ему уникальный климат.',
    mustSee: [
      { name: 'Тифлисские ворота', desc: 'Монументальная триумфальная арка XIX века, исторический въезд в город',
        locationSlug: 'stavropol-tiflisskie-vorota'
      },
      { name: 'Татарское городище', desc: 'Крупнейший археологический музей-заповедник под открытым небом среди леса',
        locationSlug: 'stavropol-tatarskoe-gorodische'
      },
      { name: 'Крепостная гора', desc: 'Место основания города с остатками крепостной стены и панорамным видом',
        locationSlug: 'stavropol-krepostnaya-gora'
      },
      { name: 'Комсомольский пруд', desc: 'Благоустроенный водоём в самом центре города, окружённый густым лесом',
        locationSlug: 'stavropol-komsomol-skiy-prud'
      },
      { name: 'Ставропольский ботанический сад', desc: 'Огромная зелёная зона со старинной липовой аллеей и редкими растениями',
        locationSlug: 'stavropol-stavropol-skiy-botanicheskiy-sad'
      },
      { name: 'Александровская площадь', desc: 'Центральная площадь с фонтанами и массивным монументом «Ангел-хранитель»',
        locationSlug: 'stavropol-aleksandrovskaya-ploschad'
      },
    ],
    travel:
      "Международный аэропорт Ставрополя принимает регулярные прямые рейсы из Москвы (время в воздухе — около 2,5 часов) и Санкт-Петербурга. Также город соединен прямым ж/д сообщением со столицей, а автопутешественники используют федеральную трассу Р-217 «Кавказ». Идеальное время для посещения одного из самых зеленых городов России — с мая по сентябрь, когда в парках работают фонтаны, открыт уникальный питьевой бювет с минеральной водой и комфортно гулять по Татарскому городищу. Осень в октябре дарит городу невероятно живописный наряд благодаря вековым дубовым лесам, окружающим жилые кварталы.",
    faq: [
    { q: "Правда ли, что Ставрополь называют «вратами Кавказа»?", a: "Да, это исторический статус города, который в XVIII веке был ключевой оборонительной крепостью Азово-Моздокской линии, откуда начиналось освоение южных рубежей империи." },
    { q: "Где находится знаменитый Немецкий мост?", a: "Уникальный высотный каменный виадук начала XX века, построенный немецкими инженерами для Туапсинской железной дороги, спрятан в живописном Мамайском лесу на окраине города и популярен у скалолазов." },
    { q: "Что посмотреть в Ставропольском краеведческом музее?", a: "Главная гордость музея — два единственных в мире полных скелета южных слонов, живших миллионы лет назад, которые были найдены археологами на территории региона." },
    ]
  },
  tomsk: {
    brief:
      'Старейший научно-образовательный центр Сибири, заслуживший мировую славу благодаря своим шедеврам деревянного зодчества. Город бьющей через край студенческой энергии, старинных университетов и невероятных кружевных теремов с тончайшей деревянной резьбой.',
    hookFact: 'А вы знали, что Томск стал неофициальным прототипом Изумрудного города из сказки Александра Волкова? Писатель долгое время жил и работал здесь, и именно зеленые крыши старинных томских деревянных усадеб вдохновили его на создание знаменитой детской повести.',
    mustSee: [
      { name: 'Лагерный сад', desc: 'Огромный парк на высоком берегу Томи с мемориалом и потрясающими панорамными видами',
        locationSlug: 'tomsk-lagernyy-sad'
      },
      { name: 'Российско-немецкий дом (Дом купца Голованова)', desc: 'Шедевр деревянного зодчества с шатровой башней',
        locationSlug: 'tomsk-rossiysko-nemetskiy-dom-dom-kuptsa-golovanova'
      },
      { name: 'Воскресенская гора', desc: 'Место основания города, где восстановлена деревянная Спасская башня',
        locationSlug: 'tomsk-voskresenskaya-gora'
      },
      { name: 'Музей славянской мифологии', desc: 'Интерактивный музей с редкими экспонатами народного искусства',
        venueSlug: 'tomsk-muzey-slavyanskoy-mifologii'
      },
      { name: 'Музей истории Томска', desc: 'Бывшая пожарная каланча на горе с лучшей смотровой площадкой в городе',
        venueSlug: 'tomsk-muzey-istorii-tomska'
      },
      { name: 'Памятник А. П. Чехову', desc: 'Гротескний ироничный памятник писателю на набережной Томи',
        locationSlug: 'tomsk-pamyatnik-a-p-chehovu'
      },
    ],
    travel:
      "Международный аэропорт Томска Богашёво имени Н. И. Камова принимает ежедневные прямые авиарейсы из Москвы (около 4 часов в полете), Новосибирска и Красноярска. Город также связан ж/д веткой с Транссибирской магистралью (станция Тайга), откуда до Томска ходят регулярные электрички и поезда. Абсолютно лучшим сезоном для визита считается лето (с июня по август) и первая половина сентября, когда студенческий город затихает, а погода идеальна для осмотра шедевров деревянного зодчества. Конец августа привлекает тысячи туристов на знаменитый международный фестиваль народных ремесел «Праздник топора» в пригороде.",
    faq: [
    { q: "Почему Томск называют «сибирским Афинами»?", a: "Это связано с огромным количеством старейших за Уралом университетов и колоссальным количеством студентов, которые составляют почти пятую часть всего населения города." },
    { q: "Где искать знаменитый памятник Чехову, который возмутил местных жителей?", a: "Ироничный памятник писателю «глазами пьяного мужика, лежащего в канаве» установлен на набережной реки Томи у ресторана «Славянский базар» — так скульптор ответил на нелестные отзывы Чехова о городе." },
    { q: "В каком районе города сохранилось больше всего деревянных домов с кружевной резьбой?", a: "Самые красивые шедевры деревянного зодчества (Дом с шатром, Дом с драконами) сосредоточены в исторических районах Татарская слобода (Елань) и в районе Воскресенской горы." },
    ]
  },
  ulyanovsk: {
    brief:
      'Симбирск - старинный город на крутом холме над Волгой, чья панорама захватывает дух из-за невероятной ширины Куйбышевского водохранилища. Крупный авиационный центр страны и родина Владимира Ленина, сохранившая огромный исторический квартал XIX века.',
    hookFact: 'А вы знали, что именно в Ульяновске находится единственный в мире Головной отраслевой музей гражданской авиации под открытым небом? На его летном поле собрано более 40 уникальных советских самолетов и вертолетов, включая легендарный сверхзвуковой Ту-144.',
    mustSee: [
      { name: 'Бульвар Новый Венец', desc: 'Живописная пешеходная набережная на высоком холме с панорамой Волги',
        locationSlug: 'ulyanovsk-bul-var-novyy-venets'
      },
      { name: 'Музей-заповедник «Родина В.И. Ленина»', desc: 'Целый старинный квартал с деревянными домами Симбирска XIX века',
        venueSlug: 'ulyanovsk-muzey-zapovednik-rodina-v-i-lenina'
      },
      { name: 'Головной музей истории гражданской авиации', desc: 'Уникальная выставка под открытым небом из 40 советских самолётов',
        venueSlug: 'ulyanovsk-golovnoy-muzey-istorii-grazhdanskoy-aviatsii'
      },
      { name: 'Императорский мост', desc: 'Грандиозный старинный мост через Волгу длиной более двух километров',
        locationSlug: 'ulyanovsk-imperatorskiy-most'
      },
      { name: 'Памятник букве «Ё»', desc: 'Оригинальный гранитный монумент, посвящённый самой молодой букве русского алфавита',
        locationSlug: 'ulyanovsk-pamyatnik-bukve-e'
      },
      { name: 'Ленинский мемориал', desc: 'Масштабное модернистское здание советской эпохи, главный исторический комплекс города',
        locationSlug: 'ulyanovsk-leninskiy-memorial'
      },
    ],
    travel:
      "Два городских аэропорта (Баратаевка и Ульяновск-Восточный) принимают регулярные прямые авиарейсы из Москвы (время в полете — около 1,5 часов), Санкт-Петербурга и Сочи. Также до родины Ленина ежедневно курсирует фирменный двухэтажный поезд «Ульяновск» с Казанского вокзала столицы, а автодороги связывают город с Самарой и Казанью. Лучшее время для туристической поездки — с конца мая по сентябрь, когда на грандиозном Куйбышевском водохранилище открыта навигация, а на высоких волжских венцах комфортно гулять и наслаждаться панорамами бескрайней реки.",
    faq: [
    { q: "Правда ли, что Волга в Ульяновске имеет рекордную ширину?", a: "Да, в районе города разлив Куйбышевского водохранилища достигает ширины почти в 40 километров, из-за чего противоположный берег реки в дымке часто кажется морским горизонтом." },
    { q: "Где находится знаменитый памятник букве «Ё»?", a: "Оригинальный гранитный монумент, посвященный седьмой букве русского алфавита, которую активно использовал в печати ульяновский земляк Николай Карамзин, установлен на бульваре Новый Венец." },
    { q: "Можно ли зайти внутрь дома, где родился Владимир Ленин?", a: "Да, подлинный деревянный флигель усадьбы Ульяновых бережно сохранен и накрыт защитным стеклянно-бетонным куполом грандиозного здания Ленинского мемориала в центре города." },
    ]
  },
  izhevsk: {
    brief:
      'Мощный индустриальный и культурный центр Предуралья, носящий гордый статус оружейной столицы России. Город, где создавалось легендарное наследие Михаила Калашникова, окруженный живописными удмуртскими лесами.',
    hookFact: 'Знаете ли вы, что Ижевский пруд - это самый большой искусственный несудоходный водоем в Европе? Его заложили еще в 1760 году для нужд железоделательного завода.',
    mustSee: [
      { name: 'Музей стрелкового оружия имени М. Т. Калашникова', desc: 'Главный музей города с возможностью посетить тир',
        venueSlug: 'izhevsk-muzey-strelkovogo-oruzhiya-imeni-m-t-kalashnikova'
      },
      { name: 'Ижевский пруд и набережная зодчего Дудина', desc: 'Один из крупнейших искусственных водоёмов Европы с красивой променадой',
        locationSlug: 'izhevsk-izhevskiy-prud-i-naberezhnaya-zodchego-dudina'
      },
      { name: 'Свято-Михайловский собор', desc: 'Величественный белокаменный храм с золотыми куполами на самой высокой точке города',
        locationSlug: 'izhevsk-svyato-mihaylovskiy-sobor'
      },
      { name: 'Зоопарк Удмуртии', desc: 'Один из лучших, самых просторных и современных зоопарков в России',
        locationSlug: 'izhevsk-zoopark-udmurtii'
      },
      { name: 'Михайловская колонна', desc: 'Единственный в России уменьшенный аналог Александровской колонны в Петербурге',
        locationSlug: 'izhevsk-mihaylovskaya-kolonna'
      },
      { name: 'Памятник Ижику', desc: 'Забавный талисман города, отлитый из старых ключей, собранных горожанами',
        locationSlug: 'izhevsk-pamyatnik-izhiku'
      },
    ],
    travel:
      "В международный аэропорт Ижевска выполняются регулярные прямые рейсы из Москвы (около 2 часов в воздухе), Санкт-Петербурга и других крупных городов. Также до столицы Удмуртии удобно добираться на фирменном двухэтажном поезде «Италмас» с Казанского вокзала Москвы, который идет около 17 часов. Лучший сезон для экскурсионного туризма — лето (с июня по август), когда в городе комфортно гулять по набережной Ижевского пруда, кататься на теплоходах и посещать масштабный этнографический музей под открытым небом «Лудорвай». Зимой город привлекает любителей горнолыжного отдыха и заснеженной северной природы Курорта Чекерил.",
    faq: [
    { q: "Где в Ижевске находится знаменитый памятник Ижику?", a: "Бронзовый талисман города в виде кафтанщика в высоком цилиндре установлен на Центральной площади; его отлили из тысяч ключей, собранных жителями города." },
    { q: "Можно ли туристам попасть на заводы концерна «Калашников»?", a: "Действующие цеха закрыты для свободного посещения из-за секретности, но полная история знаменитого оружия представлена в ультрасовременном Музейно-выставочном комплексе стрелкового оружия имени М. Т. Калашникова в центре города." },
    { q: "Что такое удмуртские перепечи и где их попробовать?", a: "Это старинное национальное блюдо в виде открытых тарталеток из ржаного теста с сочной мясной, грибной или яичной начинкой, которые запекаются перед подачей в печи и продаются во многих городских кафе." },
    ]
  },
  orel: {
    brief:
      'Признанная «литературная столица» России, подарившая миру Тургенева, Бунина, Лескова и Фета. Уютный, зеленый город в верховьях Оки, где до сих пор сохранился дух неспешных дворянских усадеб и классических русских романов.',
    hookFact: 'Знаете ли вы, что Орел был основан Иваном Грозным как секретная крепость для защиты южных границ, а свое имя город получил в честь реальной птицы, которая, по легенде, слетела с вершины векового дуба, когда строители начали рубить первые бревна?',
    mustSee: [
      { name: 'Слияние рек Оки и Орлика', desc: 'Историческое место основания Орловской крепости, украшенное высокой памятной стелой',
        locationSlug: 'orel-sliyanie-rek-oki-i-orlika'
      },
      { name: 'Музей И. С. Тургенева', desc: 'Один из старейших литературных музеев России с богатейшей экспозицией',
        venueSlug: 'orel-muzey-i-s-turgeneva'
      },
      { name: 'Парк «Дворянское гнездо»', desc: 'Литературно-мемориальный парк на обрывистом берегу, вдохновивший Тургенева на одноименный роман',
        locationSlug: 'orel-park-dvoryanskoe-gnezdo'
      },
      { name: 'Улица Ленина', desc: 'Главная пешеходная артерия города, полностью застроенная купеческими домами XIX столетия',
        locationSlug: 'orel-ulitsa-lenina'
      },
      { name: 'Памятник Ивану Грозному', desc: 'Первый в истории России памятник царю-основателю города Орла',
        locationSlug: 'orel-pamyatnik-ivanu-groznomu'
      },
      { name: 'Богоявленский собор', desc: 'Старейшее каменное здание города, сохранившее барочные элементы архитектуры',
        locationSlug: 'orel-bogoyavlenskiy-sobor'
      },
    ],
    travel:
      "Прямого авиасообщения в городе нет, поэтому основным и самым удобным транспортом являются скоростные поезда «Ласточка», которые долетают из Москвы до Орла всего за 3,5–4 часа. Автомобилисты могут с комфортом доехать по федеральной трассе М-2 «Крым» примерно за 4,5–5 часов. Лучший сезон для посещения литературной столицы России — период с мая по сентябрь, когда малые реки Ока и Орлик радуют прохладой, а старинные парки и дворянские усадьбы стоят в пышном убранстве. Золотая осень в первой половине октября также идеально подходит для поездок по тургеневским местам.",
    faq: [
    { q: "Почему Орёл официально называют «литературной столицей»?", a: "Здесь родились, жили или творили великие русские писатели: И. Тургенев, Н. Лесков, И. Бунин, А. Фет и Л. Андреев, чьи уникальные музеи сегодня объединены в большой заповедник." },
    { q: "Где находится визитная карточка города — скульптура Орла?", a: "Главный бронзовый монумент величественной птицы, свившей гнездо из колосьев, установлен на площади перед железнодорожным вокзалом и встречает всех гостей города." },
    { q: "Далеко ли от Орла находится усадьба Спасское-Лутовиново?", a: "Родовое имение Ивана Тургенева расположено в 65 км от Орла рядом со Мценском; туда можно легко добраться на пригородном автобусе или автомобиле за 1 час." },
    ]
  },
  orenburg: {
    brief:
      'Самобытный степной город, рожденный на стыке культур как главная крепость Оренбургского казачьего войска. Место, где встречаются Европа и Азия, а воздух пропитан ароматом полыни и легендами о бунте Емельяна Пугачева.',
    hookFact: 'А вы знали, что знаменитый оренбургский пуховый платок настолько тонкий, что настоящее, качественное изделие ручной работы размером два на два метра можно без труда протянуть сквозь обычное обручальное кольцо?',
    mustSee: [
      { name: 'Пешеходный мост «Европа — Азия»', desc: 'Знаменитый мост через реку Урал, условно соединяющий две части света',
        locationSlug: 'orenburg-peshehodnyy-most-evropa-aziya'
      },
      { name: 'Оренбургская детская железная дорога', desc: 'Одна из старейших действующих узкоколеек в стране вдоль реки',
        locationSlug: 'orenburg-orenburgskaya-detskaya-zheleznaya-doroga'
      },
      { name: 'Музейный комплекс «Национальная деревня»', desc: 'Этнографический парк с подворьями разных народов края',
        venueSlug: 'orenburg-muzeynyy-kompleks-natsional-naya-derevnya'
      },
      { name: 'Культурный комплекс «Караван-Сарай»', desc: 'Памятник архитектуры XIX века, стилизованный под традиционный башкирский аул',
        locationSlug: 'orenburg-kul-turnyy-kompleks-karavan-saray'
      },
      { name: 'Оренбургская набережная и станция «Комсомольская»', desc: 'Отреставрированная прогулочная зона с исторической деревянной станцией',
        locationSlug: 'orenburg-orenburgskaya-naberezhnaya-i-stantsiya-komsomol-skaya'
      },
      { name: 'Музей космонавтики', desc: 'Экспозиция, посвящённая Юрию Гагарину, который учился в местном лётном училище',
        venueSlug: 'orenburg-muzey-kosmonavtiki'
      },
    ],
    travel:
      "Международный аэропорт Оренбурга имени Ю. А. Гагарина принимает ежедневные прямые авиарейсы из Москвы (около 2 часов в воздухе), Санкт-Петербурга и Сочи. Также до города ходят регулярные поезда дальнего следования (время в пути из столицы — около суток), включая скоростные электрички из Самары и Уфы. Лучшее время для туристической поездки — май, июнь и сентябрь, когда в степном крае устанавливается комфортная теплая погода для прогулок по пешеходной Советской улице. Июль и август могут быть чересчур засушливыми и жаркими, а зимы здесь ветреные и морозные.",
    faq: [
    { q: "Где проходит знаменитая граница между Европой и Азией?", a: "Символическая граница двух частей света проходит прямо по реке Урал; через нее перекинут красивый пешеходный мост с памятными стелами на обоих берегах, по которому можно перейти за пару минут." },
    { q: "Где купить настоящий оренбургский пуховый платок?", a: "Покупать легендарную «паутинку» лучше всего в фирменных магазинах фабрики «Оренбургский пуховый платок» или в магазине при областном музее изобразительных искусств, чтобы гарантированно избежать подделок." },
    { q: "Можно ли из Оренбурга доехать до соленого озера Развал в Соль-Илецке?", a: "Да, знаменитый курорт с целебными грязями и аналогом Мертвого моря находится всего в 70 км к югу от города, туда в летний сезон каждые полчаса ходят рейсовые автобусы и маршрутки." },
    ]
  },
  abakan: {
    brief:
      'Столица Хакасии, окруженная древними степями, целебными озерами и мистическими курганами. Город привлекает археологов со всего мира и служит идеальной отправной точкой для путешествий по сибирским «местам силы» и сакральным памятникам древних цивилизаций.',
    hookFact: 'А вы знали, что Абакан называют «воротами в сибирскую Долину Царей»? Всего в часе езды от города находятся Салбыкские курганы - гигантские каменные мегалиты, которые старше знаменитого Стоунхенджа.',
    mustSee: [
      { name: 'Национальный музей Республики Хакасия', desc: 'Главный музей региона с археологией, этнографией и историей Хакасии',
        venueSlug: 'abakan-natsional-nyy-muzey-respubliki-hakasiya'
      },
      { name: 'Салбыкский курган', desc: 'Монументальный степной курган — одна из главных достопримечательностей Хакасии',
        locationSlug: 'abakan-salbykskiy-kurgan'
      },
      { name: 'Археологический комплекс «Сундуки»', desc: 'Древние наскальные рисунки и священные скалы в степи под Абаканом',
        locationSlug: 'abakan-arheologicheskiy-kompleks-sunduki'
      },
      { name: 'Петроглифы на скале Казанковка', desc: 'Наскальные изображения на берегу Енисея — важный памятник древней культуры',
        locationSlug: 'abakan-petroglify-na-skale-kazankovka'
      },
      { name: 'Саяно-Шушенская ГЭС', desc: 'Крупнейшая гидроэлектростанция России с впечатляющей плотиной и смотровыми площадками',
        locationSlug: 'abakan-sayano-shushenskaya-ges'
      },
      { name: 'Ботанический сад СО РАН', desc: 'Один из старейших ботанических садов Сибири с редкими растениями и прогулочными аллеями',
        locationSlug: 'abakan-botanicheskiy-sad-so-ran'
      },
    ],
    travel:
      "В международный аэропорт Абакана выполняются регулярные прямые рейсы из Москвы (около 4,5–5 часов в полете), Новосибирска и Красноярска. Также город связан прямым ж/д сообщением с Красноярском и Новокузнецком, а автомобилисты используют живописный федеральный тракт Р-257 «Енисей». Идеальное время для визита — лето (с июня по август): в Хакасии в этот период очень тепло и солнечно, что идеально для поездок к древним курганам, озерам и Саяно-Шушенской ГЭС. Конец мая и сентябрь хороши для комфортного экскурсионного туризма без летнего зноя.",
    faq: [
    { q: "Сколько времени нужно на осмотр самого Абакана?", a: "Для прогулки по центру, посещения парков и великолепного Краеведческого музея вполне достаточно одного полного дня." },
    { q: "Далеко ли от города находится Саяно-Шушенская ГЭС?", a: "Грандиозная плотина расположена примерно в 120 км к югу от Абакана рядом с Саяногорском, туда можно доехать на машине за 1,5–2 часа." },
    { q: "Что такое хакасский талкан и где его попробовать?", a: "Это традиционный продукт из обжаренного ячменя или пшеницы; его подают в виде сытных десертных шариков с медом и маслом в этно-кафе города." },
    ]
  },
  pskov: {
    brief:
      'Мощный город-воин и одна из древнейших каменных крепостей Руси, веками служившая неприступным «щитом» на западных рубежах страны. Место, где среди суровых стен древнего Крома бьется пульс средневековой истории.',
    hookFact: 'А вы знали, что псковские средневековые храмы внесены в список всемирного наследия ЮНЕСКО? Их уникальная архитектура из белого известняка с приземистыми звонницами не имеет аналогов в мире.',
    mustSee: [
      { name: 'Псковский Кром (Кремль)', desc: 'Средневековая крепость на слиянии Великой и Псковы с Троицким собором',
        locationSlug: 'pskov-pskovskiy-krom-kreml'
      },
      { name: 'Довмонтов город', desc: 'Археологический музей под открытым небом у стен Крома с фундаментами древних храмов',
        locationSlug: 'pskov-dovmontov-gorod'
      },
      { name: 'Храмы псковской архитектурной школы', desc: 'Памятники ЮНЕСКО: церковь Василия на Горке, Спасо-Преображенский собор Мирожского монастыря',
        locationSlug: 'pskov-hramy-pskovskoy-arhitekturnoy-shkoly'
      },
      { name: 'Гремячая башня', desc: 'Самая высокая оборонительная башня Пскова на крутом берегу реки',
        locationSlug: 'pskov-gremyachaya-bashnya'
      },
      { name: 'Изборская крепость', desc: 'Древний форпост в 30 км от города с башней Луковка и Словенскими ключами',
        locationSlug: 'pskov-izborskaya-krepost'
      },
      { name: 'Псково-Печерский монастырь', desc: 'Крупный монастырь с карстовыми пещерами — одна из главных святынь Северо-Запада',
        locationSlug: 'pskov-pskovo-pecherskiy-monastyr'
      },
    ],
    travel:
      "В международный аэропорт Пскова Кресты выполняются регулярные прямые авиарейсы из Москвы (полет занимает около 1,5 часов), Сочи, Калининграда и Минвод. Из Санкт-Петербурга до Пскова несколько раз в день ходит скоростная «Ласточка» (3,5 часа в пути), а из Москвы курсирует комфортабельный фирменный ночной поезд. Лучшее время для погружения в древнерусскую историю — с мая по сентябрь, когда можно с комфортом гулять по мощным боевым ходам Крома, кататься на лодках по реке Великой и осматривать монастыри. Золотая осень в октябре невероятно преображает Пушкинские Горы.",
    faq: [
    { q: "Нужно ли покупать билет для входа на территорию Псковского Кремля (Крома)?", a: "Проход на саму историческую территорию крепости абсолютно бесплатный для всех, билеты требуются только для подъема на смотровую площадку Власьевской башни и в музеи Приказных палат." },
    { q: "Что за необычная надпись «Россия начинается здесь» установлена у стен крепости?", a: "Это огромный светящийся арт-объект, смонтированный из букв старой культовой вывески гостиницы «Россия» в Москве, который расположен на набережной у подножия Крома и стал любимой фотозоной туристов." },
    { q: "Далеко ли от Пскова находятся Изборск и Печоры?", a: "Древняя Изборская крепость с ключами и Псково-Печерский Свято-Успенский монастырь находятся в одном направлении в 30 и 50 км от Пскова соответственно; туда ежедневно ходят рейсовые автобусы №207 от автовокзала." },
    ]
  },
  sevastopol: {
    brief:
      'Легендарный белокаменный город-герой и главная база Черноморского флота, раскинувшийся на берегах более чем тридцати живописных морских бухт. Место невероятной концентрации памятников мужества, античной истории и потрясающей приморской романтики.',
    hookFact: 'Знаете ли вы, что прямо в черте Севастополя находятся руины античного города Херсонес Таврический, который старше самого Рима? Именно здесь более тысячи лет назад принял крещение киевский князь Владимир, положив начало крещению всей Руси.',
    mustSee: [
      { name: 'Памятник затопленным кораблям и Графская пристань', desc: 'Главный символ города на Приморском бульваре, установленный прямо в воде',
        locationSlug: 'sevastopol-pamyatnik-zatoplennym-korablyam-i-grafskaya-pristan'
      },
      { name: 'Музей-заповедник «Херсонес Таврический»', desc: 'Руины древнегреческого и византийского полиса, место крещения князя Владимира',
        venueSlug: 'sevastopol-muzey-zapovednik-hersones-tavricheskiy'
      },
      { name: 'Малахов курган и Сапун-гора', desc: 'Мемориалы двух героических оборон города с панорамами и военной техникой',
        locationSlug: 'sevastopol-malahov-kurgan-i-sapun-gora'
      },
      { name: 'Балаклавская бухта', desc: 'Живописный фьорд с генуэзской крепостью Чембало и подземным музеем подлодок',
        locationSlug: 'sevastopol-balaklavskaya-buhta'
      },
      { name: 'Мыс Фиолент', desc: 'Отвесные скалы, бирюзовая вода и Свято-Георгиевский монастырь на обрыве',
        locationSlug: 'sevastopol-mys-fiolent'
      },
      { name: 'Музей Черноморского флота', desc: 'Один из старейших морских музеев мира в историческом здании в центре города',
        venueSlug: 'sevastopol-muzey-chernomorskogo-flota'
      },
    ],
    travel:
      "В связи с временным закрытием авиасообщения на полуострове, основным способом логистики являются поезда «Таврия» (ходят прямые составы из Москвы, Санкт-Петербурга и других городов до ж/д вокзала Севастополя). Также можно долететь до Сочи или Минеральных Вод, откуда пересесть на регулярные междугородние автобусы. Идеальный сезон для посещения — сентябрь и начало октября (бархатный сезон), когда море еще очень теплое, а жара спадает, создавая идеальные условия для экскурсий по Приморскому бульвару и Херсонесу Таврическому. Весна в мае привлекает туристов пышным цветением маков по всему побережью.",
    faq: [
    { q: "Нужно ли платить за вход на территорию древнего Херсонеса?", a: "Территория музея-заповедника «Херсонес Таврический» является платной для туристов, однако для жителей города Севастополя при предъявлении паспорта действует бесплатный вход." },
    { q: "Как добраться из центра города до знаменитой Балаклавской бухты?", a: "Балаклава является частью Севастополя; доехать туда из центра можно на городских автобусах или маршрутках №94 и №9 от транспортного узла «5-й километр» за 20–30 минут." },
    { q: "Как работает морской общественный транспорт в Севастополе?", a: "Из-за уникального рельефа бухты катера и паромы являются обычным городским транспортом, на котором можно по цене автобусного билета быстро переправиться с Графской пристани на Северную сторону." },
    ]
  },
  simferopol: {
    brief:
      'Солнечные и гостеприимные «ворота Крыма», расположенные на пересечении всех главных туристических маршрутов полуострова. Город цветущих каштанов, старинных зеленых бульваров, театров и древних тайн, скрытых в руинах скифской столицы.',
    hookFact: 'А вы знали, что из Симферополя в Ялту идет самый длинный в мире троллейбусный маршрут? Его протяженность составляет рекордные 86 километров, а сама трасса проходит через живописные горные перевалы и панорамы черноморского побережья.',
    mustSee: [
      { name: 'Археологический заповедник «Скифский Неаполь»', desc: 'Остатки древней столицы позднескифского государства с панорамой на город',
        locationSlug: 'simferopol-arheologicheskiy-zapovednik-skifskiy-neapol'
      },
      { name: 'Караимская кенасса', desc: 'Редкий памятник культовой архитектуры караимов с восточными мотивами',
        locationSlug: 'simferopol-karaimskaya-kenassa'
      },
      { name: 'Улицы Пушкина и Карла Маркса', desc: 'Исторический центр «Старого города» с купеческими особняками и кафе',
        locationSlug: 'simferopol-ulitsy-pushkina-i-karla-marksa'
      },
      { name: 'Гагаринский парк', desc: 'Крупнейший городской парк Крыма с прудами, аллеями и колесом обозрения',
        locationSlug: 'simferopol-gagarinskiy-park'
      },
      { name: 'Симферопольское водохранилище', desc: 'Искусственное водохранилище на окраине с видами на Чатыр-Даг',
        locationSlug: 'simferopol-simferopol-skoe-vodohranilische'
      },
      { name: 'Мраморная и Красная пещеры', desc: 'Оборудованные пещерные комплексы в окрестностях — одни из красивейших в Европе',
        locationSlug: 'simferopol-mramornaya-i-krasnaya-peschery'
      },
    ],
    travel:
      "Доехать до Симферополя можно на регулярных поездах дальнего следования «Таврия» со всех крупных железнодорожных узлов России. Автомобилисты и пассажиры автобусов прибывают на полуостров через Крымский мост, следуя по современной четырехполосной федеральной трассе «Таврида». Лучшее время для поездки — май, июнь и сентябрь, когда в столице региона тепло и комфортно гулять по Екатерининскому саду и набережной реки Салгир. Июль и август могут быть слишком жаркими для городских экскурсий, так как город расположен в степной части полуострова вдали от моря.",
    faq: [
    { q: "Есть ли в Симферополе море?", a: "Прямого выхода к морю у города нет, ближайшие пляжи Каламитского залива (Николаевка) расположены примерно в 40 км, куда можно доехать на автобусе за 40 минут." },
    { q: "Что такое Неаполь Скифский и где его искать?", a: "Это уникальный археологический заповедник на месте древней столицы позднескифского государства, расположенный на Петровских высотах прямо в черте города." },
    { q: "Правда ли, что из Симферополя в Ялту ходит троллейбус?", a: "Да, это уникальный и самый длинный в мире междугородний троллейбусный маршрут (протяженность — 86 км), который идет от ж/д вокзала Симферополя через Ангарский перевал прямо к Южному берегу Крыма." },
    ]
  },
  penza: {
    brief:
      'Невероятно зеленый и поэтичный город в Поволжье, тесно связанный с именами Лермонтова и Белинского. Город старинных деревянных усадеб, уникальных подвесных мостов и душевной, размеренной атмосферы.',
    hookFact: 'А вы знали, что Пенза - это официальная родина русского цирка? Именно здесь в 1873 году братья Никитины открыли первый в Российской империи стационарный цирк, нарушив монополию иностранных бродячих трупп.',
    mustSee: [
      { name: 'Музей одной картины им. Г. В. Мясникова', desc: 'Уникальный формат, где зрителям показывают фильм об одном шедевре, а затем саму картину',
        venueSlug: 'penza-muzey-odnoy-kartiny-im-g-v-myasnikova'
      },
      { name: 'Пензенская пешеходная улица (Московская)', desc: 'Старейшая улица города с фонтанной площадью и часами с кукушкой',
        locationSlug: 'penza-penzenskaya-peshehodnaya-ulitsa-moskovskaya'
      },
      { name: 'Парк имени В. Г. Белинского', desc: 'Старинный тенистый парк на горе с вековыми дубами и планетарием',
        locationSlug: 'penza-park-imeni-v-g-belinskogo'
      },
      { name: 'Музей-заповедник «Тарханы»', desc: 'Загородное имение, где провёл детство поэт Михаил Лермонтов (в области)',
        venueSlug: 'penza-muzey-zapovednik-tarhany'
      },
      { name: 'Светозвуковой фонтан', desc: 'Современный светомузыкальный комплекс, излюбленное место вечерних встреч',
        locationSlug: 'penza-svetozvukovoy-fontan'
      },
      { name: 'Памятник Первопоселенцу', desc: 'Монумент на смотровой площадке старой крепости, ставший визитной карточкой Пензы',
        locationSlug: 'penza-pamyatnik-pervoposelentsu'
      },
    ],
    travel:
      "Аэропорт Пензы имени В. Г. Белинского принимает регулярные прямые авиарейсы из Москвы (время в полете — чуть больше 1 часа), Санкт-Петербурга, Минвод и Сочи. Любители поездов могут воспользоваться фирменным ночным составом «Сура», который доезжает с Казанского вокзала столицы за 11 часов. Лучшее время для комфортного экскурсионного туризма — с конца мая по начало сентября, когда на пешеходной Московской улице бьют фонтаны и открыты уличные кафе. Осень привлекает ценителей литературы, стремящихся попасть на знаменитые лермонтовские праздники в Тарханах.",
    faq: [
    { q: "Правда ли, что в Пензе находится единственный в мире музей Мейерхольда?", a: "Да, уникальный Центр театрального искусства «Дом Мейерхольда» расположен в подлинном деревянном особняке купеческой усадьбы, где великий режиссер провел детство и юность." },
    { q: "Как работает знаменитый пензенский Светомузыкальный фонтан?", a: "Масштабный фонтан на одноименной площади в центре города работает ежедневно, а красочные лазерные и музыкальные шоу запускаются в вечернее время по выходным и праздникам." },
    { q: "Далеко ли от города находится музей-заповедник «Тарханы»?", a: "Родина Михаила Лермонтова расположена в 100 км от Пензы в селе Лермонтово, доехать туда можно на регулярных проходящих автобусах в сторону Тамбова за 1,5 часа." },
    ]
  },
  volgograd: {
    brief:
      'Великий и монументальный город-герой, растянувшийся почти на 100 километров вдоль Волги. Место грандиозных исторических событий, где каждый мемориал и каждая улица пропитаны памятью о величайшем переломе в истории Второй мировой войны.',
    hookFact: 'А вы знали, что волгоградская статуя «Родина-мать зовёт!» при строительстве была занесена в Книгу рекордов Гиннесса как самая высокая скульптура-статуя в мире? Её общая высота - 85 метров.',
    mustSee: [
      { name: 'Мамаев курган', desc: 'Грандиозный мемориальный комплекс, увенчанный знаменитой 85-метровой статуей «Родина-мать зовёт!»',
        locationSlug: 'volgograd-mamaev-kurgan'
      },
      { name: 'Музей-панорама «Сталинградская битва»', desc: 'Крупнейшее художественное полотно-панорама России',
        venueSlug: 'volgograd-muzey-panorama-stalingradskaya-bitva'
      },
      { name: 'Центральная набережная имени 62-й Армии', desc: 'Парадные ворота города со сталинской архитектурой и променадами у Волги',
        locationSlug: 'volgograd-tsentral-naya-naberezhnaya-imeni-62-y-armii'
      },
      { name: 'Волгоградский метротрам', desc: 'Уникальный скоростной трамвай, который часть пути идёт под землёй как метро',
        locationSlug: 'volgograd-volgogradskiy-metrotram'
      },
      { name: 'Мельница Гергардта', desc: 'Разрушенное кирпичное здание, оставленное как немой свидетель ожесточенности боёв',
        locationSlug: 'volgograd-mel-nitsa-gergardta'
      },
      { name: 'Дом Павлова', desc: 'Легендарный жилой дом, который героически обороняла группа советских бойцов в течение 58 дней',
        locationSlug: 'volgograd-dom-pavlova'
      },
    ],
    travel:
      "Международный аэропорт Волгограда Гумрак принимает ежедневные прямые рейсы из Москвы (около 2 часов в воздухе), Санкт-Петербурга и других крупных городов. Также развито регулярное ж/д сообщение, а поездка на автомобиле из столицы займет около 12–14 часов по федеральной трассе Р-22 «Каспий». Лучшее время для комфортного экскурсионного туризма — май (когда город пышно празднует День Победы) и сентябрь–октябрь, когда спадает экстремальная летняя жара. Июль и август могут быть слишком знойными для долгих прогулок под открытым небом на Мамаевом кургане.",
    faq: [
    { q: "Сколько времени нужно, чтобы подняться на Мамаев курган?", a: "Пеший подъем от подножия холма до подножия монумента «Родина-мать зовет!» с осмотром всех площадей занимает около 1–1,5 часов." },
    { q: "Что такое метротрам и где на него прокатиться?", a: "Это уникальная для России система скоростного трамвая, линии которой в центре города проходят под землей по принципу обычного метро; сесть на него можно на станциях «Площадь Ленина» или «Комсомольская»." },
    { q: "Какое гастрономическое чудо попробовать в Волгограде?", a: "Обязательно попробуйте знаменитое местное горчичное масло сарептского производства и блюда из донской рыбы." },
    ]
  },
  smolensk: {
    brief:
      'Один из древнейших городов Руси, гордо носящий звание «щита России» за то, что веками первым принимал на себя удары западных завоевателей. Город величественных холмов, древних храмов и монументальной крепостной стены, которая до сих пор поражает своим масштабом.',
    hookFact: 'Знаете ли вы, что Смоленская крепостная стена - это самая большая кирпичная крепость в мире, сохранившаяся до наших дней? Борис Годунов ласково называл её «ожерельем всея Руси», а её стены протяженностью изначально 6,5 км строила буквально вся страна.',
        mustSee: [
      { name: 'Смоленская крепостная стена', desc: 'Главная каменная крепость России рубежа XVI-XVII веков',
        locationSlug: 'smolensk-smolenskaya-krepostnaya-stena'
      },
      { name: 'Свято-Успенский кафедральный собор', desc: 'Бело-бирюзовый барочный собор на Соборной горе',
        venueSlug: 'smolensk-svyato-uspenskiy-kafedralnyy-sobor'
      },
      { name: 'Громовая башня', desc: 'Музеефицированная башня крепости с экспозицией XVII века',
        locationSlug: 'smolensk-gromovaya-bashnya'
      },
      { name: 'Лопатинский сад', desc: 'Старейший парк Смоленска внутри оборонительного рва',
        locationSlug: 'smolensk-lopatinskiy-sad'
      },
      { name: 'Памятник «Благодарная Россия героям 1812 года» (Памятник с орлами)', desc: 'Монумент 1812 года с бронзовыми орлами в сквере Памяти Героев',
        locationSlug: 'smolensk-pamyatnik-blagodarnaya-rossiya-geroyam-1812-goda-pamyatnik-s-orlami'
      },
      { name: 'Историко-архитектурный комплекс «Теремок» (Флёново)', desc: 'Неорусская усадьба Тенишевой в 15 километрах от Смоленска',
        venueSlug: 'smolensk-istoriko-arhitekturnyy-kompleks-teremok-flenovo'
      },
    ],
    sights: [
      { title: "Смоленская крепостная стена", text: "Грандиозное оборонительное сооружение начала XVII века, за свой масштаб и величие названное Борисом Годуновым «ожерельем всея Руси»." },
      { title: "Свято-Успенский кафедральный собор", text: "Величественный парящий на холме храм, который пережил несколько войн и хранит чудотворную Смоленскую икону Божией Матери." },
      { title: "Громовая башня", text: "Одна из самых красивых и полностью отреставрированных башен крепости, внутри которой сегодня открыта интерактивная военно-историческая экспозиция." },
      { title: "Лопатинский сад", text: "Центральный ландшафтный парк с королевскими бастионами, старинными памятниками, прудом с лебедями и макетами утраченных зданий." },
      { title: "Памятник «Благодарная Россия героям 1812 года»", text: "Знаменитый монумент с орлами, штурмующими скалу, ставший одним из главных символов мужества жителей Смоленска." },
      { title: "Историко-архитектурный комплекс «Теремок» (Флёново)", text: "Загородная усадьба меценатки Марии Тенишевой с уникальным сказочным домиком и мозаиками Николая Рериха." },
    ],
    travel:
      "Быстрее и комфортнее всего добираться из Москвы на скоростном поезде «Ласточка», который доезжает до города всего за 3,5–4 часа. Также через Смоленск курсируют регулярные поезда из Санкт-Петербурга, Минска и Адлера, а автомобилисты могут доехать по прямой федеральной трассе М-1. Лучшее время для туристической поездки — с мая по сентябрь, когда город утопает в зелени, работают фонтаны и комфортно гулять вдоль крепостной стены. Особенно красиво здесь в первой половине осени, когда старинные парки окрашиваются в золотые тона.",
    faq: [
      { q: "Сколько дней нужно на осмотр Смоленска?", a: "Для первого знакомства и неспешного осмотра крепости, соборов и центральных парков вполне достаточно 2 полных дней (стандартные выходные)." },
      { q: "Можно ли подняться на Смоленскую крепостную стену?", a: "Официально подниматься на необорудованные прясла стены запрещено из соображений безопасности, но можно посетить отреставрированные башни с музеями внутри." },
      { q: "Что привезти из Смоленска в подарок?", a: "Самые популярные гастрономические сувениры — это знаменитый смоленский кустарный вяленый сахар (эко-сладость по старинным рецептам) и бальзам «Смоленский»." },
    ]
  },
  syktyvkar: {
    brief:
      'Самобытная столица Республики Коми, где современный городской комфорт гармонично переплетается с суровыми и таинственными легендами Севера. Город таежного уюта, старинных этнографических музеев и уникальной деревянной архитектуры.',
    hookFact: 'Знаете ли вы, что в Сыктывкаре находится одна из самых узких улиц в мире? Грибной переулок имеет ширину в самом узком месте всего 10 сантиметров - пройти по нему невозможно, но это культовый арт-объект, у которого обожают фотографироваться туристы.',
        mustSee: [
      { name: 'Свято-Стефановский кафедральный собор', desc: 'Главный храм Коми с 64-метровым золоченым крестом',
        venueSlug: 'syktyvkar-svyato-stefanovskiy-kafedralnyy-sobor'
      },
      { name: 'Национальная галерея Республики Коми', desc: 'Главное собрание искусства Коми в здании духовного училища',
        venueSlug: 'syktyvkar-natsionalnaya-galereya-respubliki-komi'
      },
      { name: 'Улица Куратова и купеческие дома', desc: 'Историческая улица Усть-Сысольска с купеческой застройкой',
        locationSlug: 'syktyvkar-ulitsa-kuratova-i-kupecheskie-doma'
      },
      { name: 'Пожарная каланча', desc: 'Краснокирпичная часовая башня действующей пожарной части',
        locationSlug: 'syktyvkar-pozharnaya-kalancha'
      },
      { name: 'Памятник купеческому сундуку', desc: 'Бронзовый сундук-талисман купеческого успеха в центре города',
        locationSlug: 'syktyvkar-pamyatnik-kupecheskomu-sunduku'
      },
      { name: 'Арт-объект «Коми пасы»', desc: 'Этно-футуристическая стела с древними знаками Коми',
        locationSlug: 'syktyvkar-art-obekt-komi-pasy'
      },
    ],
    sights: [
      { title: "Свято-Стефановский кафедральный собор", text: "Монументальный златоглавый белокаменный храм высотой более 60 метров, являющийся главным духовным центром Республики Коми." },
      { title: "Национальная галерея Республики Коми", text: "Единственный в регионе художественный музей, расположенный в красивом историческом здании бывшего духовного училища и окруженный живописным садом скульптур." },
      { title: "Улица Куратова и купеческие дома", text: "Исторический квартал города, где сохранились аутентичные деревянные и каменные особняки дореволюционных предпринимателей Сухановых." },
      { title: "Пожарная каланча", text: "Визитная карточка Сыктывкара начала XX века, на вершине которой до сих пор установлен манекен-пожарный в исторической форме." },
      { title: "Памятник купеческому сундуку", text: "Оригинальный современный арт-объект в центре города, символизирующий финансовое благополучие и купеческие корни столицы." },
      { title: "Арт-объект «Коми пасы»", text: "Уникальная уличная инсталляция, знакомящая туристов с древним промысловым календарем и сакральной письменностью коренных народов Севера." },
    ],
    travel:
      "Прямой перелет из Москвы или Санкт-Петербурга в международный аэропорт Сыктывкара займет всего около 2 часов. Любители неспешных путешествий под стук колес могут воспользоваться фирменным поездом «Сыктывкар», который идет из столицы чуть больше суток. Лучший сезон для классического экскурсионного туризма — лето (с июня по август), когда в Коми тепло и можно отправиться на загородные экологические маршруты. Если вы хотите застать настоящую зимнюю сказку с катанием на оленях и заснеженной тайгой, планируйте поездку на февраль или март.",
    faq: [
      { q: "Правда ли, что в Сыктывкаре есть самая узкая улица в мире?", a: "Да, Грибной переулок шириной всего около 10 сантиметров неофициально считается самым узким, это популярный у туристов арт-объект." },
      { q: "Далеко ли от Сыктывкара до плато Маньпупунёр?", a: "Пешком или на машине добраться туда напрямую нельзя; туры на знаменитые столбы выветривания из Сыктывкара организуются в основном на вертолетах." },
      { q: "Какое национальное блюдо стоит попробовать?", a: "Обязательно отведайте коми шаньги (круглые открытые пирожки с картошкой или ягодами) и блюда из свежей оленины." },
    ]
  },
  'yuzhno-sahalinsk': {
    brief:
      'Уникальный островной город на самом краю России, окруженный живописными сопками, бамбуковыми зарослями и первозданной природой Дальнего Востока. Место поразительных контрастов, где русская культура переплелась с японским наследием эпохи Карафуто и невероятной морской гастрономией.',
    hookFact: 'Знаете ли вы, что Южно-Сахалинск - это мировая столица гигантского лопуха? Местные растения из-за уникального климата и состава почвы вырастают в высоту до трех метров, а их листья туристы часто используют вместо полноценных зонтов во время дождя.',
        mustSee: [
      { name: 'Сахалинский областной краеведческий музей', desc: 'Подлинное японское здание 1937 года с садом и историей острова',
        venueSlug: 'yuzhno-sahalinsk-sahalinskiy-oblastnoy-kraevedcheskiy-muzey'
      },
      { name: 'Горнолыжный комплекс «Горный воздух»', desc: 'Круглогодичный курорт на городских склонах с гондолами и панорамой долины',
        locationSlug: 'yuzhno-sahalinsk-gornolyzhnyy-kompleks-gornyy-vozduh'
      },
      { name: 'Музейно-мемориальный комплекс «Победа»', desc: 'Интерактивный военно-исторический комплекс о событиях 1945 года на Сахалине',
        venueSlug: 'yuzhno-sahalinsk-muzeyno-memorialnyy-kompleks-pobeda'
      },
      { name: 'Кафедральный собор Рождества Христова', desc: '77-метровый белокаменный собор с мозаиками на площади Победы',
        venueSlug: 'yuzhno-sahalinsk-kafedralnyy-sobor-rozhdestva-hristova'
      },
      { name: 'Сахалинский зооботанический парк', desc: 'Островной зоопарк и ботанический сад с дальневосточными животными',
        venueSlug: 'yuzhno-sahalinsk-sahalinskiy-zoobotanicheskiy-park'
      },
      { name: 'Грязевой вулкан Южно-Сахалинский', desc: 'Геологический памятник с булькающими грязевыми конусами среди тайги',
        locationSlug: 'yuzhno-sahalinsk-gryazevoy-vulkan-yuzhno-sahalinskiy'
      },
    ],
    sights: [
      { title: "Сахалинский областной краеведческий музей", text: "Уникальное и красивейшее деревянное здание в традиционном японском архитектурном стиле «тейкан-дзуку», построенное в 1937 году." },
      { title: "Горнолыжный комплекс «Горный воздух»", text: "Современный курорт прямо в черте города, предлагающий гостям канатную дорогу и лучшие панорамные виды на Южно-Сахалинск с горы Большевик." },
      { title: "Музейно-мемориальный комплекс «Победа»", text: "Масштабный и технологичный интерактивный музей с уникальными трехмерными панорамами, посвященными освобождению Южного Сахалина и Курил." },
      { title: "Кафедральный собор Рождества Христова", text: "Грандиозный храм, облицованный иерусалимским камнем, украшенный крупнейшей в мире наружной мозаикой ручной работы." },
      { title: "Зооботанический парк", text: "Один из крупнейших на Дальнем Востоке природных парков, где в комфортных условиях содержатся редкие представители островной и мировой фауны." },
      { title: "Грязевой вулкан Южно-Сахалинский", text: "Памятник природы в окрестностях города, где можно вживую увидеть необычное бурление глиняных полей и ландшафты, напоминающие инопланетные." },
    ],
    travel:
      "Основной и самый быстрый способ добраться на остров — прямой авиаперелет из Москвы, который занимает около 8 часов, либо рейсы со стыковкой в Хабаровске и Владивостоке. Главный туристический сезон на Сахалине длится с августа по октябрь: в это время море прогревается, сходит туман, созревают дикие ягоды и открывается идеальный доступ ко всем природным достопримечательностям. Горнолыжникам и сноубордистам лучше всего прилетать с конца декабря по апрель, когда склоны «Горного воздуха» гарантированно покрыты плотным слоем отличного снега.",
    faq: [
      { q: "Нужен ли пропуск для въезда в Южно-Сахалинск?", a: "Нет, для посещения самого города и большинства популярных туристических мест острова специальный пограничный пропуск гражданам РФ не требуется." },
      { q: "Можно ли бюджетно поесть морепродукты в городе?", a: "На местных рынках («Успенский», «Техник») можно выгодно купить свежего краба, креветки и икру, которые вам там же бесплатно приготовят." },
      { q: "Как работает канатная дорога «Горный воздух»?", a: "Нижняя станция подъемника расположена прямо в центре города, до нее можно дойти пешком или доехать на городском автобусе за 10 минут." },
    ]
  },
  kaluga: {
    brief:
      'Уютная колыбель мировой космонавтики, где купеческие усадьбы эпохи классицизма соседствуют с футуристическими космическими объектами. Город, где жил и работал Константин Циолковский, пропитан атмосферой мечтаний о звездах и тихим очарованием старой русской провинции.',
    hookFact: 'Знаете ли вы, что первый камень в фундамент калужского Музея космонавтики заложил лично Юрий Гагарин всего через два месяца после своего легендарного полета в космос, забросив в раствор пять копеек «на удачу»?',
    mustSee: [
      { name: 'Государственный музей истории космонавтики им. К. Э. Циолковского', desc: 'Первый в мире космический музей с ракетой «Восток» у Яченского водохранилища.',
        venueSlug: 'kaluga-gosudarstvennyy-muzey-istorii-kosmonavtiki-im-k-e-tsiolkovskogo'
      },
      { name: 'Дом-музей К. Э. Циолковского', desc: 'Деревянная усадьба ученого с подлинной мастерской и аэродинамической трубой.',
        venueSlug: 'kaluga-dom-muzey-k-e-tsiolkovskogo'
      },
      { name: 'Калужские Гостиные ряды', desc: 'Красно-белый торговый квартал XVIII века с аркадами на Старом Торге.',
        locationSlug: 'kaluga-kaluzhskie-gostinye-ryady'
      },
      { name: 'Каменный мост', desc: 'Старейший каменный виадук России 1785 года над Березуйским оврагом.',
        locationSlug: 'kaluga-kamennyy-most'
      },
      { name: 'Улица Театральная (Калужский Арбат)', desc: 'Пешеходная артерия с бронзовым Циолковским у велосипеда и купеческими домами.',
        locationSlug: 'kaluga-ulitsa-teatral-naya-kaluzhskiy-arbat'
      },
      { name: 'Калужский областной драматический театр', desc: 'Драмтеатр 1777 года в сталинском ампире на Театральной площади.',
        venueSlug: 'kaluga-kaluzhskiy-oblastnoy-dramaticheskiy-teatr'
      },
    ],
    sights: [
      { title: "Государственный музей истории космонавтики им. К. Э. Циолковского", text: "Первый в мире и крупнейший в России космический музей с подлинными ракетами, спускаемыми аппаратами и суперсовременным планетарием." },
      { title: "Дом-музей К. Э. Циолковского", text: "Мемориальный деревянный дом на окраине города, где великий ученый прожил несколько десятилетий и разработал основы теоретической космонавтики." },
      { title: "Калужские Гостиные ряды", text: "Великолепный архитектурный ансамбль конца XVIII века в стиле неоготики с яркими красно-белыми арками, где сегодня кипит культурная жизнь города." },
      { title: "Каменный мост", text: "Старейший и крупнейший в России действующий виадук, построенный по принципу древнеримских сооружений над Березуйским оврагом." },
      { title: "Улица Театральная (Калужский Арбат)", text: "Пешеходная часть старинной улицы с купеческими особняками, сувенирными лавками, уютными кофейнями и скульптурой Циолковского с велосипедом." },
      { title: "Калужский областной драматический театр", text: "Монументальное здание на Театральной площади, являющееся домом для одного из старейших и ведущих театральных коллективов страны." },
    ],
    travel:
      "Из Москвы до Калуги удобнее всего доехать на экспресс-электричке с Киевского вокзала (время в пути — около 2 часов) или на автомобиле по Киевскому шоссе. Также в городе есть собственный международный аэропорт, принимающий рейсы из южных и курортных регионов России. Калуга прекрасна в любое время года, но идеальным сезоном считается период с мая по сентябрь, когда комфортно гулять по историческому центру и посещать уличные фестивали. Зимой город привлекает туристов уютной праздничной иллюминацией и теплыми залами космического музея.",
    faq: [
      { q: "Как добраться из Калуги до арт-парка Никола-Ленивец?", a: "Проще всего доехать на автомобиле или такси (около 80 км от города), также по выходным ходят прямые туристические автобусы." },
      { q: "Нужно ли покупать билет в Музей космонавтики заранее?", a: "В выходные и праздничные дни на входе бывают очереди, поэтому билеты в музей и особенно в планетарий лучше бронировать онлайн на официальном сайте." },
      { q: "Что такое «Калужское тесто» и где его купить?", a: "Это знаменитый старинный десерт из сухарей, меда и специй, напоминающий мягкое пирожное; продается в фирменных сувенирных лавках центра." },
    ]
  },
  kostroma: {
    brief:
      'Древняя жемчужина Золотого кольца на Волге, сохранившая уникальную веерную планировку улиц, утвержденную еще Екатериной II. Город ювелиров, сыроваров и монументального Ипатьевского монастыря, который стал колыбелью великой царской династии Романовых.',
    hookFact: 'А вы знали, что Кострома - это официальная родина сразу двух культовых сказочных персонажей? Именно в костромских лесах совершил свой подвиг Иван Сусанин, и здесь же находится единственный в России терем Снегурочки.',
        mustSee: [
      { name: 'Свято-Троицкий Ипатьевский монастырь', desc: 'Главная святыня Костромы и колыбель дома Романовых у слияния Костромы и Волги.',
        venueSlug: 'kostroma-svyato-troitskiy-ipatevskiy-monastyr'
      },
      { name: 'Костромские Торговые ряды', desc: 'Грандиозный комплекс купеческих рядов XVIII века, который до сих пор остается живым торговым сердцем Костромы.',
        locationSlug: 'kostroma-kostromskie-torgovye-ryady'
      },
      { name: 'Сусанинская площадь («Сковородка»)', desc: 'Круглая парадная площадь Костромы с радиальной планировкой и памятником Ивану Сусанину.',
        locationSlug: 'kostroma-susaninskaya-ploschad-skovorodka'
      },
      { name: 'Пожарная каланча на Сусанинской площади', desc: 'Главный архитектурный символ Костромы и изящная пожарная башня позднего классицизма.',
        locationSlug: 'kostroma-pozharnaya-kalancha-na-susaninskoy-ploschadi'
      },
      { name: 'Терем Снегурочки', desc: 'Сказочный терем и ледяная комната Снегурочки на высоком берегу Волги.',
        venueSlug: 'kostroma-terem-snegurochki'
      },
      { name: 'Музей сыра', desc: 'Интерактивный музей сыроварения с дегустациями и крафтовыми сортами в центре Костромы.',
        venueSlug: 'kostroma-muzey-syra'
      },
    ],
    sights: [
      { title: "Свято-Троицкий Ипатьевский монастырь", text: "Знаменитая обитель на берегу реки Костромы, признанная «колыбелью династии Романовых», ведь именно отсюда Михаила Федоровича призвали на царство." },
      { title: "Костромские Торговые ряды", text: "Грандиозный и отлично сохранившийся гостиный двор конца XVIII века, состоящий из множества специализированных галерей (Квасных, Пряничных, Красных)." },
      { title: "Сусанинская площадь («Сковородка»)", text: "Уникальная центральная площадь радиально-веерной планировки, от которой лучами расходятся главные улицы города." },
      { title: "Пожарная каланча на Сусанинской площади", text: "Выдающийся памятник архитектуры классицизма XIX века с изящной смотровой вышкой, которой когда-то восхищался император Николай I." },
      { title: "Терем Снегурочки", text: "Сказочный интерактивный развлекательный комплекс, где круглый год можно встретиться с внучкой Деда Мороза и побывать в настоящей Ледяной комнате." },
      { title: "Музей сыра", text: "Популярное гастрономическое пространство в старинном купеческом особняке, где в игровой форме рассказывают историю сыроварения и проводят профессиональные дегустации." },
    ],
    travel:
      "Из Москвы до Костромы можно долететь за пару часов на самолете, доехать на автомобиле по Ярославскому шоссе или с комфортом добраться на скоростном поезде «Ласточка» за 4 часа. Город также является обязательной остановкой для большинства круизных теплоходов, курсирующих по Волге. Лучшее время для визита — период навигации с конца мая по август, когда можно совместить экскурсии с речными прогулками. Новогодние праздники — второй пик сезона, ведь Кострома официально считается родиной Снегурочки, и сюда едут за зимней сказкой.",
    faq: [
      { q: "Где в Костроме раскинулись те самые Торговые ряды?", a: "Грандиозный комплекс находится в самом центре города на Сусанинской площади, пропустить его невозможно." },
      { q: "Правда ли, что в Костроме есть лосиная ферма?", a: "Да, знаменитая Сумароковская лосеферма расположена всего в 25 км от города, туда круглый год пускают туристов покормить лосей." },
      { q: "Какой сыр привезти из Костромы?", a: "Ищите аутентичные сорта «Костромской» и «Сусанинский» в старинной Сырной бирже, расположенной прямо внутри Красных рядов." },
    ]
  },
  murmansk: {
    brief:
      'Крупнейший на планете город за Полярным кругом - романтичный форпост у незамерзающего Кольского залива. Край суровых скал, военных кораблей, полярных ночей и искателей приключений, мечтающих увидеть край земли.',
    hookFact: 'Знаете ли вы, что в Мурманске находится на вечной стоянке «Ленин» - самый первый в мире атомный ледокол? Сейчас этот легендарный стальной гигант превращен в уникальный музей Арктики.',
        mustSee: [
      { name: 'Атомный ледокол «Ленин»', desc: 'Первый в мире атомный ледокол, превращенный в интерактивный музей',
        venueSlug: 'murmansk-atomnyy-ledokol-lenin'
      },
      { name: 'Мемориал «Защитникам Советского Заполярья в годы Великой Отечественной войны» («Алёша»)', desc: '35-метровый воин на сопке с панорамой Кольского залива',
        locationSlug: 'murmansk-memorial-zaschitnikam-sovetskogo-zapolyarya-v-gody-velikoy-otechestvenno'
      },
      { name: 'Мемориальный комплекс «Морякам, погибшим в мирное время»', desc: 'Маяк памяти и рубка подлодки «Курск» на городском холме',
        locationSlug: 'murmansk-memorialnyy-kompleks-moryakam-pogibshim-v-mirnoe-vremya'
      },
      { name: 'Мурманский областной краеведческий музей', desc: 'Главная коллекция природы, истории и геологии Кольского Севера',
        venueSlug: 'murmansk-murmanskiy-oblastnoy-kraevedcheskiy-muzey'
      },
      { name: 'Памятник «Ждущая»', desc: 'Бронзовая девушка, встречающая моряков над Кольским заливом',
        locationSlug: 'murmansk-pamyatnik-zhduschaya'
      },
      { name: 'Мост через Кольский залив', desc: 'Самый протяженный автомобильный мост мирового Заполярья',
        locationSlug: 'murmansk-most-cherez-kolskiy-zaliv'
      },
    ],
    sights: [
      { title: 'Атомный ледокол «Ленин»', text: 'Первое в мире гражданское судно с ядерной энергетической установкой, пришвартованное у морского вокзала и превращенное в потрясающий интерактивный музей.' },
      { title: 'Мемориал «Защитникам Советского Заполярья в годы Великой Отечественной войны» («Алёша»)', text: 'Грандиозный 35-метровый памятник солдату на сопке Зелёный Мыс, откуда открывается лучший панорамный вид на весь город и Кольский залив.' },
      { title: 'Мемориальный комплекс «Морякам, погибшим в мирное время»', text: 'Архитектурный ансамбль со смотровой площадкой, маяком и фрагментом рубки атомной подводной лодки «Курск».' },
      { title: 'Мурманский областной краеведческий музей', text: 'Старейший музей за Полярным кругом, славящийся уникальной геологической коллекцией со знаменитой Кольской сверхглубокой скважины.' },
      { title: 'Памятник «Ждущая»', text: 'Трогательная бронзовая скульптура девушки на берегу залива, посвященная всем женам и матерям, преданно ждущим возвращения моряков из дальних походов.' },
      { title: 'Мост через Кольский залив', text: 'Один из длиннейших автомобильных мостов в России за Полярным кругом, связывающий город с западными районами области и ведущий в Норвегию.' },
    ],
    travel:
      "В международный аэропорт Мурманска выполняются ежедневные прямые рейсы из Москвы (время в полете — около 2,5 часов) и Санкт-Петербурга. Также до заполярной столицы ходят регулярные поезда, включая фирменную «Арктику», которая идет из Москвы чуть меньше суток. Если ваша цель — увидеть магическое Северное сияние и застать полярную ночь, прилетайте с декабря по февраль. Для классического экскурсионного туризма, поездок к китам в Териберку и наблюдения за полярным днем идеально подходит летний период с июня по август.",
    faq: [
    { q: "В какие месяцы в Мурманске можно гарантированно увидеть Северное сияние?", a: "Сезон охоты за сиянием длится с конца августа по начало апреля, но самые высокие шансы — в морозные и ясные ночи с декабря по февраль." },
    { q: "Нужно ли покупать экскурсию на атомный ледокол «Ленин» заранее?", a: "Билеты продаются строго в кассе на причале в день посещения, поэтому в выходные дни рекомендуется приходить за 30–40 минут до начала сеанса из-за очередей." },
    { q: "Как одеваться для поездки в Мурманск зимой?", a: "Обязательно берите с собой термобелье, непродуваемый пуховик, теплую обувь на толстой подошве и ветрозащитную маску — близость океана создает сильные ветры и высокую влажность." },
    ]
  },
  kursk: {
    brief:
      'Один из старейших городов России, овеянный древнерусскими ратными подвигами и соловьиными трелями. Земля с невероятно глубокой духовной историей и масштабными мемориалами, напоминающими о величайшем танковом сражении в истории человечества.',
    hookFact: 'А вы знали, что курский соловей - это не просто метафора, а настоящий природный бренд? Местные птицы поют уникальным «курским напевом», который насчитывает до 40 различных колен (звуковых элементов), чего не умеет больше ни один соловей в мире.',
        mustSee: [
      { name: 'Мемориальный комплекс «Курская дуга»', desc: 'Крупный военно-исторический мемориал с Триумфальной аркой и выставкой боевой техники.',
        locationSlug: 'kursk-memorialnyy-kompleks-kurskaya-duga'
      },
      { name: 'Знаменский кафедральный собор', desc: 'Главный ампирный собор Курска на Красной площади с огромным куполом.',
        venueSlug: 'kursk-znamenskiy-kafedralnyy-sobor'
      },
      { name: 'Курский государственный областной краеведческий музей', desc: 'Крупнейший музей Курского края в бывшем Архиерейском доме со старинными коллекциями.',
        venueSlug: 'kursk-kurskiy-gosudarstvennyy-oblastnoy-kraevedcheskiy-muzey'
      },
      { name: 'Сергиево-Казанский собор', desc: 'Барочный собор XVIII века с уникальным резным иконостасом и легендой о Серафиме Саровском.',
        venueSlug: 'kursk-sergievo-kazanskiy-sobor'
      },
      { name: 'Историко-культурный комплекс «Коренная пустынь»', desc: 'Знаменитый монастырский комплекс «Курский Афон» со святыми источниками у реки Тускарь.',
        locationSlug: 'kursk-istoriko-kulturnyy-kompleks-korennaya-pustyn'
      },
      { name: 'Музей-усадьба А. А. Фета', desc: 'Мемориальная поэтическая усадьба Афанасия Фета с парком, прудом и личными вещами поэта.',
        venueSlug: 'kursk-muzey-usadba-a-a-feta'
      },
    ],
    sights: [
      { title: "Мемориальный комплекс «Курская дуга»", text: "Масштабный триумфальный ансамбль под открытым небом с аркой, Георгиевским храмом, стелой воинской славы и экспозицией военной техники образца 1943 года." },
      { title: "Знаменский кафедральный собор", text: "Грандиозный собор в стиле классицизма с огромным 20-метровым куполом, возведенный в честь победы в Отечественной войне 1812 года." },
      { title: "Курский государственный областной краеведческий музей", text: "Богатейший музей в историческом здании бывших палат воеводы, славящийся экспозициями о курском соловье, коренной пустыни и старинном быте." },
      { title: "Сергиево-Казанский собор", text: "Шедевр русского барокко XVIII века с роскошным 18-метровым резным позолоченным иконостасом, в строительстве которого принимала участие семья преподобного Серафима Саровского." },
      { title: "Коренная пустынь (в м. Свобода)", text: "Знаменитый мужской монастырь в окрестностях города, основанный на месте обретения иконы «Знамение» и знаменитый своими святыми источниками." },
      { title: "Музей-усадьба А. А. Фета (в д. Воробьевка)", text: "Полностью отреставрированное загородное имение поэта, где он провел свои лучшие творческие годы, принимая в гостях Льва Толстого и Петра Чайковского." },
    ],
    travel:
      "Из Москвы до Курска ежедневно курсируют комфортабельные дневные поезда и «Ласточки», время в пути на которых составляет около 5,5–6 часов. Поездка на личном автомобиле из столицы пройдет по федеральной трассе М-2 «Крым» и займет около 6,5 часов. Лучший сезон для поездки — поздняя весна (май), когда в Курской области зацветают сады и начинают петь легендарные курские соловьи. Также отлично подходит лето и первая половина сентября, позволяющие с комфортом осматривать мемориалы под открытым небом и загородные усадьбы.",
    faq: [
      { q: "Далеко ли от Курска до музея «Курская дуга»?", a: "Основной мемориальный комплекс находится прямо в черте города на проспекте Победы, до него легко доехать на городском транспорте." },
      { q: "Правда ли, что курские соловьи поют по-особенному?", a: "Да, орнитологи подтверждают, что местная популяция птиц обладает уникальным многоколенным набором звуков, не встречающимся в других регионах." },
      { q: "Как попасть в усадьбу Афанасия Фета?", a: "Воробьевка находится в 30 км от Курска; туда ходят экскурсионные автобусы, а сам музей работает со среды по воскресенье." },
    ]
  },
  'yoshkar-ola': {
    brief:
      'Удивительная столица Республики Марий Эл, способная перенести туриста в старую Европу посреди Поволжья. Город невероятных архитектурных экспериментов, сказочных набережных и бережно хранимых языческих традиций марийского народа.',
    hookFact: 'Знаете ли вы, что в Йошкар-Оле можно увидеть кусочек Бельгии и Италии одновременно? Здесь построены точные копии венецианского Дворца дожей и набережной Брюгге.',
    mustSee: [
      { name: 'Набережная Брюгге', desc: 'Фламандский променад на Малой Кокшаге с фахверковыми дворцами.',
        locationSlug: 'yoshkar-ola-naberezhnaya-bryugge'
      },
      { name: 'Архитектурный комплекс «12 апостолов»', desc: 'Механическая процессия Христа и апостолов каждые три часа на Патриаршей площади.',
        locationSlug: 'yoshkar-ola-arhitekturnyy-kompleks-12-apostolov'
      },
      { name: 'Скульптурная композиция «Йошкин кот»', desc: 'Бронзовый талисман города на скамейке у МарГУ.',
        locationSlug: 'yoshkar-ola-skul-pturnaya-kompozitsiya-yoshkin-kot'
      },
      { name: 'Республиканский театр кукол', desc: 'Театр в облике замка Нойшванштайн на Патриаршей площади.',
        venueSlug: 'yoshkar-ola-respublikanskiy-teatr-kukol'
      },
      { name: 'Царевококшайский Кремль', desc: 'Самый молодой кремль мира (2009) с копиями пушек и ярмарками.',
        locationSlug: 'yoshkar-ola-tsarevokokshayskiy-kreml'
      },
      { name: 'Благовещенская башня', desc: '55-метровая башня с курантами - копией часов Спасской башни.',
        locationSlug: 'yoshkar-ola-blagoveschenskaya-bashnya'
      },
    ],
    sights: [
      { title: "Набережная Брюгге", text: "Удивительная городская улица на берегу реки Малая Кокшага, полностью застроенная яркими домами во фламандском стиле, создающими ощущение средневековой Европы." },
      { title: "Комплекс «12 апостолов»", text: "Уникальные анимационные часы на площади Девы Марии, где каждые три часа под колокольный звон из дверей выходят подвижные бронзовые фигуры Иисуса и его учеников." },
      { title: "Йошкин кот", text: "Забавный и невероятно популярный у туристов бронзовый памятник вальяжно отдыхающему на скамейке коту, которому принято тереть лапу на удачу." },
      { title: "Республиканский театр кукол", text: "Сказочное по своей архитектуре здание, внешне полностью копирующее знаменитый замок Нойшванштайн в Баварии." },
      { title: "Царевококшайский Кремль", text: "Современный культурно-исторический комплекс, воссоздающий облик старинной деревянной крепости, которая когда-то стояла на месте города." },
      { title: "Благовещенская башня", text: "Величественное сооружение на одноименной площади, являющееся уменьшенной копией Спасской башни московского Кремля и оборудованное уменьшенной копией курантов." },
    ],
    travel:
      "Прямой ночной поезд из Москвы доезжает до столицы Марий Эл примерно за 14 часов, а автомобильная поездка займет около 10 часов через Чебоксары. Также можно прилететь на самолете в соседние Чебоксары или Казань, откуда до Йошкар-Олы ходят регулярные и недорогие автобусы (1,5–2 часа в пути). Город идеален для круглогодичного туризма, но лучшее время — с мая по август, когда приятно гулять по европейским набережным и кататься на лодках по реке. Зимой, во время снегопадов, местная эклектичная архитектура приобретает по-настоящему сказочный вид.",
    faq: [
      { q: "Где сидит знаменитый Йошкин кот?", a: "Бронзовый памятник коту установлен на Ленинском проспекте, прямо у главного входа в Марийский государственный университет." },
      { q: "В какое время выходят 12 апостолов на часах?", a: "Уникальное представление с подвижными фигурами повторяется на площади каждые три часа, начиная со значения в 09:00 и до 21:00." },
      { q: "Что попробовать из традиционной марийской кухни?", a: "Обязательно закажите подкогыли (крупные национальные вареники с мясом или сыром) и многослойные блины команмел." },
    ]
  },
  bryansk: {
    brief:
      'Древний город воинской и партизанской славы, утопающий в легендарных вековых лесах. Брянск гармонично сочетает в себе уютные холмистые ландшафты, величественные монастыри и современные культурные пространства.',
    hookFact: 'А вы знали, что Брянск на целый год старше Москвы? Город был основан в 985 году как оборонительная крепость среди непроходимых брянских дебрей.',
    mustSee: [
      { name: 'Курган Бессмертия', desc: 'Центральный мемориал в парке «Соловьи» с 18-метровой бетонной звездой.',
        locationSlug: 'bryansk-kurgan-bessmertiya'
      },
      { name: 'Мемориальный комплекс «Партизанская поляна»', desc: 'Мемориал в 12 км от города с землянками, Стеной скорби и техникой.',
        locationSlug: 'bryansk-memorial-nyy-kompleks-partizanskaya-polyana'
      },
      { name: 'Свенский Свято-Успенский монастырь', desc: 'Древняя обитель на мысу над Десной с барочным Успенским собором.',
        locationSlug: 'bryansk-svenskiy-svyato-uspenskiy-monastyr'
      },
      { name: 'Парк-музей имени А. К. Толстого', desc: 'Парк деревянных скульптур из стволов деревьев в топ-12 уникальных парков мира.',
        venueSlug: 'bryansk-park-muzey-imeni-a-k-tolstogo'
      },
      { name: 'Покровский собор', desc: 'Старейшее каменное здание города на Покровской горе в нарышкинском барокко.',
        locationSlug: 'bryansk-pokrovskiy-sobor'
      },
      { name: 'Площадь Партизан', desc: 'Парадный центр в сталинском ампире с пилоном и капсулой времени.',
        locationSlug: 'bryansk-ploschad-partizan'
      },
    ],
    sights: [
      { title: "Курган Бессмертия", text: "Величественный монумент в парке Соловьи в виде пятиконечной звезды на вершине рукотворного холма, созданный в память о героях Великой Отечественной войны." },
      { title: "Мемориальный комплекс «Партизанская поляна»", text: "Расположенный в пригородном лесу масштабный музейный комплекс со стеной памяти, землянками и выставкой военной техники под открытым небом." },
      { title: "Свенский Свято-Успенский монастырь", text: "Один из древнейших монастырей России, основанный в XIII веке князем Романом Михайловичем на высоком холме у слияния рек Десны и Свени." },
      { title: "Парк-музей им. А. К. Толстого", text: "Уникальный городской парк, всемирно известный своей потрясающей коллекцией деревянных скульптур, вырезанных прямо из стволов погибших деревьев." },
      { title: "Покровский собор", text: "Старейший сохранившийся храм Брянска, построенный в конце XVII века из кирпича на месте деревянной церкви на одноименной исторической горе." },
      { title: "Площадь Партизан", text: "Парадная центральная площадь города, доминантой которой выступает грандиозный монумент воинам и партизанам, освобождавшим Брянщину." },
    ],
    travel:
      "Добраться из Москвы до Брянска проще и быстрее всего на фирменных дневных экспрессах, которые долетают до города ровно за 4 часа. Автомобилисты выбирают комфортную федеральную трассу М-3 «Украина», поездка по которой займет около 4,5–5 часов. Лучшее время для посещения Брянщины — период с мая по сентябрь, когда вековые брянские леса стоят во всей красе, и комфортно посещать загородные мемориальные комплексы. Золотая осень в октябре также дарит городу невероятное очарование, особенно в парке деревянных скульптур.",
    faq: [
      { q: "Как доехать до знаменитого мемориала «Партизанская поляна»?", a: "Комплекс расположен в 12 км от черты города, туда регулярно ходят пригородные автобусы от автовокзала Брянска." },
      { q: "Чем уникален парк имени Толстого?", a: "Это единственный в своем роде парк-музей, где старые засохшие деревья не спилили, а превратили в уникальные скульптуры сказочных персонажей." },
      { q: "Какую святыню хранят в Свенском монастыре?", a: "Монастырь знаменит Свенской иконой Божией Матери, которая по преданиям исцелила черниговского князя Романа, основавшего эту обитель." },
    ]
  },
  'blagoveschensk-amurskaya-oblast': {
    brief:
      'Уникальный форпост на Дальнем Востоке, расположенный на самой границе России. Город, где русское купеческое наследие встречается с ультрасовременной культурой Азии, создавая неповторимый контраст двух разных миров.',
    hookFact: 'Знаете ли вы, что Благовещенск - единственный областной центр в России, расположенный на государственной границе? Китайский мегаполис Хэйхэ находится на другом берегу реки Амур всего в 500 метрах, и его небоскребы отлично видны с городской набережной.',
    mustSee: [
      { name: 'Набережная реки Амур', desc: 'Многоуровневый гранитный променад с видом на китайский Хэйхэ в 750 метрах.',
        locationSlug: 'blagoveschensk-amurskaya-oblast-naberezhnaya-reki-amur'
      },
      { name: 'Триумфальная арка', desc: '20-метровые царские ворота в псевдорусском стиле, восстановленные по старым открыткам.',
        locationSlug: 'blagoveschensk-amurskaya-oblast-triumfal-naya-arka'
      },
      { name: 'Амурский областной краеведческий музей им. Г. С. Новикова-Даурского', desc: 'Один из старейших музеев Дальнего Востока в здании «Кунст и Альберс».',
        venueSlug: 'blagoveschensk-amurskaya-oblast-amurskiy-oblastnoy-kraevedcheskiy-muzey-im-g-s-novikova-daurskogo'
      },
      { name: 'Памятник Н. Н. Муравьеву-Амурскому', desc: 'Монумент на месте подписания Айгунского договора со смотровой на Хэйхэ.',
        locationSlug: 'blagoveschensk-amurskaya-oblast-pamyatnik-n-n-murav-evu-amurskomu'
      },
      { name: 'Кафедральный собор Благовещения Пресвятой Богородицы', desc: 'Белокаменный семиглавый храм с Албазинской иконой Божией Матери.',
        locationSlug: 'blagoveschensk-amurskaya-oblast-kafedral-nyy-sobor-blagovescheniya-presvyatoy-bogoroditsy'
      },
      { name: 'Благовещенское кладбище динозавров', desc: 'Палеонтологический раскоп в черте города с костями амурозавра.',
        locationSlug: 'blagoveschensk-amurskaya-oblast-blagoveschenskoe-kladbische-dinozavrov'
      },
    ],
    sights: [
      { title: "Набережная реки Амур", text: "Великолепно обустроенный парадный променад, главной особенностью которого является прямая видимость китайского мегаполиса Хэйхэ на противоположном берегу." },
      { title: "Триумфальная арка", text: "Величественные 20-метровые каменные ворота в неорусском стиле на берегу Амура, воссозданные в память о визите в город цесаревича Николая Романова." },
      { title: "Амурский областной краеведческий музей им. Г. С. Новикова-Даурского", text: "Один из старейших музеев Дальнего Востока, расположенный в красивейшем готическом здании бывшего магазина «Кунст и Альберс»." },
      { title: "Памятник Муравьеву-Амурскому", text: "Бронзовый монумент выдающемуся государственному деятелю и основателю города, установленный на историческом месте подписания Айгунского договора." },
      { title: "Кафедральный собор Благовещения Пресвятой Богородицы", text: "Главный православный храм Приамурья, построенный в традициях русского зодчества на месте самой первой деревянной церкви города." },
      { title: "Кладбище динозавров", text: "Уникальный палеонтологический памятник природы прямо на городской окраине, где ученые до сих пор находят кости ископаемых ящеров, живших миллионы лет назад." },
    ],
    travel:
      "Самый удобный способ — прямой авиаперелет из Москвы в международный аэропорт Игнатьево, который занимает около 7,5 часов. Также можно доехать на поезде по Транссибирской магистрали до станции Белогорск, откуда до Благовещенска ходят регулярные автобусы и электрички. Лучший сезон для поездки — конец лета и начало осени (август и сентябрь), когда спадает восточноазиатский муссон, устанавливается солнечная теплая погода, а Амур радует приятной прохладой. Зима здесь очень солнечная, но морозная и ветреная.",
    faq: [
      { q: "Нужна ли виза, чтобы посмотреть на Китай с набережной?", a: "Нет, чтобы просто гулять по российской набережной и фотографировать китайские небоскребы Хэйхэ, никакие пропуска и визы не требуются." },
      { q: "Можно ли сейчас съездить в Китай из Благовещенска на один день?", a: "Да, между городами курсируют теплоходы (летом) и автобусы по мосту (зимой), для россиян действует упрощенный безвизовый въезд в составе тургрупп." },
      { q: "Где искать кости динозавров?", a: "Настоящие находки с Благовещенского раскопа можно увидеть в палеонтологическом музее Института геологии и природопользования ДВО РАН в центре города." },
    ]
  },
  belgorod: {
    brief:
      'Один из самых благоустроенных, светлых и зеленых городов Центральной России, выросший из древней оборонительной крепости на белых меловых кручах. Город с мощной военной историей, просторными площадями и цветущими парками.',
    hookFact: 'А вы знали, что Белгород официально признан первым в России «Городом воинской славы»? А еще прямо под улицами города залегают миллиарды тонн чистейшего писчего мела.',
    mustSee: [
      { name: 'Музей-диорама «Курская битва. Белгородское направление»', desc: 'Самая большая цельнотканая военная диорама в Европе о Прохоровском сражении.',
        venueSlug: 'belgorod-muzey-diorama-kurskaya-bitva-belgorodskoe-napravlenie'
      },
      { name: 'Соборная площадь', desc: 'Парадный центр города с драмтеатром Щепкина, Вечным огнем и медным кругом желаний.',
        locationSlug: 'belgorod-sobornaya-ploschad'
      },
      { name: 'Памятник «Смотритель дорог» (Памятник честному автоинспектору Гречихину)', desc: 'Жанровый памятник гаишнику Павлу Гречихину с мотоциклом «Урал».',
        locationSlug: 'belgorod-pamyatnik-smotritel-dorog-pamyatnik-chestnomu-avtoinspektoru-grechihinu'
      },
      { name: 'Марфо-Мариинский монастырь', desc: 'Старейший духовный ансамбль с Успенско-Николаевским собором Петра I и розариями.',
        locationSlug: 'belgorod-marfo-mariinskiy-monastyr'
      },
      { name: 'Центральный парк культуры и отдыха имени В. И. Ленина', desc: 'Главный зеленый оазис города с вековыми дубами, террасами и зонами воркаута.',
        locationSlug: 'belgorod-tsentral-nyy-park-kul-tury-i-otdyha-imeni-v-i-lenina'
      },
      { name: 'Памятник князю Владимиру (Крестителю Руси)', desc: 'Крупнейший в мире монумент князю Владимиру на Харьковской горе со смотровой.',
        locationSlug: 'belgorod-pamyatnik-knyazyu-vladimiru-krestitelyu-rusi'
      },
    ],
    sights: [
      { title: "Музей-диорама «Курская битва. Белгородское направление»", text: "Уникальный музей в форме танкового трака, внутри которого находится самый крупный в России цельнохолщовый художественный холст, воссоздающий Прохоровское сражение." },
      { title: "Соборная площадь", text: "Центральное сердце города, вымощенное узорами в виде солнца, где расположены главные административные здания, драматический театр и зажжен Вечный огонь." },
      { title: "Смотритель дорог (Памятник честному автоинспектору)", text: "Душевный городской памятник реальному советскому гаишнику Павлу Гречихину, который прославился тем, что штрафовал всех нарушителей без исключения, включая собственных родственников." },
      { title: "Марфо-Мариинский монастырь", text: "Красивая действующая женская обитель в историческом центре, объединившая старинный Покровский храм и Успенско-Николаевский собор." },
      { title: "Центральный парк культуры и отдыха имени В. И. Ленина", text: "Ухоженная зеленая зона с тенистыми аллеями, современными игровыми площадками, аттракционами и фонтанами для семейного досуга." },
      { title: "Памятник князю Владимиру", text: "Монументальный 22-метровый памятник Крестителю Руси, установленный на Харьковской горе и являющийся крупнейшей скульптурой города." },
    ],
    travel:
      "В связи с временным закрытием местного аэропорта, основным и самым надежным способом добраться до Белгорода остаются поезда, включая скоростные экспрессы, которые доезжают из Москвы за 7–8 часов. Также развито регулярное автобусное сообщение со всеми соседними регионами, а автомобилисты используют федеральную трассу М-2 «Крым». Лучшее время для визита — май, когда город утопает в цветущих каштанах и сирени, а также летние месяцы с комфортной теплой погодой. Начало осени привлекает туристов многочисленными городскими фестивалями под открытым небом.",
    faq: [
      { q: "Далеко ли от Белгорода находится Прохоровское поле?", a: "Военно-исторический музей-заповедник «Прохоровское поле» расположен примерно в 60 км от Белгорода, туда можно доехать на пригородном поезде или автобусе." },
      { q: "Правда ли, что Белгород называют «белым городом»?", a: "Да, это связано с огромными запасами мела в регионе; прямо в черте города до сих пор видны живописные белые меловые горы." },
      { q: "Что интересного посмотреть в музее-диораме?", a: "Главный экспонат — гигантская холщовая картина длиной 67 метров, которая с поразительной точностью воссоздает события танкового сражения 1943 года." },
    ]
  },
  astrahan: {
    brief:
      'Настоящий южный оазис в дельте Волги, где каспийские кулинарные традиции смешались с колоритом Великого шелкового пути. Сюда едут ради старинного белокаменного кремля, знаменитой рыбалки, восточных рынков и невероятной южной гастрономии.',
    hookFact: 'А вы знали, что Астрахань - это самая близкая к Европе точка, где можно увидеть цветущие лотосы? В конце лета Каспийская дельта превращается в бескрайнее розовое море площадью в тысячи гектаров.',
    mustSee: [
      { name: 'Астраханский кремль', desc: 'Сердце и главная цитадель Нижнего Поволжья на Заячьем холме с Успенским собором и Пречистенской колокольней.',
        locationSlug: 'astrahan-astrahanskiy-kreml'
      },
      { name: 'Астраханский государственный театр оперы и балета', desc: 'Грандиозный театральный комплекс в неорусском стиле, крупнейшее культурное сооружение на Юге России.',
        venueSlug: 'astrahan-astrahanskiy-gosudarstvennyy-teatr-opery-i-baleta'
      },
      { name: 'Купеческое подворье и набережная Волги', desc: 'Пешеходный променад вдоль Волги с Персидским, Индийским и Армянским купеческими подворьями.',
        locationSlug: 'astrahan-kupecheskoe-podvor-e-i-naberezhnaya-volgi'
      },
      { name: 'Дом-музей Бориса Кустодиева', desc: 'Камерный музей в деревянном усадебном флигеле, где художник провел детские и юношеские годы.',
        venueSlug: 'astrahan-dom-muzey-borisa-kustodieva'
      },
      { name: 'Астраханский биосферный заповедник', desc: 'Природный резерват в дельте Волги с долиной каспийского лотоса и эко-тропами над водой.',
        locationSlug: 'astrahan-astrahanskiy-biosfernyy-zapovednik'
      },
      { name: 'Рыбный рынок «Селенские Исады»', desc: 'Старейший рыбный базар Поволжья с икрой, балыками и вяленой воблой.',
        locationSlug: 'astrahan-rybnyy-rynok-selenskie-isady'
      },
    ],
    sights: [
      { title: "Астраханский кремль", text: "Выдающийся ансамбль военно-инженерного и церковного зодчества XVI века с мощными белыми стенами, пышным Успенским собором и 80-метровой Пречистенской колокольней." },
      { title: "Астраханский государственный театр оперы и балета", text: "Грандиозное и ультрасовременное здание в неорусском стиле, являющееся одним из крупнейших театральных комплексов в Европе." },
      { title: "Купеческое подворье и набережная Волги", text: "Парадный городской променад с фонтанами, памятником Петру I и великолепно сохранившейся застройкой богатых купеческих усадеб XIX века." },
      { title: "Дом-музей Бориса Кустодиева", text: "Усадьба, посвященная жизни и творчеству знаменитого русского художника, где хранится уникальная коллекция его живописных работ, рисунков и личных вещей." },
      { title: "Астраханский биосферный заповедник", text: "Старейший в стране заповедник в дельте Волги, куда летом устремляются тысячи туристов, чтобы увидеть бескрайние цветущие поля каспийского лотоса." },
      { title: "Рыбный рынок «Селенские Исады»", text: "Легендарное гастрономическое место города с вековой историей, где можно найти и попробовать любые виды местной рыбы, балыков и черной икры." },
    ],
    travel:
      "В международный аэропорт Астрахани ежедневно прилетают самолеты из Москвы (время в воздухе — около 2,5 часов), также налажено прямое ж/д сообщение со многими крупными городами России. На автомобиле из центральной части страны удобнее всего ехать по федеральной трассе Р-22 «Каспий». Абсолютный пик туристического сезона приходится на период с середины июля по конец августа — именно в это время в дельте Волги массово цветут бескрайние лотосовые поля. Весна (апрель–май) и осень (сентябрь–октябрь) идеально подходят для заядлых рыбаков и любителей комфортной экскурсионной погоды без летней жары.",
    faq: [
      { q: "В каком месяце цветут лотосы в Астрахани?", a: "Массовое цветение каспийского лотоса начинается строго с середины июля и продолжается до начала сентября." },
      { q: "Сколько стоит вход в Астраханский кремль?", a: "Проход на саму территорию кремля абсолютно бесплатный, билеты нужны только для посещения музейных экспозиций внутри башен." },
      { q: "Где лучше всего покупать черную икру?", a: "Самый надежный способ — специализированные рыбные магазины или легендарный рынок «Селенские Исады», где обязательно нужно просить сертификат качества." },
    ]
  },
  arhangelsk: {
    brief:
      'Историческая столица Поморья, раскинувшаяся в устье суровой Северной Двины. Город деревянного зодчества, белых ночей, соленого морского ветра и вековых традиций отважных мореплавателей, откуда веками отправлялись самые опасные полярные экспедиции.',
    hookFact: 'Знаете ли вы, что Архангельск - это официальная родина первого российского торгового порта и колыбель государственного флага? Именно здесь Петр I впервые поднял над своим кораблем триколор.',
    mustSee: [
      { name: 'Музей деревянного зодчества «Малые Корелы»', desc: 'Огромный музей под открытым небом в окрестностях города, где собрано около сотни аутентичных старинных изб, мельниц и церквей со всего Поморья.',
        venueSlug: 'arhangelsk-muzey-derevyannogo-zodchestva-malye-korely'
      },
      { name: 'Новодвинская крепость', desc: 'Первая в России регулярная приморская бастионная крепость, построенная на рубеже XVII-XVIII веков по личному указу Петра I для защиты от шведов.',
        locationSlug: 'arhangelsk-novodvinskaya-krepost'
      },
      { name: 'Набережная Северной Двины', desc: 'Многокилометровый променад, где сосредоточены главные памятники города, старинный Гостиный двор и открываются потрясающие виды на широкую реку и морские суда.',
        locationSlug: 'arhangelsk-naberezhnaya-severnoy-dviny'
      },
      { name: 'Памятник Петру I', desc: 'Знаменитый монумент работы скульптора Антокольского, установленный на набережной и увековеченный на современной российской пятисотрублевой купюре.',
        locationSlug: 'arhangelsk-pamyatnik-petru-i'
      },
      { name: 'Проспект Чумбарова-Лучинского', desc: 'Пешеходная улица-музей в центре Архангельска, куда были бережно перенесены и отреставрированы красивейшие деревянные особняки старого города.',
        locationSlug: 'arhangelsk-prospekt-chumbarova-luchinskogo'
      },
      { name: 'Архангельский Гостиный двор', desc: 'Старейшее сохранившееся здание города, представляющее собой мощную каменную крепость-торговые ряды XVII века на берегу реки.',
        locationSlug: 'arhangelsk-arhangelskiy-gostinyy-dvor'
      },
    ],
    sights: [
      { title: "Музей деревянного зодчества «Малые Корелы»", text: "Огромный музей под открытым небом в окрестностях города, где собрано около сотни аутентичных старинных изб, мельниц и церквей со всего Поморья." },
      { title: "Новодвинская крепость", text: "Первая в России регулярная приморская бастионная крепость, построенная на рубеже XVII-XVIII веков по личному указу Петра I для защиты от шведов." },
      { title: "Набережная Северной Двины", text: "Многокилометровый променад, где сосредоточены главные памятники города, старинный Гостиный двор и открываются потрясающие виды на широкую реку и морские суда." },
      { title: "Памятник Петру I", text: "Знаменитый монумент работы скульптора Антокольского, установленный на набережной и увековеченный на современной российской пятисотрублевой купюре." },
      { title: "Проспект Чумбарова-Лучинского", text: "Пешеходная улица-музей в центре Архангельска, куда были бережно перенесены и отреставрированы красивейшие деревянные особняки старого города." },
      { title: "Архангельский Гостиный двор", text: "Старейшее сохранившееся здание города, представляющее собой мощную каменную крепость-торговые ряды XVII века на берегу реки." },
    ],
    travel:
      "Аэропорт Архангельска принимает ежедневные прямые рейсы из Москвы и Санкт-Петербурга, полет займет всего около 2 часов. Для любителей железных дорог курсируют регулярные поезда, которые доезжают из столицы до Белого моря примерно за 20 часов. Лучший сезон для классического экскурсионного туризма — лето, особенно июнь и июль, когда в городе стоят удивительные белые ночи, превосходящие по длительности питерские. С января по март сюда устремляются охотники за северным сиянием и любители настоящей морозной зимы.",
    faq: [
      { q: "Далеко ли от города находится музей «Малые Корелы»?", a: "Музей деревянного зодчества расположен всего в 25 км от центра Архангельска, туда каждые 20–30 минут ходят пригородные автобусы." },
      { q: "Можно ли летом купаться в Северной Двине?", a: "Официально купание в черте города чаще всего запрещено из-за сильного течения, но городские песчаные пляжи идеальны для прогулок и солнечных ванн." },
      { q: "Что такое поморский козуль?", a: "Это традиционные архангельские пряники из ржаного теста, украшенные цветной глазурью, которые веками считались оберегом и главным местным сувениром." },
    ]
  },
  tambov: {
    brief:
      'Душевный, по-провинциальному уютный и очень зеленый город Черноземья, славящийся своими роскошными купеческими усадьбами и белокаменными соборами. Родина знаменитых гастрономических брендов, сохранившая дух старой доброй купеческой России.',
    hookFact: 'А вы знали, откуда пошло выражение «тамбовский волк тебе товарищ»? В старину тамбовскими волками называли местных ярмарочных купцов, которые торговали великолепными, невероятно теплыми и прочными волчьими шкурами, бравшими первые призы на международных выставках.',
        mustSee: [
      { name: 'Музей-усадьба Асеевых', desc: 'Белокаменный дворец фабриканта Асеева с восстановленными интерьерами и ландшафтным парком',
        venueSlug: 'tambov-muzey-usadba-aseevyh'
      },
      { name: 'Набережная реки Цны', desc: 'Двухъярусный речной променад с фонтанами, мостами и видами на Цну',
        locationSlug: 'tambov-naberezhnaya-reki-tsny'
      },
      { name: 'Спасо-Преображенский кафедральный собор', desc: 'Старейший каменный храм области с восстановленной 84-метровой колокольней',
        venueSlug: 'tambov-spaso-preobrazhenskiy-kafedralnyy-sobor'
      },
      { name: 'Казанский мужской монастырь', desc: 'Монастырский ансамбль с розовым Казанским собором и 107-метровой звонницей',
        venueSlug: 'tambov-kazanskiy-muzhskoy-monastyr'
      },
      { name: 'Памятник Тамбовскому мужику', desc: 'Бронзовый образ крестьянина-пахаря и символ памяти об Антоновском мятеже',
        locationSlug: 'tambov-pamyatnik-tambovskomu-muzhiku'
      },
      { name: 'Тамбовский областной краеведческий музей', desc: 'Старейший музей региона с коллекциями живописи, археологии и истории края',
        venueSlug: 'tambov-tambovskiy-oblastnoy-kraevedcheskiy-muzey'
      },
    ],
    sights: [
      { title: "Музей-усадьба Асеевых", text: "Великолепный отреставрированный дворец суконного фабриканта начала XX века, поражающий роскошью интерьеров, барочными фасадами и старинным парком с вековым дубом." },
      { title: "Набережная реки Цны", text: "Двухуровневая пешеходная зона протяженностью несколько километров, считающаяся одной из самых благоустроенных и живописных городских набережных в России." },
      { title: "Спасо-Преображенский кафедральный собор", text: "Старейший кирпичный храм Тамбовщины с уникальной росписью стен и величественной многоярусной колокольней, возвышающейся над историческим центром." },
      { title: "Казанский мужской монастырь", text: "Историческая обитель, знаменитая своим ярким изумрудным собором и невероятно высокой колокольней, которая занимает третье место по высоте в России." },
      { title: "Памятник Тамбовскому мужику", text: "Оригинальная трехметровая бронзовая скульптура землепашца на Кронштадтской площади, ставшая символом трудолюбия и непростой истории местного крестьянства." },
      { title: "Тамбовский областной краеведческий музей", text: "Один из старейших музеев страны, расположенный в бывшем здании Дома политического просвещения с богатейшими коллекциями по истории и природе края." },
    ],
    travel:
      "Из Москвы в Тамбов регулярно ходят ночные и дневные поезда с Павелецкого вокзала (время в пути составляет около 7–9 часов), а поездка на автомобиле по трассе Р-22 займет около 6 часов. В городе также работает местный аэропорт Донское, принимающий регулярные внутренние авиарейсы. Идеальное время для планирования поездки — период с конца мая по начало сентября, когда город буквально утопает в цветах, а набережная реки Цны становится центром вечерней жизни. Осенью сюда стоит приехать ради масштабной Международной Покровской ярмарки.",
    faq: [
      { q: "Где находится тот самый памятник Тамбовскому волку?", a: "В городе есть несколько таких скульптур, но самая популярная деревянная фигура с надписью «Тамбовский волк — товарищ» установлена на въезде в город со стороны Пензы." },
      { q: "Можно ли зайти внутрь усадьбы Асеева?", a: "Да, сейчас там располагается действующий филиал музея «Петергоф», интерьеры полностью отреставрированы, и туда водят регулярные экскурсии." },
      { q: "Чем знаменита тамбовская картошка?", a: "Местная почва идеальна для корнеплодов, поэтому тамбовский картофель считается эталоном вкуса и рассыпчатости — его обязательно стоит попробовать в местных ресторанах." },
    ]
  },
  chita: {
    brief:
      'Колоритная столица Забайкалья с богатой и драматичной историей, где удивительным образом переплелись купеческое наследие, память о сосланных декабристах и восточные буддийские традиции. Город яркого солнца, бескрайних степей и сосновых лесов.',
    hookFact: 'А вы знали, что именно в Чите находится знаменитая Михайло-Архангельская церковь - единственный в Сибири уцелевший старинный деревянный двухпрестольный храм XVIII века, который вручную без единого гвоздя построили из прибайкальской лиственницы?',
        mustSee: [
      { name: 'Музей декабристов (Михайло-Архангельская церковь)', desc: 'Деревянная церковь XVIII века и мемориал декабристам Забайкалья',
        venueSlug: 'chita-muzey-dekabristov-mihaylo-arhangelskaya-tserkov'
      },
      { name: 'Читинский дацан «Дамба Брейбулинг»', desc: 'Буддийский комплекс с тибетской архитектурой и молитвенными барабанами',
        venueSlug: 'chita-chitinskiy-datsan-damba-breybuling'
      },
      { name: 'Кафедральный собор Казанской иконы Божией Матери', desc: 'Крупный лазурно-белый собор Забайкалья с девятью золочеными куполами',
        venueSlug: 'chita-kafedralnyy-sobor-kazanskoy-ikony-bozhiey-materi'
      },
      { name: 'Титовская сопка', desc: 'Природная доминанта Читы с панорамой Ингоды, тайги и города',
        locationSlug: 'chita-titovskaya-sopka'
      },
      { name: 'Дворец Шумовых', desc: 'Роскошный особняк золотопромышленников в стиле купеческого модерна',
        venueSlug: 'chita-dvorets-shumovyh'
      },
      { name: 'Ивано-Арахлейские озера', desc: 'Каскад чистых озер Забайкалья для пляжного отдыха, рыбалки и кемпинга',
        locationSlug: 'chita-ivano-arahleyskie-ozera'
      },
    ],
    sights: [
      { title: "Музей декабристов (Михайло-Архангельская церковь)", text: "Уникальный двухэтажный деревянный храм XVIII века, внутри которого собраны подлинные вещи, письма и документы сосланных в Сибирь дворян." },
      { title: "Читинский дацан «Дамба Брейбулинг»", text: "Величественный буддийский монастырский комплекс, поражающий яркой восточной архитектурой, скульптурами божеств и атмосферой умиротворения." },
      { title: "Кафедральный собор Казанской иконы Божией Матери", text: "Грандиозный небесно-голубой храм в русско-византийском стиле, являющийся самым большим православным собором в Забайкалье." },
      { title: "Титовская сопка", text: "Древний потухший вулкан на окраине города, служащий природным археологическим памятником и идеальной смотровой площадкой с часовней Александра Невского." },
      { title: "Дворец Шумовых", text: "Шедевр архитектуры в стиле забайкальского барокко и неоклассицизма, построенный в начале XX века для богатых золотопромышленников и напоминающий сказочный торт." },
      { title: "Ивано-Арахлейские озера (в окрестностях)", text: "Живописная система крупных чистейших озер, признанная главным курортным и природным местом отдыха всех жителей и гостей Читы." },
    ],
    travel:
      "В Читу быстрее всего долететь на самолете — местный аэропорт Кадала принимает регулярные рейсы из Москвы (время в пути — около 6 часов), Новосибирска и Владивостока. Также Чита является крупной станцией Транссибирской магистрали, поэтому сюда удобно добираться на поездах дальнего следования. Лучший сезон для поездки — конец лета и начало осени (август и сентябрь), когда спадает жара, природа Забайкалья окрашивается в яркие цвета, а на Ивано-Арахлейских озерах комфортно отдыхать. Зима в Чите очень солнечная, но экстремально морозная и малоснежная.",
    faq: [
      { q: "Почему Музей декабристов находится в церкви?", a: "Музей расположен в уникальном деревянном здании Михайло-Архангельской церкви XVIII века, где венчались и молились сосланные в Сибирь декабристы." },
      { q: "Можно ли туристам посещать Читинский дацан?", a: "Да, буддийский монастырь открыт для посещения, на его территории можно познакомиться с восточной культурой, но важно соблюдать правила поведения (ходить по часовой стрелке)." },
      { q: "Какое фирменное блюдо попробовать в Чите?", a: "Обязательно попробуйте забайкальские буузы (позы) — сочное национальное блюдо из теста и мяса, приготовленное на пару." },
    ]
  },
  'kirov-kirovskaya-oblast': {
    brief:
      'Самобытный вятский город с ароматом хвойных лесов, официально признанный всемирной родиной расписной дымковской игрушки. Место с уникальным северным гостеприимством, где оживают старинные русские сказки, а купеческая архитектура прячет множество уютных гастрономических музеев.',
    hookFact: 'Знаете ли вы, что Киров - это официальная резиденция Кикиморы Вятской? По славянским легендам, именно здесь находится Кикиморская гора, где сказочная проказница поселилась еще в древние времена.',
    mustSee: [
      { name: 'Набережная Грина', desc: 'Видовой променад на крутом берегу Вятки с ротондами XIX века.',
        locationSlug: 'kirov-kirovskaya-oblast-naberezhnaya-grina'
      },
      { name: 'Улица Спасская (Вятский Арбат)', desc: 'Пешеходная ось с Музеем дымковской игрушки и памятником «Место встречи».',
        locationSlug: 'kirov-kirovskaya-oblast-ulitsa-spasskaya-vyatskiy-arbat'
      },
      { name: 'Александровский сад', desc: 'Старейший парк 1835 года с ротондой Витберга без гвоздей и мостом вздохов.',
        locationSlug: 'kirov-kirovskaya-oblast-aleksandrovskiy-sad'
      },
      { name: 'Вятский палеонтологический музей', desc: 'Музей парейазавров с Котельничского местонахождения.',
        venueSlug: 'kirov-kirovskaya-oblast-vyatskiy-paleontologicheskiy-muzey'
      },
      { name: 'Свято-Успенский Трифонов мужской монастырь', desc: 'Главная обитель Вятки XVI века с Успенским собором и святым источником.',
        locationSlug: 'kirov-kirovskaya-oblast-svyato-uspenskiy-trifonov-muzhskoy-monastyr'
      },
      { name: '«Заповедник сказок» (Интерактивный парк «Резиденция Кикиморы Вятской»)', desc: 'Тематический парк-родина Кикиморы на Сказочной карте России.',
        locationSlug: 'kirov-kirovskaya-oblast-zapovednik-skazok-interaktivnyy-park-rezidentsiya-kikimory-vyatskoy'
      },
    ],
    sights: [
      { title: "Набережная Грина", text: "Живописнейший пешеходный променад на высоком берегу Вятки, названный в честь знаменитого писателя-земляка Александра Грина." },
      { title: "Улица Спасская (Вятский Арбат)", text: "Пешеходный исторический квартал с купеческими особняками, брусчаткой, Музеем дымковской игрушки и интерактивными кондитерскими лавками." },
      { title: "Александровский сад", text: "Один из старейших и красивейших ландшафтных парков Поволжья, знаменитый своими белоснежными деревянными ротондами в стиле ампир." },
      { title: "Вятский палеонтологический музей", text: "Уникальный научный центр, где экспонируются редчайшие скелеты древних ящеров-парейазавров, найденные на Котельничском раскопе." },
      { title: "Свято-Успенский Трифонов монастырь", text: "Величественный древний архитектурный ансамбль XVI века, являющийся главным духовным центром Вятской земли." },
      { title: "Заповедник сказок (Резиденция Кикиморы Вятской)", text: "Интерактивный развлекательный парк в сосновом бору, где круглый год проходят театрализованные программы по мотивам русских сказок." },
    ],
    travel:
      "Прямой перелет из Москвы в кировский аэропорт Победилово займет всего 1,5–2 часа, а фирменный поезд «Вятка» довезет вас с Ярославского вокзала примерно за 12 часов. Город также соединен удобными автодорогами с Пермью, Нижним Новгородом и Казанью. Лучшее время для путешествия в Киров — лето (с июня по август), когда можно в полной мере насладиться прогулками по старинным паркам, набережной Грина и пешеходной Спасской улице. Зимой Киров превращается в настоящую новогоднюю столицу с красивыми ледовыми городками и интерактивными праздничными программами в «Заповеднике сказок».",
    faq: [
      { q: "Где в Кирове купить настоящую дымковскую игрушку?", a: "Покупать знаменитый глиняный сувенир лучше всего в музее «Дымковская игрушка» или фирменных художественных салонах в центре, чтобы не наткнуться на подделку." },
      { q: "Правда ли, что в Кирове жили динозавры?", a: "В области находится Котельничское местонахождение парейазавров, а в самом городе открыт потрясающий Палеонтологический музей с уникальными скелетами древних ящеров." },
      { q: "Кто такая Кикимора Вятская?", a: "Согласно местным легендам, Киров — это историческая родина Кикиморы; сейчас в городе открыта ее интерактивная резиденция с развлекательными программами для детей." },
    ]
  },
  kurgan: {
    brief:
      'Спокойный и гостеприимный уральский город с богатым купеческим прошлым, выросший из древнего укрепленного поселения Царёво Городище. Сегодня он известен на весь мир как один из главных центров инновационной медицины и ортопедии.',
    hookFact: 'Знаете ли вы, что именно в Кургане доктор Гавриил Илизаров изобрел свой знаменитый аппарат для сращивания костей, который перевернул мировую медицину и вернул возможность ходить миллионам людей по всему свету?',
        mustSee: [
      { name: 'Центр «Восстановительная травматология и ортопедия» имени академика Г. А. Илизарова', desc: 'Мирово известный медицинский центр Илизарова с музеем ортопедии и парком.',
        venueSlug: 'kurgan-tsentr-vosstanovitelnaya-travmatologiya-i-ortopediya-imeni-akademika-g-a'
      },
      { name: 'Курганский авиационный музей', desc: 'Открытый музей у аэропорта с коллекцией самолетов и возможностью заглянуть в кабину пилота.',
        venueSlug: 'kurgan-kurganskiy-aviatsionnyy-muzey'
      },
      { name: 'Музей истории города Кургана (Усадьба купца Березина)', desc: 'Купеческая усадьба XIX века с экспозицией о быте слободы Царёво Городище.',
        venueSlug: 'kurgan-muzey-istorii-goroda-kurgana-usadba-kuptsa-berezina'
      },
      { name: 'Пожарная каланча', desc: 'Краснокирпичная пожарная башня 1882 года, которая до сих пор остается действующей частью города.',
        locationSlug: 'kurgan-pozharnaya-kalancha'
      },
      { name: 'Курганский областной культурно-выставочный центр (КВЦ)', desc: 'Главная культурная сцена Зауралья в здании советского модернизма с крупными выставками.',
        venueSlug: 'kurgan-kurganskiy-oblastnoy-kulturno-vystavochnyy-tsentr-kvts'
      },
      { name: 'Свято-Троицкий собор', desc: 'Главный православный собор Кургана у набережной Тобола в русско-византийском стиле.',
        venueSlug: 'kurgan-svyato-troitskiy-sobor'
      },
    ],
    sights: [
      { title: "Российский научный центр «Восстановительная травматология и ортопедия» имени И. А. Илизарова", text: "Всемирно известная клиника с музеем, где великий академик создал свой знаменитый аппарат и совершил революцию в медицине." },
      { title: "Курганский авиационный музей", text: "Масштабная выставка под открытым небом, где собрано более десятка подлинных советских военных, гражданских и спортивных самолетов." },
      { title: "Музей истории города Кургана (Усадьба купца Березина)", text: "Единственный в Зауралье каменный усадебный комплекс XIX века, воссоздающий купеческий быт, традиции и торговые тайны региона." },
      { title: "Пожарная каланча", text: "Изящное 27-метровое кирпичное сооружение начала XX века, которое до сих пор является главным архитектурным символом исторического центра." },
      { title: "Курганский областной культурно-выставочный центр", text: "Главная творческая площадка города, где проходят ключевые выставки, всероссийские фестивали и вернисажи современных художников." },
      { title: "Свято-Троицкий собор", text: "Величественный белокаменный храм на берегу Тобола, возрожденный в традициях старинного русского зодчества и ставший духовным сердцем города." },
    ],
    travel:
      "В Курган можно прилететь на самолете (местный аэропорт принимает регулярные рейсы из Москвы) или доехать на поездах, следующих по Транссибирской магистрали. Автомобилисты добираются по федеральной трассе Р-254 «Иртыш». Лучшее время для поездки — с июня по август, когда стоит теплая уральская погода, комфортная для прогулок по набережной Тобола и отдыха на знаменитых бальнеологических курортах области. Вторая половина осени и зима подойдут любителям заснеженных пейзажей, но стоит готовиться к суровым сибирским морозам.",
    faq: [
      { q: "Чем знаменит Курган в плане медицины?", a: "Город всемирно известен Центром Илизарова — уникальной клиникой ортопедии и травматологии, куда приезжают пациенты со всего земного шара." },
      { q: "Далеко ли от вокзала до исторического центра?", a: "Железнодорожный вокзал находится практически в самом центре города, до главных музеев и набережной можно дойти пешком за 15–20 минут." },
      { q: "Что посмотреть в Курганском авиационном музее?", a: "Это масштабная экспозиция под открытым небом, где собрано более десятка подлинных советских военных и гражданских самолетов и вертолетов." },
    ]
  },
  lipeck: {
    brief:
      'Динамичный город поразительных контрастов, где гигантские силуэты металлургических заводов гармонично уживаются со старейшим питьевым и грязевым курортом России. Город фонтанов, тенистых парков и целебных минеральных источников.',
    hookFact: 'Знаете ли вы, что местный Липецкий бювет был заложен по прямому указу Петра I? Царь лично обнаружил здесь целебную воду, целебные свойства которой врачи позже признали равными знаменитым водам немецкого Баден-Бадена.',
        mustSee: [
      { name: 'Нижний парк и Липецкий бювет', desc: 'Старейший курортный парк Липецка у подножия Соборной горы с футуристическим стеклянным бюветом и обновленными прогулочными террасами.',
        locationSlug: 'lipeck-nizhniy-park-i-lipetskiy-byuvet'
      },
      { name: 'Академический театр драмы им. Л. Н. Толстого', desc: 'Главный театральный флагман Липецка в монументальном здании советского модернизма на высоком Театральном спуске.',
        venueSlug: 'lipeck-akademicheskiy-teatr-dramy-im-l-n-tolstogo'
      },
      { name: 'Музей народного и декоративно-прикладного искусства', desc: 'Самый душевный этнографический музей Липецкой области в бывшем купеческом особняке с мастерскими ремесел.',
        venueSlug: 'lipeck-muzey-narodnogo-i-dekorativno-prikladnogo-iskusstva'
      },
      { name: 'Соборная площадь и Христорождественский кафедральный собор', desc: 'Парадный центр Липецка на вершине Соборной горы с белоснежным классицистическим собором и каскадами фонтанов.',
        venueSlug: 'lipeck-sobornaya-ploschad-i-hristorozhdestvenskiy-kafedralnyy-sobor'
      },
      { name: 'Памятник Петру I на площади Петра Великого', desc: 'Главный исторический символ Липецка - динамичный монумент Петру I на просторной площади с сухими фонтанами.',
        locationSlug: 'lipeck-pamyatnik-petru-i-na-ploschadi-petra-velikogo'
      },
      { name: 'Природный парк чудес «Кудыкина гора»', desc: 'Грандиозный семейный парк развлечений на берегу Дона с деревянной крепостью, скульптурами и огненным Змеем Горынычем.',
        locationSlug: 'lipeck-prirodnyy-park-chudes-kudykina-gora'
      },
    ],
    sights: [
      { title: "Нижний парк и Липецкий бювет", text: "Старейший дендропарк города, где по указу Петра I были открыты целебные минеральные источники и заложен первый в России курорт." },
      { title: "Липецкий государственный академический театр драмы им. Л. Н. Толстого", text: "Знаменитый театр на Соборной горе, ставший первым в стране, который поставил на своей сцене произведения великого писателя при его жизни." },
      { title: "Музей народного и декоративно-прикладного искусства", text: "Колоритное пространство, где хранится уникальная коллекция подлинной романовской глиняной игрушки и предметов старинного быта." },
      { title: "Соборная площадь и Христорождественский кафедральный собор", text: "Парадное сердце города с монументальным классическим храмом XVIII века и великолепной смотровой площадкой." },
      { title: "Памятник Петру I на площади Петра Великого", text: "Величественный бронзовый монумент основателю города, стремительно шагающему в сторону металлургических заводов." },
      { title: "Природный парк «Кудыкина гора» (в окрестностях)", text: "Огромный загородный сафари-парк, всемирно известный своей гигантской скульптурой огнедышащего Змея Горыныча." },
    ],
    travel:
      "В связи с временными ограничениями работы местного аэропорта, удобнее всего добираться до Липецка на поездах (фирменные составы из Москвы идут около 9–10 часов) или на автомобиле по трассе М-4 «Дон». Также развито плотное автобусное сообщение со всеми соседними областными центрами. Идеальный сезон для визита — период с мая по сентябрь, когда в Нижнем парке работают фонтаны, открыты питьевые бюветы и цветут вековые аллеи. Конец лета также прекрасен для поездок к природным достопримечательностям Липецкой области.",
    faq: [
      { q: "Какую воду пьют в Липецком бювете?", a: "Липецкая минеральная вода — это знаменитая хлоридно-сульфатная натриевая вода, открытая еще при Петре I, которая полезна для пищеварения." },
      { q: "Далеко ли от Липецка находится парк «Кудыкина гора»?", a: "Популярный семейный парк с гигантским извергающим пламя Змеем Горынычем расположен в 75 км от города, туда удобнее ехать на машине или экскурсионном автобусе." },
      { q: "Что интересного в музее народного искусства?", a: "Музей знаменит коллекциями романовской игрушки — старинного местного промысла глиняных свистулек, известного по всей России." },
    ]
  },
  ivanovo: {
    brief:
      'Самый молодой и необычный город Золотого кольца, ставший мировым памятником советского архитектурного авангарда. Город текстильной славы, студенчества и уникальных фабричных кварталов из красного кирпича.',
    hookFact: 'А вы знали, что Иваново - это Мекка для любителей конструктивизма? Только здесь можно увидеть уникальные дома-метафоры: Дом-корабль, Дом-подкову и даже Дом-коллектив со столовой на крыше.',
    mustSee: [
      { name: 'Музей ивановского ситца', desc: 'Музей в особняке Бурылина с крупнейшей коллекцией текстильных паттернов.',
        venueSlug: 'ivanovo-muzey-ivanovskogo-sittsa'
      },
      { name: 'Дом-корабль', desc: 'Эталон конструктивизма 1930-х: жилой дом в форме океанского лайнера.',
        locationSlug: 'ivanovo-dom-korabl'
      },
      { name: 'Дом-подкова', desc: 'Конструктивистский жилой комбинат ОГПУ в форме подковы.',
        locationSlug: 'ivanovo-dom-podkova'
      },
      { name: 'Щудровская палатка', desc: 'Старейшее каменное здание XVII века - бывшая приказная изба.',
        locationSlug: 'ivanovo-schudrovskaya-palatka'
      },
      { name: 'Музей промышленности и искусства (Музей Д. Г. Бурылина)', desc: '«Ивановский Эрмитаж» с астрономическими часами и египетскими мумиями.',
        venueSlug: 'ivanovo-muzey-promyshlennosti-i-iskusstva-muzey-d-g-burylina'
      },
      { name: 'Ивановский областной драматический театр', desc: 'Конструктивистский Дворец искусств на площади Пушкина с тремя труппами.',
        venueSlug: 'ivanovo-ivanovskiy-oblastnoy-dramaticheskiy-teatr'
      },
    ],
    sights: [
      { title: 'Музей ивановского ситца', text: 'Уникальный музей в роскошном особняке фабриканта Бурылина, рассказывающий историю «текстильной столицы» и хранящий тысячи образцов старинных тканей.' },
      { title: 'Дом-корабль', text: 'Знаменитый памятник советского конструктивизма 1930-х годов, визуально напоминающий плывущий по городским улицам пассажирский лайнер.' },
      { title: 'Дом-подкова', text: 'Еще один легендарный авангардный дом-коммуна, полукруглая форма которого была спроектирована ради максимального использования солнечного света в квартирах рабочих.' },
      { title: 'Щудровская палатка', text: 'Старейшее сохранившееся кирпичное здание города XVII века, служившее когда-то приказной избой и чудом уцелевшее среди современной застройки.' },
      { title: 'Музей промышленности и искусства', text: 'Грандиозное хранилище редких коллекций оружия, старинных книг, монет и фарфора, собранных местным меценатом Дмитрием Бурылиным.' },
      { title: 'Ивановский областной драматический театр', text: 'Величественное конструктивистское здание Дворца искусств на площади Пушкина, являющееся главным культурным центром региона.' },
    ],
    travel:
      "Доехать до Иваново из Москвы быстрее всего на скоростном поезде «Ласточка», который отправляется несколько раз в день и доезжает до места менее чем за 4 часа. Также налажено регулярное автобусное сообщение, а автопутешественники едут по трассе М-7 через Владимир. Лучший сезон для поездки — лето (с июня по август), когда в городе комфортно осматривать конструктивистские кварталы и зеленую набережную реки Уводь. Начало лета также привлекает любителей событийного туризма благодаря проведению кинофестиваля «Зеркало» имени Андрея Тарковского.",
    faq: [
    { q: "Где лучше всего покупать знаменитый ивановский текстиль?", a: "В городе открыто несколько огромных специализированных торговых комплексов (например, «Текстиль-Профи» или «Рио»), куда организованы даже бесплатные автобусные туры." },
    { q: "Правда ли, что Иваново называют «городом невест»?", a: "Да, этот устойчивый бренд закрепился за городом в советские годы из-за огромного количества текстильных фабрик, где трудились преимущественно женщины." },
    { q: "Что уникального в местной архитектуре?", a: "Иваново официально считается заповедником советского авангарда и конструктивизма 1920–1930-х годов; здесь сохранились уникальные дома в форме корабля, подковы и птицы." },
    ]
  },
  kemerovo: {
    brief:
      'Угольное и индустриальное сердце Сибири, раскинувшееся на берегах Томи в окружении первозданного реликтового бора. Город мощной рабочей энергетики, масштабных монументов и неожиданно насыщенной, яркой театральной жизни, которая удивляет даже искушенных столичных гостей.',
    hookFact: 'А вы знали, что прямо в черте Кемерово находится уникальный Красный бор - настоящий кусок дикой сибирской тайги площадью более 400 гектаров, который чудом сохранился нетронутым посреди крупного промышленного мегаполиса?',
    mustSee: [
      { name: 'Музей-заповедник «Красная Горка»', desc: 'Индустриальный музей на месте открытия кузбасского угля с техникой и штольней.',
        venueSlug: 'kemerovo-muzey-zapovednik-krasnaya-gorka'
      },
      { name: 'Монумент «Память шахтерам Кузбасса» Эрнста Неизвестного', desc: 'Бронзовый шахтер с неоновым сердцем работы Эрнста Неизвестного.',
        locationSlug: 'kemerovo-monument-pamyat-shahteram-kuzbassa-ernsta-neizvestnogo'
      },
      { name: 'Рудничный сосновый бор', desc: 'Реликтовый бор 400 га в центре города с буквами «КУЗБАСС» и ручными белками.',
        locationSlug: 'kemerovo-rudnichnyy-sosnovyy-bor'
      },
      { name: 'Кемеровский областной краеведческий музей', desc: 'Музей со скелетом пситтакозавра сибирского на площади Советов.',
        venueSlug: 'kemerovo-kemerovskiy-oblastnoy-kraevedcheskiy-muzey'
      },
      { name: 'Набережная реки Томи', desc: 'Двухъярусный променад с памятником Бездомной собаке и сталинским ампиром.',
        locationSlug: 'kemerovo-naberezhnaya-reki-tomi'
      },
      { name: 'Музей-заповедник «Томская Писаница»', desc: 'Заповедник петроглифов неолита в 50 км от города у реки Томи.',
        venueSlug: 'kemerovo-muzey-zapovednik-tomskaya-pisanitsa'
      },
    ],
    sights: [
      { title: "Музей-заповедник «Красная Горка»", text: "Уникальный исторический комплекс на месте первого угольного рудника, где сохранились дома голландской архитектуры и открывается лучший вид на реку Томь." },
      { title: "Монумент «Память шахтерам Кузбасса» Эрнста Неизвестного", text: "Грандиозная и глубокая по смыслу бронзовая скульптура на вершине холма, ставшая главным символом мужества сибирских горняков." },
      { title: "Рудничный сосновый бор", text: "Уникальный реликтовый лес площадью почти 400 гектаров прямо в черте города, оборудованный эко-тропами и смотровыми площадками." },
      { title: "Кемеровский областной краеведческий музей", text: "Один из богатейших музеев Сибири, славящийся уникальным скелетом пситтакозавра сибирского, найденного на территории региона." },
      { title: "Набережная реки Томи", text: "Ухоженный двухъярусный парадный променад с эффектными уличными скульптурами, амфитеатром и зонами для вечернего отдыха." },
      { title: "Музей-заповедник «Томская Писаница» (в окрестностях)", text: "Первый в Сибири под открытым небом музей наскального искусства, где сохранились рисунки древних людей эпохи неолита." },
    ],
    travel:
      "Международный аэропорт Кемерово имени Алексея Леонова принимает регулярные прямые рейсы из Москвы и других крупных городов, полет займет около 4,5 часов. Также до города можно добраться на поездах дальнего следования через узловые станции Транссиба (например, Топки или Тайгу). Лучшее время для классического экскурсионного туризма — лето (июнь–август), когда в регионе тепло и комфортно осматривать памятники под открытым небом. Зимний сезон (с ноября по апрель) привлекает тех, кто использует Кемерово как транзитный пункт по пути на горнолыжный курорт Шерегеш.",
    faq: [
      { q: "Что такое «Красная Горка» и почему туда нужно сходить?", a: "Это уникальный музей-заповедник на месте основания Кузбасса, где сохранились постройки старинного рудника и открывается лучший панорамный вид на город и реку Томь." },
      { q: "Есть ли в Кемерово настоящий сосновый бор в черте города?", a: "Да, прямо на правом берегу реки раскинулся реликтовый Рудничный бор — огромный естественный лес с прогулочными тропами и эко-маршрутами." },
      { q: "Как добраться из Кемерово до знаменитой Писаницы?", a: "Историко-культурный музей-заповедник «Томская Писаница» с древними наскальными рисунками находится в 50 км от города, туда ходят регулярные пригородные автобусы." },
    ]
  },
  cheboksary: {
    brief:
      'Колоритная, невероятно зеленая и уютная столица Чувашии, раскинувшаяся на живописном берегу Волги. Город древних национальных традиций, потрясающих пешеходных набережных, каскадных фонтанов и знаменитого на всю страну гостеприимства.',
    hookFact: 'А вы знали, что Чебоксары - это официальная родина легендарного героя Гражданской войны Василия Чапаева? Здесь сохранился его подлинный деревянный дом-пятистенок, превращенный в уникальный мемориальный музей.',
        mustSee: [
      { name: 'Монумент «Мать-Покровительница»', desc: '46-метровый символ Чувашии на холме над Чебоксарским заливом',
        locationSlug: 'cheboksary-monument-mat-pokrovitelnitsa'
      },
      { name: 'Чебоксарский залив и Красная площадь', desc: 'Главное общественное пространство города с мостами, фонтанами и видом на Волгу',
        locationSlug: 'cheboksary-cheboksarskiy-zaliv-i-krasnaya-ploschad'
      },
      { name: 'Бульвар Купца Ефремова', desc: 'Чувашский Арбат с купеческими особняками, музеями и уличной жизнью',
        locationSlug: 'cheboksary-bulvar-kuptsa-efremova'
      },
      { name: 'Научно-технический музей истории трактора', desc: 'Интерактивный музей с десятками действующих тракторов со всего мира',
        venueSlug: 'cheboksary-nauchno-tehnicheskiy-muzey-istorii-traktora'
      },
      { name: 'Чувашский национальный музей', desc: 'Сокровищница истории и культуры чувашского народа на Красной площади',
        venueSlug: 'cheboksary-chuvashskiy-natsionalnyy-muzey'
      },
      { name: 'Введенский кафедральный собор', desc: 'Древнейший каменный храм Чувашии с фресками и Казанской иконой',
        venueSlug: 'cheboksary-vvedenskiy-kafedralnyy-sobor'
      },
    ],
    sights: [
      { title: "Монумент «Мать-Покровительница»", text: "Грандиозная 46-метровая скульптура на берегу залива, ставшая главным символом Чувашской Республики и олицетворяющая защиту духовных ценностей народа." },
      { title: "Чебоксарский залив и Красная площадь", text: "Масштабное пешеходное сердце города с поющими фонтанами, аттракционами, прокатом катамаранов и великолепными видами на старинные храмы." },
      { title: "Бульвар Купца Ефремова", text: "Колоритный пешеходный бульвар с купеческой застройкой, памятником героям «12 стульев» и уникальными чувашскими камнями солнца и любви." },
      { title: "Научно-технический музей истории трактора", text: "Единственный в России специализированный интерактивный музей, где собрано более полусотни раритетных тракторов со всего мира в рабочем состоянии." },
      { title: "Чувашский национальный музей", text: "Главный исторический центр региона, где можно увидеть уникальную вышитую карту России, древние шаманские обереги и узнать воинские традиции чувашей." },
      { title: "Введенский кафедральный собор", text: "Старейший храм Чувашии, заложенный по указу Ивана Грозного в XVI веке, полностью сохранивший свои уникальные старинные фрески." },
    ],
    travel:
      "В Чебоксары можно быстро долететь на самолете из Москвы (всего 1,5 часа в пути) или с комфортом доехать на фирменном ночном поезде «Чувашия». Также город очень популярен среди автопутешественников благодаря федеральной трассе М-7 и является обязательной остановкой для круизных теплоходов по Волге. Идеальное время для поездки — с конца мая по август, когда Чебоксарский залив и Красная площадь превращаются в эпицентр фестивалей, работают поющие фонтаны и открыт прокат лодок. Начало осени в сентябре тоже прекрасно подходит для неспешных прогулок по зеленым бульварам.",
    faq: [
      { q: "Правда ли, что Чебоксары называют одним из самых чистых городов России?", a: "Да, город регулярно занимает призовые места во всероссийских рейтингах по благоустройству, поражая туристов ухоженными набережными и обилием зелени." },
      { q: "Где находится знаменитый памятник Остапу Бендеру и Кисе Воробьянинову?", a: "Скульптурная композиция, посвященная героям «12 стульев», расположена в самом начале пешеходного бульвара Купца Ефремова в историческом центре." },
      { q: "Что такое шурпе и где его попробовать?", a: "Это традиционный и очень сытный чувашский национальный суп из субпродуктов и мяса со специями; его подают практически во всех ресторанах национальной кухни вокруг залива." },
    ]
  },
  barnaul: {
    brief:
      'Крупный сибирский центр, основанный как секретный горнозаводской поселок во времена императрицы Елизаветы. Сегодня город манит туристов своей сибирской деревянной архитектурой, уютным старым центром и статусом главных «ворот» к ледникам Алтая.',
    hookFact: 'Знаете ли вы, что в XIX веке Барнаул называли «Сибирским Эльдорадо»? На местном заводе выплавляли 90% всего серебра Российской империи, из которого чеканили монеты для царской казны.',
    mustSee: [
      { name: 'Нагорный парк и буквы «БАРНАУЛ»', desc: 'Смотровая доминанта на холме у слияния Оби и Барнаулки с буквами «БАРНАУЛ» и храмом Иоанна Предтечи.',
        locationSlug: 'barnaul-nagornyy-park-i-bukvy-barnaul'
      },
      { name: 'Мало-Тобольская улица (Барнаульский Арбат)', desc: 'Первая полностью пешеходная улица города с купеческими торговыми рядами и кованым Медведем.',
        locationSlug: 'barnaul-malo-tobol-skaya-ulitsa-barnaul-skiy-arbat'
      },
      { name: 'Барнаульский сереброплавильный завод («Спичка»)', desc: 'Памятник промышленной архитектуры Демидова XVIII века, в советские годы - спичечная фабрика.',
        locationSlug: 'barnaul-barnaul-skiy-serebroplavil-nyy-zavod-spichka'
      },
      { name: 'Музей автоугона имени Юрия Деточкина', desc: 'Частный музей при службе спасения с вещественными доказательствами и интерактивными стендами взлома.',
        venueSlug: 'barnaul-muzey-avtougona-imeni-yuriya-detochkina'
      },
      { name: 'Государственный художественный музей Алтайского края (ГХМАК)', desc: 'Крупнейшая сокровищница изобразительного искусства региона со строгановскими иконами и классикой.',
        venueSlug: 'barnaul-gosudarstvennyy-hudozhestvennyy-muzey-altayskogo-kraya-ghmak'
      },
      { name: 'Музей «Мир времени»', desc: 'Интерактивный частный музей в бывшей аптеке Крюгера, где экспонаты можно брать в руки.',
        venueSlug: 'barnaul-muzey-mir-vremeni'
      },
    ],
    sights: [
      { title: "Нагорный парк и буквы «БАРНАУЛ»", text: "Ландшафтный парк на холме с огромными белыми буквами в стиле Голливуда, откуда открывается потрясающая круговая панорама на Обь и весь город." },
      { title: "Мало-Тобольская улица (Барнаульский Арбат)", text: "Уютный пешеходный бульвар в историческом центре, окруженный отреставрированными купеческими пассажами и уличными арт-объектами." },
      { title: "Барнаульский сереброплавильный завод", text: "Уникальный историко-архитектурный комплекс XVIII века, из которого когда-то вырос весь город и где выплавляли до 90% всего российского серебра." },
      { title: "Музей автоугона имени Юрия Деточкина", text: "Единственный в своем роде ироничный музей, где собраны самые курьезные самодельные противоугонные средства, капканы и вскрытые замки." },
      { title: "Государственный художественный музей Алтайского края", text: "Богатейшая галерея, славящаяся уникальными коллекциями сибирской иконы, старинного русского фарфора и полотен выдающихся русских художников." },
      { title: "Музей «Мир времени»", text: "Удивительный интерактивный частный музей, где собраны сотни необычных бытовых предметов разных эпох, каждый из которых разрешено трогать руками." },
    ],
    travel:
      "В международный аэропорт Барнаула имени Германа Титова выполняются ежедневные прямые авиарейсы из Москвы (время в полете — около 4,5 часов). Также город является крупным железнодорожным узлом, соединенным поездами с Новосибирском, Красноярском и Казахстаном. Лучшее время для экскурсий по самому городу — период с конца мая по сентябрь, когда работает пешеходная Мало-Тобольская улица и Нагорный парк. Если вы планируете отсюда ехать в горы Алтая, то идеальными месяцами будут июль, август и сентябрь (сезон золотой осени).",
    faq: [
      { q: "Где в Барнауле сделать знаменитое фото на фоне букв «БАРНАУЛ»?", a: "Огромные белые буквы в стиле Hollywood установлены в Нагорном парке на склоне холма, откуда открывается лучший вид на Обь." },
      { q: "Сохранился ли старинный сереброплавильный завод?", a: "Исторический комплекс находится на реставрации, но его старинные кирпичные корпуса можно увидеть в рамках специальных экскурсий по историческому центру." },
      { q: "Правда ли, что в Барнауле есть музей автоугона?", a: "Да, это уникальный и очень ироничный Музей автоугона имени Юрия Деточкина, где собраны необычные приспособления для защиты машин и курьезные экспонаты." },
    ]
  },
  saransk: {
    brief:
      'Невероятно ухоженная, компактная и колоритная столица Мордовии, удивляющая гостей обилием ярких площадей и каскадных фонтанов. Город, где современные спортивные арены ЧМ-2018 гармонично сочетаются с самобытной финно-угорской культурой и национальной кухней.',
    hookFact: 'Знаете ли вы, что Саранск - мировая столица уникальной деревянной игрушки? Местные мастера из села Подлесная Тавла вырезают из липы знаменитых тавлинских коней, которые благодаря своей уникальной экспрессивной резьбе внесены в список семи чудес финно-угорского мира.',
        mustSee: [
      { name: 'Кафедральный собор святого праведного воина Феодора Ушакова', desc: 'Главный храм Мордовии с 62-метровым куполом',
        venueSlug: 'saransk-kafedralnyy-sobor-svyatogo-pravednogo-voina-feodora-ushakova'
      },
      { name: 'Музей изобразительных искусств им. С. Д. Эрьзи', desc: 'Главный музей Мордовии с крупнейшей коллекцией Степана Эрьзи',
        venueSlug: 'saransk-muzey-izobrazitelnyh-iskusstv-im-s-d-erzi'
      },
      { name: 'Площадь Тысячелетия и фонтан «Звезда Мордовии»', desc: 'Современная площадь со светомузыкальным сухим фонтаном',
        locationSlug: 'saransk-ploschad-tysyacheletiya-i-fontan-zvezda-mordovii'
      },
      { name: 'Этнографический комплекс «Мордовское подворье»', desc: 'Деревянная усадьба и ремесла на берегу реки Саранки',
        locationSlug: 'saransk-etnograficheskiy-kompleks-mordovskoe-podvore'
      },
      { name: 'Музей мордовской народной культуры', desc: 'Эрзянские и мокшанские традиции в купеческом особняке',
        venueSlug: 'saransk-muzey-mordovskoy-narodnoy-kultury'
      },
      { name: 'Стадион «Мордовия Арена»', desc: 'Ярко-оранжевый стадион чемпионата мира в пойме Инсара',
        venueSlug: 'saransk-stadion-mordoviya-arena'
      },
    ],
    sights: [
      { title: "Кафедральный собор святого праведного воина Феодора Ушакова", text: "Грандиозный собор с ярким лазурным куполом, построенный в стиле ампир и вмещающий более трех тысяч прихожан одновременно." },
      { title: "Мордовский республиканский музей изобразительных искусств им. С. Д. Эрьзи", text: "Всемирно известная сокровищница, где хранится самая большая в мире коллекция шедевров уникального скульптора Степана Эрьзи." },
      { title: "Площадь Тысячелетия и фонтан «Звезда Мордовии»", text: "Колоссальная площадь со светомузыкальным фонтаном диаметром 60 метров, который бьет в такт музыке и повторяет очертания национального орнамента." },
      { title: "Этнографический комплекс «Мордовское подворье»", text: "Колоритный музей под открытым небом, воссоздающий аутентичную деревянную усадьбу мордовского крестьянина XIX века с действующей кузницей и рестораном." },
      { title: "Музей мордовской народной культуры", text: "Уютный купеческий особняк в центре города, где представлены богатейшие коллекции национальных костюмов, свадебных оберегов и старинных деревянных снастей." },
      { title: "Стадион «Мордовия Арена»", text: "Ультрасовременный спортивный комплекс в форме яркого солнца, построенный к Чемпионату мира по футболу 2018 года и ставший новой визитной карточкой города." },
    ],
    travel:
      "Из Москвы в Саранск удобнее всего добираться на фирменном двухэтажном поезде «Мордовия» (около 9 часов в пути) или долететь на самолете всего за 1,5 часа. На машине путь займет около 9 часов по трассе М-5 с поворотом на Краснослободск. Самый лучший сезон для визита — лето (с июня по август), когда Саранск превращается в город бьющих фонтанов, цветов и уличных веранд с национальной кухней. Сентябрь также хорош для поездки благодаря комфортной прохладе и ярким краскам ухоженных парков.",
    faq: [
      { q: "Кто такой Степан Эрьзя, чьим именем назван музей?", a: "Это великий российский и советский скульптор, работавший в уникальной технике с редкими породами южноамериканского дерева, чьи работы признаны шедеврами мирового искусства." },
      { q: "На каком языке говорят в Саранске?", a: "Основной язык общения — русский, но на вывесках и в госучреждениях дублируются названия на двух официальных местных языках: эрзянском и мокшанском." },
      { q: "Где попробовать настоящие мордовские блины?", a: "Знаменитые толстые дрожжевые блины «пачат» подают в этнокомплексе «Мордовское подворье» прямо в центре города." },
    ]
  },
  habarovsk: {
    brief:
      'Величественная и солнечная столица Дальнего Востока, раскинувшаяся на высоких утесах могучего Амура. Город масштабных площадей, зеленых бульваров, старинных кирпичных доходных домов и невероятных по своей красоте рассветов над бескрайней рекой.',
    hookFact: 'Знаете ли вы, что Хабаровск признан одним из самых солнечных городов России? Солнце светит здесь около 300 дней в году - это гораздо больше, чем в курортном Сочи или на побережье Южного Крыма.',
        mustSee: [
      { name: 'Набережная Адмирала Невельского и Хабаровский утес', desc: 'Парадная набережная Амура со смотровой площадкой на знаменитом утесе',
        locationSlug: 'habarovsk-naberezhnaya-admirala-nevelskogo-i-habarovskiy-utes'
      },
      { name: 'Амурский мост (Музей истории Амурского моста)', desc: 'Легендарный совмещенный мост и музей с царской стальной фермой',
        venueSlug: 'habarovsk-amurskiy-most-muzey-istorii-amurskogo-mosta'
      },
      { name: 'Площадь имени Ленина', desc: 'Главная площадь города с каскадом фонтанов и сталинской архитектурой',
        locationSlug: 'habarovsk-ploschad-imeni-lenina'
      },
      { name: 'Хабаровский краевой музей имени Н. И. Гродекова', desc: 'Крупнейший музей Дальнего Востока с этнографией, природой и 3D-панорамой',
        venueSlug: 'habarovsk-habarovskiy-kraevoy-muzey-imeni-n-i-grodekova'
      },
      { name: 'Градо-Хабаровский собор Успения Божией Матери', desc: 'Красно-белый неорусский собор на Комсомольской площади у Амура',
        venueSlug: 'habarovsk-grado-habarovskiy-sobor-uspeniya-bozhiey-materi'
      },
      { name: 'Городские пруды и парк «Динамо»', desc: 'Парк с каскадом прудов, мостками и вечерними светомузыкальными фонтанами',
        locationSlug: 'habarovsk-gorodskie-prudy-i-park-dinamo'
      },
    ],
    sights: [
      { title: "Набережная Адмирала Невельского и Хабаровский утес", text: "Главное место для прогулок с исторической смотровой площадкой на вершине скалы, откуда открывается захватывающий вид на бескрайний Амур." },
      { title: "Амурский мост (Музей моста)", text: "Знаменитое инженерное сооружение, запечатленное на пятитысячной рублевой купюре, рядом с которым открыт музей со старинными фермами царских времен." },
      { title: "Площадь имени Ленина", text: "Одна из крупнейших площадей в России с монументальными фонтанами, красивыми партерными газонами и парадными зданиями советской архитектуры." },
      { title: "Хабаровский краевой музей имени Н. И. Гродекова", text: "Выдающийся музейный комплекс, где можно увидеть огромную панораму Волочаевской битвы, скелет кита и богатейшие этнографические коллекции." },
      { title: "Градо-Хабаровский собор Успения Божией Матери", text: "Необычный по своей архитектуре высотный пятиглавый храм с элементами неорусского стиля, встречающий гостей на Комсомольской площади." },
      { title: "Городские пруды и парк «Динамо»", text: "Живописный каскад искусственных водоемов в парковой зоне, украшенный поющими фонтанами, лазерным шоу и бронзовыми скульптурами персонажей советских мультфильмов." },
    ],
    travel:
      "Прямой авиаперелет из Москвы в международный аэропорт Хабаровска займет около 7,5–8 часов, а для путешественников по Сибири доступно регулярное ж/д сообщение по Транссибу. Лучшее время для посещения города — первая половина осени (сентябрь и начало октября), когда устанавливается так называемое «бабье лето» с сухой, мягкой и солнечной погодой. Май и июнь также прекрасны для долгих прогулок по высоким амурским набережным. Зима здесь очень морозная и ветреная, но практически всегда радует ослепительно синим небом.",
    faq: [
      { q: "Где можно сфотографировать вид с пятитысячной купюры?", a: "Легендарная панорама Амурского моста открывается со смотровой площадки на Хабаровском утесе в ЦПКиО им. Муравьева-Амурского." },
      { q: "Далеко ли от города до границы с Китаем?", a: "Хабаровск расположен очень близко к границе — всего в нескольких десятках километров находится большой остров Большой Уссурийский, разделенный между РФ и КНР." },
      { q: "Что интересного посмотреть в музее имени Гродекова?", a: "Главная гордость музея — гигантская круговая панорама, детально воссоздающая Волочаевское сражение Гражданской войны на Дальнем Востоке." },
    ]
  }
};

// Catalog monuments pack (SPB/MSK/NN/KGD/Perm) → hub + My Day mustSee.
mergeMonumentMustSeeIntoCityInfo(CITY_INFO);

function normalizeLookupKey(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

function lookupCityInfoKey(key?: string | null) {
  const normalized = normalizeLookupKey(key);
  if (!normalized) return null;
  if (CITY_INFO[normalized]) return normalized;
  const alias = SLUG_ALIASES[normalized];
  if (alias && CITY_INFO[alias]) return alias;
  return null;
}

export function resolveCityInfo(slug?: string | null, sourceSlug?: string | null): CityInfoEntry | null {
  for (const candidate of [slug, sourceSlug]) {
    const key = lookupCityInfoKey(candidate);
    if (key) return CITY_INFO[key];
  }
  return null;
}

export function resolveCityBrief(slug?: string | null, sourceSlug?: string | null, name?: string | null): string {
  const info = resolveCityInfo(slug, sourceSlug);
  if (info?.brief) return info.brief;
  if (name) {
    return `${name} - экскурсии, музеи, театры и городские события. Выбирайте дату в афише и покупайте билеты онлайн.`;
  }
  return 'Экскурсии, музеи и мероприятия - выбирайте дату в афише и покупайте билеты онлайн.';
}
