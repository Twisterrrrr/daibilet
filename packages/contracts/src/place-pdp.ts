export const PLACE_TYPE_OPTIONS = [
  ['ARCHITECTURE', 'Архитектура'],
  ['MONUMENT', 'Памятники и мемориалы'],
  ['MUSEUM', 'Музеи'],
  ['RELIGION', 'Религиозные места'],
  ['NATURE', 'Природа'],
  ['URBAN', 'Городские пространства'],
  ['THEATRE', 'Театры'],
  ['ENTERTAINMENT', 'Развлечения'],
  ['FOOD', 'Еда и гастрономия'],
  ['VENUE', 'Площадки'],
  ['TRANSPORT', 'Транспорт и отправления'],
  ['OTHER', 'Другое — требуется проверка'],
] as const;

export type PlaceType = (typeof PLACE_TYPE_OPTIONS)[number][0];
export type PlacePdpVariant =
  | 'museum'
  | 'theater'
  | 'concert_hall'
  | 'club'
  | 'pier'
  | 'landmark'
  | 'nature'
  | 'urban_area'
  | 'food'
  | 'attraction'
  | 'transport'
  | 'park'
  | 'space'
  | 'religion'
  | 'sport'
  | 'venue';

export type PlaceSubtypeOption = { value: string; label: string; variant?: PlacePdpVariant };

/** Controlled suggestions. Unknown values remain readable for legacy imports and editorial exceptions. */
export const PLACE_SUBTYPE_OPTIONS: Record<PlaceType, readonly PlaceSubtypeOption[]> = {
  ARCHITECTURE: [
    { value: 'palace', label: 'Дворец' }, { value: 'estate', label: 'Усадьба' },
    { value: 'fortress', label: 'Крепость' }, { value: 'architectural_ensemble', label: 'Архитектурный ансамбль' },
  ],
  MONUMENT: [
    { value: 'monument', label: 'Памятник', variant: 'landmark' }, { value: 'memorial', label: 'Мемориал', variant: 'landmark' },
    { value: 'sculpture', label: 'Скульптура', variant: 'landmark' },
  ],
  MUSEUM: [
    { value: 'museum', label: 'Музей', variant: 'museum' }, { value: 'gallery', label: 'Галерея', variant: 'museum' },
    { value: 'planetarium', label: 'Планетарий', variant: 'museum' }, { value: 'aquarium', label: 'Океанариум', variant: 'museum' },
  ],
  RELIGION: [
    { value: 'church', label: 'Церковь' }, { value: 'chapel', label: 'Часовня' }, { value: 'cathedral', label: 'Собор' },
    { value: 'monastery', label: 'Монастырь' }, { value: 'mosque', label: 'Мечеть' }, { value: 'synagogue', label: 'Синагога' },
  ],
  NATURE: [
    { value: 'park', label: 'Парк', variant: 'park' }, { value: 'garden', label: 'Сад', variant: 'park' },
    { value: 'reserve', label: 'Заповедник', variant: 'nature' }, { value: 'lake', label: 'Озеро', variant: 'nature' },
    { value: 'mountain', label: 'Гора', variant: 'nature' }, { value: 'waterfall', label: 'Водопад', variant: 'nature' },
  ],
  URBAN: [
    { value: 'square', label: 'Площадь', variant: 'urban_area' }, { value: 'street', label: 'Улица', variant: 'urban_area' },
    { value: 'embankment', label: 'Набережная', variant: 'urban_area' }, { value: 'district', label: 'Район', variant: 'urban_area' },
  ],
  THEATRE: [
    { value: 'theatre', label: 'Театр', variant: 'theater' }, { value: 'cinema', label: 'Кинотеатр', variant: 'venue' },
    { value: 'circus', label: 'Цирк', variant: 'attraction' }, { value: 'concert_hall', label: 'Концертный зал', variant: 'concert_hall' },
    { value: 'philharmonic', label: 'Филармония', variant: 'concert_hall' },
  ],
  ENTERTAINMENT: [
    { value: 'amusement_park', label: 'Парк аттракционов', variant: 'park' }, { value: 'zoo', label: 'Зоопарк', variant: 'attraction' },
    { value: 'water_park', label: 'Аквапарк', variant: 'attraction' }, { value: 'quest', label: 'Квест-пространство', variant: 'attraction' },
    { value: 'observation_deck', label: 'Смотровая площадка', variant: 'attraction' },
  ],
  FOOD: [
    { value: 'restaurant', label: 'Ресторан', variant: 'food' }, { value: 'cafe', label: 'Кафе', variant: 'food' },
    { value: 'bar', label: 'Бар', variant: 'food' }, { value: 'bakery', label: 'Пекарня', variant: 'food' },
    { value: 'food_market', label: 'Фуд-маркет', variant: 'food' },
  ],
  VENUE: [
    { value: 'concert_hall', label: 'Концертный зал', variant: 'concert_hall' }, { value: 'theatre', label: 'Театр', variant: 'theater' },
    { value: 'club', label: 'Клуб', variant: 'club' }, { value: 'stadium', label: 'Стадион', variant: 'sport' },
    { value: 'arena', label: 'Арена', variant: 'sport' }, { value: 'exhibition_hall', label: 'Выставочный зал', variant: 'venue' },
  ],
  TRANSPORT: [
    { value: 'pier', label: 'Причал', variant: 'pier' }, { value: 'river_terminal', label: 'Речной вокзал', variant: 'pier' },
    { value: 'sea_terminal', label: 'Морской терминал', variant: 'pier' }, { value: 'marina', label: 'Марина', variant: 'pier' },
    { value: 'railway_station', label: 'Железнодорожный вокзал', variant: 'transport' },
    { value: 'airport', label: 'Аэропорт', variant: 'transport' }, { value: 'bus_station', label: 'Автовокзал', variant: 'transport' },
  ],
  OTHER: [{ value: 'other', label: 'Другое', variant: 'venue' }],
};

