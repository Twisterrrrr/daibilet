import { riverLandingHref } from '@/lib/landing-routes';

export type DinnerPier = {
  name: string;
  description: string;
  transport?: string;
};

export type DinnerMealFormat = {
  name: string;
  badge: string;
  description: string;
};

export type DinnerCityGuide = {
  heroTitle: string;
  heroSubtitle: string;
  breadcrumbCurrent: string;
  introTitle: string;
  introText: string;
  scheduleTitle: string;
  riverCruiseHref: string;
  riverCruiseLabel: string;
  piers: DinnerPier[];
  mealFormats: DinnerMealFormat[];
};

export const DINNER_CITY_GUIDES: Record<string, DinnerCityGuide> = {
  Москва: {
    heroTitle: 'Ужин на теплоходе по Москве-реке сегодня — цены и расписание',
    heroSubtitle: 'Сравните рестораны на воде и выберите лучший вечерний круиз по Москве-реке.',
    breadcrumbCurrent: 'Ужин на теплоходе — Москва',
    introTitle: 'Ужин на теплоходе — ресторан с видом на Кремль',
    introText:
      'Москва-река — идеальная декорация для вечернего ужина. Вы проплываете мимо Кремля, Храма Христа Спасителя и Москва-Сити, пока шеф-повар готовит блюда на борту. Это не просто прогулка — это полноценный ресторанный опыт на воде: от сет-меню из 5 блюд до фуршетов с живой музыкой.',
    scheduleTitle: 'Теплоходы с ужином — Москва',
    riverCruiseHref: riverLandingHref('moscow'),
    riverCruiseLabel: 'Все речные прогулки по Москве',
    piers: [
      { name: 'Китай-город (Устьинский сектор)', description: 'Самый популярный причал для вечерних рейсов. Панорама Кремля и Зарядья с воды.', transport: 'м. Китай-город, 5 мин пешком' },
      { name: 'Крымский мост', description: 'Старт у Парка Горького и Храма Христа Спасителя. Красивый вечерний маршрут.', transport: 'м. Парк Культуры, 10 мин' },
      { name: 'Парк Горького', description: 'Короткие рейсы по центру. Удобно совмещать с прогулкой по парку.', transport: 'м. Парк Культуры, у входа в парк' },
    ],
    mealFormats: [
      { name: 'Сет-меню', badge: 'Популярный', description: 'Фиксированный набор из 3–5 блюд: салат, горячее, десерт, напиток. Знаете цену до покупки.' },
      { name: 'Фуршет', badge: 'Для компаний', description: 'Шведский стол с выбором блюд. Удобно для больших компаний — каждый найдёт что-то своё.' },
      { name: 'Депозит / Бар', badge: 'Гибкий', description: 'Рейс без еды в цене, заказ по меню на борту. Можно только напитки или полноценный ужин.' },
    ],
  },
  'Санкт-Петербург': {
    heroTitle: 'Ужин на теплоходе по Неве сегодня — цены и расписание',
    heroSubtitle: 'Сравните рестораны на воде и выберите лучший вечерний круиз по Неве.',
    breadcrumbCurrent: 'Ужин на теплоходе — Санкт-Петербург',
    introTitle: 'Ужин на теплоходе — ресторан с видом на разводные мосты',
    introText:
      'Нева вечером — лучший фон для ужина на воде. Панорамные окна, живая музыка и подсветка дворцов создают атмосферу, которую не повторить в обычном ресторане.',
    scheduleTitle: 'Теплоходы с ужином — Санкт-Петербург',
    riverCruiseHref: riverLandingHref('saint-petersburg'),
    riverCruiseLabel: 'Все речные прогулки по Петербургу',
    piers: [
      { name: 'Дворцовая набережная', description: 'Старт напротив Эрмитажа. Ночной маршрут мимо Петропавловки и разводных мостов.', transport: 'м. Адмиралтейская, 10 мин' },
      { name: 'Английская набережная', description: 'Центр города, вид на стрелку Васильевского острова.', transport: 'м. Василеостровская, 5 мин' },
      { name: 'наб. реки Фонтанки', description: 'Камерные рейсы по каналам с выходом на Неву.', transport: 'м. Сенная, 7 мин' },
    ],
    mealFormats: [
      { name: 'Сет-меню', badge: 'Популярный', description: 'Фиксированный набор блюд. Самый частый формат для романтических ужинов.' },
      { name: 'Фуршет', badge: 'Для компаний', description: 'Шведский стол на борту. Удобно для корпоративов и больших компаний.' },
      { name: 'Депозит / Бар', badge: 'Гибкий', description: 'Рейс без еды, заказ по меню. Для тех, кто хочет только напитки и виды.' },
    ],
  },
};

export function dinnerCityGuide(cityName: string | null, citySlug?: string): DinnerCityGuide | null {
  if (!cityName) return null;
  if (DINNER_CITY_GUIDES[cityName]) return DINNER_CITY_GUIDES[cityName]!;
  const slugKey = citySlug || 'moscow';
  return {
    heroTitle: `Ужин на теплоходе в ${cityName} — цены и расписание`,
    heroSubtitle: `Сравните рестораны на воде и выберите лучший вечерний круиз в ${cityName}.`,
    breadcrumbCurrent: `Ужин на теплоходе — ${cityName}`,
    introTitle: `Ужин на теплоходе в ${cityName}`,
    introText: `Вечерний круиз с ужином на борту — удобный способ совместить гастрономию и обзор города с воды.`,
    scheduleTitle: `Теплоходы с ужином — ${cityName}`,
    riverCruiseHref: riverLandingHref(slugKey),
    riverCruiseLabel: `Все речные прогулки в ${cityName}`,
    piers: [],
    mealFormats: [],
  };
}