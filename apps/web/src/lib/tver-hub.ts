/** Tver tourist hub pack (owner 2026-08-18). Hyphen-only copy. */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { TVER_LINE_DAY_ROUTE_PRESETS } from './tver-line-presets.ts';

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

export const TVER_MUST_SEE: any[] = [
  place('Памятник Афанасию Никитину', 'Тверской купец-путешественник на ладьевидном постаменте над Волгой.', 56.866112, 35.906112, { address: 'наб. Афанасия Никитина', locationSlug: 'tver-pamyatnik-afanasiyu-nikitinu', mustSeeFilter: 'monument', visitMinutes: 20, alsoMain: true }),
  place('Памятник Михаилу Кругу', 'Самая известная контактная скульптура города: шансонье с гитарой на скамейке.', 56.858912, 35.911112, { address: 'бульвар Радищева, 21', locationSlug: 'tver-pamyatnik-mihailu-krugu', mustSeeFilter: 'monument', visitMinutes: 15, alsoMain: true }),
  place('Памятник А. С. Пушкину', 'Бронзовый поэт у чугунной решетки набережной в Городском саду.', 56.861912, 35.904912, { address: 'наб. Михаила Ярославича, Городской сад', locationSlug: 'tver-pamyatnik-pushkinu', mustSeeFilter: 'monument', visitMinutes: 15 }),
  place('Памятник Михаилу Ярославичу Тверскому', 'Конный монумент святому князю-защитнику на главной площади.', 56.858112, 35.915891, { address: 'пл. Святого Благоверного Князя Михаила Тверского', locationSlug: 'tver-pamyatnik-mihailu-yaroslavichu', mustSeeFilter: 'monument', visitMinutes: 15 }),
  place('Памятник И. А. Крылову', 'Баснописец детских тверских лет, окруженный бронзовыми рельефами басен.', 56.856912, 35.901112, { address: 'сквер Крылова, ул. Советская', locationSlug: 'tver-pamyatnik-krylovu', mustSeeFilter: 'monument', visitMinutes: 15 }),
  place('Памятник Салтыкову-Щедрину', 'Писатель и бывший тверской вице-губернатор в кресле на Тверской площади.', 56.859112, 35.906912, { address: 'Тверская площадь', locationSlug: 'tver-pamyatnik-saltykovu-shchedrinu', mustSeeFilter: 'monument', visitMinutes: 15 }),
  place('Скульптура «Рыбак»', 'Контактный жанровый памятник: мужчина ловит рыбу с набережной Степана Разина.', 56.861112, 35.912912, { address: 'наб. Степана Разина', locationSlug: 'tver-skulptura-rybak', mustSeeFilter: 'monument', visitMinutes: 10 }),
  place('Обелиск Победы', '45-метровая стела со смотровой и Вечным огнем, главный военный мемориал Твери.', 56.863112, 35.891112, { address: 'площадь Победы', locationSlug: 'tver-obelisk-pobedy', mustSeeFilter: 'monument', visitMinutes: 20 }),
  place('Памятник Карлу Марксу', 'Советский монумент у входа в Городской сад со стороны Театральной площади.', 56.858912, 35.912312, { address: 'ул. Советская / Городской сад', locationSlug: 'tver-pamyatnik-karlu-marksu', mustSeeFilter: 'monument', visitMinutes: 10 }),
  place('Скульптура «Семья»', 'Современный уличный арт-объект родителей и детей на бульваре Радищева.', 56.858412, 35.908912, { address: 'бульвар Радищева, 14', locationSlug: 'tver-skulptura-semya', mustSeeFilter: 'monument', visitMinutes: 10 }),
  place('Памятник морякам-подводникам', 'Стела с рельефом атомной подлодки у речного вокзала.', 56.865891, 35.918912, { address: 'наб. Афанасия Никитина, у речного вокзала', locationSlug: 'tver-pamyatnik-moryakam-podvodnikam', mustSeeFilter: 'monument', visitMinutes: 15 }),
  place('Памятник Кириллу и Мефодию', 'Святые просветители со славянской азбукой перед корпусом университета.', 56.856112, 35.913112, { address: 'ул. Желябова, 33', locationSlug: 'tver-pamyatnik-kirillu-i-mefodiyu', mustSeeFilter: 'monument', visitMinutes: 10 }),
  place('Арт-объект «Тверской козел»', 'Интерактивная мини-скульптура у Музея козла, ироничный символ края.', 56.851912, 35.915112, { address: 'ул. Жигарева, 5', locationSlug: 'tver-art-obyekt-tverskoy-kozel', mustSeeFilter: 'monument', visitMinutes: 10 }),
  place('Памятник Симеону Тверскому', 'Первый тверской епископ и духовный наставник Михаила Тверского у собора.', 56.859912, 35.899112, { address: 'Соборная площадь', locationSlug: 'tver-pamyatnik-simeonu-tverskomu', mustSeeFilter: 'monument', visitMinutes: 10 }),
  place('Памятник В. И. Ленину', 'Парадный советский пилон в центре круглой исторической площади Ленина.', 56.858312, 35.911412, { address: 'площадь Ленина', locationSlug: 'tver-pamyatnik-leninu', mustSeeFilter: 'monument', visitMinutes: 10 }),

  place('Императорский путевой дворец', 'Дворцово-парковый ансамбль XVIII века, главный барочный шедевр набережной.', 56.860112, 35.898912, { address: 'ул. Советская, 3', locationSlug: 'tver-imperatorskiy-putevoy-dvorets', mustSeeFilter: 'houses', visitMinutes: 60, alsoMain: true }),
  place('Казармы Морозовского городка', 'Самый красивый корпус фабричного квартала в кирпичном модерне со шпилями.', 56.848912, 35.881112, { address: 'ул. Двор Пролетарки, 70', locationSlug: 'tver-morozovskiy-gorodok-dvor-proletarki', mustSeeFilter: 'houses', visitMinutes: 60, alsoMain: true }),
  place('Здание бывшего Реального училища', 'Монументальный классический ансамбль XIX века, ныне областной краеведческий музей.', 56.859112, 35.901112, { address: 'ул. Советская, 5', locationSlug: 'tver-zdanie-realnogo-uchilishcha', mustSeeFilter: 'houses', visitMinutes: 20 }),
  place('Тверской драматический театр', 'Сталинский ампир с колоннадой, доминанта Театральной площади.', 56.858912, 35.913112, { address: 'ул. Советская, 16', venueSlug: 'tver-dramaticheskiy-teatr', mustSeeFilter: 'creative', visitMinutes: 30 }),
  place('Дом Ворошиловских стрелков', 'Парадный неоклассицизм, выходящий фасадом на набережную.', 56.861112, 35.908912, { address: 'наб. Степана Разина, 2', locationSlug: 'tver-dom-voroshilovskih-strelkov', mustSeeFilter: 'houses', visitMinutes: 15 }),
  place('Кинотеатр «Звезда»', 'Постконструктивизм 1930-х в форме гигантского бинокля, смотрящего на Волгу.', 56.861912, 35.911112, { address: 'наб. Степана Разина, 1', locationSlug: 'tver-kinoteatr-zvezda', mustSeeFilter: 'houses', visitMinutes: 15 }),
  place('Здание Дворянского собрания', 'Классицизм купеческих балов Тверской губернии.', 56.858112, 35.918912, { address: 'ул. Советская, 28', locationSlug: 'tver-zdanie-dvoryanskogo-sobraniya', mustSeeFilter: 'houses', visitMinutes: 15 }),
  place('Дом купца Арефьева', 'Единственный уцелевший в Заволжье каменный купеческий особняк XVIII века.', 56.868112, 35.905891, { address: 'ул. Горького, 38', locationSlug: 'tver-dom-kuptsa-arefeva', mustSeeFilter: 'mansions', visitMinutes: 20 }),
  place('Тверской Гостиный двор', 'Симметричные каменные торговые ряды конца XVIII века в центре.', 56.858912, 35.908912, { address: 'Свободный переулок, 5', locationSlug: 'tver-gostinyy-dvor', mustSeeFilter: 'houses', visitMinutes: 20 }),
  place('Жилой дом Шпренгера', 'Дореволюционный особняк в духе немецкого модерна на улице Заволжья.', 56.871112, 35.898912, { address: 'ул. Горького, 108', locationSlug: 'tver-zhiloy-dom-shprengera', mustSeeFilter: 'mansions', visitMinutes: 15 }),
  place('Здание Аваевского приюта', 'Краснокирпичный готический замок с башенками в центре города.', 56.856112, 35.918912, { address: 'ул. Крылова, 20', locationSlug: 'tver-zdanie-avaevskogo-priyuta', mustSeeFilter: 'houses', visitMinutes: 15 }),
  place('Староволжский мост', 'Ажурный консольный мост 1900 года, главный визуальный маркер Твери.', 56.863891, 35.901112, { address: 'Староволжский мост', locationSlug: 'tver-starovolzhskiy-most', mustSeeFilter: 'views', visitMinutes: 20, alsoMain: true }),

  place('Тверская областная картинная галерея', 'Собрание русского искусства в залах Путевого дворца: Левитан, Коровин и тверской слой.', 56.860312, 35.898712, { address: 'ул. Советская, 3', venueSlug: 'tver-oblastnaya-kartinnaya-galereya', mustSeeFilter: 'museum', visitMinutes: '1-2 ч', alsoMain: true }),
  place('Музей тверского быта', 'Этнография в усадьбе Арефьевых: чаепитие, ремесла и купеческий быт Заволжья.', 56.867912, 35.904112, { address: 'ул. Горького, 19/4', venueSlug: 'tver-muzey-tverskogo-byta', mustSeeFilter: 'museum', visitMinutes: 45 }),
  place('Музей козла', 'Ироничный частный музей тысяч экспонатов про главный тотем города.', 56.851912, 35.915112, { address: 'ул. Жигарева, 5', venueSlug: 'tver-muzey-kozla', mustSeeFilter: 'museum', visitMinutes: 45 }),
  place('Тверской краеведческий музей', 'Артефакты края от доистории до Тверского княжества в здании Реального училища.', 56.859412, 35.901212, { address: 'ул. Советская, 5', venueSlug: 'tver-kraevedcheskiy-muzey', mustSeeFilter: 'museum', visitMinutes: '1-2 ч' }),
  place('Музей связи Тверской области', 'Камерная история ямской гоньбы и телеграфа в здании Ростелекома.', 56.857912, 35.908912, { address: 'ул. Новоторжская, 24', venueSlug: 'tver-muzey-svyazi', mustSeeFilter: 'museum', visitMinutes: 40 }),
  place('Музей М. Е. Салтыкова-Щедрина', 'Мемориальный дом, где писатель жил вице-губернатором.', 56.858912, 35.922312, { address: 'ул. Рыбацкая, 11', venueSlug: 'tver-muzey-saltykova-shchedrina', mustSeeFilter: 'literature', visitMinutes: 40 }),
  place('Музейно-выставочный центр им. Лизы Чайкиной', 'Народное творчество, промыслы и ковка у Тверской площади.', 56.859112, 35.905112, { address: 'ул. Салтыкова-Щедрина, 16', venueSlug: 'tver-vystavochnyy-tsentr-lizy-chaykinoy', mustSeeFilter: 'museum', visitMinutes: 40 }),
  place('Музей Плюшкина', 'Частный музей советского быта, игрушек и интерьера эпохи СССР.', 56.856912, 35.921112, { address: 'ул. Пушкинская, 6', venueSlug: 'tver-muzey-plyushkina', mustSeeFilter: 'museum', visitMinutes: 40 }),
  place('Детский музейный центр', 'Интерактивная купеческая площадка и мастер-классы по глиняной игрушке.', 56.860112, 35.899812, { address: 'ул. Советская, 3А', venueSlug: 'tver-detskiy-muzeynyy-tsentr', mustSeeFilter: 'science', visitMinutes: 45 }),

  place('Спасо-Преображенский кафедральный собор', 'Воссозданный белокаменный собор, сердце Соборной площади.', 56.860139, 35.897778, { address: 'Соборная площадь, 1', locationSlug: 'tver-spaso-preobrazhenskiy-sobor', mustSeeFilter: 'temple', visitMinutes: 30, alsoMain: true }),
  place('Храм Белая Троица', 'Старейшее каменное здание города 1564 года, уцелевшее в пожарах и войнах Затьмачья.', 56.854912, 35.888912, { address: 'ул. Троицкая, 38', locationSlug: 'tver-hram-belaya-troitsa', mustSeeFilter: 'temple', visitMinutes: 25 }),
  place('Свято-Екатерининский женский монастырь', 'Обитель на стрелке Волги и Тверцы с нарядным барочным собором.', 56.868112, 35.921112, { address: 'наб. Афанасия Никитина, 1', locationSlug: 'tver-svyato-ekaterininskiy-monastyr', mustSeeFilter: 'temple', visitMinutes: 35 }),
  place('Вознесенский собор', 'Классический храм на пересечении трех главных лучей города.', 56.858112, 35.916912, { address: 'ул. Советская, 26', locationSlug: 'tver-voznesenskiy-sobor', mustSeeFilter: 'temple', visitMinutes: 25 }),
  place('Тверская соборная мечеть', 'Кирпичная двухэтажная мечеть начала XX века в татарском стиле.', 56.855891, 35.932312, { address: 'ул. Советская, 66', locationSlug: 'tver-sobornaya-mechet', mustSeeFilter: 'temple', visitMinutes: 20 }),
  place('Католический храм Преображения Господня', 'Строгая неоготика, духовный центр тверских католиков.', 56.856112, 35.931112, { address: 'ул. Советская, 62', locationSlug: 'tver-katolicheskiy-hram-preobrazheniya', mustSeeFilter: 'temple', visitMinutes: 20 }),
  place('Церковь Трех Святителей', 'Барочный храм XVIII века в Заволжье.', 56.891112, 35.875891, { address: 'ул. Паши Савельевой, 4', locationSlug: 'tver-tserkov-treh-svyatiteley', mustSeeFilter: 'temple', visitMinutes: 20 }),
  place('Храм Покрова Пресвятой Богородицы', 'Уединенный храм на острове в пойме Тьмаки.', 56.855112, 35.895891, { address: 'ул. Набережная Тьмаки, 1С', locationSlug: 'tver-hram-pokrova', mustSeeFilter: 'temple', visitMinutes: 20 }),
  place('Армянская церковь Сурб Арутюн', 'Современный храм из розового туфа в Заволжье.', 56.878912, 35.914112, { address: 'ул. Коноплянниковой, 112', locationSlug: 'tver-armyanskaya-tserkov-surb-arutyun', mustSeeFilter: 'temple', visitMinutes: 20 }),

  place('Тверской Городской сад', 'Парадный парк на набережной с дубами, аттракционами и видами на Волгу.', 56.859812, 35.908912, { address: 'ул. Советская / наб. Михаила Ярославича', locationSlug: 'tver-gorodskoy-sad', mustSeeFilter: 'park', visitMinutes: 45, alsoMain: true }),
  place('Пешеходная Трехсвятская улица', 'Главный променад города, тверской Арбат с лавками и уличными музыкантами.', 56.856912, 35.911112, { address: 'ул. Трехсвятская', locationSlug: 'tver-peshehodnaya-trehsvyatskaya-ulitsa', mustSeeFilter: 'street', visitMinutes: 45, alsoMain: true }),
  place('Набережная Степана Разина', 'Двухъярусный променад с купеческой застройкой единой фасадой XVIII века.', 56.861112, 35.918912, { address: 'наб. Степана Разина', locationSlug: 'tver-naberezhnaya-stepana-razina', mustSeeFilter: 'park', visitMinutes: 40, alsoMain: true }),
  place('Ландшафтный парк «Тьмака»', 'Благоустроенная пойма с деревянными экотропами и велодорожками.', 56.851212, 35.894912, { address: 'ул. Набережная Тьмаки', locationSlug: 'tver-landshaftnyy-park-tmaka', mustSeeFilter: 'park', visitMinutes: 50 }),
  place('Ботанический сад ТвГУ', 'Северный ботанический сад с коллекцией орхидей и тропическими прудами.', 56.871112, 35.911112, { address: 'пер. Шевченко, 16', locationSlug: 'tver-botanicheskiy-sad-tvgu', mustSeeFilter: 'park', visitMinutes: 45 }),
  place('Сквер Казакова', 'Небольшой сад с фонтанами у площади Ленина.', 56.858412, 35.910912, { address: 'площадь Ленина', locationSlug: 'tver-skver-kazakova', mustSeeFilter: 'park', visitMinutes: 20 }),
  place('Набережная Афанасия Никитина', 'Широкий заволжский променад с пляжем и лучшим видом на Путевой дворец.', 56.865112, 35.901112, { address: 'наб. Афанасия Никитина', locationSlug: 'tver-naberezhnaya-afanasiya-nikitina', mustSeeFilter: 'park', visitMinutes: 40, alsoMain: true }),
  place('Смотровая у бизнес-центра «Тверь»', 'Панорама города с высоты 22-го этажа здания «Рюмки».', 56.851912, 35.924912, { address: 'Смоленский переулок, 29', locationSlug: 'tver-smotrovaya-biznes-tsentr-tver', mustSeeFilter: 'views', visitMinutes: 25 }),
  place('Бульвар Радищева', 'Тенистая аллея через Трехсвятскую с книжными развалами и памятником Кругу.', 56.858412, 35.908912, { address: 'бульвар Радищева', locationSlug: 'tver-bulvar-radishcheva', mustSeeFilter: 'street', visitMinutes: 30 }),

  place('Тверской театр юного зрителя', 'Смелые постановки и лауреат «Золотой маски» на Советской.', 56.857912, 35.921112, { address: 'ул. Советская, 32', venueSlug: 'tver-teatr-yunogo-zritelya', mustSeeFilter: 'science', visitMinutes: 90 }),
  place('Гастро-бар «Ламбада»', 'Молодежный спот со спешелти-кофе на Трехсвятской.', 56.858912, 35.911112, { address: 'ул. Трехсвятская, 10', locationSlug: 'tver-gastrobar-lambada', mustSeeFilter: 'gastro', visitMinutes: 50 }),
  place('Ресторан «Люблин»', 'Купеческий гастро-спот с эталонными пожарскими котлетами и тверскими слойками.', 56.856112, 35.904912, { address: 'пер. Свободный, 30', locationSlug: 'tver-restoran-lyublin', mustSeeFilter: 'gastro', visitMinutes: 75 }),
  place('Креативный кластер «Рельсы»', 'Мультицентр в кирпичном здании: лекторий, кофейня и книжный маркет.', 56.856412, 35.911891, { address: 'ул. Трехсвятская, 18А', locationSlug: 'tver-kreativnyy-klaster-relsy', mustSeeFilter: 'creative', visitMinutes: 40 }),
  place('Ресторан «Старая Тверь»', 'Панорамный стол у Волги в Городском саду с блюдами из местной дичи.', 56.860912, 35.905112, { address: 'наб. Михаила Ярославича, 1', locationSlug: 'tver-restoran-staraya-tver', mustSeeFilter: 'gastro', visitMinutes: 75 }),
  place('Тверской государственный театр кукол', 'Один из сильных кукольных театров Поволжья в модернистском здании на Победе.', 56.843912, 35.918912, { address: 'проспект Победы, 9', venueSlug: 'tver-teatr-kukol', mustSeeFilter: 'science', visitMinutes: 90 }),
  place('Кофейня «Тапиока»', 'Фильтр-кофе во дворах бульвара Радищева.', 56.858112, 35.911812, { address: 'бульвар Радищева, 23', locationSlug: 'tver-kofeynya-tapioka', mustSeeFilter: 'gastro', visitMinutes: 40 }),
  place('Бар «Калинин»', 'Локальный паб с крафтом и тверскими настойками на Трехсвятской.', 56.854912, 35.911112, { address: 'ул. Трехсвятская, 25', locationSlug: 'tver-bar-kalinin', mustSeeFilter: 'gastro', visitMinutes: 60 }),
  place('Винный бар «Манилов»', 'Скрытый бар в кирпичных купеческих подвалах Новоторжской.', 56.858902, 35.902812, { address: 'ул. Новоторжская, 5', locationSlug: 'tver-vinnyy-bar-manilov', mustSeeFilter: 'gastro', visitMinutes: 50 }),
  place('Тверская областная филармония', 'Исторический концертный зал с немецким органом на Театральной.', 56.858112, 35.914112, { address: 'Театральная площадь, 1', venueSlug: 'tver-oblastnaya-filarmoniya', mustSeeFilter: 'creative', visitMinutes: 90 }),
  place('Гастропространство «Фабрика»', 'Фудхолл в бывших корпусах Морозовской мануфактуры.', 56.849112, 35.882312, { address: 'ул. Двор Пролетарки, 4', locationSlug: 'tver-gastroprostranstvo-fabrika', mustSeeFilter: 'gastro', visitMinutes: 60 }),
];