export type PlaceSubtypeIssue = 'unknown_type' | 'unknown_subtype' | 'subtype_type_mismatch';

export type PdpSectionEditorSchema = {
  bodyLabel: string;
  bodyHint: string;
  itemLabel: string;
  itemFields: Partial<Record<'title' | 'description' | 'imageUrl' | 'linkUrl' | 'meta' | 'sourceUrl', string>>;
  detailSuggestions: readonly string[];
};

const commonItemFields = { title: 'Название', description: 'Описание', imageUrl: 'Изображение URL', linkUrl: 'Ссылка', meta: 'Короткая подпись', sourceUrl: 'Источник' } as const;
const schema = (bodyLabel: string, bodyHint: string, itemLabel = 'Материал', itemFields: PdpSectionEditorSchema['itemFields'] = commonItemFields, detailSuggestions: readonly string[] = []) => ({ bodyLabel, bodyHint, itemLabel, itemFields, detailSuggestions });

/** Section-specific authoring language shared by the PDP editor. */
export const PDP_SECTION_EDITOR_SCHEMA: Record<string, PdpSectionEditorSchema> = {
  about: schema('Текст об объекте', 'Кратко объясните, что это за место и чем оно примечательно.', 'Тематический факт'),
  visit_facts: schema('Пояснение к фактам посещения', 'Уточните правила, которые не помещаются в короткие факты.', 'Факт посещения', { title: 'Правило / условие', description: 'Пояснение', meta: 'Короткая отметка', sourceUrl: 'Источник' }, ['Возрастное ограничение', 'Продолжительность визита', 'Выходной день', 'Доступность', 'Нужна предварительная запись']),
  gallery: schema('Подпись к галерее', 'Добавьте контекст к фотографиям и проверьте права на публикацию.', 'Фотография'),
  ticket_guide: schema('Как купить и использовать билет', 'Укажите существенные правила входа и использования билета.', 'Тип билета / правило', { title: 'Билет или правило', description: 'Условия и пояснение', meta: 'Стоимость / короткая отметка', linkUrl: 'Ссылка на покупку', sourceUrl: 'Источник' }, ['Цена', 'Льготная категория', 'Бесплатный вход', 'Нужен документ']),
  exhibitions: schema('О выставках', 'Опишите принцип выставочной программы; актуальные даты храните в событийном каталоге.', 'Выставка', { title: 'Название выставки', description: 'О чём выставка', imageUrl: 'Изображение URL', linkUrl: 'Страница выставки', meta: 'Период / короткая отметка', sourceUrl: 'Источник' }, ['Период проведения', 'Зал', 'Куратор']),
  collection: schema('О коллекции', 'Расскажите о постоянной экспозиции и ключевых коллекциях.', 'Коллекция', { title: 'Название коллекции', description: 'Состав и особенности', imageUrl: 'Изображение URL', linkUrl: 'Подробнее', meta: 'Период / направление', sourceUrl: 'Источник' }, ['Эпоха', 'Автор', 'Материал', 'Зал']),
  routes: schema('О маршрутах', 'Опишите маршрут посещения или отправления и его особенности.', 'Маршрут', { title: 'Название маршрута', description: 'Описание и ключевые точки', imageUrl: 'Схема / изображение URL', linkUrl: 'Подробнее', meta: 'Продолжительность / направление', sourceUrl: 'Источник' }, ['Продолжительность', 'Протяжённость', 'Отправление', 'Прибытие']),
  audio_guide: schema('Об аудиогиде', 'Укажите доступные аудиоматериалы и язык.', 'Аудиогид', { title: 'Название / язык', description: 'Как воспользоваться', linkUrl: 'Ссылка', meta: 'Формат', sourceUrl: 'Источник' }, ['Язык', 'Продолжительность', 'Стоимость']),
  accessibility: schema('О доступности', 'Опишите доступность входа, маршрута и сервисов без общих обещаний.', 'Условие доступности', { title: 'Что доступно', description: 'Ограничения и детали', meta: 'Зона / короткая отметка', sourceUrl: 'Источник' }, ['Вход без ступеней', 'Лифт', 'Туалет', 'Сопровождение']),
  location: schema('Как добраться и найти вход', 'Уточните вход, ориентиры и варианты дороги до места.', 'Ориентир / способ добраться', { title: 'Ориентир или способ', description: 'Подробности', linkUrl: 'Карта / ссылка', meta: 'Транспорт', sourceUrl: 'Источник' }, ['Адрес входа', 'Метро', 'Остановка', 'Парковка']),
  faq: schema('Частые вопросы', 'Добавьте ответы только на вопросы, подтверждённые официальными источниками.', 'Вопрос и ответ', { title: 'Вопрос', description: 'Ответ', sourceUrl: 'Источник' }),
  halls: schema('О залах', 'Укажите залы, их назначение и полезные особенности для посетителя.', 'Зал', { title: 'Название зала', description: 'Назначение и особенности', imageUrl: 'Схема / фото URL', meta: 'Вместимость / короткая отметка', sourceUrl: 'Источник' }, ['Вместимость', 'Посадка', 'Доступность']),
  repertoire_guide: schema('О репертуаре', 'Расскажите о направлениях программы; актуальные события показываются отдельно.', 'Направление репертуара', { title: 'Жанр / цикл', description: 'Что обычно входит', linkUrl: 'Афиша', sourceUrl: 'Источник' }, ['Жанр', 'Возрастная маркировка']),
  seating: schema('О местах и схеме зала', 'Объясните категории мест и ограничения видимости.', 'Категория мест', { title: 'Категория', description: 'Обзор и ограничения', imageUrl: 'Схема зала URL', meta: 'Ряд / сектор', sourceUrl: 'Источник' }, ['Сектор', 'Ограниченная видимость', 'Доступность']),
  acoustics: schema('Об акустике', 'Опишите особенности звучания и конфигурации зала.', 'Особенность зала', { title: 'Зона / особенность', description: 'Пояснение', sourceUrl: 'Источник' }, ['Тип настройки', 'Расположение']),
  subscriptions: schema('Об абонементах', 'Опишите принцип абонементных программ без устаревающих цен.', 'Абонемент', { title: 'Название / цикл', description: 'Состав и условия', linkUrl: 'Подробнее', sourceUrl: 'Источник' }, ['Количество событий', 'Срок действия']),
  atmosphere: schema('Об атмосфере', 'Помогите посетителю понять формат и правила пространства.', 'Особенность пространства'),
  entry_rules: schema('О правилах входа', 'Перечислите проверяемые требования при входе.', 'Правило входа', { title: 'Правило', description: 'Детали', meta: 'Короткая отметка', sourceUrl: 'Источник' }, ['Возраст', 'Документ', 'Дресс-код', 'Повторный вход']),
  spaces: schema('О пространствах', 'Опишите зоны, инфраструктуру и назначение площадки.', 'Пространство / зона', { title: 'Название зоны', description: 'Назначение и возможности', imageUrl: 'Изображение URL', meta: 'Этаж / короткая отметка', sourceUrl: 'Источник' }, ['Этаж', 'Вместимость', 'Доступность']),
  boarding: schema('О посадке и отправлении', 'Уточните место сбора, порядок посадки и время прибытия.', 'Точка посадки / правило', { title: 'Точка или этап', description: 'Как пройти и что сделать', linkUrl: 'Карта / схема', meta: 'Время / ориентир', sourceUrl: 'Источник' }, ['Время посадки', 'Время отправления', 'Место сбора', 'Документы']),
  fleet: schema('О флоте', 'Указывайте особенности флота только если они подтверждены и стабильны.', 'Тип судна', { title: 'Название / тип судна', description: 'Особенности и удобства', imageUrl: 'Фото URL', sourceUrl: 'Источник' }, ['Вместимость', 'Закрытая палуба', 'Туалет']),
  weather_policy: schema('О погодных условиях', 'Расскажите, как погода влияет на посещение и перенос.', 'Погодное условие', { title: 'Условие', description: 'Что происходит и как узнать решение', sourceUrl: 'Источник' }, ['Перенос', 'Отмена', 'Возврат']),
  history: schema('Об истории', 'Кратко изложите историю и привяжите важные даты к источникам.', 'Исторический факт', { title: 'Период / событие', description: 'Подтверждённый факт', meta: 'Дата', sourceUrl: 'Источник' }, ['Год открытия', 'Архитектор', 'Историческое название']),
  highlights: schema('Что важно увидеть', 'Выберите наиболее значимые детали, связанные с этим объектом.', 'Главная особенность', { title: 'Что посмотреть', description: 'Почему это интересно', imageUrl: 'Изображение URL', sourceUrl: 'Источник' }),
  visit_route: schema('Маршрут осмотра', 'Предложите последовательность осмотра и оцените время.', 'Этап маршрута', { title: 'Точка маршрута', description: 'Что смотреть', meta: 'Номер / время', sourceUrl: 'Источник' }, ['Продолжительность', 'Начало маршрута']),
  trails: schema('О тропах и маршрутах', 'Укажите покрытие, сложность и сезонные ограничения.', 'Тропа / маршрут', { title: 'Название маршрута', description: 'Покрытие, сложность, ориентиры', linkUrl: 'Карта', meta: 'Длина / сложность', sourceUrl: 'Источник' }, ['Протяжённость', 'Сложность', 'Покрытие']),
  seasonality: schema('О сезонности', 'Укажите, что доступно в разные сезоны и где проверить ограничения.', 'Сезонное условие', { title: 'Сезон', description: 'Что работает и какие есть ограничения', sourceUrl: 'Источник' }, ['Сезон', 'Погодное ограничение']),
  safety: schema('О безопасности', 'Добавьте конкретные правила безопасности и ограничения.', 'Правило безопасности', { title: 'Правило', description: 'Кого касается и что делать', sourceUrl: 'Источник' }),
  walking_routes: schema('О прогулочных маршрутах', 'Опишите самостоятельные маршруты, точки и ориентировочное время.', 'Прогулочный маршрут', { title: 'Название маршрута', description: 'Ключевые точки и направление', linkUrl: 'Карта', meta: 'Время / протяжённость', sourceUrl: 'Источник' }, ['Продолжительность', 'Протяжённость', 'Старт']),
  chef: schema('О кухне и команде', 'Представляйте шефа и концепцию только по актуальным подтверждённым данным.', 'Шеф / концепция', { title: 'Имя / тема', description: 'Подтверждённая информация', imageUrl: 'Изображение URL', sourceUrl: 'Источник' }),
  menu: schema('О меню', 'Покажите примеры кухни, отметьте возможные изменения меню.', 'Раздел / блюдо', { title: 'Блюдо или раздел', description: 'Состав и особенности', meta: 'Цена / категория', sourceUrl: 'Источник' }, ['Кухня', 'Диетические опции', 'Актуальность меню']),
  dining_events: schema('О специальных гастро-событиях', 'Расскажите о формате событий; ближайшие даты размещайте в афише.', 'Формат события', { title: 'Формат', description: 'Как проходит', sourceUrl: 'Источник' }),
  reasons_to_visit: schema('Почему сюда приходят', 'Сформулируйте конкретные преимущества места.', 'Причина посетить'),
  booking: schema('О бронировании', 'Укажите подтверждённый способ и условия бронирования.', 'Способ бронирования', { title: 'Канал / условие', description: 'Как забронировать', linkUrl: 'Ссылка', sourceUrl: 'Источник' }, ['Телефон', 'Предоплата', 'Отмена']),
  zones: schema('О зонах и экспозициях', 'Объясните, что находится в каждой зоне и сколько времени заложить.', 'Зона', { title: 'Название зоны', description: 'Что внутри', imageUrl: 'Изображение URL', meta: 'Возраст / время', sourceUrl: 'Источник' }, ['Возраст', 'Продолжительность']),
  shows: schema('О представлениях и шоу', 'Опишите постоянные форматы; актуальное расписание не дублируйте.', 'Формат шоу', { title: 'Название', description: 'Содержание и ограничения', meta: 'Продолжительность', sourceUrl: 'Источник' }),
  feeding_schedule: schema('О показательных кормлениях', 'Раздел может устаревать: укажите, где и когда проверять текущее расписание.', 'Кормление / встреча', { title: 'Животное / зона', description: 'Условия посещения', meta: 'Расписание (проверять перед визитом)', sourceUrl: 'Источник' }),
  visit_routes: schema('О маршрутах посещения', 'Предложите варианты осмотра по времени или интересам.', 'Маршрут посещения', { title: 'Название маршрута', description: 'Последовательность и ориентиры', meta: 'Время / возраст', sourceUrl: 'Источник' }, ['Время', 'Доступность', 'Для детей']),
  stations: schema('О станциях и остановках', 'Укажите точки маршрута и пересадки.', 'Станция / остановка', { title: 'Название точки', description: 'Посадка, пересадка и ориентиры', meta: 'Порядковый номер', sourceUrl: 'Источник' }),
  destination: schema('О месте назначения', 'Расскажите, что ждёт путешественника по прибытии.', 'Ориентир в пункте назначения', { title: 'Место', description: 'Как добраться от точки прибытия', linkUrl: 'Карта', sourceUrl: 'Источник' }),
  schedule_notes: schema('Об особенностях расписания', 'Не дублируйте даты и сеансы из системы продаж; объясните сезонность и ограничения.', 'Правило расписания', { title: 'Условие', description: 'Пояснение', sourceUrl: 'Источник' }),
  alternatives: schema('Об альтернативных способах', 'Добавьте альтернативу только если она реально помогает посетителю.', 'Способ добраться', { title: 'Вариант', description: 'Маршрут и ограничения', meta: 'Время / сезон', sourceUrl: 'Источник' }),
  map: schema('О карте территории', 'Загрузите актуальную схему и поясните обозначения.', 'Зона / точка на карте', { title: 'Обозначение', description: 'Что находится в этой зоне', imageUrl: 'Карта / схема URL', sourceUrl: 'Источник' }),
  tours: schema('Об экскурсиях', 'Укажите доступные форматы знакомства с территорией.', 'Формат экскурсии', { title: 'Формат', description: 'Как записаться и что входит', linkUrl: 'Подробнее', meta: 'Продолжительность', sourceUrl: 'Источник' }),
  rentals: schema('О прокате', 'Перечислите доступный прокат и условия.', 'Вид проката', { title: 'Инвентарь', description: 'Условия и ограничения', meta: 'Цена / залог', sourceUrl: 'Источник' }),
  food_spots: schema('О местах питания на территории', 'Укажите где поесть и ограничения доступа.', 'Точка питания', { title: 'Название', description: 'Формат и часы', meta: 'Зона / короткая отметка', sourceUrl: 'Источник' }),
  activities: schema('О занятиях и активностях', 'Опишите варианты досуга и ограничения для участия.', 'Активность', { title: 'Занятие', description: 'Как принять участие', meta: 'Возраст / сезон', sourceUrl: 'Источник' }),
  places_inside: schema('О точках внутри пространства', 'Перечислите связанные места, для которых полезна отдельная карточка.', 'Точка внутри', { title: 'Название', description: 'Что здесь находится', linkUrl: 'Страница места', sourceUrl: 'Источник' }),
  upcoming_events: schema('О спортивных событиях', 'Не фиксируйте прошедшие даты: события и билеты поступают из каталога.', 'Тип события / формат', { title: 'Формат', description: 'Как проходит посещение', linkUrl: 'Актуальная афиша', sourceUrl: 'Источник' }),
  equipment: schema('Об оборудовании и инфраструктуре', 'Опишите доступный инвентарь, аренду и ограничения.', 'Оборудование', { title: 'Инвентарь', description: 'Использование и ограничения', meta: 'Наличие / аренда', sourceUrl: 'Источник' }),
  services: schema('Об услугах площадки', 'Укажите услуги, которые помогают спланировать посещение.', 'Услуга', { title: 'Название услуги', description: 'Условия', meta: 'Стоимость / режим', sourceUrl: 'Источник' }),
  program: schema('О программе события', 'Сохраните подтверждённую программу события.', 'Элемент программы', { title: 'Название / время', description: 'Содержание', meta: 'Время / участник', sourceUrl: 'Источник' }),
  participants: schema('Об участниках', 'Укажите подтверждённых артистов, авторов или организаторов.', 'Участник', { title: 'Имя / название', description: 'Роль в событии', linkUrl: 'Официальная страница', sourceUrl: 'Источник' }),
  ticket_notes: schema('Об условиях билета', 'Опишите ограничения и условия возврата, не дублируя цену.', 'Условие билета', { title: 'Условие', description: 'Пояснение', sourceUrl: 'Источник' }),
  custom: schema('Текст дополнительного раздела', 'Добавляйте только полезную информацию, которой нет в стандартных разделах.', 'Дополнительный материал'),
};

