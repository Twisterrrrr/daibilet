/** Curated Great Novgorod hub content. Keep route stops tied to the place list. */
import type { CityDayRoutePreset, CityMustSeeItem, CitySuburbItem } from './cityInfo-data';

export const VELIKY_NOVGOROD_MUST_SEE: CityMustSeeItem[] = [
  // Нумерация и повторы сохранены по новгород.md: пункт 50 повторяет Рюриково городище.
  { name: "Новгородский Кремль (Детинец)", dayRouteId: 'veliky-novgorod-place-1', desc: "Одна из древнейших каменных крепостей России, историческое и духовное сердце города. Вход свободный.", mustSeeFilter: "main", address: "Кремль", latitude: 58.521404, longitude: 31.275535, locationSlug: "veliky-novgorod-novgorodskiy-detinets-kreml" },
  { name: "Софийский собор", dayRouteId: 'veliky-novgorod-place-2', desc: "Древнейший сохранившийся православный храм России (1045–1050 гг.), главный символ города.", mustSeeFilter: "temple", address: "Кремль, 1", latitude: 58.522049, longitude: 31.276564, locationSlug: "veliky-novgorod-sofiyskiy-sobor", alsoMain: true },
  { name: "Памятник «Тысячелетие России»", dayRouteId: 'veliky-novgorod-place-3', desc: "Монумент 1862 года в честь тысячелетней годовщины призвания варягов, содержит более сотни фигур выдающихся деятелей.", mustSeeFilter: "monument", address: "Кремль", latitude: 58.521144, longitude: 31.275247, locationSlug: "veliky-novgorod-pamyatnik-tysyacheletie-rossii", alsoMain: true },
  { name: "Ярославово Дворище и Торг", dayRouteId: 'veliky-novgorod-place-4', desc: "Исторический район на правом берегу Волхова, где шумел средневековый рынок. Множество древних церквей XII–XVI веков.", mustSeeFilter: "main", address: "Ярославово Дворище", latitude: 58.518718, longitude: 31.28372, locationSlug: "veliky-novgorod-yaroslavovo-dvorische" },
  { name: "Музей деревянного зодчества «Витославлицы»", dayRouteId: 'veliky-novgorod-place-5', desc: "Музей-заповедник под открытым небом с уникальными деревянными постройками XVI–XX веков.", mustSeeFilter: "museum", address: "Юрьевское шоссе", latitude: 58.490332, longitude: 31.272284, locationSlug: "veliky-novgorod-muzey-derevyannogo-zodchestva-vitoslavlitsy", alsoMain: true },
  { name: "Свято-Юрьев монастырь", dayRouteId: 'veliky-novgorod-place-6', desc: "Один из древнейших монастырей России (XII век). Главный собор — Георгиевский — выдающийся памятник архитектуры.", mustSeeFilter: "temple", address: "Юрьевское шоссе, 10", latitude: 58.486363, longitude: 31.284658, imageUrl: '/images/venues/veliky-novgorod/svyato-yuryev-monastyr.jpg', imageCredit: { author: 'Vityavo', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Yuriev_Monastery_ensemble_in_Veliky_Novgorod_(view_from_the_Volkhov_River).jpg', license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/' }, alsoMain: true },
  { name: "Пешеходный мост через Волхов", desc: "Лучший вид на Кремль и оба берега реки. Идеальное место для прогулок и фотографий.", mustSeeFilter: "main", dayRouteId: 'veliky-novgorod-peshehodny-most', address: "мост через Волхов", latitude: 58.520167, longitude: 31.280728, imageUrl: '/images/venues/veliky-novgorod/peshehodny-most-volkhov.jpg', imageCredit: { author: 'Mono2mono', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Пешеходный_мост_(Великий_Новгород).jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' } },
  { name: "Памятный знак «Новгородская земля»", dayRouteId: 'veliky-novgorod-place-8', desc: "Скульптурный знак, отсылающий к истории края.", mustSeeFilter: "monument", address: "[уточнить]" },
  { name: "Скульптура «Садко»", dayRouteId: 'veliky-novgorod-place-9', desc: "Упоминается в контексте городских фестивалей.", mustSeeFilter: "monument", address: "[уточнить]" },
  { name: "Арт-объекты на Ярославовом Дворище", dayRouteId: 'veliky-novgorod-place-10', desc: "Современные скульптуры в историческом месте.", mustSeeFilter: "monument", address: "Ярославово Дворище; точка уточнить" },
  { name: "Памятник Сергею Рахманинову", dayRouteId: 'veliky-novgorod-place-11', desc: "Бронзовый монумент композитору, родившемуся в Новгородской губернии.", mustSeeFilter: "monument", address: "[уточнить]" },
  { name: "Памятник князю Владимиру", dayRouteId: 'veliky-novgorod-place-12', desc: "Скульптура крестителю Руси.", mustSeeFilter: "monument", address: "[уточнить]" },
  { name: "Софийская звонница", dayRouteId: 'veliky-novgorod-place-13', desc: "Историческая колокольня в Кремле, хороший ориентир и место для фото.", mustSeeFilter: "temple", address: "Кремль", latitude: 58.521389, longitude: 31.2775 },
  { name: "Владычная (Грановитая) палата", dayRouteId: 'veliky-novgorod-place-14', desc: "Памятник архитектуры XV века в Кремле, связанный с архиерейским двором.", mustSeeFilter: "museum", address: "Кремль", latitude: 58.5227, longitude: 31.276314 },
  { name: "Здание Дворянского собрания", dayRouteId: 'veliky-novgorod-place-15', desc: "Историческое здание в центре.", mustSeeFilter: "houses", address: "[уточнить]" },
  { name: "Воскресенская арка", dayRouteId: 'veliky-novgorod-place-16', desc: "Историческая арка в центре города.", mustSeeFilter: "houses", address: "[уточнить]" },
  { name: "Церковь Георгия на Торгу", dayRouteId: 'veliky-novgorod-place-17', desc: "Выставка «Прогулка по старому Новгороду».", mustSeeFilter: "temple", address: "Ярославово Дворище", latitude: 58.51937, longitude: 31.28657 },
  { name: "Церковь Симеона Богоприимца", dayRouteId: 'veliky-novgorod-place-18', desc: "Уникальная настенная роспись с портретами святых в медальонах.", mustSeeFilter: "temple", address: "[уточнить]", latitude: 58.53632, longitude: 31.27646 },
  { name: "Церковь Успения Пресвятой Богородицы в Волотове", dayRouteId: 'veliky-novgorod-place-19', desc: "Всемирно известна фресковой росписью 1363 года.", mustSeeFilter: "temple", address: "[уточнить]", latitude: 58.5372, longitude: 31.35677 },
  { name: "Знаменский собор", dayRouteId: 'veliky-novgorod-place-20', desc: "Памятник архитектуры и живописи XVII–XVIII вв.", mustSeeFilter: "temple", address: "[уточнить]", latitude: 58.5171, longitude: 31.29453 },
  { name: "Рюриково городище", dayRouteId: 'veliky-novgorod-place-21', desc: "Историческое место, откуда, по летописи, началась Русь. Находится на правом берегу Волхова.", mustSeeFilter: "secret", address: "Рюриково городище", latitude: 58.493687, longitude: 31.298049, locationSlug: "veliky-novgorod-ryurikovo-gorodische", imageUrl: '/images/venues/veliky-novgorod/ryurikovo-gorodische.jpg' },
  { name: "Городская усадьба", dayRouteId: 'veliky-novgorod-place-22', desc: "Пример гражданской застройки XVIII–XIX веков.", mustSeeFilter: "houses", address: "[уточнить]" },
  { name: "Дом купца", dayRouteId: 'veliky-novgorod-place-23', desc: "Памятник купеческой архитектуры.", mustSeeFilter: "houses", address: "[уточнить]" },
  { name: "Здание бывшей гимназии", dayRouteId: 'veliky-novgorod-place-24', desc: "Историческое учебное заведение.", mustSeeFilter: "houses", address: "[уточнить]" },
  { name: "Гостиный двор", dayRouteId: 'veliky-novgorod-place-25', desc: "Исторический торговый комплекс на Торговой стороне.", mustSeeFilter: "houses", address: "[уточнить]" },
  { name: "Новгородский государственный объединенный музей-заповедник", dayRouteId: 'veliky-novgorod-place-26', desc: "Один из старейших музеев России (1865 г.). Включает множество экспозиций.", mustSeeFilter: "museum", address: "[уточнить]" },
  { name: "Музей изобразительных искусств", dayRouteId: 'veliky-novgorod-place-27', desc: "Экспозиция русского искусства XVIII–XX веков.", mustSeeFilter: "museum", address: "`58.521840, 31.269750`", latitude: 58.52184, longitude: 31.26975 },
  { name: "Музей художественной культуры Новгородской земли", dayRouteId: 'veliky-novgorod-place-28', desc: "В исходном документе описание экспозиции не указано.", mustSeeFilter: "museum", address: "[уточнить]" },
  { name: "Центр музыкальных древностей", dayRouteId: 'veliky-novgorod-place-29', desc: "Реставрация старинных инструментов, концерты, лекции.", mustSeeFilter: "museum", address: "`58.515800, 31.303350`", latitude: 58.5158, longitude: 31.30335 },
  { name: "Музей Новгородского гидромелиоративного техникума", dayRouteId: 'veliky-novgorod-place-30', desc: "Экспозиция о партизанском движении.", mustSeeFilter: "museum", address: "[уточнить]" },
  { name: "Музей «Садко»", dayRouteId: 'veliky-novgorod-place-31', desc: "Экспозиция, посвящённая былинному герою.", mustSeeFilter: "museum", address: "[уточнить]" },
  { name: "Музей истории и археологии", dayRouteId: 'veliky-novgorod-place-32', desc: "Современная экспозиция о средневековом Новгороде.", mustSeeFilter: "museum", address: "[уточнить]" },
  { name: "Перынский скит", dayRouteId: 'veliky-novgorod-place-33', desc: "Тихий скит с крошечным храмом, рядом с Юрьевым монастырём.", mustSeeFilter: "temple", address: "[уточнить]", latitude: 58.472872, longitude: 31.273899 },
  { name: "Церковь Спаса на Нередице", dayRouteId: 'veliky-novgorod-place-34', desc: "Всемирно известный памятник домонгольского зодчества и фресковой живописи.", mustSeeFilter: "temple", address: "[уточнить]" },
  { name: "Николо-Вяжищский монастырь", dayRouteId: 'veliky-novgorod-place-35', desc: "Действующий женский монастырь в окрестностях города.", mustSeeFilter: "temple", address: "[уточнить]" },
  { name: "Сырков монастырь", dayRouteId: 'veliky-novgorod-place-36', desc: "Заброшенный мужской монастырь в окрестностях.", mustSeeFilter: "temple", address: "[уточнить]" },
  { name: "Антониев монастырь", dayRouteId: 'veliky-novgorod-place-37', desc: "Один из древнейших монастырей города.", mustSeeFilter: "temple", address: "[уточнить]", latitude: 58.539167, longitude: 31.289444 },
  { name: "Кремлёвский парк", dayRouteId: 'veliky-novgorod-place-38', desc: "Живописный парк рядом с Кремлём.", mustSeeFilter: "park", address: "`58.521000, 31.273000`", latitude: 58.518777, longitude: 31.271728 },
  { name: "Набережная Александра Невского", dayRouteId: 'veliky-novgorod-place-39', desc: "Прогулочная зона вдоль Волхова.", mustSeeFilter: "views", address: "Набережная Александра Невского", latitude: 58.52, longitude: 31.278 },
  { name: "Смотровая площадка на Кремлёвской стене", dayRouteId: 'veliky-novgorod-place-40', desc: "Вид на реку и город.", mustSeeFilter: "views", address: "[уточнить]" },
  { name: "Берег озера Ильмень", dayRouteId: 'veliky-novgorod-place-41', desc: "Живописные виды на озеро, особенно в районе Юрьева монастыря.", mustSeeFilter: "park", address: "[уточнить]" },
  { name: "Горбатый мост", dayRouteId: 'veliky-novgorod-place-42', desc: "Ещё один мост через Волхов с хорошими видами.", mustSeeFilter: "views", address: "Пешеходный мост через Волхов", latitude: 58.5205, longitude: 31.2805 },
  { name: "Ресторан «Pryanik»", dayRouteId: 'veliky-novgorod-place-43', desc: "Рекомендуется туристами; актуальные меню и цены проверьте перед визитом.", mustSeeFilter: "gastro", address: "ул. Большая Московская" },
  { name: "Местная среднеазиатская кухня", dayRouteId: 'veliky-novgorod-place-44', desc: "В исходном документе обозначена как гастрономическая категория; точное заведение и адрес требуют уточнения.", mustSeeFilter: "gastro", address: "[уточнить]" },
  { name: "Кафе и рестораны на Торговой стороне", dayRouteId: 'veliky-novgorod-place-45', desc: "Гастрономическая зона, а не отдельное заведение; конкретные точки требуют отбора.", mustSeeFilter: "gastro", address: "[уточнить]" },
  { name: "Новгородские специалитеты", dayRouteId: 'veliky-novgorod-place-46', desc: "Редакционная гастрономическая тема; для карточки нужна конкретная точка или продуктовый рынок.", mustSeeFilter: "gastro", address: "[уточнить]" },
  { name: "Новгородский академический театр драмы им. Ф. М. Достоевского", dayRouteId: 'veliky-novgorod-place-47', desc: "Главная театральная сцена города.", mustSeeFilter: "creative", address: "ул. Великая, 14", latitude: 58.523, longitude: 31.271 },
  { name: "Театр «Малый»", dayRouteId: 'veliky-novgorod-place-48', desc: "Камерный театр с интересным репертуаром.", mustSeeFilter: "creative", address: "ул. Фёдоровский ручей, [уточнить номер дома]" },
  { name: "Витославлицы, Юрьев монастырь и Перынский скит", dayRouteId: 'veliky-novgorod-place-49', desc: "Компактный маршрут на полдня.", mustSeeFilter: "main", address: "Маршрут; точка начала и координаты уточнить" },
  { name: "Рюриково городище", dayRouteId: 'veliky-novgorod-place-50', desc: "Историческое место на правом берегу Волхова.", mustSeeFilter: "secret", address: "Рюриково городище", latitude: 58.493687, longitude: 31.298049, locationSlug: "veliky-novgorod-ryurikovo-gorodische", imageUrl: '/images/venues/veliky-novgorod/ryurikovo-gorodische.jpg' },
];

export const VELIKY_NOVGOROD_SUBURBS: CitySuburbItem[] = [
  {
    name: 'Витославлицы, Юрьев монастырь и Перынский скит',
    desc: 'Компактная поездка на полдня: музей деревянного зодчества, действующий монастырь и Перынский скит. Транспорт и режим площадок сверяйте перед выездом.',
    dayRouteId: 'veliky-novgorod-south-bank',
    mustSeeFilter: 'main',
    visitMinutes: 'полдня',
    imageUrl: '/images/cities/suburbs/veliky-novgorod-peryn-skete.jpg',
    imageCredit: { author: 'Sterndmitri', sourceUrl: 'https://commons.wikimedia.org/wiki/File:PerynSketePerynChapelCells.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    latitude: 58.490332,
    longitude: 31.272284,
    places: [
      { name: 'Музей «Витославлицы»', desc: 'Коллекция деревянных построек.', dayRouteId: 'veliky-novgorod-vitoslavlitsy', latitude: 58.490332, longitude: 31.272284 },
      { name: 'Церковь Рождества Богородицы из села Перёдки', desc: 'В документе указана как старейшая постройка музея (1531 год); дату следует перепроверить по каталогу музея.', dayRouteId: 'veliky-novgorod-nativity-peredki' },
      { name: 'Свято-Юрьев монастырь', desc: 'Действующая обитель.', dayRouteId: 'veliky-novgorod-yuriev-monastery', latitude: 58.486363, longitude: 31.284658 },
      { name: 'Георгиевский собор', desc: 'Главный храм Юрьева монастыря (1119 год).', dayRouteId: 'veliky-novgorod-georgievsky-cathedral', latitude: 58.486363, longitude: 31.284658 },
      { name: 'Перынский скит', desc: 'Тихое место с небольшим храмом.', dayRouteId: 'veliky-novgorod-peryn-skete', latitude: 58.472872, longitude: 31.273899 },
      { name: 'Озеро Ильмень', desc: 'Живописный берег рядом с монастырём.', dayRouteId: 'veliky-novgorod-ilmen-shore' },
      { name: 'Смотровая площадка', desc: 'Вид на окрестности.', dayRouteId: 'veliky-novgorod-south-viewpoint' },
    ],
  },
  {
    name: 'Рюриково городище',
    desc: 'Археологическая территория к югу от центра у истока Волхова. Весной доступ может осложняться половодьем; выбирайте сухую погоду и удобную обувь.',
    locationSlug: 'veliky-novgorod-ryurikovo-gorodische',
    mustSeeFilter: 'secret',
    visitMinutes: '1-2 ч',
    latitude: 58.493687,
    longitude: 31.298049,
    places: [
      { name: 'Городище', desc: 'Место древнего поселения.', dayRouteId: 'veliky-novgorod-ryurikovo', latitude: 58.493687, longitude: 31.298049 },
      { name: 'Церковь Благовещения на Городище', desc: 'Древний храм на территории городища.', dayRouteId: 'veliky-novgorod-annunciation-ruins' },
      { name: 'Смотровая площадка', desc: 'Вид на Волхов и окрестности.', dayRouteId: 'veliky-novgorod-ryurikovo-viewpoint' },
      { name: 'Археологические раскопы', desc: 'Следы древней истории.', dayRouteId: 'veliky-novgorod-ryurikovo-excavations' },
      { name: 'Берег Волхова', desc: 'Прогулочная зона.', dayRouteId: 'veliky-novgorod-ryurikovo-volkhov-bank' },
      { name: 'Памятный знак', desc: 'Отметка исторического места.', dayRouteId: 'veliky-novgorod-ryurikovo-marker' },
      { name: 'Природа', desc: 'Живописные окрестности.', dayRouteId: 'veliky-novgorod-ryurikovo-nature' },
    ],
  },
];

export const VELIKY_NOVGOROD_DAY_ROUTE_PRESETS: CityDayRoutePreset[] = [
  {
    id: 'veliky-novgorod-medieval-center',
    title: 'Сердце древнего города',
    description: 'Пешеходный маршрут по двум историческим берегам: начните в Кремле, перейдите Волхов и завершите у древних церквей Торга.',
    coverImageUrl: '/images/cities/night/veliky-novgorod.png',
    travelVector: 'Пешком; через Волхов — по пешеходному мосту.',
    stops: [
      VELIKY_NOVGOROD_MUST_SEE[0],
      VELIKY_NOVGOROD_MUST_SEE[1],
      VELIKY_NOVGOROD_MUST_SEE[2],
      VELIKY_NOVGOROD_MUST_SEE[12],
      VELIKY_NOVGOROD_MUST_SEE[13],
      VELIKY_NOVGOROD_MUST_SEE[6],
      VELIKY_NOVGOROD_MUST_SEE[3],
      VELIKY_NOVGOROD_MUST_SEE[16],
    ],
  },
  {
    id: 'veliky-novgorod-south-day',
    title: 'Деревянное зодчество и монастыри',
    description: 'Отдельная загородная поездка: музей, монастырский ансамбль и Перынский скит. Проверяйте сезонный режим музея и дорогу у воды.',
    timingNote: 'Закладывайте не меньше половины дня; порядок поездки зависит от расписания транспорта и площадок.',
    coverImageUrl: '/images/cities/routes/veliky-novgorod-vitoslavlitsy.jpg',
    coverImageCredit: { author: 'Александр Сигачёв', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Vitoslavlicy_-_2025-08_-_p3.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    travelVector: 'Такси или городской транспорт до южных площадок; между удалёнными остановками удобнее такси.',
    stops: [
      ...[0, 2, 4].map((index) => ({ ...VELIKY_NOVGOROD_SUBURBS[0].places![index], desc: VELIKY_NOVGOROD_SUBURBS[0].places![index].desc || VELIKY_NOVGOROD_SUBURBS[0].places![index].name }) as CityMustSeeItem),
    ],
  },
];

export const VELIKY_NOVGOROD_TRAVEL =
  'Великий Новгород связан железной дорогой с Москвой и Санкт-Петербургом, а также автомобильными маршрутами по трассам М-10 и М-11. Перед поездкой сверяйте актуальное расписание поездов и автобусов: частота рейсов и время в пути меняются. Центр с Кремлём и Торговой стороной удобно осматривать пешком; Витославлицы, Юрьев монастырь и Рюриково городище требуют отдельного выезда. Летом работают прогулки по Волхову; весной доступ к Рюрикову городищу может затруднить половодье. Режим музеев и действующих храмов проверяйте перед поездкой.';

export const VELIKY_NOVGOROD_FAQ = [
  {
    q: 'Вход в Новгородский Кремль бесплатный?',
    a: 'Прогулка по территории Детинца обычно доступна свободно, но музейные экспозиции, звонница и отдельные объекты работают по собственному расписанию и билетам. Перед визитом проверьте правила и режим на сайте Новгородского музея-заповедника.',
  },
  {
    q: 'Можно ли зайти в Софийский собор?',
    a: 'Собор действующий, поэтому возможность осмотра зависит от богослужений и правил посещения. Уточните режим на официальной странице перед поездкой; внутри соблюдайте тишину и требования к одежде.',
  },
  {
    q: 'Как доехать до Витославлиц без машины?',
    a: 'До музея ходит городской транспорт, однако номер маршрута и расписание могут меняться. Проверьте актуальную схему у перевозчика или городского транспортного сервиса в день поездки.',
  },
  {
    q: 'Что успеть за один день?',
    a: 'Сосредоточьтесь на Детинце, Софийском соборе, музее в Кремле и Ярославовом Дворище. Витославлицы и Юрьев монастырь лучше оставить на отдельную поездку, чтобы не превращать день в гонку между точками.',
  },
  {
    q: 'Стоит ли ехать на Рюриково городище весной?',
    a: 'В апреле и мае доступ к территории может быть затруднён половодьем. Новгородский музей-заповедник отдельно предупреждает об этом; проверьте состояние подъезда и прогноз перед выездом.',
  },
];