export const TVER_SUBURBS: any[] = [
  {
    name: 'Торжок',
    desc: 'Древнейший город Тверской земли: Борисоглебский монастырь, золотое шитье, пожарские котлеты и купеческий масштаб на холмах Тверцы.',
    locationSlug: 'tver-torzhok',
    mustSeeFilter: 'main',
    visitMinutes: '6-8 ч',
    latitude: 57.039112,
    longitude: 34.958912,
    address: 'Тверская обл., г. Торжок, ул. Старицкая, 1',
    travelVector: '«Ласточка» / авто ~1 ч',
    travelVectorBlurb: 'Закладывайте на скоростной поезд «Ласточка» или автомобиль около часа, чтобы приехать к 09:30 утра.',
    timingNote: 'По крутым набережным Тверцы к стенам Борисоглебского монастыря, золотое шитье и котлеты оставьте на финал.',
    logisticsExit: 'вокзал Торжка / парковка у монастыря',
    gastroStop: { name: 'Пожарская котлета', blurb: 'Именно здесь Пушкин заказывал котлеты у Дарьи Пожарской. Берите их в историческом центре, а не в придорожном кафе у трассы.' },
    places: [
      place('Новоторжский Борисоглебский монастырь', 'Один из старейших монастырей России XI века с собором работы Николая Львова.', 57.039112, 34.958912, { address: 'ул. Старицкая, 1', locationSlug: 'tver-torzhok-borisoglebskiy-monastyr', mustSeeFilter: 'temple', visitMinutes: 50 }),
      place('Свечная башня монастыря', 'Высокая башня со шпилем и лучшим видом на весь Торжок.', 57.039412, 34.958512, { address: 'территория монастыря', locationSlug: 'tver-torzhok-svechnaya-bashnya', mustSeeFilter: 'views', visitMinutes: 20 }),
      place('Этнографический музей им. Пожарского', 'Купеческие палаты про гастро-бренд края и историю пожарской котлеты.', 57.040112, 34.960112, { address: 'центр Торжка', locationSlug: 'tver-torzhok-muzey-pozharskogo', mustSeeFilter: 'museum', visitMinutes: 40 }),
      place('Музей «Торжокские золотошвеи»', 'Подлинное золотное шитье канителью, которым расшивали парадные платья двора.', 57.041112, 34.961112, { address: 'центр Торжка', locationSlug: 'tver-torzhok-zolotoshvei', mustSeeFilter: 'museum', visitMinutes: 40 }),
      place('Деревянная Старо-Вознесенская церковь', 'Шедевр поволжского зодчества XVII века без единого гвоздя на обрыве.', 57.042112, 34.957112, { address: 'правый берег Тверцы', locationSlug: 'tver-torzhok-staro-voznesenskaya-tserkov', mustSeeFilter: 'temple', visitMinutes: 25 }),
      place('Пешеходный мост через Тверцу', 'Арочный виадук между купеческим правым берегом и монастырским левым.', 57.040512, 34.959512, { address: 'река Тверца', locationSlug: 'tver-torzhok-peshehodnyy-most', mustSeeFilter: 'views', visitMinutes: 15 }),
      place('Усадьба Знаменское-Раёк', 'Дворцовый палаццо Львова с круговой колоннадой в 15 км от Торжка.', 57.083112, 34.863112, { address: 'Тверская обл., усадьба Знаменское-Раёк', locationSlug: 'tver-torzhok-znamenskoe-rayok', mustSeeFilter: 'mansions', visitMinutes: 50 }),
    ],
  },
  {
    name: 'Домотканово',
    desc: 'Мемориальная усадьба Дервизов, где Серов писал «Девушку, освещенную солнцем» и «Заросший пруд»: пруды, березы и тихий пленэрный день.',
    locationSlug: 'tver-domotkanovo',
    mustSeeFilter: 'main',
    visitMinutes: '4-5 ч',
    latitude: 56.731112,
    longitude: 35.942312,
    address: 'Тверская обл., Калининский район, д. Красная Новь, усадьба Домотканово',
    travelVector: 'Авто / автобус №109 ~25 мин',
    travelVectorBlurb: 'Закладывайте на автомобиль или пригородный автобус №109 около 25 минут, чтобы приехать к 10:00 утра.',
    timingNote: 'По каскадным прудам липового парка к господскому деревянному дому, селфи у березовой рощи оставьте на финал.',
    logisticsExit: 'парковка усадьбы / остановка Красная Новь',
    gastroStop: { name: 'Чайная «В Домотканово»', blurb: 'Самовар на углях и тверские слойки после парка. Полноценный обед чаще удобнее уже в Твери.' },
    places: [
      place('Господский дом усадьбы', 'Деревянный особняк с вещами Серова, мольбертом и ранними эскизами.', 56.731112, 35.942312, { address: 'усадьба Домотканово', locationSlug: 'tver-domotkanovo-gospodskiy-dom', mustSeeFilter: 'museum', visitMinutes: 45 }),
      place('Каскад усадебных прудов', 'Восемь прудов с кувшинками, которые Серов писал как живую декорацию.', 56.731412, 35.941912, { address: 'парк усадьбы', locationSlug: 'tver-domotkanovo-prudy', mustSeeFilter: 'park', visitMinutes: 30 }),
      place('Березовая аллея Серова', 'Роща, послужившая фоном для «Девушки, освещенной солнцем».', 56.731712, 35.941512, { address: 'парк усадьбы', locationSlug: 'tver-domotkanovo-berezovaya-alleya', mustSeeFilter: 'park', visitMinutes: 20 }),
      place('Здание земской школы', 'Кирпичный павильон конца XIX века с выставкой крестьянских промыслов.', 56.730812, 35.942712, { address: 'усадьба Домотканово', locationSlug: 'tver-domotkanovo-zemskaya-shkola', mustSeeFilter: 'museum', visitMinutes: 25 }),
      place('Исторический конный двор', 'Конюшни усадьбы и сезонные катания в фаэтонах.', 56.730512, 35.943112, { address: 'усадьба Домотканово', locationSlug: 'tver-domotkanovo-konnyy-dvor', mustSeeFilter: 'houses', visitMinutes: 20 }),
      place('Вековые липы дворянского сада', 'Исполинские деревья Серебряного века вокруг господского дома.', 56.731312, 35.942012, { address: 'парк усадьбы', locationSlug: 'tver-domotkanovo-lipy', mustSeeFilter: 'park', visitMinutes: 15 }),
      place('Чайная «В Домотканово»', 'Бревенчатый трактир с чаем из самовара и тверскими слойками.', 56.730912, 35.942512, { address: 'усадьба Домотканово', locationSlug: 'tver-domotkanovo-chaynaya', mustSeeFilter: 'gastro', visitMinutes: 40 }),
    ],
  },
  {
    name: 'Старица',
    desc: 'Белокаменное ущелье Волги: Успенский монастырь, пещеры-каменоломни и кручи «старицкого мрамора», которые Иван Грозный звал своим городком.',
    locationSlug: 'tver-staritsa',
    mustSeeFilter: 'main',
    visitMinutes: '7-8 ч',
    latitude: 56.511112,
    longitude: 34.932312,
    address: 'Тверская обл., г. Старица, ул. Пушкина, 1',
    travelVector: 'Авто / экспресс-автобус ~1 ч 15 мин',
    travelVectorBlurb: 'Закладывайте на автомобиль или экспресс-автобус около 1 часа 15 минут, чтобы приехать к 09:30 утра.',
    timingNote: 'По известняковым кручам правого берега к монастырским стенам, пещеры оставьте на вторую половину дня.',
    logisticsExit: 'центр Старицы / парковка у Успенского монастыря',
    gastroStop: { name: 'Простой обед в центре', blurb: 'Это маршрут про камень и воду. Ищите кафе у монастыря или берите перекус с собой к смотровому обрыву.' },
    places: [
      place('Свято-Успенский мужской монастырь', 'Белокаменная крепость-обитель XVI века у самой воды.', 56.511112, 34.932312, { address: 'ул. Пушкина, 1', locationSlug: 'tver-staritsa-uspenskiy-monastyr', mustSeeFilter: 'temple', visitMinutes: 50 }),
      place('Старицкие известняковые пещеры', 'Каменоломни Ледяная и Лисичка, где зимой растут ледяные сталактиты.', 56.508112, 34.928112, { address: 'окрестности Старицы', locationSlug: 'tver-staritsa-peschery', mustSeeFilter: 'science', visitMinutes: 50 }),
      place('Пятницкая церковь', 'Круглый ротондальный храм позднего барокко у подножия городища.', 56.510512, 34.933112, { address: 'подножие городища', locationSlug: 'tver-staritsa-pyatnitskaya-tserkov', mustSeeFilter: 'temple', visitMinutes: 20 }),
      place('Старицкое городище', 'Земляные валы древней крепости с панорамой каньона Волги.', 56.512112, 34.931112, { address: 'Новый торг', locationSlug: 'tver-staritsa-gorodishche', mustSeeFilter: 'views', visitMinutes: 30 }),
      place('Белокаменные купеческие кузницы', 'Каменные павильоны XVIII века, встроенные прямо в земляной вал.', 56.511712, 34.931512, { address: 'вал городища', locationSlug: 'tver-staritsa-kuznitsy', mustSeeFilter: 'houses', visitMinutes: 20 }),
      place('Борисоглебский собор', 'Пятиглавый собор классицизма с отдельно стоящей колокольней Львова.', 56.510112, 34.934112, { address: 'центр Старицы', locationSlug: 'tver-staritsa-borisoglebskiy-sobor', mustSeeFilter: 'temple', visitMinutes: 25 }),
      place('Смотровой обрыв над Волгой', 'Отвесный скалистый берег для панорамных съемок каньона.', 56.512512, 34.930512, { address: 'правый берег Волги', locationSlug: 'tver-staritsa-smotrovoy-obryv', mustSeeFilter: 'views', visitMinutes: 25 }),
    ],
  },
];