export type PdpReadinessRequirement = { anyOf: readonly string[]; label: string; mode: 'body' | 'items' | 'body_or_items' };
const requirement = (label: string, mode: PdpReadinessRequirement['mode'], ...anyOf: string[]): PdpReadinessRequirement => ({ label, mode, anyOf });

export type PdpVariantSectionProfile = { core: readonly string[]; conditional: readonly string[] };

/** Distinguishes the informational page's core from blocks shown only when relevant facts exist. */
export const PDP_VARIANT_SECTION_PROFILE: Record<PlacePdpVariant, PdpVariantSectionProfile> = {
  museum: { core: ['about', 'collection', 'location'], conditional: ['visit_facts', 'gallery', 'ticket_guide', 'exhibitions', 'routes', 'audio_guide', 'accessibility', 'faq'] },
  theater: { core: ['about', 'halls', 'location'], conditional: ['visit_facts', 'gallery', 'ticket_guide', 'repertoire_guide', 'seating', 'accessibility', 'faq'] },
  concert_hall: { core: ['about', 'halls', 'seating', 'location'], conditional: ['visit_facts', 'gallery', 'ticket_guide', 'acoustics', 'subscriptions', 'accessibility', 'faq'] },
  club: { core: ['about', 'atmosphere', 'spaces', 'entry_rules', 'location'], conditional: ['visit_facts', 'gallery', 'ticket_guide', 'accessibility', 'faq'] },
  pier: { core: ['about', 'boarding', 'location'], conditional: ['visit_facts', 'gallery', 'ticket_guide', 'routes', 'fleet', 'weather_policy', 'accessibility', 'faq'] },
  landmark: { core: ['about', 'location'], conditional: ['visit_facts', 'gallery', 'history', 'highlights', 'visit_route', 'accessibility', 'faq'] },
  nature: { core: ['about', 'location'], conditional: ['visit_facts', 'gallery', 'trails', 'seasonality', 'safety', 'accessibility', 'faq'] },
  urban_area: { core: ['about', 'highlights', 'location'], conditional: ['visit_facts', 'gallery', 'walking_routes', 'spaces', 'accessibility', 'faq'] },
  food: { core: ['about', 'menu', 'location'], conditional: ['visit_facts', 'gallery', 'chef', 'dining_events', 'atmosphere', 'reasons_to_visit', 'spaces', 'booking', 'accessibility', 'faq'] },
  attraction: { core: ['about', 'location'], conditional: ['visit_facts', 'gallery', 'ticket_guide', 'zones', 'shows', 'feeding_schedule', 'visit_routes', 'entry_rules', 'accessibility', 'faq'] },
  transport: { core: ['about', 'location'], conditional: ['visit_facts', 'gallery', 'ticket_guide', 'boarding', 'routes', 'stations', 'destination', 'schedule_notes', 'weather_policy', 'alternatives', 'accessibility', 'faq'] },
  park: { core: ['about', 'map', 'walking_routes', 'location'], conditional: ['visit_facts', 'gallery', 'ticket_guide', 'highlights', 'seasonality', 'tours', 'rentals', 'food_spots', 'entry_rules', 'accessibility', 'faq'] },
  space: { core: ['about', 'places_inside', 'location'], conditional: ['visit_facts', 'gallery', 'activities', 'map', 'walking_routes', 'history', 'tours', 'accessibility', 'faq'] },
  religion: { core: ['about', 'history', 'entry_rules', 'location'], conditional: ['visit_facts', 'gallery', 'highlights', 'ticket_guide', 'accessibility', 'faq'] },
  sport: { core: ['about', 'spaces', 'entry_rules', 'location'], conditional: ['visit_facts', 'gallery', 'upcoming_events', 'equipment', 'ticket_guide', 'accessibility', 'faq'] },
  venue: { core: ['about', 'spaces', 'location'], conditional: ['visit_facts', 'gallery', 'entry_rules', 'services', 'accessibility', 'faq'] },
};

