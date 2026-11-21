import type { CatalogPresetSlug } from '@/lib/catalog-presets';
import { buildCatalogPresetValues } from '@/lib/catalog-presets';
import type { CatalogFilterValues } from '@/lib/catalog-url';
import { normalizeKnownCitySlug } from '@/lib/landing-routes';

/** Статичные SEO-URL подборок (индексируемые), вместо `/events?…`. */
export type CatalogIntentSlug =
  | 'besplatno'
  | 'na-vyhodnye'
  | 'segodnya-vecherom'
  | 'do-2000'
  | 'skoro';

export type CatalogIntentDefinition = {
  intent: CatalogIntentSlug;
  preset: CatalogPresetSlug;
  /** H1 / короткий ярлык */
  label: string;
  title: string;
  description: string;
  /** On-page SEO текст (без em/en dash) */
  seoBody: string;
};

const INTENTS: CatalogIntentDefinition[] = [
  {
    intent: 'besplatno',
    preset: 'free',
    label: 'Бесплатно',
    title: 'Бесплатные события и экскурсии - афиша и билеты',
    description:
      'Подборка бесплатных событий, музеев и экскурсий: актуальные даты, города и переход к покупке билета онлайн на Дайбилет.',
    seoBody:
      'Бесплатные события - удобный способ познакомиться с городом без лишних трат. В этой подборке собраны мероприятия с нулевой ценой билета: дни открытых дверей, бесплатные экскурсии, городские акции и другие форматы, где вход не требует оплаты. Список обновляется по каталогу Дайбилет: можно выбрать город, дату и сразу перейти к карточке события. Если бесплатных вариантов мало, рядом есть соседние подборки с низким чеком и предложениями на вечер или выходные. Покупка и подтверждение идут через билетную систему организатора - на странице события видно расписание, площадку и условия.',
  },
  {
    intent: 'na-vyhodnye',
    preset: 'weekend',
    label: 'На выходных',
    title: 'События на выходных - афиша и билеты',
    description:
      'Что посмотреть в выходные: экскурсии, музеи и мероприятия на субботу и воскресенье. Актуальная афиша и билеты на Дайбилет.',
    seoBody:
      'Выходные - пик спроса на экскурсии, музеи и городские мероприятия. Подборка показывает варианты на субботу и воскресенье: можно сравнить время, цену и площадку, не листая весь каталог. Фильтр по городу сужает выдачу под поездку или прогулку рядом с домом. На карточке события есть описание, ближайшие сеансы и кнопка покупки. Если нужен другой горизонт дат, откройте полный каталог или соседние подборки - вечер сегодня, бюджет до 2000 рублей или бесплатные форматы. Дайбилет помогает сравнить предложения и оформить билет онлайн через систему организатора.',
  },
  {
    intent: 'segodnya-vecherom',
    preset: 'evening',
    label: 'Сегодня вечером',
    title: 'События сегодня вечером - афиша и билеты',
    description:
      'Куда сходить сегодня вечером: актуальные сеансы, экскурсии и мероприятия после работы. Билеты онлайн на Дайбилет.',
    seoBody:
      'Подборка «сегодня вечером» собрана для спонтанных планов: сеансы и старты во второй половине дня и ночью. Удобно, если вы уже в городе и хотите выбрать маршрут за несколько минут. Смотрите время начала, цену от и площадку, затем переходите к покупке. Список зависит от города и текущего расписания поставщиков - вечером в пятницу и в будни набор может отличаться. Если на вечер мало мест, посмотрите варианты на выходные или весь каталог с фильтром по дате. Оформление билета проходит у организатора; на Дайбилет остаются сравнение, карточка события и поддержка по заказу.',
  },
  {
    intent: 'do-2000',
    preset: 'cheap',
    label: 'До 2000 ₽',
    title: 'События до 2000 рублей - афиша и билеты',
    description:
      'Бюджетные экскурсии и мероприятия до 2000 рублей: сравнение цен, даты и покупка билетов онлайн на Дайбилет.',
    seoBody:
      'Подборка до 2000 рублей помогает держать бюджет поездки под контролем: в выдаче остаются события с ценой в этом диапазоне. Это удобно для коротких экскурсий, музеев и городских форматов без премиум-чека. Отсортируйте по цене или популярности, выберите город и дату, затем откройте карточку с расписанием. Цены зависят от категории билета и сеанса - на странице события видно актуальный диапазон. Если нужен вход без оплаты, перейдите в подборку бесплатных событий. Покупка оформляется через билетную систему организатора; Дайбилет показывает сравнение и путь к оплате.',
  },
  {
    intent: 'skoro',
    preset: 'soon',
    label: 'Скоро начнётся',
    title: 'Скоро начинающиеся события - афиша и билеты',
    description:
      'События, которые скоро начнутся: ближайшие сеансы и экскурсии с актуальным временем старта. Билеты на Дайбилет.',
    seoBody:
      'Подборка «скоро начнётся» ориентирована на ближайшие сеансы в каталоге: удобно, когда важно успеть к старту, а не планировать на недели вперёд. Сортировка по времени помогает увидеть, что доступно в ближайшие часы. Проверьте город, площадку и остаток мест на карточке, затем перейдите к покупке. Набор быстро меняется - после старта сеанса позиция может исчезнуть из списка. Для планов на вечер или выходные используйте соседние тематические подборки. Дайбилет агрегирует предложения организаторов и ведёт к оформлению в их билетной системе.',
  },
];

