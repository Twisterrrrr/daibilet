import routing from '../../../../data/geo/city-routing.ru.json';

export const DEFAULT_CITY_TIME_ZONE = 'Europe/Moscow';

const CITY_TIME_ZONE_OVERRIDES: Record<string, string> = {
  Абакан: 'Asia/Krasnoyarsk',
  Архангельск: 'Europe/Moscow',
  Астрахань: 'Europe/Astrakhan',
  Барнаул: 'Asia/Barnaul',
  'Благовещенск (Амурская область)': 'Asia/Yakutsk',
  Владивосток: 'Asia/Vladivostok',
  Екатеринбург: 'Asia/Yekaterinburg',
  Ижевск: 'Europe/Samara',
  Иркутск: 'Asia/Irkutsk',
  'Йошкар-Ола': 'Europe/Moscow',
  Калининград: 'Europe/Kaliningrad',
  Кемерово: 'Asia/Novokuznetsk',
  'Киров (Кировская область)': 'Europe/Kirov',
  'Комсомольск-на-Амуре': 'Asia/Vladivostok',
  Красноярск: 'Asia/Krasnoyarsk',
  Курган: 'Asia/Yekaterinburg',
  Магадан: 'Asia/Magadan',
  Мурманск: 'Europe/Moscow',
  Новосибирск: 'Asia/Novosibirsk',
  Омск: 'Asia/Omsk',
  Оренбург: 'Asia/Yekaterinburg',
  Пермь: 'Asia/Yekaterinburg',
  Самара: 'Europe/Samara',
  Саранск: 'Europe/Moscow',
  Саратов: 'Europe/Saratov',
  Сыктывкар: 'Europe/Moscow',
  Томск: 'Asia/Novosibirsk',
  Тюмень: 'Asia/Yekaterinburg',
  'Улан-Удэ': 'Asia/Irkutsk',
  Ульяновск: 'Europe/Samara',
  Уфа: 'Asia/Yekaterinburg',
  Хабаровск: 'Asia/Vladivostok',
  Чебоксары: 'Europe/Moscow',
  Челябинск: 'Asia/Yekaterinburg',
  Чита: 'Asia/Yakutsk',
  'Южно-Сахалинск': 'Asia/Sakhalin',
  Якутск: 'Asia/Yakutsk',
};

const REGION_TIME_ZONES: Record<string, string> = {
  'Красноярский край': 'Asia/Krasnoyarsk',
  'Ульяновская область': 'Europe/Samara',
  'Хабаровский край': 'Asia/Vladivostok',
  'Республика Хакасия': 'Asia/Krasnoyarsk',
  'Республика Татарстан': 'Europe/Moscow',
  'Республика Башкортостан': 'Asia/Yekaterinburg',
  'Республика Карелия': 'Europe/Moscow',
  'Алтайский край': 'Asia/Barnaul',
  'Приморский край': 'Asia/Vladivostok',
  'Иркутская область': 'Asia/Irkutsk',
  'Забайкальский край': 'Asia/Yakutsk',
  'Сахалинская область': 'Asia/Sakhalin',
  'Камчатский край': 'Asia/Kamchatka',
  'Самарская область': 'Europe/Samara',
  'Челябинская область': 'Asia/Yekaterinburg',
  'Кемеровская область': 'Asia/Novokuznetsk',
  'Свердловская область': 'Asia/Yekaterinburg',
  'Ханты-Мансийский автономный округ': 'Asia/Yekaterinburg',
  Япония: 'Asia/Tokyo',
};

const cityToRegion = routing.cityToRegion || {};

export function resolveCityTimeZone(cityName?: string | null, destinationName?: string | null): string {
  const candidates = [cityName, destinationName].map((value) => String(value || '').trim()).filter(Boolean);
  for (const name of candidates) {
    if (CITY_TIME_ZONE_OVERRIDES[name]) return CITY_TIME_ZONE_OVERRIDES[name];
    const region = cityToRegion[name as keyof typeof cityToRegion];
    if (region && REGION_TIME_ZONES[region]) return REGION_TIME_ZONES[region];
    if (REGION_TIME_ZONES[name]) return REGION_TIME_ZONES[name];
  }
  return DEFAULT_CITY_TIME_ZONE;
}

export function resolveSessionTimeZone(session: { city?: string | null; destination?: string | null; timeZone?: string | null }) {
  return session.timeZone || resolveCityTimeZone(session.city, session.destination);
}
