/**
 * ContextWidget config by canonical landing slug (CHPU / landing-rules).
 * NOT a Prisma Category.widgetData field - content lives in code until CMS blocks cover it.
 * No fake ratings / review counts.
 */

export type LandingContextChip = {
  /** Visible label (text-first Clean UI). */
  label: string;
  /** Optional keyword for soft client filter against title+tags (lowercase). */
  match?: string;
};

export type LandingContextTip = {
  title: string;
  text: string;
};

export type LandingContextWidgetConfig = {
  /** Canonical slug from landing-rules / landing-routes. */
  slug: string;
  /** Section H2. */
  title: string;
  /** Short lead under H2. */
  lead: string;
  /** Theme chips - text-first, no emoji, no icon clusters. */
  chips: LandingContextChip[];
  /** Practical tips (1-4). */
  tips: LandingContextTip[];
  /** Optional «для кого» lines (plain text). */
  audience?: string[];
};

/**
 * Owner matrix (CHPU path → canonical slug):
 * planetarium → planetarium
 * rooftops → rooftops (progulki-po-krysham)
 * zagorodnye → country-tours
 * vecherinki → river-party
 * detyam → family-kids
 * novyj-god → new-year
 */
export const LANDING_CONTEXT_WIDGETS: Record<string, LandingContextWidgetConfig> = {
  planetarium: {
    slug: 'planetarium',
    title: 'Как выбрать программу в Планетарии',
    lead: 'Под куполом бывают детские сказки, полнокупольные фильмы и вечерние концерты. Смотрите возраст и длительность до покупки.',
    chips: [
      { label: 'Детям', match: 'дет' },
      { label: 'Полный купол', match: 'купол' },
      { label: 'Концерт', match: 'концерт' },
      { label: 'Научпоп', match: 'науч' },
    ],
    tips: [
      {
        title: 'Возраст и длительность',
        text: 'Малышам комфортнее короткие сеансы. Для шоу 16+ проверьте ограничение на карточке события.',
      },
      {
        title: 'Места в зале',
        text: 'Центральные ряды дают лучший обзор купола. Крайние места сильнее наклоняют голову.',
      },
    ],
    audience: ['Семьи с детьми', 'Школьники', 'Вечерний досуг без экскурсии по городу'],
  },

  rooftops: {
    slug: 'rooftops',
    title: 'Крыши и смотровые: что учесть',
    lead: 'Форматы разные: экскурсия с гидом по крышам, открытая смотровая или закрытый салон с видом. Сверяйте сезон, обувь и погоду.',
    chips: [
      { label: 'Смотровая', match: 'смотр' },
      { label: 'С гидом', match: 'гид' },
      { label: 'Панорама', match: 'панорам' },
      { label: 'Вечер', match: 'вечер' },
    ],
    tips: [
      {
        title: 'Погода и обувь',
        text: 'На открытой крыше ветер сильнее, чем на улице. Удобная нескользящая обувь обязательна.',
      },
      {
        title: 'Не путать с концертом на крыше',
        text: 'Музыкальные вечера в салоне - другой продукт. Если нужна именно экскурсия по кровлям, ищите это в названии.',
      },
    ],
    audience: ['Фото и панорамы', 'Первый визит в город', 'Небольшие компании'],
  },

  'country-tours': {
    slug: 'country-tours',
    title: 'Загородные экскурсии: как не ошибиться',
    lead: 'Петергоф, Пушкин, Павловск, Кронштадт и Выборг отличаются временем в пути и насыщенностью дня. Смотрите точку сбора и длительность.',
    chips: [
      { label: 'Петергоф', match: 'петергоф' },
      { label: 'Пушкин', match: 'пушкин' },
      { label: 'Кронштадт', match: 'кронштадт' },
      { label: 'Выборг', match: 'выборг' },
      { label: 'Павловск', match: 'павловск' },
    ],
    tips: [
      {
        title: 'Время в дороге',
        text: 'Длинный выезд утомляет детей. Для первого раза лучше полудневный маршрут с понятной точкой возврата.',
      },
      {
        title: 'Билеты в музеи',
        text: 'Иногда вход в парк или дворец оплачивается отдельно. Читайте, что входит в цену на карточке события.',
      },
    ],
    audience: ['Туристы на 1-2 дня', 'Семьи', 'Гости без машины'],
  },

  'river-party': {
    slug: 'river-party',
    title: 'Вечеринка на теплоходе: форматы',
    lead: 'Под одним названием бывают DJ-сеты, дискотеки и спокойные вечерние круизы с музыкой. Сверяйте возраст и стиль вечера.',
    chips: [
      { label: 'DJ', match: 'dj' },
      { label: 'Дискотека', match: 'дискотек' },
      { label: 'Живая музыка', match: 'живая' },
      { label: '18+', match: '18' },
    ],
    tips: [
      {
        title: 'Громкость и палуба',
        text: 'Танцевальные рейсы обычно громче обзорных. Если важна беседа - ищите формат без дискотеки.',
      },
      {
        title: 'Старт и возврат',
        text: 'Ночные рейсы заканчиваются поздно. Проверьте причал посадки и как добраться обратно.',
      },
    ],
    audience: ['Компании друзей', 'День рождения', 'Туристы на вечер'],
  },

  'family-kids': {
    slug: 'family-kids',
    title: 'Детям и семьям: быстрый чеклист',
    lead: 'Цирк, анимация, ёлки и семейные шоу отличаются по возрасту и длительности. Смотрите маркировку и можно ли выйти из зала.',
    chips: [
      { label: '0+', match: '0+' },
      { label: '6+', match: '6+' },
      { label: 'Цирк', match: 'цирк' },
      { label: 'Анимация', match: 'анимац' },
      { label: 'Шоу', match: 'шоу' },
    ],
    tips: [
      {
        title: 'Возраст важнее жанра',
        text: 'Формально «семейное» шоу может быть долгим для дошкольника. Ориентируйтесь на возраст на карточке.',
      },
      {
        title: 'Перерывы и еда',
        text: 'На длинных программах уточните антракт. Возьмите лёгкий перекус, если площадка далеко от кафе.',
      },
    ],
    audience: ['Дошкольники', 'Младшие школьники', 'Семейный выходной'],
  },

  'new-year': {
    slug: 'new-year',
    title: 'Новый год: как выбрать программу',
    lead: 'Ёлки, шоу, камерные концерты и праздничные экскурсии - разные вечера. Бронируйте заранее: январские слоты разбирают быстро.',
    chips: [
      { label: 'Ёлка', match: 'елк' },
      { label: 'Шоу', match: 'шоу' },
      { label: 'Семье', match: 'семейн' },
      { label: 'Взрослым', match: '18' },
      { label: 'Экскурсия', match: 'экскурс' },
    ],
    tips: [
      {
        title: 'Дата и город',
        text: 'На лендинге нет привязки «сегодня» к календарю июля. Выбирайте нужную дату в фильтре расписания.',
      },
      {
        title: 'Детская ёлка vs взрослое шоу',
        text: 'Ёлка для детей и новогодний концерт для взрослых - разные ожидания. Читайте возраст и описание.',
      },
    ],
    audience: ['Семьи с детьми', 'Компании друзей', 'Гости города на каникулах'],
  },
};

export function resolveLandingContextWidget(slug: string): LandingContextWidgetConfig | null {
  const key = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
  return LANDING_CONTEXT_WIDGETS[key] || null;
}

export function landingContextWidgetSlugs(): string[] {
  return Object.keys(LANDING_CONTEXT_WIDGETS);
}