/** Subtype notes adjust editorial emphasis without inventing new required sections or facts. */
export const PDP_SUBTYPE_CONTENT_HINTS: Record<string, Partial<Record<string, string>>> = {
  'MUSEUM:gallery': { exhibitions: 'Для галереи поставьте в фокус художественные направления и выставочную программу; конкретные даты поступают из каталога событий.' },
  'MUSEUM:planetarium': { visit_facts: 'Уточните возрастные ограничения и правила посещения сеансов. Расписание и билеты не фиксируйте в тексте.' },
  'MUSEUM:aquarium': { collection: 'Опишите экспозиционные зоны и правила взаимодействия с животными, если они официально опубликованы.' },
  'THEATRE:concert_hall': { halls: 'Опишите концертный зал и его конфигурации; если предмет места — регулярные концерты, редактор может выбрать профиль «Концертный зал».' },
  'THEATRE:philharmonic': { repertoire_guide: 'Опишите оркестры, циклы и принцип абонементов. Состав конкретных концертов берите из афиши.' },
  'THEATRE:cinema': { halls: 'Уточните залы и формат показа. Для кинозала редактор может выбрать профиль «Площадка», если он точнее.' },
  'THEATRE:circus': { visit_facts: 'Уточните особенности посещения семейной площадки; конкретные представления и билеты поступают из афиши.' },
  'ENTERTAINMENT:zoo': { zones: 'Опишите зоны и правила посещения животных. Расписание кормлений добавляйте только при наличии официального расписания.' },
  'ENTERTAINMENT:water_park': { entry_rules: 'Добавьте подтверждённые ограничения по росту, возрасту, безопасности и необходимой экипировке.' },
  'ENTERTAINMENT:quest': { visit_routes: 'Укажите подтверждённые параметры группы, возраст и длительность формата; доступные сеансы показываются из системы продаж.' },
  'FOOD:restaurant': { booking: 'Расскажите, как бронировать столик. Свободное время показывайте только из подключённой системы бронирования.' },
  'FOOD:food_market': { spaces: 'Перечислите подтверждённые зоны или корнеры; актуальных операторов регулярно сверяйте с источником.' },
  'TRANSPORT:pier': { boarding: 'Укажите точное место посадки и ориентиры. Наличие причала само по себе не подтверждает рейс.' },
  'TRANSPORT:river_terminal': { boarding: 'Разделите вход в терминал и конкретную точку посадки; отправления связываются с причалом и живым расписанием.' },
  'TRANSPORT:railway_station': { stations: 'Укажите входы, платформенные/терминальные зоны и пересадки; расписание берите из транспортного источника.' },
  'TRANSPORT:airport': { stations: 'Уточните терминалы и переходы. Номера рейсов и фактическое время отправления не храните как редакционный текст.' },
  'TRANSPORT:funicular': { schedule_notes: 'Опишите сезонность и погодные ограничения; актуальный режим работы проверяйте у оператора.' },
  'NATURE:reserve': { safety: 'Добавьте официальные правила доступа, разрешения и ограничения маршрутов; не публикуйте непроверенные советы по безопасности.' },
  'NATURE:mountain': { trails: 'Уточните сложность и протяжённость маршрута только по надёжному источнику; погодные/аварийные закрытия требуют живого статуса.' },
  'NATURE:cave': { safety: 'Уточните доступность маршрута, требования к сопровождению и ограничения объекта по официальным правилам.' },
  'URBAN:embankment': { walking_routes: 'Покажите участки маршрута, спуски и точки обзора; укажите ограничения только при подтверждении.' },
  'VENUE:stadium': { spaces: 'Опишите зоны и входы для зрителей. Секторы конкретного матча и доступные места выводятся из билетов на событие.' },
  'VENUE:arena': { spaces: 'Разведите конфигурации площадки и правила посещения конкретного события.' },
};

