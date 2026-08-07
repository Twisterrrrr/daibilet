/**
 * Patch CITY_INFO.moscow in web + public cityInfo.ts with Phase C hub pack.
 *
 * Usage:
 *   node scripts/data/patch-moscow-hub-pack.js
 *   node scripts/data/patch-moscow-hub-pack.js --dry-run
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const dry = process.argv.includes('--dry-run');

const mskPresetStopHelper = `/** Компактная editorial-точка для preset Москвы. */
const mskPresetStop = (
  name: string,
  route?: Pick<
    CityMustSeeItem,
    'dayRouteId' | 'latitude' | 'longitude' | 'venueSlug' | 'locationSlug'
  >,
): CityMustSeeItem => ({
  name,
  desc: 'Точка маршрута по Москве.',
  ...route,
});
`;

/** Full moscow entry body (without trailing comma of next city). */
const MOSCOW_BLOCK = `  moscow: {
    brief:
      'Огненный супермегаполис с тысячелетней историей, где древние кремлевские стены соседствуют с зеркальными небоскребами Сити. Город невероятных скоростей, безумной культурной жизни, лучших театров планеты и парков мирового уровня.',
    hookFact: 'А вы знали, что московское метро - это не просто транспорт, а самая большая подземная арт-галерея в мире? Более 40 станций признаны официальными памятниками архитектуры, а для их отделки использовались десятки видов редчайшего мрамора и гранита со всего СССР.',
    mustSee: [
      // --- main (12) ---
      { name: 'Красная площадь и Кремль', desc: 'Символ России и объект ЮНЕСКО: стены, соборы и парадный двор столицы.', mustSeeFilter: 'main', locationSlug: 'moscow-krasnaya-ploschad-i-kreml', latitude: 55.7539, longitude: 37.6208 },
      { name: 'Собор Василия Блаженного', desc: 'Девять цветных глав у Кремля - главный открыточный кадр Красной площади.', mustSeeFilter: 'main', locationSlug: 'moscow-sobor-vasiliya-blazhennogo', latitude: 55.7525, longitude: 37.6231 },
      { name: 'Большой театр', desc: 'Легендарная оперная и балетная сцена на Театральной площади.', mustSeeFilter: 'main', venueSlug: 'moscow-bol-shoy-teatr', latitude: 55.7596, longitude: 37.6184 },
      { name: 'Третьяковская галерея', desc: 'Крупнейшее собрание русского искусства в Замоскворечье.', mustSeeFilter: 'main', venueSlug: 'moscow-tret-yakovskaya-galereya', latitude: 55.7415, longitude: 37.6208 },
      { name: 'Парк Зарядье', desc: 'Современный парк у стен Кремля с парящим мостом и медиацентром.', mustSeeFilter: 'main', locationSlug: 'moscow-park-zaryad-e', latitude: 55.7512, longitude: 37.629 },
      { name: 'ВДНХ', desc: 'Грандиозный выставочный комплекс с павильонами, фонтанами и музеем космонавтики рядом.', mustSeeFilter: 'main', locationSlug: 'moscow-vdnh', latitude: 55.826, longitude: 37.637 },
      { name: 'Москва-Сити', desc: 'Деловой кластер небоскребов со смотровыми площадками и видами на реку.', mustSeeFilter: 'main', locationSlug: 'moscow-moskva-siti', latitude: 55.7494, longitude: 37.5377 },
      { name: 'Воробьевы горы', desc: 'Смотровая над Москвой-рекой у МГУ - бесплатная панорама города.', mustSeeFilter: 'main', locationSlug: 'moscow-vorobevy-gory', latitude: 55.7102, longitude: 37.559 },
      { name: 'Храм Христа Спасителя', desc: 'Главный собор Москвы на берегу реки с видами с Патриаршего моста.', mustSeeFilter: 'main', locationSlug: 'moscow-hram-hrista-spasitelya', latitude: 55.7446, longitude: 37.6055 },
      { name: 'Новодевичий монастырь', desc: 'Белокаменный ансамбль ЮНЕСКО у пруда и Новодевичьего кладбища.', mustSeeFilter: 'main', locationSlug: 'moscow-novodevichiy-monastyr', latitude: 55.7262, longitude: 37.556 },
      { name: 'Останкинская телебашня', desc: 'Высотная доминанта севера Москвы со смотровой и историей советского ТВ.', mustSeeFilter: 'main', locationSlug: 'moscow-ostankinskaya-telebashnya', latitude: 55.8197, longitude: 37.6117 },
      { name: 'ГУМ', desc: 'Парадный торговый пассаж на Красной площади с галереями и катком зимой.', mustSeeFilter: 'main', locationSlug: 'moscow-gum', latitude: 55.7546, longitude: 37.6215 },
      // --- museum (10) ---
      { name: 'ГМИИ имени Пушкина', desc: 'Западное искусство у Волхонки - от античности до импрессионистов.', mustSeeFilter: 'museum', venueSlug: 'moscow-gmii-imeni-pushkina', latitude: 55.7473, longitude: 37.6051 },
      { name: 'Новая Третьяковка', desc: 'XX век русского искусства на Крымском Валу рядом с Музеоном.', mustSeeFilter: 'museum', venueSlug: 'moscow-novaya-tretyakovka', latitude: 55.7345, longitude: 37.6059 },
      { name: 'Музей современного искусства «Гараж»', desc: 'Современное искусство в Парке Горького в здании бывшего ресторана «Времена года».', mustSeeFilter: 'museum', venueSlug: 'moscow-muzey-garazh', latitude: 55.7278, longitude: 37.6014 },
      { name: 'Музей космонавтики', desc: 'Ракета «Восток» и история космоса у ВДНХ.', mustSeeFilter: 'museum', venueSlug: 'moscow-muzey-kosmonavtiki', latitude: 55.8227, longitude: 37.6397 },
      { name: 'Политехнический музей', desc: 'Наука и техника в историческом здании на Лубянке (с учетом режима площадок).', mustSeeFilter: 'museum', venueSlug: 'moscow-politehnicheskiy-muzey', latitude: 55.7585, longitude: 37.6295 },
      { name: 'Еврейский музей и центр толерантности', desc: 'Интерактивная история евреев России в бывшем Бахметьевском гараже.', mustSeeFilter: 'museum', venueSlug: 'moscow-evreyskiy-muzey', latitude: 55.7886, longitude: 37.6089 },
      { name: 'Музей Москвы', desc: 'Городская история в Провиантских складах на Зубовском бульваре.', mustSeeFilter: 'museum', venueSlug: 'moscow-muzey-moskvy', latitude: 55.7368, longitude: 37.5925 },
      { name: 'Бункер-42 на Таганке', desc: 'Холодная война под землей: командный бункер и экскурсии в шахтах.', mustSeeFilter: 'museum', venueSlug: 'moscow-bunker-42', latitude: 55.7416, longitude: 37.657 },
      { name: 'Музей Михаила Булгакова', desc: '«Нехорошая квартира» и булгаковский след на Большой Садовой.', mustSeeFilter: 'museum', venueSlug: 'moscow-muzey-bulgakova', latitude: 55.7668, longitude: 37.5935 },
      { name: 'Музей русского импрессионизма', desc: 'Частное собрание в бывшем мукомольном цехе на Ленинградке.', mustSeeFilter: 'museum', venueSlug: 'moscow-muzey-russkogo-impressionizma', latitude: 55.7889, longitude: 37.5615 },
      // --- views (8) ---
      { name: 'Парящий мост в Зарядье', desc: 'Консольный вынос над Москвой-рекой с кадрами на Кремль и высотки.', mustSeeFilter: 'views', locationSlug: 'moscow-paryaschiy-most-zaryadya', latitude: 55.7498, longitude: 37.6285 },
      { name: 'Смотровая на Воробьевых горах', desc: 'Классическая панорама: МГУ, Лужники, излучина реки.', mustSeeFilter: 'views', locationSlug: 'moscow-smotrovaya-vorobevyh-gor', latitude: 55.7102, longitude: 37.559 },
      { name: 'Патриарший мост', desc: 'Вечерний променад от ХХС к Болотной с видом на Кремль.', mustSeeFilter: 'views', locationSlug: 'moscow-patriarshiy-most', latitude: 55.7435, longitude: 37.6085 },
      { name: 'Крымская набережная', desc: 'Пешеходный парк у Музеона и моста - закаты и река.', mustSeeFilter: 'views', locationSlug: 'moscow-krymskaya-naberezhnaya', latitude: 55.7335, longitude: 37.6085 },
      { name: 'Набережная у Кремля', desc: 'Софийская и Кремлевская линии - фасад власти и воды.', mustSeeFilter: 'views', locationSlug: 'moscow-kremlevskaya-naberezhnaya', latitude: 55.7495, longitude: 37.6125 },
      { name: 'Смотровая Москва-Сити', desc: 'Платные высотные площадки над деловым центром.', mustSeeFilter: 'views', locationSlug: 'moscow-smotrovaya-moskva-siti', latitude: 55.7497, longitude: 37.5372 },
      { name: 'Котельническая набережная', desc: 'Сталинская высотка и вид на стрелку Яузы.', mustSeeFilter: 'views', locationSlug: 'moscow-kotelnicheskaya-naberezhnaya', latitude: 55.7472, longitude: 37.6428 },
      { name: 'Смотровая Останкинской башни', desc: 'Высотный обзор севера столицы (по расписанию и погоде).', mustSeeFilter: 'views', locationSlug: 'moscow-smotrovaya-ostankino', latitude: 55.8197, longitude: 37.6117 },
      // --- street (6) ---
      { name: 'Старый Арбат', desc: 'Пешеходная ось с уличными музыкантами, сувенирами и доходными домами.', mustSeeFilter: 'street', locationSlug: 'moscow-staryy-arbat', latitude: 55.7494, longitude: 37.5915 },
      { name: 'Никольская улица', desc: 'Световые арки и поток между Лубянкой и Красной площадью.', mustSeeFilter: 'street', locationSlug: 'moscow-nikolskaya-ulitsa', latitude: 55.7575, longitude: 37.6235 },
      { name: 'Патриаршие пруды', desc: 'Камерный квартал Булгакова, скамейки у воды и вечерние огни.', mustSeeFilter: 'street', locationSlug: 'moscow-patriarshie-prudy', latitude: 55.7638, longitude: 37.5922 },
      { name: 'Кузнецкий Мост', desc: 'Историческая торговая улица между Неглинной и Петровкой.', mustSeeFilter: 'street', locationSlug: 'moscow-kuznetskiy-most', latitude: 55.7615, longitude: 37.6245 },
      { name: 'Камергерский переулок', desc: 'Театральный переулок у МХТ - узкий променад центра.', mustSeeFilter: 'street', locationSlug: 'moscow-kamergerskiy-pereulok', latitude: 55.7598, longitude: 37.6135 },
      { name: 'Пятницкая улица', desc: 'Замоскворечье: храмы, низкая застройка и путь к Третьяковке.', mustSeeFilter: 'street', locationSlug: 'moscow-pyatnitskaya-ulitsa', latitude: 55.7425, longitude: 37.6285 },
      // --- park (8) ---
      { name: 'Парк Горького', desc: 'Главный городской парк с набережной, прокатом и «Гаражом».', mustSeeFilter: 'park', locationSlug: 'moscow-park-gorkogo', latitude: 55.7312, longitude: 37.6015 },
      { name: 'Музеон', desc: 'Парк искусств у Новой Третьяковки со скульптурами под открытым небом.', mustSeeFilter: 'park', locationSlug: 'moscow-muzeon', latitude: 55.7348, longitude: 37.6065 },
      { name: 'Коломенское', desc: 'Царская усадьба, церковь Вознесения и вид на Москву-реку.', mustSeeFilter: 'park', locationSlug: 'moscow-kolomenskoe', latitude: 55.6672, longitude: 37.6708 },
      { name: 'Царицыно', desc: 'Дворцово-парковый ансамбль Баженова и Казакова с прудами.', mustSeeFilter: 'park', locationSlug: 'moscow-tsaritsyno', latitude: 55.6156, longitude: 37.682 },
      { name: 'Кусково', desc: 'Усадьба Шереметевых с дворцом, оранжереей и регулярным парком.', mustSeeFilter: 'park', locationSlug: 'moscow-kuskovo', latitude: 55.7355, longitude: 37.8075 },
      { name: 'Измайловский парк и кремль', desc: 'Огромный лесопарк и деревянный Измайловский кремль у рынка.', mustSeeFilter: 'park', locationSlug: 'moscow-izmaylovskiy-park', latitude: 55.7915, longitude: 37.7495 },
      { name: 'Сокольники', desc: 'Классический парк с лучами аллей и павильонами на северо-востоке.', mustSeeFilter: 'park', locationSlug: 'moscow-sokolniki', latitude: 55.8045, longitude: 37.6775 },
      { name: 'Аптекарский огород', desc: 'Ботанический сад МГУ у Проспекта Мира - оранжереи и сезонные выставки.', mustSeeFilter: 'park', locationSlug: 'moscow-aptekarskiy-ogorod', latitude: 55.7785, longitude: 37.6355 },
      // --- temple (6) ---
      { name: 'Казанский собор на Красной площади', desc: 'Восстановленный храм у Никольских ворот - камерная точка парадного центра.', mustSeeFilter: 'temple', locationSlug: 'moscow-kazanskiy-sobor-krasnaya', latitude: 55.7553, longitude: 37.619 },
      { name: 'Покровский монастырь', desc: 'Действующий монастырь у Таганской с потоком паломников.', mustSeeFilter: 'temple', locationSlug: 'moscow-pokrovskiy-monastyr', latitude: 55.7385, longitude: 37.6705 },
      { name: 'Донской монастырь', desc: 'Тихий некрополь и стены у Шаболовки - пауза от центра.', mustSeeFilter: 'temple', locationSlug: 'moscow-donskoy-monastyr', latitude: 55.7145, longitude: 37.6025 },
      { name: 'Богоявленский собор в Елохове', desc: 'Кафедральный собор с мощами святителя Алексия.', mustSeeFilter: 'temple', locationSlug: 'moscow-bogoyavlenskiy-sobor-elohovo', latitude: 55.7785, longitude: 37.6745 },
      { name: 'Храм Вознесения в Коломенском', desc: 'Шатровый шедевр XVI века - объект ЮНЕСКО в усадьбе.', mustSeeFilter: 'temple', locationSlug: 'moscow-hram-vozneseniya-kolomenskoe', latitude: 55.667, longitude: 37.6705 },
      { name: 'Марфо-Мариинская обитель', desc: 'Обитель великой княгини Елизаветы на Большой Ордынке.', mustSeeFilter: 'temple', locationSlug: 'moscow-marfo-mariinskaya-obitel', latitude: 55.7385, longitude: 37.6235 },
      // --- science / family (4) ---
      { name: 'Московский зоопарк', desc: 'Исторический зоопарк у Краснопресненской - семейный якорь центра.', mustSeeFilter: 'science', locationSlug: 'moscow-zoopark', latitude: 55.7625, longitude: 37.5785 },
      { name: 'Москвариум на ВДНХ', desc: 'Крупный океанариум и шоу у главного входа ВДНХ.', mustSeeFilter: 'science', venueSlug: 'moscow-moskvarium', latitude: 55.8325, longitude: 37.6215 },
      { name: 'Планетарий', desc: 'Купол у зоопарка: звезды, музей Урании и интерактив.', mustSeeFilter: 'science', venueSlug: 'moscow-planetariy', latitude: 55.7615, longitude: 37.5745 },
      { name: 'Экспериментариум', desc: 'Интерактивный музей науки на севере города для детей и взрослых.', mustSeeFilter: 'science', venueSlug: 'moscow-eksperimentanium', latitude: 55.8265, longitude: 37.4975 },
      // --- creative (4) ---
      { name: 'Винзавод', desc: 'Креативный кластер на бывшем винодельческом заводе у Курской.', mustSeeFilter: 'creative', locationSlug: 'moscow-vinzavod', latitude: 55.7555, longitude: 37.6655 },
      { name: 'Artplay', desc: 'Дизайн и выставки в бывших промышленных корпусах у Яузы.', mustSeeFilter: 'creative', locationSlug: 'moscow-artplay', latitude: 55.76, longitude: 37.6675 },
      { name: 'Флакон', desc: 'Дизайн-завод с шоурумами, двором и ивентами на севере.', mustSeeFilter: 'creative', locationSlug: 'moscow-flakon', latitude: 55.8045, longitude: 37.5845 },
      { name: 'Даниловский рынок', desc: 'Обновленный гастрономический рынок у Тульской - еда и локальные продукты.', mustSeeFilter: 'creative', locationSlug: 'moscow-danilovskiy-rynok', latitude: 55.7105, longitude: 37.6215 },
    ],
    significantSuburbs: [
      {
        name: 'Сергиев Посад',
        desc: 'Золотое кольцо у ворот Москвы: Троице-Сергиева лавра и посадский центр.',
        mustSeeFilter: 'main',
        travelVector: 'Северный и Ярославский вектор',
        travelVectorBlurb: 'Электрички и экспрессы с Ярославского вокзала (метро «Комсомольская») до Сергиева Посада за ~1-1,5 часа.',
        stationHub: 'Ярославский вокзал',
        stationName: 'Станция Сергиев Посад',
        places: [
          { name: 'Троице-Сергиева лавра', desc: 'главный монастырь России, объект ЮНЕСКО с ансамблем соборов и колокольней', locationSlug: 'moscow-troitse-sergieva-lavra', latitude: 56.3105, longitude: 38.1305 },
          { name: 'Надкладезная часовня', desc: 'источник во дворе лавры - короткая пауза между храмами', latitude: 56.3108, longitude: 38.1312 },
          { name: 'Музей игрушки', desc: 'коллекция игрушек у вокзала - семейная точка после лавры', latitude: 56.3085, longitude: 38.1355 },
          { name: 'Келарский пруд', desc: 'вид на стены лавры с воды - спокойный кадр за стенами', latitude: 56.3095, longitude: 38.1285 },
          { name: 'Проспект Красной Армии', desc: 'посадская торговая ось с сувенирами и кафе', latitude: 56.3125, longitude: 38.1335 },
        ],
      },
      {
        name: 'Коломна',
        desc: 'Кремль, пастила и набережная Москвы-реки - день на юго-восток области.',
        mustSeeFilter: 'main',
        travelVector: 'Юго-Восточный и Рязанский вектор',
        travelVectorBlurb: 'Поезда с Казанского вокзала до Коломны; удобно совмещать кремль, музеи и прогулку по посаду.',
        stationHub: 'Казанский вокзал',
        stationName: 'Станция Коломна / Голутвин',
        places: [
          { name: 'Коломенский кремль', desc: 'кирпичные стены и башни XVI века в центре старого города', locationSlug: 'moscow-kolomenskiy-kreml', latitude: 55.1035, longitude: 38.7525 },
          { name: 'Музей пастилы', desc: 'фирменная сладость Коломны и экскурсии по фабрике вкуса', latitude: 55.1045, longitude: 38.7555 },
          { name: 'Соборная площадь', desc: 'храмы внутри кремля и парадный двор посада', latitude: 55.104, longitude: 38.7535 },
          { name: 'Набережная Москвы-реки', desc: 'променад с видом на воду и валы', latitude: 55.1025, longitude: 38.7515 },
          { name: 'Фабрика музей «Коломенская пастила»', desc: 'дегустации и история купеческого лакомства', latitude: 55.1055, longitude: 38.7565 },
        ],
      },
      {
        name: 'Звенигород',
        desc: 'Саввино-Сторожевский монастырь и тихий город на Москве-реке.',
        mustSeeFilter: 'main',
        travelVector: 'Западный и Белорусский вектор',
        travelVectorBlurb: 'Электрички с Белорусского вокзала до Звенигорода; дальше автобус или такси к монастырю на холме.',
        stationHub: 'Белорусский вокзал',
        stationName: 'Станция Звенигород',
        places: [
          { name: 'Саввино-Сторожевский монастырь', desc: 'белый ансамбль на холме над рекой - главный якорь дня', locationSlug: 'moscow-savvino-storozhevskiy', latitude: 55.7285, longitude: 36.8155 },
          { name: 'Собор Рождества Богородицы', desc: 'древний храм внутри монастыря', latitude: 55.7288, longitude: 36.8158 },
          { name: 'Городок / Успенский собор', desc: 'историческое ядро Звенигорода на высоком берегу', latitude: 55.7295, longitude: 36.8545 },
          { name: 'Сквер на набережной', desc: 'короткая прогулка у воды после монастыря', latitude: 55.7305, longitude: 36.8525 },
          { name: 'Музей истории Звенигорода', desc: 'локальная история в центре города', latitude: 55.7315, longitude: 36.8555 },
        ],
      },
      {
        name: 'Архангельское',
        desc: 'Усадьба Юсуповых с дворцом, парком и видом на Москву-реку.',
        mustSeeFilter: 'main',
        travelVector: 'Западный и Новорижский вектор',
        travelVectorBlurb: 'Автобусы и маршрутки от метро «Тушинская» / «Строгино»; удобно как полудневная поездка без вокзала.',
        stationHub: 'Метро Тушинская / Строгино',
        stationName: 'Остановка «Архангельское»',
        places: [
          { name: 'Большой дворец', desc: 'парадные залы и колоннада усадьбы', locationSlug: 'moscow-usadba-arhangelskoe', latitude: 55.7865, longitude: 37.2835 },
          { name: 'Храм Архангела Михаила', desc: 'усадебная церковь над склоном к реке', latitude: 55.7855, longitude: 37.2825 },
          { name: 'Парк Архангельского', desc: 'террасы, статуи и виды на пойму', latitude: 55.7875, longitude: 37.2845 },
          { name: 'Колоннада', desc: 'классический фасад для открытки', latitude: 55.7868, longitude: 37.2838 },
          { name: 'Музей усадьбы', desc: 'коллекции и интерьеры в служебных корпусах', latitude: 55.7862, longitude: 37.2842 },
        ],
      },
      {
        name: 'Истра / Новый Иерусалим',
        desc: 'Воскресенский Ново-Иерусалимский монастырь и музей рядом.',
        mustSeeFilter: 'main',
        travelVector: 'Северо-Западный и Рижский вектор',
        travelVectorBlurb: 'Электрички с Рижского вокзала до Истры; монастырь - короткая дорога от станции.',
        stationHub: 'Рижский вокзал',
        stationName: 'Станция Истра / Ново-Иерусалимская',
        places: [
          { name: 'Ново-Иерусалимский монастырь', desc: 'масштабный ансамбль Патриарха Никона на реке Истре', locationSlug: 'moscow-novo-ierusalimskiy', latitude: 55.9215, longitude: 36.8455 },
          { name: 'Воскресенский собор', desc: 'главный храм комплекса с ротондой', latitude: 55.9218, longitude: 36.8458 },
          { name: 'Музей «Новый Иерусалим»', desc: 'современный музейный корпус у стен монастыря', latitude: 55.9195, longitude: 36.8485 },
          { name: 'Скит Патриарха Никона', desc: 'уединенная постройка на острове пруда', latitude: 55.9225, longitude: 36.8445 },
          { name: 'Набережная Истры', desc: 'прогулка вокруг монастырских стен', latitude: 55.921, longitude: 36.844 },
        ],
      },
      {
        name: 'Абрамцево',
        desc: 'Усадьба Аксаковых и Мамонтовых - художники Серебряного века.',
        mustSeeFilter: 'main',
        travelVector: 'Северный и Ярославский вектор',
        travelVectorBlurb: 'Ярославское направление: до Хотьково / Абрамцево, далее пешком или на такси к музею-заповеднику.',
        stationHub: 'Ярославский вокзал',
        stationName: 'Станция Абрамцево / Хотьково',
        places: [
          { name: 'Усадебный дом', desc: 'главный дом музея-заповедника с мемориальными комнатами', locationSlug: 'moscow-abramtsevo', latitude: 56.2335, longitude: 37.9675 },
          { name: 'Церковь Спаса Нерукотворного', desc: 'храм кружка Мамонтовых в усадебном парке', latitude: 56.2345, longitude: 37.9685 },
          { name: 'Беседка «Избушка на курьих ножках»', desc: 'сказочный павильон Васнецова в парке', latitude: 56.234, longitude: 37.967 },
          { name: 'Парк Абрамцева', desc: 'аллеи и речка Воря вокруг усадьбы', latitude: 56.233, longitude: 37.9665 },
          { name: 'Мастерская керамики', desc: 'след мамонтовской художественной колонии', latitude: 56.2338, longitude: 37.968 },
        ],
      },
      {
        name: 'Бородино',
        desc: 'Поле Бородинского сражения и музей-заповедник.',
        mustSeeFilter: 'main',
        travelVector: 'Западный и Белорусский вектор',
        travelVectorBlurb: 'Электрички на Можайск с Белорусского вокзала, далее трансфер к музею на поле.',
        stationHub: 'Белорусский вокзал',
        stationName: 'Станция Бородино / Можайск',
        places: [
          { name: 'Бородинское поле', desc: 'мемориальный ландшафт 1812 года', locationSlug: 'moscow-borodinskoe-pole', latitude: 55.5255, longitude: 35.8215 },
          { name: 'Главный монумент', desc: 'памятник на батарее Раевского', latitude: 55.5265, longitude: 35.8225 },
          { name: 'Спасо-Бородинский монастырь', desc: 'женский монастырь на поле сражения', latitude: 55.5185, longitude: 35.8155 },
          { name: 'Музей Бородина', desc: 'экспозиция войны 1812 года', latitude: 55.5275, longitude: 35.8205 },
          { name: 'Шевардинский редут', desc: 'западный край поля - отдельная смотровая точка', latitude: 55.5215, longitude: 35.8015 },
        ],
      },
      {
        name: 'Мелихово',
        desc: 'Музей-заповедник А. П. Чехова в Подмосковье.',
        mustSeeFilter: 'main',
        travelVector: 'Южный и Курский вектор',
        travelVectorBlurb: 'Курское направление до Чехова, далее автобус/такси в Мелихово - литературный день без спешки.',
        stationHub: 'Курский вокзал',
        stationName: 'Станция Чехов',
        places: [
          { name: 'Дом Чехова', desc: 'главный усадебный дом писателя', locationSlug: 'moscow-melihovo', latitude: 55.1185, longitude: 37.6485 },
          { name: 'Флигель «Чеховская аптека»', desc: 'мемориальная аптека и кабинет', latitude: 55.1188, longitude: 37.6488 },
          { name: 'Сад Мелихова', desc: 'аллеи и пруд усадьбы', latitude: 55.1182, longitude: 37.6475 },
          { name: 'Школа Чехова', desc: 'школа, построенная на средства писателя', latitude: 55.1195, longitude: 37.6495 },
          { name: 'Сцена под открытым небом', desc: 'летние постановки в заповеднике', latitude: 55.1175, longitude: 37.648 },
        ],
      },
    ],
    dayRoutePresets: [
      {
        id: 'msk-1',
        title: 'Парадный центр / Красная площадь',
        description: 'Кремль, Красная площадь, Зарядье и театральный квартал без лишних переездов.',
        blogSlug: 'moscow-2-dnya-samostoyatelno-marshrut',
        stops: [
          mskPresetStop('Красная площадь и Кремль', { locationSlug: 'moscow-krasnaya-ploschad-i-kreml', latitude: 55.7539, longitude: 37.6208 }),
          mskPresetStop('Собор Василия Блаженного', { locationSlug: 'moscow-sobor-vasiliya-blazhennogo', latitude: 55.7525, longitude: 37.6231 }),
          mskPresetStop('ГУМ', { locationSlug: 'moscow-gum', latitude: 55.7546, longitude: 37.6215 }),
          mskPresetStop('Никольская улица', { locationSlug: 'moscow-nikolskaya-ulitsa', latitude: 55.7575, longitude: 37.6235 }),
          mskPresetStop('Большой театр', { venueSlug: 'moscow-bol-shoy-teatr', latitude: 55.7596, longitude: 37.6184 }),
          mskPresetStop('Парк Зарядье', { locationSlug: 'moscow-park-zaryad-e', latitude: 55.7512, longitude: 37.629 }),
          mskPresetStop('Парящий мост в Зарядье', { locationSlug: 'moscow-paryaschiy-most-zaryadya', latitude: 55.7498, longitude: 37.6285 }),
          mskPresetStop('Казанский собор на Красной площади', { locationSlug: 'moscow-kazanskiy-sobor-krasnaya', latitude: 55.7553, longitude: 37.619 }),
        ],
      },
      {
        id: 'msk-2',
        title: 'Замоскворечье и Третьяковка',
        description: 'Южный берег: Третьяковка, Пятницкая, Патриарший мост и ХХС.',
        blogSlug: 'moscow-zamoskvoreche-tretyakovka',
        stops: [
          mskPresetStop('Третьяковская галерея', { venueSlug: 'moscow-tret-yakovskaya-galereya', latitude: 55.7415, longitude: 37.6208 }),
          mskPresetStop('Пятницкая улица', { locationSlug: 'moscow-pyatnitskaya-ulitsa', latitude: 55.7425, longitude: 37.6285 }),
          mskPresetStop('Марфо-Мариинская обитель', { locationSlug: 'moscow-marfo-mariinskaya-obitel', latitude: 55.7385, longitude: 37.6235 }),
          mskPresetStop('Патриарший мост', { locationSlug: 'moscow-patriarshiy-most', latitude: 55.7435, longitude: 37.6085 }),
          mskPresetStop('Храм Христа Спасителя', { locationSlug: 'moscow-hram-hrista-spasitelya', latitude: 55.7446, longitude: 37.6055 }),
          mskPresetStop('ГМИИ имени Пушкина', { venueSlug: 'moscow-gmii-imeni-pushkina', latitude: 55.7473, longitude: 37.6051 }),
          mskPresetStop('Музеон', { locationSlug: 'moscow-muzeon', latitude: 55.7348, longitude: 37.6065 }),
          mskPresetStop('Новая Третьяковка', { venueSlug: 'moscow-novaya-tretyakovka', latitude: 55.7345, longitude: 37.6059 }),
        ],
      },
      {
        id: 'msk-3',
        title: 'ВДНХ и космос',
        description: 'Северный день: арка ВДНХ, павильоны, музей космонавтики и Останкино.',
        blogSlug: 'moscow-vdnh-kosmos-den',
        stops: [
          mskPresetStop('ВДНХ', { locationSlug: 'moscow-vdnh', latitude: 55.826, longitude: 37.637 }),
          mskPresetStop('Музей космонавтики', { venueSlug: 'moscow-muzey-kosmonavtiki', latitude: 55.8227, longitude: 37.6397 }),
          mskPresetStop('Москвариум на ВДНХ', { venueSlug: 'moscow-moskvarium', latitude: 55.8325, longitude: 37.6215 }),
          mskPresetStop('Останкинская телебашня', { locationSlug: 'moscow-ostankinskaya-telebashnya', latitude: 55.8197, longitude: 37.6117 }),
          mskPresetStop('Смотровая Останкинской башни', { locationSlug: 'moscow-smotrovaya-ostankino', latitude: 55.8197, longitude: 37.6117 }),
          mskPresetStop('Аптекарский огород', { locationSlug: 'moscow-aptekarskiy-ogorod', latitude: 55.7785, longitude: 37.6355 }),
        ],
      },
      {
        id: 'msk-4',
        title: 'Воробьевы горы и Сити',
        description: 'Западный вектор: смотровая, Новодевичий, река и небоскребы.',
        blogSlug: 'moscow-vorobevy-gory-siti',
        stops: [
          mskPresetStop('Воробьевы горы', { locationSlug: 'moscow-vorobevy-gory', latitude: 55.7102, longitude: 37.559 }),
          mskPresetStop('Смотровая на Воробьевых горах', { locationSlug: 'moscow-smotrovaya-vorobevyh-gor', latitude: 55.7102, longitude: 37.559 }),
          mskPresetStop('Новодевичий монастырь', { locationSlug: 'moscow-novodevichiy-monastyr', latitude: 55.7262, longitude: 37.556 }),
          mskPresetStop('Парк Горького', { locationSlug: 'moscow-park-gorkogo', latitude: 55.7312, longitude: 37.6015 }),
          mskPresetStop('Музей современного искусства «Гараж»', { venueSlug: 'moscow-muzey-garazh', latitude: 55.7278, longitude: 37.6014 }),
          mskPresetStop('Москва-Сити', { locationSlug: 'moscow-moskva-siti', latitude: 55.7494, longitude: 37.5377 }),
          mskPresetStop('Смотровая Москва-Сити', { locationSlug: 'moscow-smotrovaya-moskva-siti', latitude: 55.7497, longitude: 37.5372 }),
        ],
      },
      {
        id: 'msk-5',
        title: 'Усадьбы юга: Коломенское и Царицыно',
        description: 'Два дворцово-парковых ансамбля на юге - лучше с ранним стартом.',
        blogSlug: 'moscow-kolomenskoe-tsaritsyno',
        stops: [
          mskPresetStop('Коломенское', { locationSlug: 'moscow-kolomenskoe', latitude: 55.6672, longitude: 37.6708 }),
          mskPresetStop('Храм Вознесения в Коломенском', { locationSlug: 'moscow-hram-vozneseniya-kolomenskoe', latitude: 55.667, longitude: 37.6705 }),
          mskPresetStop('Царицыно', { locationSlug: 'moscow-tsaritsyno', latitude: 55.6156, longitude: 37.682 }),
          mskPresetStop('Даниловский рынок', { locationSlug: 'moscow-danilovskiy-rynok', latitude: 55.7105, longitude: 37.6215 }),
        ],
      },
    ],
    travel:
      'Москва является главным транспортным узлом России, куда ведут четыре международных аэропорта (Шереметьево, Домодедово, Внуково, Жуковский), десять железнодорожных вокзалов и современные скоростные автомагистрали. Столица предлагает колоссальное количество развлечений в любое время года, но идеальными сезонами для классического туризма считаются поздняя весна (май с цветущими парками), лето и начало осени (бабье лето в сентябре). Новогодние праздники - еще один мощный пик сезона, когда центр Москвы превращается в одну из самых красивых праздничных площадок мира.',
    seasonalTip: {
      title: 'День города в Москве',
      description:
        'Главный городской праздник столицы - с водой, музыкой и салютом. В подборке уже собраны теплоходы и программы к Дню города, чтобы не искать их по всей афише.',
      href: '/moscow/den-goroda',
      linkLabel: 'Открыть День города',
    },
    faq: [
      { q: 'Как выгоднее всего перемещаться по Москве туристу?', a: 'Самый быстрый и экономный способ - московское метро, МЦК и МЦД; для оплаты поездок лучше сразу приобрести транспортную карту «Тройка» и записать на нее безлимитный тариф на 1 или 3 суток.' },
      { q: 'Правда ли, что вход на Красную площадь бесплатный?', a: 'Да, вход на главную площадь страны бесплатный для всех, однако её могут временно закрывать во время масштабных государственных мероприятий или репетиций парадов.' },
      { q: 'Где найти лучшие смотровые площадки с панорамой города?', a: 'Виды на столицу открываются со смотровой на Воробьевых горах (бесплатно), с парящего моста в парке «Зарядье» и с высотных площадок в башнях «Москва-Сити».' },
    ],
  }`;

function ensureMskHelper(src) {
  if (src.includes('const mskPresetStop')) return src;
  if (!src.includes('const spbPresetStop')) {
    throw new Error('spbPresetStop helper not found - unexpected cityInfo shape');
  }
  // Insert after spbPresetStop function (before CITY_INFO)
  const marker = 'export const CITY_INFO:';
  const idx = src.indexOf(marker);
  if (idx < 0) throw new Error('CITY_INFO export not found');
  return src.slice(0, idx) + mskPresetStopHelper + '\n' + src.slice(idx);
}

function replaceMoscowBlock(src) {
  const start = src.indexOf('\n  moscow: {');
  if (start < 0) throw new Error('moscow block not found');
  // Find next top-level city key after moscow (2-space indent + key + :)
  const rest = src.slice(start + 1);
  const next = rest.search(/\n  [a-z0-9-]+: \{/);
  if (next < 0) throw new Error('next city after moscow not found');
  // next points at newline before next city; moscow block ends before that
  const before = src.slice(0, start + 1);
  const after = rest.slice(next); // starts with \n  kazan: ...
  return before + MOSCOW_BLOCK + ',' + after;
}

function patchFile(rel) {
  const file = path.join(root, rel);
  let src = fs.readFileSync(file, 'utf8');
  src = ensureMskHelper(src);
  src = replaceMoscowBlock(src);
  if (dry) {
    const must = (src.match(/mustSeeFilter: '/g) || []).length;
    console.log('[dry]', rel, 'msk filters approx', must);
    return;
  }
  fs.writeFileSync(file, src);
  console.log('patched', rel);
}

for (const f of [
  'apps/web/src/lib/cityInfo.ts',
  'apps/public/src/lib/cityInfo.ts',
]) {
  patchFile(f);
}

console.log(dry ? 'dry-run ok' : 'done');