export const TVER_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'tver-imperial-arches',
    title: 'Императорский блеск и ажурные арки Волги',
    description: 'Классический первый день: Путевой дворец, Городской сад, «Звезда», Никитин и Староволжский мост.',
    travelVector: 'Пешком по центру и через мост',
    timingNote: 'Около 4-5 часов с одной длинной дворцовой паузой и обедом в «Люблине».',
    stops: [
      place('Спасо-Преображенский собор и Путевой дворец', 'Час на залы дворца и белокаменный собор рядом.', 56.860112, 35.898912, { address: 'ул. Советская, 3', locationSlug: 'tver-imperatorskiy-putevoy-dvorets', mustSeeFilter: 'houses', visitMinutes: 60, alsoMain: true }),
      place('Городской сад и памятник Пушкину', 'Террасы у Волги и короткая парковая пауза.', 56.859812, 35.908912, { address: 'Городской сад', locationSlug: 'tver-gorodskoy-sad', mustSeeFilter: 'park', visitMinutes: 30, alsoMain: true }),
      place('Кинотеатр «Звезда»', 'Фото здания-бинокля и памятника Марксу у входа в сад.', 56.861912, 35.911112, { address: 'наб. Степана Разина, 1', locationSlug: 'tver-kinoteatr-zvezda', mustSeeFilter: 'houses', visitMinutes: 15 }),
      place('Набережная Афанасия Никитина', 'Заволжский берег и памятник путешественнику.', 56.865112, 35.901112, { address: 'наб. Афанасия Никитина', locationSlug: 'tver-naberezhnaya-afanasiya-nikitina', mustSeeFilter: 'park', visitMinutes: 40, alsoMain: true }),
      place('Староволжский мост', 'Созерцание ажурных арок на обратном пути.', 56.863891, 35.901112, { address: 'Староволжский мост', locationSlug: 'tver-starovolzhskiy-most', mustSeeFilter: 'views', visitMinutes: 20, alsoMain: true }),
      place('Ресторан «Люблин»', 'Пожарские котлеты и тверские слойки на Свободном переулке.', 56.856112, 35.904912, { address: 'пер. Свободный, 30', locationSlug: 'tver-restoran-lyublin', mustSeeFilter: 'gastro', visitMinutes: 60 }),
    ],
  },
  {
    id: 'tver-arbat-morozov',
    title: 'Тверской Арбат, креатив и Морозовский индастриал',
    description: 'Трехсвятская, Круг, «Рельсы», Музей козла и кирпичные корпуса Двора Пролетарки.',
    travelVector: 'Пешком по центру и доезд до Пролетарки',
    timingNote: 'Около 5 часов. До Морозовского городка удобен автобус №21 или такси, не растягивайте пешком.',
    stops: [
      place('Трехсвятская и памятник Кругу', 'Променад и фото на скамейке шансонье.', 56.856912, 35.911112, { address: 'ул. Трехсвятская', locationSlug: 'tver-peshehodnaya-trehsvyatskaya-ulitsa', mustSeeFilter: 'street', visitMinutes: 40, alsoMain: true }),
      place('Креативный кластер «Рельсы»', 'Фильтр-кофе и короткая пауза во дворе.', 56.856412, 35.911891, { address: 'ул. Трехсвятская, 18А', locationSlug: 'tver-kreativnyy-klaster-relsy', mustSeeFilter: 'creative', visitMinutes: 40 }),
      place('Музей козла', 'Ироничная интерактивная экскурсия на Жигарева.', 56.851912, 35.915112, { address: 'ул. Жигарева, 5', venueSlug: 'tver-muzey-kozla', mustSeeFilter: 'museum', visitMinutes: 45 }),
      place('Морозовский городок', 'Кирпичный модерн казармы «Париж» на Дворе Пролетарки.', 56.848912, 35.881112, { address: 'ул. Двор Пролетарки, 70', locationSlug: 'tver-morozovskiy-gorodok-dvor-proletarki', mustSeeFilter: 'houses', visitMinutes: 90, alsoMain: true }),
      place('Гастропространство «Фабрика»', 'Ужин в индустриальных интерьерах мануфактуры.', 56.849112, 35.882312, { address: 'ул. Двор Пролетарки, 4', locationSlug: 'tver-gastroprostranstvo-fabrika', mustSeeFilter: 'gastro', visitMinutes: 60 }),
    ],
  },
  ...TVER_LINE_DAY_ROUTE_PRESETS,
];

