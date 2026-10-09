/* Ulyanovsk tourist hub pack - suburbs + day routes (2026-10-09). Hyphen-only. */
/* eslint-disable @typescript-eslint/no-explicit-any */

export const ULYANOVSK_SUBURBS: any[] = [
  {
    name: 'Сенгилей',
    desc: 'Тихий старинный город на высоком берегу Волги в 60 км от Ульяновска — купеческие дома, Государев овраг и виды на водохранилище.',
    address: 'г. Сенгилей, Ульяновская область',
    locationSlug: 'ulyanovsk-sengiley',
    latitude: 53.9622,
    longitude: 48.7944,
    travelVector: 'Сенгилейский вектор',
    travelVectorBlurb: 'Авто по М-5 ~1 час. Старт от набережной, финал — Государев овраг.',
    places: [
      { name: 'Набережная Сенгилея', desc: 'Высокий волжский берег с панорамой Куйбышевского водохранилища.', locationSlug: 'ulyanovsk-naberezhnaya-sengileya', latitude: 53.9615, longitude: 48.7928 },
      { name: 'Государев овраг', desc: 'Лесной каньон у города — короткая природная прогулка.', locationSlug: 'ulyanovsk-gosudarev-ovrag', latitude: 53.9588, longitude: 48.7872 },
      { name: 'Сенгилеевский краеведческий музей', desc: 'История уездного Симбирского края.', venueSlug: 'ulyanovsk-sengileevskiy-muzey', latitude: 53.9632, longitude: 48.7955 },
    ],
  },
  {
    name: 'Новоульяновск',
    desc: 'Молодой город-спутник на противоположном берегу Волги с Императорским мостом и парком Победы.',
    address: 'г. Новоульяновск, Ульяновская область',
    locationSlug: 'ulyanovsk-novoulyanovsk',
    latitude: 54.1517,
    longitude: 48.3883,
    travelVector: 'Императорский мост',
    travelVectorBlurb: 'Авто через Императорский мост ~20 минут.',
    places: [
      { name: 'Императорский мост', desc: 'Старинный двухкилометровый мост через Волгу — один из самых длинных в России.', locationSlug: 'ulyanovsk-imperatorskiy-most', latitude: 54.1365, longitude: 48.3733 },
      { name: 'Парк Победы', desc: 'Зелёная зона с мемориалами и детскими площадками.', locationSlug: 'ulyanovsk-park-pobedy-novoulyanovsk', latitude: 54.1522, longitude: 48.3891 },
    ],
  },
];

export const ULYANOVSK_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'ulyanovsk-classic',
    title: 'Классический Симбирск',
    description: 'Ленинский мемориал, музей-заповедник, бульвар Новый Венец и панорама Волги за один день.',
    travelVector: 'Пешком по центру, 3-4 часа.',
    stops: [
      { name: 'Ленинский мемориал', desc: 'Старт у модернистского комплекса с домом Ульяновых.', locationSlug: 'ulyanovsk-leninskiy-memorial', visitMinutes: 60 },
      { name: 'Музей-заповедник «Родина В.И. Ленина»', desc: 'Старинный квартал деревянного Симбирска.', venueSlug: 'ulyanovsk-muzey-zapovednik-rodina-v-i-lenina', visitMinutes: 90 },
      { name: 'Памятник букве «Ё»', desc: 'Фото-стоп у Карамзинского символа.', locationSlug: 'ulyanovsk-pamyatnik-bukve-e', visitMinutes: 15 },
      { name: 'Бульвар Новый Венец', desc: 'Финал — панорама Волги с высокого берега.', locationSlug: 'ulyanovsk-bul-var-novyy-venets', visitMinutes: 40 },
    ],
  },
  {
    id: 'ulyanovsk-aviation',
    title: 'Авиация и Волга',
    description: 'Музей гражданской авиации под открытым небом + Императорский мост и волжские виды.',
    travelVector: 'Авто / такси между точками.',
    stops: [
      { name: 'Головной музей истории гражданской авиации', desc: '40 советских самолётов на летном поле, включая Ту-144.', venueSlug: 'ulyanovsk-golovnoy-muzey-istorii-grazhdanskoy-aviatsii', visitMinutes: 120 },
      { name: 'Императорский мост', desc: 'Двухкилометровый мост через Волгу — виды на водохранилище.', locationSlug: 'ulyanovsk-imperatorskiy-most', visitMinutes: 30 },
      { name: 'Набережная Сенгилея', desc: 'Финал — высокий берег Волги в 60 км от города (опционально).', locationSlug: 'ulyanovsk-naberezhnaya-sengileya', visitMinutes: 40 },
    ],
  },
];