export function pdpSectionRequirement(variant: string, sectionKind: string): 'core' | 'conditional' | null {
  const profile = PDP_VARIANT_SECTION_PROFILE[variant as PlacePdpVariant];
  if (!profile) return null;
  if (profile.core.includes(sectionKind)) return 'core';
  if (profile.conditional.includes(sectionKind)) return 'conditional';
  return null;
}

export function pdpSubtypeContentHint(placeType?: string | null, placeSubtype?: string | null, sectionKind?: string | null): string | null {
  const type = String(placeType || '').trim().toUpperCase();
  const subtype = String(placeSubtype || '').trim().toLowerCase();
  const kind = String(sectionKind || '').trim();
  if (!type || !subtype || !kind) return null;
  return PDP_SUBTYPE_CONTENT_HINTS[`${type}:${subtype}`]?.[kind] || null;
}

/** Editorial checklist for marking a venue PDP READY. These are prompts, never an automatic publish/index switch. */
export const PDP_VARIANT_READINESS: Partial<Record<PlacePdpVariant, readonly PdpReadinessRequirement[]>> = {
  museum: [requirement('Описание музея', 'body', 'about'), requirement('Практические факты и посещение', 'items', 'visit_facts'), requirement('Коллекция или выставочная программа', 'body_or_items', 'collection', 'exhibitions'), requirement('Вход и адрес', 'body_or_items', 'location')],
  theater: [requirement('О театре', 'body', 'about'), requirement('Факты для зрителя', 'items', 'visit_facts'), requirement('Залы или репертуар', 'body_or_items', 'halls', 'repertoire_guide'), requirement('Как добраться', 'body_or_items', 'location')],
  concert_hall: [requirement('О концертной площадке', 'body', 'about'), requirement('Залы и места', 'items', 'halls'), requirement('Акустика или абонементы', 'body_or_items', 'acoustics', 'subscriptions'), requirement('Как добраться', 'body_or_items', 'location')],
  club: [requirement('О площадке', 'body', 'about'), requirement('Атмосфера и формат', 'body_or_items', 'atmosphere'), requirement('Правила входа', 'body_or_items', 'entry_rules'), requirement('Как добраться', 'body_or_items', 'location')],
  pier: [requirement('О причале', 'body', 'about'), requirement('Посадка и точка сбора', 'body_or_items', 'boarding'), requirement('Маршруты', 'items', 'routes'), requirement('Погодные условия', 'body_or_items', 'weather_policy'), requirement('Как добраться', 'body_or_items', 'location')],
  landmark: [requirement('Описание объекта', 'body', 'about'), requirement('История', 'body_or_items', 'history'), requirement('Что посмотреть', 'items', 'highlights'), requirement('Маршрут осмотра или адрес', 'body_or_items', 'visit_route', 'location')],
  nature: [requirement('Описание территории', 'body', 'about'), requirement('Тропы и маршруты', 'items', 'trails'), requirement('Сезонность', 'body_or_items', 'seasonality'), requirement('Безопасность', 'body_or_items', 'safety'), requirement('Как добраться', 'body_or_items', 'location')],
  urban_area: [requirement('Описание пространства', 'body', 'about'), requirement('Что посмотреть', 'items', 'highlights'), requirement('Маршрут прогулки', 'items', 'walking_routes'), requirement('Как добраться', 'body_or_items', 'location')],
  food: [requirement('Концепция места', 'body', 'about'), requirement('Меню и кухня', 'items', 'menu'), requirement('Атмосфера или команда', 'body_or_items', 'atmosphere', 'chef'), requirement('Бронирование', 'body_or_items', 'booking'), requirement('Как добраться', 'body_or_items', 'location')],
  attraction: [requirement('Описание места', 'body', 'about'), requirement('Зоны или шоу', 'items', 'zones', 'shows'), requirement('Маршрут посещения', 'items', 'visit_routes'), requirement('Правила входа', 'body_or_items', 'entry_rules'), requirement('Как добраться', 'body_or_items', 'location')],
  transport: [requirement('Описание маршрута или терминала', 'body', 'about'), requirement('Посадка и отправление', 'body_or_items', 'boarding'), requirement('Маршруты или станции', 'items', 'routes', 'stations'), requirement('Как добраться', 'body_or_items', 'location')],
  park: [requirement('Описание парка', 'body', 'about'), requirement('Карта территории', 'body_or_items', 'map'), requirement('Прогулочные маршруты', 'items', 'walking_routes'), requirement('Сезонность', 'body_or_items', 'seasonality'), requirement('Как добраться', 'body_or_items', 'location')],
  space: [requirement('Описание пространства', 'body', 'about'), requirement('Активности', 'items', 'activities'), requirement('Точки внутри', 'items', 'places_inside'), requirement('Карта или маршрут', 'body_or_items', 'map', 'walking_routes'), requirement('Как добраться', 'body_or_items', 'location')],
  religion: [requirement('Описание места', 'body', 'about'), requirement('История', 'body_or_items', 'history'), requirement('Что посмотреть', 'items', 'highlights'), requirement('Правила посещения', 'body_or_items', 'entry_rules'), requirement('Как добраться', 'body_or_items', 'location')],
  sport: [requirement('Описание площадки', 'body', 'about'), requirement('Инфраструктура', 'items', 'spaces'), requirement('Оборудование', 'body_or_items', 'equipment'), requirement('Правила входа', 'body_or_items', 'entry_rules'), requirement('Как добраться', 'body_or_items', 'location')],
  venue: [requirement('Описание места', 'body', 'about'), requirement('Пространства и услуги', 'items', 'spaces', 'services'), requirement('Правила посещения', 'body_or_items', 'entry_rules'), requirement('Как добраться', 'body_or_items', 'location')],
};

