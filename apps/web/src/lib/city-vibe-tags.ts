/**
 * Static vibe tags for `/cities` cards - mood/place hooks, not landing chips.
 * Keys = canonical city slugs (+ common aliases). Copy uses regular hyphen `-`.
 * `icon` = Lucide icon name rendered by CityCard (muted line icons, no emoji).
 */

export type CityVibeIconName =
  | 'Building2'
  | 'Clapperboard'
  | 'Train'
  | 'Moon'
  | 'Bridge'
  | 'Landmark'
  | 'Waves'
  | 'Sun'
  | 'Mountain'
  | 'Trees'
  | 'Factory'
  | 'Palette'
  | 'Ship'
  | 'Sunrise'
  | 'Umbrella'
  | 'Rocket'
  | 'Microscope'
  | 'Gem'
  | 'Church'
  | 'Swords'
  | 'Flame'
  | 'Music'
  | 'Snowflake'
  | 'Cake'
  | 'Fish'
  | 'Anchor'
  | 'Droplets'
  | 'GraduationCap'
  | 'Shield'
  | 'Sparkles'
  | 'MapPin';

export type CityVibeTag = {
  icon: CityVibeIconName;
  label: string;
};

const CITY_VIBE_TAGS: Record<string, CityVibeTag[]> = {
  moscow: [
    { icon: 'Building2', label: 'Столица' },
    { icon: 'Clapperboard', label: 'Театры' },
    { icon: 'Train', label: 'Метро' },
    { icon: 'Moon', label: 'Ночная жизнь' },
  ],
  'saint-petersburg': [
    { icon: 'Bridge', label: 'Мосты' },
    { icon: 'Landmark', label: 'Эрмитаж' },
    { icon: 'Waves', label: 'Нева' },
    { icon: 'Sun', label: 'Белые ночи' },
  ],
  kazan: [
    { icon: 'Landmark', label: 'Кремль' },
    { icon: 'Building2', label: 'Третья столица' },
    { icon: 'Cake', label: 'Эчпочмак' },
    { icon: 'Church', label: 'Кул-Шариф' },
  ],
  sochi: [
    { icon: 'Waves', label: 'Море' },
    { icon: 'Mountain', label: 'Горы' },
    { icon: 'Sun', label: 'Курорт' },
    { icon: 'Trees', label: 'Олимпийский парк' },
  ],
  ekaterinburg: [
    { icon: 'Factory', label: 'Урал' },
    { icon: 'Palette', label: 'Стрит-арт' },
    { icon: 'Building2', label: 'Ельцин Центр' },
  ],
  'nizhny-novgorod': [
    { icon: 'Ship', label: 'Стрелка' },
    { icon: 'Landmark', label: 'Кремль' },
    { icon: 'Sunrise', label: 'Закаты' },
  ],
  kaliningrad: [
    { icon: 'Waves', label: 'Балтика' },
    { icon: 'Landmark', label: 'Форты' },
    { icon: 'Umbrella', label: 'Янтарный берег' },
  ],
  samara: [
    { icon: 'Ship', label: 'Волга' },
    { icon: 'Umbrella', label: 'Набережная' },
    { icon: 'Rocket', label: 'Космос' },
  ],
  novosibirsk: [
    { icon: 'Trees', label: 'Сибирь' },
    { icon: 'Clapperboard', label: 'Опера' },
    { icon: 'Microscope', label: 'Академгородок' },
  ],
  krasnodar: [
    { icon: 'Trees', label: 'Юг' },
    { icon: 'Landmark', label: 'Парк Галицкого' },
    { icon: 'Sun', label: 'Солнечно' },
  ],
  vladivostok: [
    { icon: 'Bridge', label: 'Мосты' },
    { icon: 'Waves', label: 'Океан' },
    { icon: 'MapPin', label: 'Дальний Восток' },
  ],
  irkutsk: [
    { icon: 'Gem', label: 'Байкал' },
    { icon: 'Trees', label: 'Деревянный' },
    { icon: 'Mountain', label: 'Сибирь' },
  ],
  yaroslavl: [
    { icon: 'Ship', label: 'Золотое кольцо' },
    { icon: 'Church', label: 'Храмы' },
    { icon: 'Waves', label: 'Волга' },
  ],
  vladimir: [
    { icon: 'Gem', label: 'Золотое кольцо' },
    { icon: 'Landmark', label: 'Белый камень' },
    { icon: 'Church', label: 'Успенский собор' },
  ],
  'veliky-novgorod': [
    { icon: 'Swords', label: 'Древняя Русь' },
    { icon: 'Landmark', label: 'Кремль' },
    { icon: 'Waves', label: 'Волхов' },
  ],
  volgograd: [
    { icon: 'Flame', label: 'Мамаев курган' },
    { icon: 'Ship', label: 'Волга' },
    { icon: 'Landmark', label: 'Память' },
  ],
  'rostov-na-donu': [
    { icon: 'Clapperboard', label: 'Южная столица' },
    { icon: 'Waves', label: 'Дон' },
    { icon: 'Music', label: 'Джаз' },
  ],
  'rostov-on-don': [
    { icon: 'Clapperboard', label: 'Южная столица' },
    { icon: 'Waves', label: 'Дон' },
    { icon: 'Music', label: 'Джаз' },
  ],
  perm: [
    { icon: 'Clapperboard', label: 'Театр' },
    { icon: 'Mountain', label: 'Урал' },
    { icon: 'Palette', label: 'Пермский стиль' },
  ],
  ufa: [
    { icon: 'Sparkles', label: 'Башкирия' },
    { icon: 'Mountain', label: 'Урал' },
    { icon: 'Clapperboard', label: 'Театр' },
  ],
  chelyabinsk: [
    { icon: 'Mountain', label: 'Урал' },
    { icon: 'Factory', label: 'Металлургия' },
    { icon: 'Snowflake', label: 'Зима' },
  ],
  tula: [
    { icon: 'Cake', label: 'Пряник' },
    { icon: 'Swords', label: 'Оружие' },
    { icon: 'Landmark', label: 'Кремль' },
  ],
  kostroma: [
    { icon: 'Gem', label: 'Золотое кольцо' },
    { icon: 'Landmark', label: 'Ипатьевский' },
    { icon: 'Ship', label: 'Волга' },
  ],
  astrahan: [
    { icon: 'Fish', label: 'Волга-дельта' },
    { icon: 'Landmark', label: 'Кремль' },
    { icon: 'Sun', label: 'Арбузы' },
  ],
  murmansk: [
    { icon: 'Snowflake', label: 'Заполярье' },
    { icon: 'Ship', label: 'Порт' },
    { icon: 'Sparkles', label: 'Северное сияние' },
  ],
  sevastopol: [
    { icon: 'Waves', label: 'Чёрное море' },
    { icon: 'Anchor', label: 'Флот' },
    { icon: 'Landmark', label: 'История' },
  ],
  tyumen: [
    { icon: 'Droplets', label: 'Термы' },
    { icon: 'Flame', label: 'Нефть' },
    { icon: 'Building2', label: 'Сибирь' },
  ],
  krasnoyarsk: [
    { icon: 'Mountain', label: 'Столбы' },
    { icon: 'Waves', label: 'Енисей' },
    { icon: 'Trees', label: 'Сибирь' },
  ],
  voronezh: [
    { icon: 'Ship', label: 'Корабль' },
    { icon: 'Trees', label: 'Черноземье' },
    { icon: 'Clapperboard', label: 'Театр' },
  ],
  omsk: [
    { icon: 'Ship', label: 'Иртыш' },
    { icon: 'Building2', label: 'Сибирь' },
    { icon: 'Clapperboard', label: 'Театр' },
  ],
  tomsk: [
    { icon: 'GraduationCap', label: 'Студенческий' },
    { icon: 'Trees', label: 'Деревянный' },
    { icon: 'Trees', label: 'Сибирь' },
  ],
  habarovsk: [
    { icon: 'Waves', label: 'Амур' },
    { icon: 'MapPin', label: 'Дальний Восток' },
    { icon: 'Sunrise', label: 'Набережная' },
  ],
  'yuzhno-sahalinsk': [
    { icon: 'Mountain', label: 'Сахалин' },
    { icon: 'Waves', label: 'Океан' },
    { icon: 'MapPin', label: 'Остров' },
  ],
  sortavala: [
    { icon: 'Waves', label: 'Ладога' },
    { icon: 'Mountain', label: 'Карелия' },
    { icon: 'Trees', label: 'Север' },
  ],
  pskov: [
    { icon: 'Landmark', label: 'Кремль' },
    { icon: 'Swords', label: 'Древняя Русь' },
    { icon: 'Church', label: 'Храмы' },
  ],
  smolensk: [
    { icon: 'Landmark', label: 'Крепость' },
    { icon: 'Shield', label: 'Щит России' },
    { icon: 'Landmark', label: 'История' },
  ],
  kaluga: [
    { icon: 'Rocket', label: 'Космос' },
    { icon: 'Landmark', label: 'Циолковский' },
    { icon: 'Trees', label: 'Центр' },
  ],
  tver: [
    { icon: 'Ship', label: 'Волга' },
    { icon: 'Building2', label: 'Между столицами' },
    { icon: 'Trees', label: 'Прогулки' },
  ],
  saratov: [
    { icon: 'Ship', label: 'Волга' },
    { icon: 'Building2', label: 'Набережная' },
    { icon: 'Clapperboard', label: 'Театр' },
  ],
  vologda: [
    { icon: 'Cake', label: 'Масло' },
    { icon: 'Trees', label: 'Деревянный' },
    { icon: 'Snowflake', label: 'Север' },
  ],
  arhangelsk: [
    { icon: 'Ship', label: 'Белое море' },
    { icon: 'Trees', label: 'Малые Корелы' },
    { icon: 'Snowflake', label: 'Север' },
  ],
  ryazan: [
    { icon: 'Landmark', label: 'Кремль' },
    { icon: 'Ship', label: 'Ока' },
    { icon: 'Gem', label: 'Золотое кольцо' },
  ],
  penza: [
    { icon: 'Clapperboard', label: 'Театр' },
    { icon: 'Ship', label: 'Сура' },
    { icon: 'Palette', label: 'Лермонтов' },
  ],
  barnaul: [
    { icon: 'Mountain', label: 'Алтай' },
    { icon: 'Trees', label: 'Сибирь' },
    { icon: 'Building2', label: 'Столица края' },
  ],
  lipetsk: [
    { icon: 'Trees', label: 'Черноземье' },
    { icon: 'Factory', label: 'Металлургия' },
    { icon: 'Landmark', label: 'Центр России' },
  ],
  lipeck: [
    { icon: 'Trees', label: 'Черноземье' },
    { icon: 'Factory', label: 'Металлургия' },
    { icon: 'Landmark', label: 'Центр России' },
  ],
  surgut: [
    { icon: 'Flame', label: 'Нефть' },
    { icon: 'Ship', label: 'Обь' },
    { icon: 'Snowflake', label: 'Север' },
  ],
  novokuznetsk: [
    { icon: 'Factory', label: 'Кузбасс' },
    { icon: 'Mountain', label: 'Сибирь' },
    { icon: 'Building2', label: 'Горная столица' },
  ],
  tolyatti: [
    { icon: 'Ship', label: 'Волга' },
    { icon: 'Factory', label: 'Автоград' },
    { icon: 'Trees', label: 'Парк' },
  ],
  ulyanovsk: [
    { icon: 'Ship', label: 'Волга' },
    { icon: 'Landmark', label: 'Симбирск' },
    { icon: 'Rocket', label: 'Авиация' },
  ],
  cheboksary: [
    { icon: 'Sparkles', label: 'Чувашия' },
    { icon: 'Ship', label: 'Волга' },
    { icon: 'Landmark', label: 'Кремль' },
  ],
  kemerovo: [
    { icon: 'Factory', label: 'Кузбасс' },
    { icon: 'Trees', label: 'Сибирь' },
    { icon: 'Mountain', label: 'Шория' },
  ],
  kirov: [
    { icon: 'Ship', label: 'Вятка' },
    { icon: 'Landmark', label: 'Кремль' },
    { icon: 'Trees', label: 'Центр России' },
  ],
  'kirov-kirovskaya-oblast': [
    { icon: 'Ship', label: 'Вятка' },
    { icon: 'Landmark', label: 'Кремль' },
    { icon: 'Trees', label: 'Центр России' },
  ],
  kurgan: [
    { icon: 'Train', label: 'Транссиб' },
    { icon: 'Mountain', label: 'Урал' },
    { icon: 'Building2', label: 'Сибирь' },
  ],
  izhevsk: [
    { icon: 'Sparkles', label: 'Удмуртия' },
    { icon: 'Factory', label: 'Промышленность' },
    { icon: 'Music', label: 'Оружейная' },
  ],
  abakan: [
    { icon: 'Mountain', label: 'Саяны' },
    { icon: 'Trees', label: 'Хакасия' },
    { icon: 'Landmark', label: 'Минусинск' },
  ],
  belgorod: [
    { icon: 'Trees', label: 'Черноземье' },
    { icon: 'Landmark', label: 'Собор' },
    { icon: 'Shield', label: 'Пограничье' },
  ],
  bryansk: [
    { icon: 'Trees', label: 'Леса' },
    { icon: 'Landmark', label: 'Партизаны' },
    { icon: 'Shield', label: 'Запад' },
  ],
  ivanovo: [
    { icon: 'Factory', label: 'Текстиль' },
    { icon: 'Ship', label: 'Волга' },
    { icon: 'Palette', label: 'Иваново' },
  ],
  'yoshkar-ola': [
    { icon: 'Sparkles', label: 'Марий Эл' },
    { icon: 'Landmark', label: 'Кремль' },
    { icon: 'Ship', label: 'Кокшага' },
  ],
  kursk: [
    { icon: 'Trees', label: 'Черноземье' },
    { icon: 'Landmark', label: 'Собор' },
    { icon: 'Shield', label: 'Курская дуга' },
  ],
  orel: [
    { icon: 'Trees', label: 'Черноземье' },
    { icon: 'Palette', label: 'Тургенев' },
    { icon: 'Landmark', label: 'Центр России' },
  ],
  orenburg: [
    { icon: 'Sparkles', label: 'Оренбург' },
    { icon: 'Bridge', label: 'Мост' },
    { icon: 'Sun', label: 'Степь' },
  ],
  saransk: [
    { icon: 'Sparkles', label: 'Мордовия' },
    { icon: 'Clapperboard', label: 'Футбол' },
    { icon: 'Landmark', label: 'Центр' },
  ],
  simferopol: [
    { icon: 'Sun', label: 'Крым' },
    { icon: 'Mountain', label: 'Горы рядом' },
    { icon: 'Landmark', label: 'Центр полуострова' },
  ],
  stavropol: [
    { icon: 'Mountain', label: 'Кавказ' },
    { icon: 'Sun', label: 'Юг' },
    { icon: 'Trees', label: 'Курорты' },
  ],
  syktyvkar: [
    { icon: 'Trees', label: 'Коми' },
    { icon: 'Ship', label: 'Сысола' },
    { icon: 'Snowflake', label: 'Север' },
  ],
  tambov: [
    { icon: 'Trees', label: 'Черноземье' },
    { icon: 'Palette', label: 'Платонов' },
    { icon: 'Landmark', label: 'Центр России' },
  ],
  'ulan-ude': [
    { icon: 'Sparkles', label: 'Бурятия' },
    { icon: 'Landmark', label: 'Лама' },
    { icon: 'Mountain', label: 'Байкал' },
  ],
  chita: [
    { icon: 'Train', label: 'Транссиб' },
    { icon: 'MapPin', label: 'Забайкалье' },
    { icon: 'Building2', label: 'Восток' },
  ],
  'hanty-mansiysk': [
    { icon: 'Flame', label: 'Нефть' },
    { icon: 'Snowflake', label: 'Север' },
    { icon: 'Ship', label: 'Иртыш' },
  ],
  'blagoveschensk-amurskaya-oblast': [
    { icon: 'Ship', label: 'Амур' },
    { icon: 'MapPin', label: 'Дальний Восток' },
    { icon: 'Bridge', label: 'Граница' },
  ],
};

