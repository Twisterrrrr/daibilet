import { BRIDGES_LANDING } from '@/data/bridges-landing';
import { resolveLandingContentPack } from '@/data/landing-content-packs';
import { getSeasonalLanding, seasonalCityGuide } from '@/data/seasonal-landings';
import { riverCityGuide } from '@/data/river-landings';
import { resolveLandingCityName } from '@/lib/landing-city';
import { isRiverCruisesLandingSlug } from '@/lib/landing-constants';
import { normalizeCitySlug } from '@/lib/landing-routes';
import type { PublicLandingPageDto } from '@daibilet/contracts/public';

export type LandingFaqProfile = 'bus' | 'dinner' | 'river' | 'seasonal' | 'bridges' | 'default';
type LandingContentBlock = NonNullable<PublicLandingPageDto['blocks']>[number];
export function defaultLandingFaq(slug: string, profile: LandingFaqProfile = 'default', citySlug?: string) {
  const key = slug.toLowerCase();
  if (profile === 'bridges') return BRIDGES_LANDING.faq;
  if (profile === 'seasonal') {
    const meta = getSeasonalLanding(key);
    const cityName = resolveLandingCityName(citySlug, key);
    const cityGuide = seasonalCityGuide(key, cityName);
    if (cityGuide?.faq.length) return cityGuide.faq;
    if (meta?.defaultFaq.length) return meta.defaultFaq;
  }
  if (profile === 'bus' || key.includes('bus')) {
    if (normalizeCitySlug(citySlug) === 'saint-petersburg') {
      return [
        { question: 'Есть ли экскурсия с разводными мостами?', answer: 'Да — ночной рейс «Ночной Петербург + разводные мосты» стартует после 23:00 и включает остановку у разводного моста.' },
        { question: 'Стоит ли ехать в Петергоф?', answer: 'Да, если есть полдня. Автобусная экскурсия в Петергоф — один из самых популярных загородных маршрутов. В будни меньше очередей.' },
      ];
    }
    return [
      { question: 'Сколько длится обзорная экскурсия?', answer: 'Обычно 2–3 часа. Загородные маршруты (Петергоф, Куршская коса, Красная Поляна) — от 4 до 6 часов.' },
      { question: 'Есть ли аудиогид?', answer: 'На большинстве рейсов доступен аудиогид на русском и английском. Иконка наушников в карточке — признак аудиосопровождения.' },
      { question: 'Можно ли с детьми?', answer: 'Да, обзорные автобусные экскурсии подходят для семей. Для длительных маршрутов лучше брать детей от 5–6 лет.' },
      { question: 'Чем автобусная экскурсия лучше пешей?', answer: 'За 2–3 часа вы увидите больше достопримечательностей без усталости. Удобно в жару, дождь и с маленькими детьми.' },
    ];
  }
  if (profile === 'dinner' || key.includes('dinner')) {
    return [
      { question: 'Ужин включён в стоимость билета?', answer: 'Да, на большинстве рейсов ужин или фуршет включены в стоимость. Уточняйте формат меню в карточке рейса.' },
      { question: 'Можно ли принести свой алкоголь?', answer: 'Обычно нет — на борту работает бар с винной картой. Исключения возможны на VIP-рейсах, уточняйте у организатора.' },
      { question: 'Где посадка на теплоход?', answer: 'Точка посадки указана в карточке рейса. Популярные причалы: Китай-город, Парк Горького, Крымская набережная.' },
      { question: 'Что если плохая погода?', answer: 'Теплоходы с ужином обычно имеют крытые палубы и работают в любую погоду. Рейс отменяют только при штормовом ветре.' },
      { question: 'Нужно ли бронировать заранее?', answer: 'Да, особенно на выходные и праздники. Столики у окна разбирают за 3–7 дней.' },
      { question: 'Есть ли дресс-код?', answer: 'Smart casual — без пляжной одежды. На VIP-рейсах возможен dress code: коктейльные платья и рубашки.' },
    ];
  }
  if (profile === 'river' || isRiverCruisesLandingSlug(slug) || key.includes('bridge')) {
    const cityName = resolveLandingCityName(citySlug);
    const guide = riverCityGuide(cityName);
    if (guide?.faq.length) return guide.faq;
    if (key.includes('bridge') || normalizeCitySlug(citySlug) === 'saint-petersburg') {
      return [
        { question: 'Когда разводят мосты в Санкт-Петербурге?', answer: 'В навигационный сезон разводка начинается около 01:00–02:30. Рейсы в 23:30–00:30 позволяют увидеть несколько мостов подряд.' },
        { question: 'Стоит ли брать ночную прогулку или дневную?', answer: 'Ночная — для разводки мостов и подсветки. Дневная — для архитектуры и фото при дневном свете.' },
        { question: 'Можно ли с детьми?', answer: 'Да, большинство рейсов допускают детей. Уточняйте возрастные ограничения у конкретного организатора.' },
        { question: 'Что взять с собой?', answer: 'Тёплую одежду — на воде прохладнее. Фотоаппарат и power bank приветствуются.' },
        { question: 'Как купить билет?', answer: 'Нажмите на цену в расписании — откроется официальный виджет билетной системы организатора.' },
      ];
    }
    return [
      { question: 'Когда начинается навигация?', answer: 'В большинстве городов — с апреля–мая по октябрь. Точные даты зависят от погоды и уровня воды.' },
      { question: 'Что взять с собой?', answer: 'Тёплую одежду — на воде всегда прохладнее. Солнцезащитные очки и вода летом.' },
      { question: 'Можно ли с детьми?', answer: 'Да, большинство речных прогулок подходят для семей. На борту обычно есть крытые зоны.' },
      { question: 'Как купить билет?', answer: 'Нажмите на цену в расписании — откроется официальный виджет билетной системы организатора.' },
    ];
  }
  if (key.includes('yard') || key.includes('paradn') || key === 'spb-yards') {
    return [
      { question: 'Чем отличаются парадные, дворы и коммуналки?', answer: 'Парадные — исторические входные группы домов, дворы — закрытые дворы-колодцы, коммуналки — квартиры с общими зонами. Маршруты часто комбинируют несколько форматов.' },
      { question: 'Нужна ли специальная обувь?', answer: 'Удобная обувь для пешей прогулки 1,5–2,5 часа. В некоторых домах могут попросить надеть бахилы — их обычно выдают на месте.' },
      { question: 'Можно ли с детьми?', answer: 'Да, многие маршруты рассчитаны на семейную аудиторию. Уточняйте возрастные ограничения в карточке события.' },
      { question: 'Как купить билет?', answer: 'Выберите дату и время в расписании — покупка откроется в виджете билетной системы организатора.' },
    ];
  }
  if (key.includes('family') || key.includes('kids') || key.includes('detyam')) {
    return [
      { question: 'С какого возраста подходят детские шоу?', answer: 'Зависит от программы — возраст указан в карточке события или на странице организатора.' },
      { question: 'Чем отличается от новогодних программ?', answer: 'Эта подборка шире: цирк, анимация, детские спектакли и семейные шоу круглый год, не только в декабре.' },
      { question: 'Нужны ли взрослые билеты?', answer: 'Обычно да — детский билет сопровождается взрослым. Точные правила — в виджете при покупке.' },
    ];
  }
  if (key.includes('concert')) {
    return [
      { question: 'Чем эта подборка отличается от стендапа?', answer: 'Здесь — музыкальные концерты: рок, джаз, классика, эстрада. Стендап и комедия — в отдельной подборке.' },
      { question: 'Можно ли выбрать жанр?', answer: 'Используйте фильтр «Формат» и сортировку по дате или цене, чтобы сузить выдачу.' },
      { question: 'Где проходит оплата?', answer: 'В официальном виджете билетной системы организатора после выбора сеанса.' },
    ];
  }
  if (key.includes('moscow-museum') || key === 'moscow-museums') {
    return [
      { question: 'Это только один музей?', answer: 'Подборка собирает мастер-классы и музейные программы в Москве — прежде всего студии и выставочные форматы.' },
      { question: 'Нужна ли подготовка для мастер-класса?', answer: 'Обычно нет — материалы предоставляет организатор. Одежду, которую не жалко испачкать, лучше уточнить в описании.' },
      { question: 'Как купить билет?', answer: 'Выберите сеанс в расписании — оплата в виджете организатора.' },
    ];
  }
  if (key.includes('active') || key.includes('sport') || key.includes('autosport')) {
    return [
      { question: 'Нужны ли права для участия?', answer: 'Для зрителей — нет. Для заездов и master-class drive уточняйте требования у организатора в карточке события.' },
      { question: 'Можно ли с детьми?', answer: 'Зависит от формата — на автоспортивных событиях часто есть возрастные ограничения из соображений безопасности.' },
    ];
  }
  return [
    { question: 'Как выбрать подходящий вариант?', answer: 'Используйте фильтры по дате, городу и сортировке по цене или времени.' },
    { question: 'Где происходит оплата?', answer: 'Оплата проходит в официальном виджете билетной системы организатора.' },
    { question: 'Можно ли вернуть билет?', answer: 'Условия возврата зависят от организатора — они указаны при оформлении заказа.' },
  ];
}

/** The visible FAQ and FAQPage structured data use exactly the same questions. */
export function resolveLandingFaqItems(input: {
  slug: string;
  profile: LandingFaqProfile;
  citySlug?: string;
  blocks: LandingContentBlock[];
}): Array<{ question: string; answer: string }> {
  const contentPack = resolveLandingContentPack(input.slug);
  if (contentPack?.faq?.length) {
    return contentPack.faq.map((item) => ({ question: item.question, answer: item.answer }));
  }
  const block = input.blocks.find((item) => item.type === 'FAQ');
  if (block) {
    const raw = block.payload?.items;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item) => ({
        question: String(item.question || item.title || ''),
        answer: String(item.answer || item.text || ''),
      }))
      .filter((item) => item.question.length > 0);
  }
  return defaultLandingFaq(input.slug, input.profile, input.citySlug);
}
