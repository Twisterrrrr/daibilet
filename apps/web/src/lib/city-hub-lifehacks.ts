/**
 * City hub «лайфхаки»: короткие карточки с CTA.
 * Держим отдельно от cityInfo (coords/mustSee) и local-flavor (погода/уникальность).
 * Пилот: Пермь. Другие города - getter возвращает null.
 */

import { normalizeCityHubSlug } from './city-hub-config.ts';
import type { CityPlaceFocus } from './city-hub-local-flavor.ts';

export type CityLifehackTabId = 'walk' | 'transit' | 'fly' | 'food';

export type CityLifehackBodyPart = {
  text: string;
  strong?: boolean;
};

export type CityLifehackCta = {
  kind: 'maps' | 'gis' | 'affiche' | 'places';
  label: string;
  href?: string;
  slugs?: string[];
  scrollTo?: 'places' | 'suburbs';
  extra?: Array<{ label: string; href: string }>;
};

export type CityLifehackIcon = 'walk' | 'transit' | 'fly' | 'food' | 'loop';

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

const PERM_LIFEHACKS: CityLifehackPack = {
  skipTravel: true,
  tabs: LIFEHACK_TABS,
  items: [
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
  ],
};

const CITY_HUB_LIFEHACKS: Record<string, CityLifehackPack> = {
  perm: PERM_LIFEHACKS,
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