export function placeSubtypeIssue(placeType?: string | null, placeSubtype?: string | null): PlaceSubtypeIssue | null {
  const type = String(placeType || '').trim().toUpperCase() as PlaceType;
  const subtype = String(placeSubtype || '').trim().toLowerCase();
  if (!subtype) return null;
  if (!isPlaceType(type)) return 'unknown_type';
  if (PLACE_SUBTYPE_OPTIONS[type].some((option) => option.value === subtype)) return null;
  const existsElsewhere = Object.entries(PLACE_SUBTYPE_OPTIONS).some(([otherType, options]) =>
    otherType !== type && options.some((option) => option.value === subtype));
  return existsElsewhere ? 'subtype_type_mismatch' : 'unknown_subtype';
}

/** Default editorial block profile. Editors may override the suggestion per Place. */
export const PLACE_PDP_VARIANT_BY_TYPE: Record<PlaceType, PlacePdpVariant> = {
  ARCHITECTURE: 'landmark',
  MONUMENT: 'landmark',
  MUSEUM: 'museum',
  RELIGION: 'religion',
  NATURE: 'nature',
  URBAN: 'urban_area',
  THEATRE: 'theater',
  ENTERTAINMENT: 'attraction',
  FOOD: 'food',
  VENUE: 'venue',
  TRANSPORT: 'transport',
  OTHER: 'venue',
};

export function suggestedPlacePdpVariant(
  placeType?: string | null,
  placeSubtype?: string | null,
): PlacePdpVariant {
  const type = String(placeType || '').trim().toUpperCase() as PlaceType;
  const subtype = String(placeSubtype || '').trim().toLowerCase();
  const subtypeOption = isPlaceType(type) ? PLACE_SUBTYPE_OPTIONS[type].find((option) => option.value === subtype) : undefined;
  if (subtypeOption?.variant) return subtypeOption.variant;
  return PLACE_PDP_VARIANT_BY_TYPE[type] || 'venue';
}

export function isPlaceType(value: unknown): value is PlaceType {
  return typeof value === 'string' && PLACE_TYPE_OPTIONS.some(([type]) => type === value);
}