export const TVER_FAQ: Array<{ q: string; a: string }> = [
  { q: 'Как быстрее и дешевле добраться до Твери из Москвы и Санкт-Петербурга?', a: 'Из Москвы удобнее всего «Ласточка» с Ленинградского вокзала: около 1 часа 40 минут. Из Санкт-Петербурга берите «Сапсан»: около 2 часов 40 минут с короткой остановкой на тверском вокзале.' },
  { q: 'Правда ли, что в Морозовском городке до сих пор живут люди и безопасно ли туда ходить?', a: 'Частично правда. Большинство аварийных казарм расселены, но в отдельных корпусах, включая «Париж», люди еще живут. Днем гулять безопасно: стены привлекают фотографов. Вечером вглубь неосвещенных дворов без гида лучше не заходить.' },
  { q: 'Что за история с тверским речным вокзалом и почему он в руинах?', a: 'Речной вокзал 1938 года на стрелке Волги и Тверцы - шедевр сталинского ампира. В 2017 году из-за подмыва фундамента обрушилась ротонда. Здание законсервировано и ждет реставрации. Смотреть его лучше с набережной Афанасия Никитина.' },
  { q: 'Где в Твери искать места Михаила Круга?', a: 'Главная точка - бронзовый памятник на бульваре Радищева: шляпу и гитару натерли до блеска. Поклонники также едут на Дмитрово-Черкасское кладбище и смотрят дом в Мамулино. Песни Круга часто играют в барах на Трехсвятской.' },
];

export const TVER_TRAVEL =
  'Тверь лежит на тракте между двумя столицами, поэтому «Ласточка» из Москвы занимает около 1 часа 40 минут, а «Сапсан» из Петербурга - около 2 часов 40 минут. Лучшее время - с мая по октябрь: в мае открывается речная навигация, летом работают пляжи Волги и Тверцы, сентябрь дает долгое бабье лето, а октябрь золотит Путевой дворец и набережные. Зимой город удобен для короткого музейного маршрута, тюбинга в парке «Яр» и сытной купеческой кухни.';
