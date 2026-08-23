/** Rostov-on-Don tourist hub pack (owner 2026-08-18). Hyphen-only copy. */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { ROSTOV_LINE_DAY_ROUTE_PRESETS } from './rostov-na-donu-line-presets.ts';

function place(
  name: string,
  desc: string,
  latitude: number,
  longitude: number,
  opts: {
    address: string;
    locationSlug?: string;
    venueSlug?: string;
    mustSeeFilter?: string;
    visitMinutes?: number | string;
    alsoMain?: boolean;
  },
): any {
  return {
    name,
    desc,
    address: opts.address,
    latitude,
    longitude,
    mustSeeFilter: opts.mustSeeFilter || 'main',
    visitMinutes: opts.visitMinutes ?? 20,
    ...(opts.locationSlug ? { locationSlug: opts.locationSlug } : {}),
    ...(opts.venueSlug ? { venueSlug: opts.venueSlug } : {}),
    ...(typeof opts.alsoMain === 'boolean' ? { alsoMain: opts.alsoMain } : {}),
  };
}

export const ROSTOV_NA_DONU_MUST_SEE: any[] = [
  // --- Памятники и скульптуры (1-15) ---
  place('Памятник «Тачанка-Ростовчанка»', 'Исполинский монумент на южном въезде в город, один из самых узнаваемых символов Ростова.', 47.184112, 39.739112, {
    address: 'южный въезд в город, район развязки М-4',
    locationSlug: 'rostov-na-donu-tachanka-rostovchanka',
    mustSeeFilter: 'monument',
    visitMinutes: 20,
    alsoMain: true,
  }),
  place('Памятник Степану Разину с дружиной', 'Казачий атаман на ладьях у самой воды - сюжетно и по-южному размашисто.', 47.218901, 39.721112, {
    address: 'ул. Береговая, 47',
    locationSlug: 'rostov-na-donu-pamyatnik-stepanu-razinu',
    mustSeeFilter: 'monument',
    visitMinutes: 15,
  }),
  place('Памятник М. А. Шолохову', 'Шолохов в лодке среди камышей на набережной Дона - самый живой кадр берега.', 47.218112, 39.718912, {
    address: 'ул. Береговая, 35',
    locationSlug: 'rostov-na-donu-pamyatnik-sholohovu',
    mustSeeFilter: 'monument',
    visitMinutes: 15,
    alsoMain: true,
  }),
  place('Скульптура «Нахаленок и Дед Щукарь»', 'Контактная бронза по мотивам Шолохова - веселая и фотогеничная.', 47.217812, 39.712312, {
    address: 'ул. Береговая, 23А',
    locationSlug: 'rostov-na-donu-skulptura-nahalenok-i-ded-shchukar',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
  place('Памятник Елизавете Петровне', 'Императрица, с указа которой началась таможенная история будущего Ростова.', 47.225912, 39.731112, {
    address: 'Покровский сквер',
    locationSlug: 'rostov-na-donu-pamyatnik-elizavete-petrovne',
    mustSeeFilter: 'monument',
    visitMinutes: 15,
  }),
  place('Скульптура «Ростовчанка»', 'Бронзовая фигура у Дона, посвященная южной красоте и городской легкости.', 47.218312, 39.715891, {
    address: 'ул. Береговая, 27',
    locationSlug: 'rostov-na-donu-skulptura-rostovchanka',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
  place('Памятник Димитрию Ростовскому', 'Святитель и покровитель города перед соборной площадью.', 47.219812, 39.711912, {
    address: 'Соборная площадь',
    locationSlug: 'rostov-na-donu-pamyatnik-dimitriyu-rostovskomu',
    mustSeeFilter: 'monument',
    visitMinutes: 15,
  }),
  place('Памятник Первоконникам', 'Экспрессивная работа Вучетича на площади Советов перед административным ансамблем.', 47.221112, 39.719812, {
    address: 'площадь Советов',
    locationSlug: 'rostov-na-donu-pamyatnik-pervokonnikam',
    mustSeeFilter: 'monument',
    visitMinutes: 15,
  }),
  place('Скульптура «Купец-коробейник»', 'Городская легенда о торговом Ростове и южной коммерческой жилке.', 47.221912, 39.711112, {
    address: 'у входа в парк Горького',
    locationSlug: 'rostov-na-donu-skulptura-kupec-korobeynik',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
  place('Памятник А. С. Пушкину', 'Пушкин стоит у начала Пушкинской: отсюда начинается центральный променад.', 47.224112, 39.715891, {
    address: 'ул. Пушкинская / Буденновский проспект',
    locationSlug: 'rostov-na-donu-pamyatnik-pushkinu',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
  place('Скульптура «Цветочница»', 'Жанровая бронза на Большой Садовой, добавляющая южной театральности прогулке.', 47.222312, 39.714912, {
    address: 'ул. Большая Садовая, 64',
    locationSlug: 'rostov-na-donu-skulptura-cvetochnica',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
  place('Памятник водопроводу', 'Редкий городской сюжет о первой колонке и бытовой истории старого Ростова.', 47.225112, 39.732312, {
    address: 'Покровский сквер',
    locationSlug: 'rostov-na-donu-pamyatnik-vodoprovodu',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
  place('Арт-объект «Ростовский рак»', 'Небольшая, но очень местная гастро-скульптура про главный донской деликатес.', 47.211112, 39.734912, {
    address: 'парк Левобережный',
    locationSlug: 'rostov-na-donu-rostovskiy-rak',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
  place('Памятник сантехнику', 'Ироничная фигура рабочего у Театральной площади, любимая фотопауза горожан.', 47.223891, 39.745112, {
    address: 'Театральная площадь, 1',
    locationSlug: 'rostov-na-donu-pamyatnik-santehniku',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),
  place('Памятник В. И. Ленину у парка Горького', 'Парадный советский акцент у входа в старейший парк центра.', 47.221412, 39.709912, {
    address: 'ул. Большая Садовая / парк Горького',
    locationSlug: 'rostov-na-donu-pamyatnik-leninu',
    mustSeeFilter: 'monument',
    visitMinutes: 10,
  }),

  // --- Историческое наследие и архитектура (16-27) ---
  place('Здание Городской думы', 'Купеческий дворец Померанцева с богатыми фасадами и кариатидами.', 47.221912, 39.714112, {
    address: 'ул. Большая Садовая, 47',
    locationSlug: 'rostov-na-donu-zdanie-gorodskoy-dumy',
    mustSeeFilter: 'houses',
    visitMinutes: 20,
    alsoMain: true,
  }),
  place('Торговый дом Яблоковых', 'Ростовский модерн начала XX века с точной пластикой и южным блеском витрин.', 47.220912, 39.709891, {
    address: 'ул. Большая Садовая, 38',
    locationSlug: 'rostov-na-donu-torgovyy-dom-yablokovyh',
    mustSeeFilter: 'houses',
    visitMinutes: 15,
  }),
  place('Особняк Парамонова', 'Неоклассический дом зернопромышленника на Пушкинской, сегодня библиотека ЮФУ.', 47.227812, 39.728912, {
    address: 'ул. Пушкинская, 148',
    locationSlug: 'rostov-na-donu-osobnyak-paramonova',
    mustSeeFilter: 'mansions',
    visitMinutes: 20,
    alsoMain: true,
  }),
  place('Дом Черновой', 'Эклектичный особняк с башенкой и одной из самых красивых любовных легенд Ростова.', 47.220112, 39.704912, {
    address: 'ул. Большая Садовая, 27/65',
    locationSlug: 'rostov-na-donu-dom-chernovoy',
    mustSeeFilter: 'mansions',
    visitMinutes: 15,
  }),
  place('Особняк Сариева', 'Почти суровый модерн с гранитной отделкой, важный фасад Большой Садовой.', 47.224112, 39.722312, {
    address: 'ул. Большая Садовая, 94',
    locationSlug: 'rostov-na-donu-osobnyak-sarieva',
    mustSeeFilter: 'mansions',
    visitMinutes: 15,
    alsoMain: true,
  }),
  place('Дом Врангеля', 'Сдержанный исторический особняк, связанный с биографией барона Петра Врангеля.', 47.218912, 39.714902, {
    address: 'пер. Газетный, 8',
    locationSlug: 'rostov-na-donu-dom-vrangelya',
    mustSeeFilter: 'houses',
    visitMinutes: 15,
  }),
  place('Здание Главпочтамта', 'Монументальная раннесоветская пластика на оси Соборного переулка.', 47.221112, 39.711812, {
    address: 'пер. Соборный, 24',
    locationSlug: 'rostov-na-donu-zdanie-glavpochtamta',
    mustSeeFilter: 'houses',
    visitMinutes: 15,
  }),
  place('Пассаж Генч-Оглуева', 'Первый многоэтажный доходный дом города с башней на углу Большой Садовой.', 47.222912, 39.716112, {
    address: 'ул. Большая Садовая, 68',
    locationSlug: 'rostov-na-donu-passazh-gench-oglueva',
    mustSeeFilter: 'houses',
    visitMinutes: 15,
  }),
  place('Особняк Супрунова', 'Дом с необычным темным кирпичом и редкой для юга декоративной фактурой.', 47.225112, 39.711912, {
    address: 'ул. Пушкинская, 79',
    locationSlug: 'rostov-na-donu-osobnyak-suprunova',
    mustSeeFilter: 'mansions',
    visitMinutes: 15,
  }),
  place('Дом Котлярова в Нахичевани', 'Купеческий особняк восточной части центра, важный для армянского Ростова.', 47.228912, 39.755891, {
    address: 'ул. 1-я Майская, 14',
    locationSlug: 'rostov-na-donu-dom-kotlyarova',
    mustSeeFilter: 'houses',
    visitMinutes: 15,
  }),
  place('Доходный дом Кисина', 'Живописный фасад старого центра рядом с рынком и торговыми рядами.', 47.218112, 39.710891, {
    address: 'ул. Московская, 37',
    locationSlug: 'rostov-na-donu-dohodnyy-dom-kisina',
    mustSeeFilter: 'houses',
    visitMinutes: 15,
  }),
  place('Здание Государственного банка', 'Неоклассический ансамбль на площади Советов, важный для официального центра.', 47.220912, 39.718912, {
    address: 'пл. Советов, 1',
    locationSlug: 'rostov-na-donu-zdanie-gosudarstvennogo-banka',
    mustSeeFilter: 'houses',
    visitMinutes: 15,
  }),

  // --- Музеи и наследие (28-36) ---
  place('Ростовский областной музей краеведения', 'Скифское золото, археология Дона и полный исторический контекст региона.', 47.223112, 39.722912, {
    address: 'ул. Большая Садовая, 79',
    venueSlug: 'rostov-na-donu-oblastnoy-muzey-kraevedeniya',
    mustSeeFilter: 'museum',
    visitMinutes: '1-2 ч',
    alsoMain: true,
  }),
  place('Ростовский музей изобразительных искусств', 'Русская классика, камерные залы и хороший маршрут по Пушкинской.', 47.226312, 39.721112, {
    address: 'ул. Пушкинская, 115',
    venueSlug: 'rostov-na-donu-muzey-izobrazitelnyh-iskusstv',
    mustSeeFilter: 'museum',
    visitMinutes: '1-2 ч',
  }),
  place('Музей истории Северо-Кавказской железной дороги', 'Подлинные локомотивы и вагоны на старой станции Гниловская.', 47.199112, 39.631112, {
    address: 'Олонецкий пер., 22',
    venueSlug: 'rostov-na-donu-muzey-skzhd',
    mustSeeFilter: 'museum',
    visitMinutes: '1-2 ч',
  }),
  place('Музей русско-армянской дружбы', 'История Нахичевани-на-Дону и армянского переселения в регион.', 47.229112, 39.756112, {
    address: 'пл. Свободы, 14',
    venueSlug: 'rostov-na-donu-muzey-russko-armyanskoy-druzhby',
    mustSeeFilter: 'museum',
    visitMinutes: '1-2 ч',
  }),
  place('Музей современного изобразительного искусства', 'Небольшая, но важная площадка южного современного арта в центре.', 47.220112, 39.713912, {
    address: 'ул. Шаумяна, 51',
    venueSlug: 'rostov-na-donu-msii-na-dmitrovskoy',
    mustSeeFilter: 'museum',
    visitMinutes: '1-2 ч',
  }),
  place('Музей истории органов правопорядка Дона', 'Редкий локальный сюжет о криминальном мифе «Ростова-папы» и милицейской истории.', 47.220412, 39.705891, {
    address: 'ул. Большая Садовая, 29',
    venueSlug: 'rostov-na-donu-muzey-istorii-organov-pravoporyadka',
    mustSeeFilter: 'museum',
    visitMinutes: '1-2 ч',
  }),
  place('Музей космонавтики', 'Ведомственная коллекция с подлинным спускаемым аппаратом и инженерной оптикой.', 47.214112, 39.619112, {
    address: 'проспект Стачки, 231/2',
    venueSlug: 'rostov-na-donu-muzey-kosmonavtiki',
    mustSeeFilter: 'science',
    visitMinutes: '1-2 ч',
  }),
  place('Парамоновские склады', 'Краснокирпичные руины с родниками и одна из самых сильных индустриальных точек города.', 47.219412, 39.725891, {
    address: 'ул. Береговая, 49',
    locationSlug: 'rostov-na-donu-paramonovskie-sklady',
    mustSeeFilter: 'museum',
    visitMinutes: '1-2 ч',
    alsoMain: true,
  }),
  place('КВЦ «Донская казачья гвардия»', 'Единственная в стране экспозиция о казачьей императорской гвардии.', 47.225912, 39.734112, {
    address: 'ул. Социалистическая, 162',
    venueSlug: 'rostov-na-donu-donskaya-kazachya-gvardiya',
    mustSeeFilter: 'museum',
    visitMinutes: '1-2 ч',
  }),

  // --- Храмы, парки, улицы и виды (37-45) ---
  place('Кафедральный собор Рождества Богородицы', 'Главный храм города и золотой визуальный центр старого Ростова.', 47.218333, 39.711667, {
    address: 'ул. Станиславского, 58',
    locationSlug: 'rostov-na-donu-kafedralnyy-sobor-rozhdestva-bogorodicy',
    mustSeeFilter: 'temple',
    visitMinutes: 30,
    alsoMain: true,
  }),
  place('Армянская церковь Сурб Хач', 'Старейшее каменное здание Ростова XVIII века на высоком северном склоне.', 47.281112, 39.714112, {
    address: 'ул. Баграмяна, 1',
    locationSlug: 'rostov-na-donu-surb-hach',
    mustSeeFilter: 'temple',
    visitMinutes: 30,
  }),
  place('Старообрядческий Покровский собор', 'Краснокирпичный неорусский храм с красивой ажурной колокольней.', 47.215891, 39.713891, {
    address: 'ул. Ульяновская, 37',
    locationSlug: 'rostov-na-donu-staroobryadcheskiy-pokrovskiy-sobor',
    mustSeeFilter: 'temple',
    visitMinutes: 30,
  }),
  place('Пушкинская улица', 'Главный зеленый бульвар центра с деревьями, лавками и длинным южным променадом.', 47.225891, 39.718912, {
    address: 'ул. Пушкинская',
    locationSlug: 'rostov-na-donu-pushkinskaya-ulitsa',
    mustSeeFilter: 'street',
    visitMinutes: 60,
    alsoMain: true,
  }),
  place('Парк Горького', 'Старейший городской сад с террасами, гротами и историей дореволюционных гуляний.', 47.221112, 39.712112, {
    address: 'ул. Большая Садовая, 45',
    locationSlug: 'rostov-na-donu-park-gorkogo',
    mustSeeFilter: 'park',
    visitMinutes: '1-2 ч',
  }),
  place('Парк Левобережный', 'Просторный парк у «Ростов Арены» с пляжной зоной и широкими видами на правый берег.', 47.211912, 39.731112, {
    address: 'ул. Левобережная',
    locationSlug: 'rostov-na-donu-park-levoberezhnyy',
    mustSeeFilter: 'park',
    visitMinutes: '1-2 ч',
  }),
  place('Набережная Дона', 'Главный городской променад вдоль реки с катерами, памятниками и закатами.', 47.218112, 39.719112, {
    address: 'ул. Береговая',
    locationSlug: 'rostov-na-donu-naberezhnaya-reki-don-beregovaya-ulitsa',
    mustSeeFilter: 'views',
    visitMinutes: 60,
    alsoMain: true,
  }),
  place('Парк Революции', 'Парк с колесом обозрения «Одно небо» и редким для города фламинго-прудом.', 47.224912, 39.749112, {
    address: 'Театральная площадь, 3',
    locationSlug: 'rostov-na-donu-park-revolyutsii',
    mustSeeFilter: 'park',
    visitMinutes: '1-2 ч',
    alsoMain: true,
  }),
  place('Смотровая на Седова', 'Высокий берег с лучшей городской панорамой порта, моста и Левбердона.', 47.219612, 39.728912, {
    address: 'ул. Седова / ул. Нижнебульварная',
    locationSlug: 'rostov-na-donu-smotrovaya-na-sedova',
    mustSeeFilter: 'views',
    visitMinutes: 30,
    alsoMain: true,
  }),

  // --- Театры, гастро и креатив (46-50) ---
  place('Театр драмы им. Горького', 'Легендарный театр-трактор и одна из главных авангардных построек страны.', 47.223412, 39.744112, {
    address: 'Театральная площадь, 1',
    venueSlug: 'rostov-na-donu-teatr-dramy-im-gorkogo',
    mustSeeFilter: 'creative',
    visitMinutes: 45,
    alsoMain: true,
  }),
  place('Центральный рынок (Старый базар)', 'Южный гастро-хаб с рыбой, овощами, раками и характером старого торгового города.', 47.217912, 39.710912, {
    address: 'Буденновский проспект, 12',
    locationSlug: 'rostov-na-donu-tsentral-nyy-rynok-staryy-bazar',
    mustSeeFilter: 'gastro',
    visitMinutes: 60,
    alsoMain: true,
  }),
  place('Ресторан «Раки и Гады»', 'Один из самых известных адресов для донских раков и черноморской кухни.', 47.219112, 39.711891, {
    address: 'ул. Шаумяна, 39',
    locationSlug: 'rostov-na-donu-raki-i-gady',
    mustSeeFilter: 'gastro',
    visitMinutes: 75,
  }),
  place('Ресторан «Онегин Дача»', 'Стильный купеческий ресторан с русской и французской южной подачей.', 47.225112, 39.728912, {
    address: 'ул. Чехова, 45',
    locationSlug: 'rostov-na-donu-onegin-dacha',
    mustSeeFilter: 'gastro',
    visitMinutes: 90,
  }),
  place('Кластер «Макаронка» / С61', 'Независимое арт-пространство и важная точка современной культурной сцены города.', 47.229112, 39.751212, {
    address: 'ул. 18-я Линия, 8',
    locationSlug: 'rostov-na-donu-makaronka-s61',
    mustSeeFilter: 'creative',
    visitMinutes: 60,
  }),
];

export const ROSTOV_NA_DONU_SUBURBS: any[] = [
  {
    name: 'Танаис',
    desc: 'Античный город под открытым небом в степи: греческие руины, сарматский след и сильное ощущение южной границы цивилизаций.',
    locationSlug: 'rostov-na-donu-tanais',
    mustSeeFilter: 'main',
    visitMinutes: '4-5 ч',
    latitude: 47.271112,
    longitude: 39.332312,
    address: 'Ростовская обл., хутор Недвиговка',
    travelVector: 'Электричка или авто ~40-50 мин',
    travelVectorBlurb:
      'Поездка на полдня: удобнее электричкой до платформы Танаис или машиной с ранним выездом до жары.',
    timingNote:
      'Сначала археологический раскоп и рвы, затем музейные павильоны, в финале - степная панорама у дельты.',
    logisticsExit: 'платформа Танаис / парковка музея',
    gastroStop: {
      name: 'Термос и вода',
      blurb: 'Это степной маршрут без плотной городской гастро-сетки. Берите воду и легкий перекус с собой.',
    },
    places: [
      place('Главный раскоп Танаиса', 'Остатки улиц, жилых кварталов и каменных стен античного полиса.', 47.271112, 39.332312, {
        address: 'Территория музея-заповедника',
        locationSlug: 'rostov-na-donu-tanais-glavnyy-raskop',
        mustSeeFilter: 'main',
        visitMinutes: 45,
      }),
      place('Оборонительный ров и мост', 'Ключевая фортификация на внешнем периметре древнего города.', 47.270912, 39.331912, {
        address: 'Территория музея-заповедника',
        locationSlug: 'rostov-na-donu-tanais-oboronitelnyy-rov',
        mustSeeFilter: 'main',
        visitMinutes: 20,
      }),
      place('Музей амфорной тары', 'Амфоры и торговая логистика античного мира в одном зале.', 47.271212, 39.332612, {
        address: 'Территория музея-заповедника',
        venueSlug: 'rostov-na-donu-tanais-muzey-amfor',
        mustSeeFilter: 'museum',
        visitMinutes: 30,
      }),
      place('Историко-бытовая экспозиция', 'Костюмы, оружие, монеты и объяснение, как жил город на краю степи.', 47.271312, 39.332812, {
        address: 'Территория музея-заповедника',
        venueSlug: 'rostov-na-donu-tanais-istoriko-bytovaya-ekspoziciya',
        mustSeeFilter: 'museum',
        visitMinutes: 30,
      }),
      place('Половецкое святилище', 'Каменные изваяния кочевников и переход к средневековому пласту региона.', 47.271512, 39.333012, {
        address: 'Территория музея-заповедника',
        locationSlug: 'rostov-na-donu-tanais-poloveckoe-svyatilishche',
        mustSeeFilter: 'monument',
        visitMinutes: 20,
      }),
      place('Реконструкция усадьбы меота', 'Пояснение к быту местных племен Приазовья до и рядом с греческим полисом.', 47.270712, 39.332512, {
        address: 'Территория музея-заповедника',
        locationSlug: 'rostov-na-donu-tanais-usadba-meota',
        mustSeeFilter: 'museum',
        visitMinutes: 20,
      }),
      place('Смотровая на дельту Дона', 'Деревянная площадка с видом на степь и русла Мертвого Донца.', 47.270512, 39.331512, {
        address: 'Территория музея-заповедника',
        locationSlug: 'rostov-na-donu-tanais-smotrovaya',
        mustSeeFilter: 'views',
        visitMinutes: 20,
      }),
    ],
  },
  {
    name: 'Старочеркасская',
    desc: 'Старая столица донского казачества с мощеными улицами, собором, атаманским дворцом и очень сильным ощущением исторической вольницы.',
    locationSlug: 'rostov-na-donu-starocherkasskaya',
    mustSeeFilter: 'main',
    visitMinutes: '4-5 ч',
    latitude: 47.239112,
    longitude: 40.042312,
    address: 'Ростовская обл., станица Старочеркасская',
    travelVector: 'Автобус 232 или авто ~45-55 мин',
    travelVectorBlurb:
      'Лучше ехать утром: к полудню в соборе и на набережной становится жарко, а автобусы заполняются дачниками.',
    timingNote:
      'Начните с собора и майдана, затем дворец Ефремовых, жилые дома, в финале - берег Дона и пляж.',
    logisticsExit: 'остановка у музея-заповедника / парковка на ул. Почтовой',
    gastroStop: {
      name: 'Казачий обед',
      blurb: 'В станице ищите простые кафе с ухой, пирогами и шашлыком - сюда едут не за fine dining, а за атмосферой.',
    },
    places: [
      place('Воскресенский войсковой собор', 'Первый каменный храм Дона и главная архитектурная доминанта станицы.', 47.239312, 40.042112, {
        address: 'Соборная площадь',
        locationSlug: 'rostov-na-donu-starocherkasskaya-voskresenskiy-sobor',
        mustSeeFilter: 'temple',
        visitMinutes: 40,
      }),
      place('Дворец атаманов Ефремовых', 'Казачья усадьба с музейной экспозицией и парадным двором.', 47.239012, 40.041712, {
        address: 'ул. Почтовая, 1',
        venueSlug: 'rostov-na-donu-starocherkasskaya-dvorec-efremovyh',
        mustSeeFilter: 'museum',
        visitMinutes: '1-2 ч',
      }),
      place('Дом-крепость Жученкова', 'Редкий укрепленный дом начала XVIII века с бойницами и толстыми стенами.', 47.238812, 40.041312, {
        address: 'исторический центр станицы',
        locationSlug: 'rostov-na-donu-starocherkasskaya-dom-krepost-zhuchenkova',
        mustSeeFilter: 'houses',
        visitMinutes: 20,
      }),
      place('Майдан Старочеркасска', 'Площадь казачьего круга с пушками и воротами Азова.', 47.239412, 40.042512, {
        address: 'исторический центр станицы',
        locationSlug: 'rostov-na-donu-starocherkasskaya-maydan',
        mustSeeFilter: 'main',
        visitMinutes: 20,
      }),
      place('Петропавловская церковь', 'Барочный храм, связанный с именем атамана Платова.', 47.238612, 40.043112, {
        address: 'исторический центр станицы',
        locationSlug: 'rostov-na-donu-starocherkasskaya-petropavlovskaya-cerkov',
        mustSeeFilter: 'temple',
        visitMinutes: 25,
      }),
      place('Монастырское урочище', 'Тихая окраина станицы с часовней и старым кладбищем.', 47.236912, 40.044412, {
        address: 'окраина станицы',
        locationSlug: 'rostov-na-donu-starocherkasskaya-monastyrskoe-urochishche',
        mustSeeFilter: 'views',
        visitMinutes: 25,
      }),
      place('Казачий речной пляж', 'Широкий берег Дона с хорошей панорамой на воду и неспешным южным ритмом.', 47.238212, 40.045112, {
        address: 'берег Дона',
        locationSlug: 'rostov-na-donu-starocherkasskaya-kazachiy-plyazh',
        mustSeeFilter: 'park',
        visitMinutes: 40,
      }),
    ],
  },
  {
    name: 'Аксайская таможенная застава',
    desc: 'Быстрый исторический выезд про донскую границу, почтовый тракт и купеческую дорогу между Ростовом и Старочеркасском.',
    locationSlug: 'rostov-na-donu-aksayskaya-tamozhennaya-zastava',
    mustSeeFilter: 'main',
    visitMinutes: '3-4 ч',
    latitude: 47.269112,
    longitude: 39.874112,
    address: 'г. Аксай, исторический центр',
    travelVector: 'Авто / маршрутка ~35-45 мин',
    travelVectorBlurb: 'Это самый легкий исторический выезд из Ростова: удобно совмещать с Аксайским военно-историческим слоем и прогулкой по берегу.',
    logisticsExit: 'центр Аксая / парковка у музейного квартала',
    places: [
      place('Здание заставы', 'Ядро маршрута и главный повод сюда ехать.', 47.269112, 39.874112, { address: 'исторический центр Аксая', locationSlug: 'rostov-na-donu-aksay-zdanie-zastavy', mustSeeFilter: 'museum', visitMinutes: 40 }),
      place('Купеческая улица Аксая', 'Короткая прогулка по старой торговой линии.', 47.268812, 39.873812, { address: 'центр Аксая', locationSlug: 'rostov-na-donu-aksay-kupecheskaya-ulica', mustSeeFilter: 'street', visitMinutes: 20 }),
      place('Набережная Аксая', 'Спокойный выход к воде и панорама рукавов Дона.', 47.268512, 39.875012, { address: 'берег Аксая', locationSlug: 'rostov-na-donu-aksay-naberezhnaya', mustSeeFilter: 'views', visitMinutes: 25 }),
      place('Военно-исторический подземный комплекс', 'Сильный дополнительный слой про оборону и фортификацию.', 47.269412, 39.874612, { address: 'исторический центр Аксая', locationSlug: 'rostov-na-donu-aksay-podzemnyy-kompleks', mustSeeFilter: 'museum', visitMinutes: 40 }),
    ],
  },
  {
    name: 'Ростовский заповедник / Маныч-Гудило',
    desc: 'Степной большой выезд ради птиц, соленых озер и почти инопланетного южного пейзажа без городского шума.',
    locationSlug: 'rostov-na-donu-manych-gudilo',
    mustSeeFilter: 'main',
    visitMinutes: '10-12 ч',
    latitude: 46.191112,
    longitude: 42.841112,
    address: 'Ростовская обл., район озера Маныч-Гудило',
    travelVector: 'Только авто ~4-5 ч',
    travelVectorBlurb: 'Это полноценный природный день. Выезжать нужно рано утром и брать воду, головной убор и запас еды.',
    logisticsExit: 'визит-центр / экотропы заповедника',
    places: [
      place('Смотровые степные маршруты', 'Главный опыт - горизонт, ветер и пустое пространство.', 46.191112, 42.841112, { address: 'территория заповедника', locationSlug: 'rostov-na-donu-manych-stepnye-marshruty', mustSeeFilter: 'views', visitMinutes: 60 }),
      place('Озеро Маныч-Гудило', 'Соленая акватория и главный природный якорь этой поездки.', 46.192112, 42.842112, { address: 'территория заповедника', locationSlug: 'rostov-na-donu-ozero-manych-gudilo', mustSeeFilter: 'views', visitMinutes: 40 }),
      place('Орнитологические точки', 'Весной и осенью здесь особенно хорошо наблюдать птиц.', 46.190412, 42.840612, { address: 'территория заповедника', locationSlug: 'rostov-na-donu-manych-ornito-tochki', mustSeeFilter: 'science', visitMinutes: 45 }),
      place('Степные курганы', 'Исторический след посреди ландшафта, который лучше читать с гидом.', 46.189912, 42.839912, { address: 'территория заповедника', locationSlug: 'rostov-na-donu-manych-kurgany', mustSeeFilter: 'monument', visitMinutes: 20 }),
    ],
  },
  {
    name: 'Хутор Пухляковский',
    desc: 'Винный и тихо-донской выезд: фестивальная лоза, виноградники, берег Дона и южная сельская эстетика.',
    locationSlug: 'rostov-na-donu-puhlyakovskiy',
    mustSeeFilter: 'main',
    visitMinutes: '5-6 ч',
    latitude: 47.444112,
    longitude: 40.646112,
    address: 'Ростовская обл., хутор Пухляковский',
    travelVector: 'Авто ~1.5-2 ч',
    travelVectorBlurb: 'Лучше ехать в сухую погоду и совмещать с винодельней или сезонным фестивалем.',
    logisticsExit: 'центр хутора / парковка у винных точек',
    places: [
      place('Виноградники Пухляковского', 'Главный сельский пейзаж и основа винного характера места.', 47.444112, 40.646112, { address: 'окрестности хутора', locationSlug: 'rostov-na-donu-puhlyakovskiy-vinogradniki', mustSeeFilter: 'views', visitMinutes: 40 }),
      place('Дегустационные площадки', 'Автохтонные сорта и местный винный рассказ без курортной мишуры.', 47.443812, 40.645812, { address: 'центр хутора', locationSlug: 'rostov-na-donu-puhlyakovskiy-degustaciya', mustSeeFilter: 'gastro', visitMinutes: 60 }),
      place('Берег Дона', 'Тихая речная пауза после виноградников.', 47.443312, 40.646712, { address: 'берег Дона', locationSlug: 'rostov-na-donu-puhlyakovskiy-bereg-dona', mustSeeFilter: 'views', visitMinutes: 30 }),
      place('Фестивальная площадь', 'Сердце осенней «Донской лозы» и сельского культурного ритма.', 47.444512, 40.646412, { address: 'центр хутора', locationSlug: 'rostov-na-donu-puhlyakovskiy-festivalnaya-ploshchad', mustSeeFilter: 'main', visitMinutes: 20 }),
    ],
  },
];

export const ROSTOV_NA_DONU_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'rostov-merchant-don',
    title: 'Купеческий шик и донские просторы',
    description:
      'Классический первый день: парадные фасады Большой Садовой, рынок, набережная и финал у руин Парамоновских складов.',
    travelVector: 'Пешком по центру и к Дону',
    timingNote: 'Около 4 часов без музеев: рынок, набережная, склады и неспешный обед.',
    coverImageUrl: '/images/venues/rostov-na-donu/naberezhnaya-reki-don-beregovaya-ulitsa.jpg',
    stops: [
      place('Здание Городской думы', '20 минут на фасады и кариатиды Померанцева.', 47.221912, 39.714112, {
        address: 'ул. Большая Садовая, 47',
        locationSlug: 'rostov-na-donu-zdanie-gorodskoy-dumy',
        mustSeeFilter: 'houses',
        visitMinutes: 20,
        alsoMain: true,
      }),
      place('Пешеходный Соборный', 'Короткий участок со стрит-фото и кофе перед рынком.', 47.220912, 39.711412, {
        address: 'Соборный переулок',
        locationSlug: 'rostov-na-donu-sobornyy-pereulok',
        mustSeeFilter: 'street',
        visitMinutes: 20,
      }),
      place('Центральный рынок', 'Час на рыбу, раков и южный шум Старого базара.', 47.217912, 39.710912, {
        address: 'Буденновский проспект, 12',
        locationSlug: 'rostov-na-donu-tsentral-nyy-rynok-staryy-bazar',
        mustSeeFilter: 'gastro',
        visitMinutes: 60,
        alsoMain: true,
      }),
      place('Набережная Дона', '40 минут на прогулку мимо памятников и причалов.', 47.218112, 39.719112, {
        address: 'ул. Береговая',
        locationSlug: 'rostov-na-donu-naberezhnaya-reki-don-beregovaya-ulitsa',
        mustSeeFilter: 'views',
        visitMinutes: 40,
        alsoMain: true,
      }),
      place('Парамоновские склады', '30 минут на индустриальные руины и родники.', 47.219412, 39.725891, {
        address: 'ул. Береговая, 49',
        locationSlug: 'rostov-na-donu-paramonovskie-sklady',
        mustSeeFilter: 'museum',
        visitMinutes: 30,
        alsoMain: true,
      }),
      place('Ресторан «Раки и Гады»', 'Длинный южный обед с раками и морской закуской.', 47.219112, 39.711891, {
        address: 'ул. Шаумяна, 39',
        locationSlug: 'rostov-na-donu-raki-i-gady',
        mustSeeFilter: 'gastro',
        visitMinutes: 90,
      }),
    ],
  },
  {
    id: 'rostov-pushkinskaya-avantgarde',
    title: 'Пушкинская, авангард и скрытые бары',
    description:
      'Более молодежный маршрут: художественный музей, Пушкинская, театр-трактор и вечер в двориках Газетного.',
    travelVector: 'Пешком по Пушкинской и Театральной',
    timingNote: 'Около 4 часов с одной музейной паузой и вечерним барным финалом.',
    coverImageUrl: '/images/venues/rostov-na-donu/teatr-dramy-im-gorkogo.jpg',
    stops: [
      place('Особняк Парамонова', '15 минут на неоклассический фасад и контекст Пушкинской.', 47.227812, 39.728912, {
        address: 'ул. Пушкинская, 148',
        locationSlug: 'rostov-na-donu-osobnyak-paramonova',
        mustSeeFilter: 'mansions',
        visitMinutes: 15,
        alsoMain: true,
      }),
      place('Музей изобразительных искусств', 'Час на русскую классику и камерные залы.', 47.226312, 39.721112, {
        address: 'ул. Пушкинская, 115',
        venueSlug: 'rostov-na-donu-muzey-izobrazitelnyh-iskusstv',
        mustSeeFilter: 'museum',
        visitMinutes: 60,
      }),
      place('Пушкинская улица', 'Полчаса на тенистый бульвар в спокойном темпе.', 47.225891, 39.718912, {
        address: 'ул. Пушкинская',
        locationSlug: 'rostov-na-donu-pushkinskaya-ulitsa',
        mustSeeFilter: 'street',
        visitMinutes: 30,
        alsoMain: true,
      }),
      place('Театр драмы им. Горького', '20 минут на лучший ракурс тракторного фасада.', 47.223412, 39.744112, {
        address: 'Театральная площадь, 1',
        venueSlug: 'rostov-na-donu-teatr-dramy-im-gorkogo',
        mustSeeFilter: 'creative',
        visitMinutes: 20,
        alsoMain: true,
      }),
      place('Парк Революции', '30 минут у колеса обозрения и фламинго-пруда.', 47.224912, 39.749112, {
        address: 'Театральная площадь, 3',
        locationSlug: 'rostov-na-donu-park-revolyutsii',
        mustSeeFilter: 'park',
        visitMinutes: 30,
        alsoMain: true,
      }),
      place('Рюмочная «Хрусталь»', 'Финал с настойками во дворах старого центра.', 47.221912, 39.714512, {
        address: 'пер. Газетный, 52',
        locationSlug: 'rostov-na-donu-ryumochnaya-hrustal',
        mustSeeFilter: 'gastro',
        visitMinutes: 40,
      }),
    ],
  },
  ...ROSTOV_LINE_DAY_ROUTE_PRESETS,
];

export const ROSTOV_NA_DONU_FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'Аэропорт Платов закрыт. Как сейчас удобнее всего добираться в Ростов-на-Дону?',
    a: 'Самый надежный вариант - фирменные и двухэтажные поезда из Москвы до станции Ростов-Главный. Они идут около 15-16 часов. На машине и автобусе по трассе М-4 «Дон» закладывайте 12-14 часов без длинных пробок.',
  },
  {
    q: 'Правда ли, что на Старом базаре надо торговаться?',
    a: 'Да, но спокойно и с улыбкой. На рынке лучше пройти вглубь рядов, сравнить цены на рыбу и раков и только потом покупать. Торг здесь - часть южной городской культуры, а не конфликт.',
  },
  {
    q: 'Что сейчас с Парамоновскими складами и бывшим природным бассейном?',
    a: 'Купание прекращено из-за аварийного состояния конструкций и подготовки территории к реставрации. Но сами склады, родники и кирпичные своды по-прежнему остаются одной из самых сильных визуальных точек города.',
  },
  {
    q: 'Где искать атмосферу старого «Ростова-папы» без экскурсионного глянца?',
    a: 'Лучше всего идти в кварталы ниже Большой Садовой: Шаумяна, Станиславского, Газетный, Богатяновский спуск. Сегодня это безопасные, но очень колоритные улицы с купеческими фасадами и дворами-галерками.',
  },
];

export const ROSTOV_NA_DONU_TRAVEL =
  'Лучшее время для поездки в Ростов - апрель-май и сентябрь-октябрь. Весной город быстро зеленеет, запускается навигация по Дону и легче гулять по Пушкинской и набережной. Осенью держится долгое бабье лето, становится меньше транзитного трафика по М-4 и дешевеют отели. Лето часто очень жаркое, выше +35 °C, поэтому планируйте прогулки утром и после 18:00. Зимой город мягкий, но ветреный: центр компактен, а согреваться лучше в музеях и гастро-точках.';