const ALIAS_TO_CANON: Record<string, string> = {
  moskva: 'moscow',
  msk: 'moscow',
  spb: 'saint-petersburg',
  'sankt-peterburg': 'saint-petersburg',
  peterburg: 'saint-petersburg',
  'nizhniy-novgorod': 'nizhny-novgorod',
  'velikiy-novgorod': 'veliky-novgorod',
  rostov: 'rostov-on-don',
  lipetsk: 'lipeck',
};

function resolveVibeKey(slug?: string | null, sourceSlug?: string | null): string | null {
  for (const raw of [slug, sourceSlug]) {
    const key = String(raw || '')
      .trim()
      .toLowerCase();
    if (!key) continue;
    const canon = ALIAS_TO_CANON[key] || key;
    if (CITY_VIBE_TAGS[canon]) return canon;
  }
  return null;
}

/** 2-4 vibe tags for a city card; empty if unknown. */
export function resolveCityVibeTags(
  slug?: string | null,
  sourceSlug?: string | null,
  limit = 4,
): CityVibeTag[] {
  const key = resolveVibeKey(slug, sourceSlug);
  if (!key) return [];
  return CITY_VIBE_TAGS[key].slice(0, Math.max(2, Math.min(limit, 4)));
}

/** Static vibes first; hubTags chips as fallback for cities without a curated set. */
export function resolveCityCardVibeTags(
  city: {
    slug?: string | null;
    sourceSlug?: string | null;
    hubTags?: { label?: string | null }[] | null;
  },
  limit = 4,
): CityVibeTag[] {
  const custom = resolveCityVibeTags(city.slug, city.sourceSlug, limit);
  if (custom.length >= 2) return custom;

  const fromHub = (city.hubTags || [])
    .map((tag) => String(tag.label || '').trim())
    .filter(Boolean)
    .slice(0, limit)
    .map((label) => ({ icon: 'Sparkles' as CityVibeIconName, label }));

  if (fromHub.length >= 2) return fromHub.slice(0, Math.max(2, Math.min(limit, 4)));
  return custom;
}