const BY_INTENT = new Map(INTENTS.map((item) => [item.intent, item]));
const BY_PRESET = new Map(INTENTS.map((item) => [item.preset, item]));
const INTENT_ALIASES: Record<string, CatalogIntentSlug> = {
  'na-vyhodnyh': 'na-vyhodnye',
};

export function listCatalogIntents(): CatalogIntentDefinition[] {
  return INTENTS;
}

export function resolveCatalogIntent(raw: string | undefined | null): CatalogIntentDefinition | null {
  const key = String(raw || '')
    .trim()
    .toLowerCase();
  if (!key) return null;
  return BY_INTENT.get((INTENT_ALIASES[key] || key) as CatalogIntentSlug) || null;
}

export function canonicalCatalogIntentSlug(raw: string | undefined | null): CatalogIntentSlug | null {
  const key = String(raw || '').trim().toLowerCase();
  if (!key) return null;
  const canonical = INTENT_ALIASES[key] || key;
  return BY_INTENT.has(canonical as CatalogIntentSlug) ? (canonical as CatalogIntentSlug) : null;
}

export function catalogIntentPath(intent: CatalogIntentSlug, city?: string | null): string {
  const raw = String(city || '').trim();
  if (raw && raw !== 'all') {
    // Self-canonical Group E: всегда SEO path-канон города, не DB translit / alias.
    const citySlug = normalizeKnownCitySlug(raw) || raw;
    return `/podborki/${intent}/${encodeURIComponent(citySlug)}`;
  }
  return `/podborki/${intent}`;
}

export function catalogPresetToIntentPath(
  preset: CatalogPresetSlug,
  city?: string | null,
): string | null {
  const def = BY_PRESET.get(preset);
  if (!def) return null;
  return catalogIntentPath(def.intent, city);
}

export function catalogIntentFilterValues(intent: CatalogIntentDefinition): CatalogFilterValues {
  return buildCatalogPresetValues(intent.preset, false);
}

export function formatIntentSeoBody(
  intent: CatalogIntentDefinition,
  opts?: { cityName?: string | null; eventsCount?: number },
): string {
  const city = String(opts?.cityName || '').trim();
  const count = opts?.eventsCount && opts.eventsCount > 0 ? opts.eventsCount : null;
  const parts = [intent.seoBody];
  if (city) {
    parts.push(
      ` Сейчас подборка открыта для города ${city}${count != null ? `: в выдаче около ${count} позиций` : ''}.`,
    );
  } else if (count != null) {
    parts.push(` В общей выдаче сейчас около ${count} позиций по всем городам.`);
  }
  return parts.join('').replace(/\s+/g, ' ').trim();
}
