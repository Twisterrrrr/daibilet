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
};

const ALIAS_TO_CANON: Record<string, string> = {
  moskva: 'moscow',
  msk: 'moscow',
  spb: 'saint-petersburg',
  'sankt-peterburg': 'saint-petersburg',
  peterburg: 'saint-petersburg',
  'nizhniy-novgorod': 'nizhny-novgorod',
  rostov: 'rostov-on-don',
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
