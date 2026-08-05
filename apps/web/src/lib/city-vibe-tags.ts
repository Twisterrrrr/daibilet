/**
 * Static vibe tags for `/cities` cards - mood/place hooks, not landing chips.
 * Keys = canonical city slugs (+ common aliases). Copy uses regular hyphen `-`.
 */

export type CityVibeTag = {
  emoji: string;
  label: string;
};

const CITY_VIBE_TAGS: Record<string, CityVibeTag[]> = {
  moscow: [
    { emoji: '🏙', label: 'Столица' },
    { emoji: '🎭', label: 'Театры' },
    { emoji: '🚇', label: 'Метро' },
    { emoji: '🌃', label: 'Ночная жизнь' },
  ],
  'saint-petersburg': [
    { emoji: '🌉', label: 'Мосты' },
    { emoji: '🏛', label: 'Эрмитаж' },
    { emoji: '🌊', label: 'Нева' },
    { emoji: '🤍', label: 'Белые ночи' },
  ],
  kazan: [
    { emoji: '🏰', label: 'Кремль' },
    { emoji: '🏙', label: 'Третья столица' },
    { emoji: '🥟', label: 'Эчпочмак' },
    { emoji: '🕌', label: 'Кул-Шариф' },
  ],
  sochi: [
    { emoji: '🌊', label: 'Море' },
    { emoji: '🏔', label: 'Горы' },
    { emoji: '☀️', label: 'Курорт' },
    { emoji: '🏞', label: 'Олимпийский парк' },
  ],
  ekaterinburg: [
    { emoji: '🏭', label: 'Урал' },
    { emoji: '🎨', label: 'Стрит-арт' },
    { emoji: '🏙', label: 'Ельцин Центр' },
  ],
  'nizhny-novgorod': [
    { emoji: '🛳', label: 'Стрелка' },
    { emoji: '🏰', label: 'Кремль' },
    { emoji: '🌅', label: 'Закаты' },
  ],
  kaliningrad: [
    { emoji: '🌊', label: 'Балтика' },
    { emoji: '🏰', label: 'Форты' },
    { emoji: '🏖', label: 'Янтарный берег' },
  ],
  samara: [
    { emoji: '🛳', label: 'Волга' },
    { emoji: '🏖', label: 'Набережная' },
    { emoji: '🚀', label: 'Космос' },
  ],
  novosibirsk: [
    { emoji: '🌲', label: 'Сибирь' },
    { emoji: '🎭', label: 'Опера' },
    { emoji: '🔬', label: 'Академгородок' },
  ],
  krasnodar: [
    { emoji: '🌳', label: 'Юг' },
    { emoji: '🏛', label: 'Парк Галицкого' },
    { emoji: '☀️', label: 'Солнечно' },
  ],
  vladivostok: [
    { emoji: '🌉', label: 'Мосты' },
    { emoji: '🌊', label: 'Океан' },
    { emoji: '🦀', label: 'Дальний Восток' },
  ],
  irkutsk: [
    { emoji: '💎', label: 'Байкал' },
    { emoji: '🪵', label: 'Деревянный' },
    { emoji: '🏞', label: 'Сибирь' },
  ],
  yaroslavl: [
    { emoji: '🛳', label: 'Золотое кольцо' },
    { emoji: '🏛', label: 'Храмы' },
    { emoji: '🌊', label: 'Волга' },
  ],
  vladimir: [
    { emoji: '💍', label: 'Золотое кольцо' },
    { emoji: '🏛', label: 'Белый камень' },
    { emoji: '⛪', label: 'Успенский собор' },
  ],
  'veliky-novgorod': [
    { emoji: '⚔', label: 'Древняя Русь' },
    { emoji: '🏛', label: 'Кремль' },
    { emoji: '🌊', label: 'Волхов' },
  ],
  volgograd: [
    { emoji: '🕯', label: 'Мамаев курган' },
    { emoji: '🛳', label: 'Волга' },
    { emoji: '🏛', label: 'Память' },
  ],
  'rostov-na-donu': [
    { emoji: '🎭', label: 'Южная столица' },
    { emoji: '🌊', label: 'Дон' },
    { emoji: '🎷', label: 'Джаз' },
  ],
  'rostov-on-don': [
    { emoji: '🎭', label: 'Южная столица' },
    { emoji: '🌊', label: 'Дон' },
    { emoji: '🎷', label: 'Джаз' },
  ],
  perm: [
    { emoji: '🎭', label: 'Театр' },
    { emoji: '🏔', label: 'Урал' },
    { emoji: '🎨', label: 'Пермский стиль' },
  ],
  ufa: [
    { emoji: '🍯', label: 'Башкирия' },
    { emoji: '🏔', label: 'Урал' },
    { emoji: '🎭', label: 'Театр' },
  ],
  chelyabinsk: [
    { emoji: '🏔', label: 'Урал' },
    { emoji: '🏭', label: 'Металлургия' },
    { emoji: '❄️', label: 'Зима' },
  ],
  tula: [
    { emoji: '🍞', label: 'Пряник' },
    { emoji: '⚔', label: 'Оружие' },
    { emoji: '🏰', label: 'Кремль' },
  ],
  kostroma: [
    { emoji: '💍', label: 'Золотое кольцо' },
    { emoji: '🏛', label: 'Ипатьевский' },
    { emoji: '🛳', label: 'Волга' },
  ],
  astrahan: [
    { emoji: '🐟', label: 'Волга-дельта' },
    { emoji: '🏰', label: 'Кремль' },
    { emoji: '🍉', label: 'Арбузы' },
  ],
  murmansk: [
    { emoji: '❄️', label: 'Заполярье' },
    { emoji: '🚢', label: 'Порт' },
    { emoji: '🌌', label: 'Северное сияние' },
  ],
  sevastopol: [
    { emoji: '🌊', label: 'Чёрное море' },
    { emoji: '⚓', label: 'Флот' },
    { emoji: '🏛', label: 'История' },
  ],
  tyumen: [
    { emoji: '🛁', label: 'Термы' },
    { emoji: '🛢', label: 'Нефть' },
    { emoji: '🏙', label: 'Сибирь' },
  ],
  krasnoyarsk: [
    { emoji: '🏔', label: 'Столбы' },
    { emoji: '🌊', label: 'Енисей' },
    { emoji: '🌲', label: 'Сибирь' },
  ],
  voronezh: [
    { emoji: '🛳', label: 'Корабль' },
    { emoji: '🌳', label: 'Черноземье' },
    { emoji: '🎭', label: 'Театр' },
  ],
  omsk: [
    { emoji: '🛳', label: 'Иртыш' },
    { emoji: '🏙', label: 'Сибирь' },
    { emoji: '🎭', label: 'Театр' },
  ],
  tomsk: [
    { emoji: '🎓', label: 'Студенческий' },
    { emoji: '🪵', label: 'Деревянный' },
    { emoji: '🌲', label: 'Сибирь' },
  ],
  habarovsk: [
    { emoji: '🌊', label: 'Амур' },
    { emoji: '🦀', label: 'Дальний Восток' },
    { emoji: '🌅', label: 'Набережная' },
  ],
  'yuzhno-sahalinsk': [
    { emoji: '🏔', label: 'Сахалин' },
    { emoji: '🌊', label: 'Океан' },
    { emoji: '🦀', label: 'Остров' },
  ],
  sortavala: [
    { emoji: '🏞', label: 'Ладога' },
    { emoji: '⛰', label: 'Карелия' },
    { emoji: '🌲', label: 'Север' },
  ],
  pskov: [
    { emoji: '🏰', label: 'Кремль' },
    { emoji: '⚔', label: 'Древняя Русь' },
    { emoji: '🏛', label: 'Храмы' },
  ],
  smolensk: [
    { emoji: '🏰', label: 'Крепость' },
    { emoji: '🛡', label: 'Щит России' },
    { emoji: '🏛', label: 'История' },
  ],
  kaluga: [
    { emoji: '🚀', label: 'Космос' },
    { emoji: '🏛', label: 'Циолковский' },
    { emoji: '🌳', label: 'Центр' },
  ],
  tver: [
    { emoji: '🛳', label: 'Волга' },
    { emoji: '🏙', label: 'Между столицами' },
    { emoji: '🌳', label: 'Прогулки' },
  ],
  saratov: [
    { emoji: '🛳', label: 'Волга' },
    { emoji: '🏙', label: 'Набережная' },
    { emoji: '🎭', label: 'Театр' },
  ],
  vologda: [
    { emoji: '🧈', label: 'Масло' },
    { emoji: '🪵', label: 'Деревянный' },
    { emoji: '❄', label: 'Север' },
  ],
  arhangelsk: [
    { emoji: '🚢', label: 'Белое море' },
    { emoji: '🪵', label: 'Малые Корелы' },
    { emoji: '❄', label: 'Север' },
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
