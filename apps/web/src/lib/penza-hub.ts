/** Penza tourist hub pack (owner 2026-08-18). Hyphen-only copy. */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { PENZA_LINE_DAY_ROUTE_PRESETS } from './penza-line-presets.ts';

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

export const PENZA_MUST_SEE: any[] = [
  place('Памятник Первопоселенцу', 'Главный символ Пензы на смотровой площадке старой крепости.', 53.195112, 45.019112, { address: 'ул. Кирова, смотровая площадка', locationSlug: 'penza-pamyatnik-pervoposelentsu', mustSeeFilter: 'monument', visitMinutes: 20, alsoMain: true }),
  place('Памятник В. Г. Белинскому', 'Классический памятник главному литературному имени города.', 53.198812, 45.016912, { address: 'сквер Белинского', locationSlug: 'penza-pamyatnik-belinskomu', mustSeeFilter: 'monument', visitMinutes: 15 }),
  place('Памятник М. Ю. Лермонтову', 'Литературный акцент центра и обязательная точка для города Лермонтова и Тархан.', 53.195612, 45.018412, { address: 'ул. Кирова', locationSlug: 'penza-pamyatnik-lermontovu', mustSeeFilter: 'monument', visitMinutes: 15 }),
  place('Памятник В. О. Ключевскому', 'Память о крупнейшем русском историке, связанном с Пензой.', 53.198112, 45.024112, { address: 'ул. Ключевского, 66', locationSlug: 'penza-pamyatnik-klyuchevskomu', mustSeeFilter: 'monument', visitMinutes: 15 }),
  place('Бюст Дениса Давыдова', 'Небольшой, но характерный военный акцент старой губернской Пензы.', 53.194812, 45.017512, { address: 'сквер у ул. Московской', locationSlug: 'penza-byust-denisa-davydova', mustSeeFilter: 'monument', visitMinutes: 10 }),
  place('Памятник ювелиру', 'Городская жанровая бронза на пешеходной Московской.', 53.194212, 45.016012, { address: 'ул. Московская', locationSlug: 'penza-pamyatnik-yuveliru', mustSeeFilter: 'monument', visitMinutes: 10 }),
  place('Памятник семье', 'Современная скульптура для спокойной прогулки по центру.', 53.194912, 45.016212, { address: 'Фонтанная площадь', locationSlug: 'penza-pamyatnik-seme', mustSeeFilter: 'monument', visitMinutes: 10 }),
  place('Памятник врачу', 'Небольшой жанровый монумент про мирную и умную Пензу.', 53.197112, 45.017912, { address: 'ул. Володарского', locationSlug: 'penza-pamyatnik-vrachu', mustSeeFilter: 'monument', visitMinutes: 10 }),
  place('Памятник матери', 'Тихая городская пластика рядом с пешеходным центром.', 53.196212, 45.019012, { address: 'сквер в центре', locationSlug: 'penza-pamyatnik-materi', mustSeeFilter: 'monument', visitMinutes: 10 }),
  place('Памятник чеканщику', 'Редкий городской сюжет про ремесленную историю.', 53.194412, 45.015712, { address: 'ул. Московская', locationSlug: 'penza-pamyatnik-chekanshchiku', mustSeeFilter: 'monument', visitMinutes: 10 }),
  place('Памятник В. Э. Мейерхольду', 'Театральный знак у дома, где прошли детские годы режиссера.', 53.196112, 45.020612, { address: 'ул. Володарского, 59', locationSlug: 'penza-pamyatnik-meyerholdu', mustSeeFilter: 'monument', visitMinutes: 15 }),
  place('Бюст А. Н. Радищева', 'Литературный мост между Пензой и музейным пригородом.', 53.195312, 45.018712, { address: 'центр города', locationSlug: 'penza-byust-radishcheva', mustSeeFilter: 'monument', visitMinutes: 10 }),
  place('Скульптура «Дама с собачкой»', 'Легкая жанровая точка на прогулочном маршруте.', 53.194712, 45.015212, { address: 'ул. Московская', locationSlug: 'penza-dama-s-sobachkoy', mustSeeFilter: 'monument', visitMinutes: 10 }),
  place('Памятник цирковым братьям Никитиным', 'Напоминание о том, что Пенза считает себя родиной русского стационарного цирка.', 53.193612, 45.016412, { address: 'у здания цирка', locationSlug: 'penza-pamyatnik-bratyam-nikitinym', mustSeeFilter: 'monument', visitMinutes: 15 }),
  place('Памятник строителям крепости', 'Монументальный сюжет о пограничном происхождении города.', 53.195412, 45.019412, { address: 'район старой крепости', locationSlug: 'penza-pamyatnik-stroitelyam-kreposti', mustSeeFilter: 'monument', visitMinutes: 15 }),

  place('Музей одной картины им. Г. В. Мясникова', 'Уникальный музейный формат с одним шедевром за сеанс.', 53.195512, 45.020112, { address: 'ул. Кирова, 11', venueSlug: 'penza-muzey-odnoy-kartiny-im-g-v-myasnikova', mustSeeFilter: 'museum', visitMinutes: 45, alsoMain: true }),
  place('Улица Московская', 'Пешеходная артерия Пензы с витринами, кафе и городским ритмом.', 53.194112, 45.015912, { address: 'ул. Московская', locationSlug: 'penza-penzenskaya-peshehodnaya-ulitsa-moskovskaya', mustSeeFilter: 'street', visitMinutes: 60, alsoMain: true }),
  place('Парк Белинского', 'Большой исторический парк на холме с тенистыми аллеями.', 53.201212, 45.014812, { address: 'ул. Карла Маркса, 1', locationSlug: 'penza-park-imeni-v-g-belinskogo', mustSeeFilter: 'park', visitMinutes: '1-2 ч', alsoMain: true }),
  place('Тарханы', 'Главный литературный day trip Пензы и родина Лермонтова в области.', 53.084112, 43.154912, { address: 'с. Лермонтово, музей-заповедник «Тарханы»', venueSlug: 'penza-muzey-zapovednik-tarhany', mustSeeFilter: 'museum', visitMinutes: 'полдня', alsoMain: true }),
  place('Светомузыкальный фонтан', 'Главное вечернее место центра с летними шоу.', 53.194312, 45.017012, { address: 'Фонтанная площадь', locationSlug: 'penza-svetozvukovoy-fontan', mustSeeFilter: 'views', visitMinutes: 30, alsoMain: true }),
  place('Спасский кафедральный собор', 'Белокаменный собор на исторической Соборной площади.', 53.194812, 45.018512, { address: 'Соборная площадь', locationSlug: 'penza-spasskiy-kafedralnyy-sobor', mustSeeFilter: 'temple', visitMinutes: 30, alsoMain: true }),
  place('Дворянское собрание', 'Главный классицистический фасад старой губернской Пензы.', 53.194912, 45.018912, { address: 'ул. Кирова, 13', locationSlug: 'penza-zdanie-dvoryanskogo-sobraniya', mustSeeFilter: 'houses', visitMinutes: 15 }),
  place('Дом Мейерхольда', 'Подлинная деревянная усадьба, где прошли детские годы режиссера.', 53.196112, 45.020612, { address: 'ул. Володарского, 59', venueSlug: 'penza-dom-meyerholda', mustSeeFilter: 'creative', visitMinutes: 45 }),
  place('Картинная галерея им. Савицкого', 'Главный художественный музей города с хорошим классическим собранием.', 53.196612, 45.018212, { address: 'ул. Советская, 3', venueSlug: 'penza-kartinnaya-galereya-im-savickogo', mustSeeFilter: 'museum', visitMinutes: '1-2 ч', alsoMain: true }),
  place('Музей В. О. Ключевского', 'Небольшой мемориальный музей в деревянном доме историка.', 53.198112, 45.024112, { address: 'ул. Ключевского, 66', venueSlug: 'penza-muzey-klyuchevskogo', mustSeeFilter: 'museum', visitMinutes: 45 }),
  place('Пензенский краеведческий музей', 'Полный срез истории губернии от археологии до модерна.', 53.197012, 45.020212, { address: 'ул. Красная, 73', venueSlug: 'penza-kraevedcheskiy-muzey', mustSeeFilter: 'museum', visitMinutes: '1-2 ч' }),
  place('Планетарий', 'Научная точка парка Белинского и хороший семейный stop.', 53.200812, 45.014112, { address: 'парк Белинского', venueSlug: 'penza-planetariy', mustSeeFilter: 'science', visitMinutes: 45 }),
  place('Литературный музей', 'Еще один важный слой для города Лермонтова, Куприна и Белинского.', 53.196412, 45.021112, { address: 'ул. Кирова, 2', venueSlug: 'penza-literaturnyy-muzey', mustSeeFilter: 'literature', visitMinutes: 45 }),
  place('Дом губернатора', 'Спокойная административная классика старого центра.', 53.195012, 45.018212, { address: 'ул. Советская', locationSlug: 'penza-dom-gubernatora', mustSeeFilter: 'houses', visitMinutes: 15 }),
  place('Дом купца Мясникова', 'Купеческий фасад, напоминающий о меценатской линии города.', 53.195212, 45.019712, { address: 'центр Пензы', locationSlug: 'penza-dom-kuptsa-myasnikova', mustSeeFilter: 'mansions', visitMinutes: 15 }),
  place('Народный дом', 'Сцена и общественная история провинциальной культуры рубежа веков.', 53.195912, 45.017412, { address: 'ул. Московская, 89', locationSlug: 'penza-narodnyy-dom', mustSeeFilter: 'houses', visitMinutes: 15 }),
  place('Здание Государственного банка', 'Главный банковский фасад центра, координата здесь должна оставаться в пределах 53-й широты.', 53.184912, 45.010912, { address: 'ул. Московская', locationSlug: 'penza-zdanie-gosudarstvennogo-banka', mustSeeFilter: 'houses', visitMinutes: 15 }),
  place('Пензенский драмтеатр', 'Главная вечерняя сцена города на московском проспекте центра.', 53.195812, 45.016712, { address: 'ул. Московская, 89', venueSlug: 'penza-dramaticheskiy-teatr-lunacharskogo', mustSeeFilter: 'creative', visitMinutes: 90 }),
  place('Филармония и органный зал', 'Музыкальная Пенза без лишней помпы, но с сильной акустикой.', 53.193112, 45.022112, { address: 'ул. Суворова, 215', venueSlug: 'penza-filarmoniya', mustSeeFilter: 'creative', visitMinutes: 90 }),
  place('Театр юного зрителя', 'Камерная театральная площадка и хороший семейный вечер.', 53.194612, 45.020512, { address: 'ул. Тарханова', venueSlug: 'penza-teatr-yunogo-zritelya', mustSeeFilter: 'science', visitMinutes: 60 }),
  place('Ботанический сад ПГУ', 'Тихая зеленая точка вне суеты центра.', 53.189712, 45.020812, { address: 'ул. Карла Маркса, 2А', locationSlug: 'penza-botanicheskiy-sad-pgu', mustSeeFilter: 'park', visitMinutes: '1-2 ч' }),
  place('Олимпийская аллея', 'Любимый городской променад для пробежек и длинных прогулок.', 53.205112, 45.001112, { address: 'район Олимпийской аллеи', locationSlug: 'penza-olimpiyskaya-alleya', mustSeeFilter: 'park', visitMinutes: 60 }),
  place('Сквер им. Дениса Давыдова', 'Небольшой литературный сквер в центре прогулочного каркаса.', 53.194512, 45.018012, { address: 'ул. Кирова', locationSlug: 'penza-skver-denisa-davydova', mustSeeFilter: 'park', visitMinutes: 20 }),
  place('Сквер Славы', 'Мемориальный сквер с хорошей обзорной паузой.', 53.193912, 45.017712, { address: 'центр города', locationSlug: 'penza-skver-slavy', mustSeeFilter: 'park', visitMinutes: 20 }),
  place('Набережная Суры', 'Не самый столичный, но важный водный слой городской прогулки.', 53.191812, 45.022712, { address: 'берег Суры', locationSlug: 'penza-naberezhnaya-sury', mustSeeFilter: 'views', visitMinutes: 45 }),
  place('Тропа здоровья', 'Лесная прогулка на границе парковых и природных участков.', 53.203112, 45.004112, { address: 'лесопарковая зона', locationSlug: 'penza-tropa-zdorovya', mustSeeFilter: 'park', visitMinutes: 60 }),
  place('Успенский кафедральный собор', 'Классический городской храм с более спокойной атмосферой, чем у Спасского.', 53.201912, 45.019812, { address: 'ул. Захарова', locationSlug: 'penza-uspenskiy-kafedralnyy-sobor', mustSeeFilter: 'temple', visitMinutes: 30 }),
  place('Покровская церковь', 'Камерный исторический храм старой Пензы.', 53.194212, 45.020412, { address: 'ул. Чкалова', locationSlug: 'penza-pokrovskaya-cerkov', mustSeeFilter: 'temple', visitMinutes: 25 }),
  place('Троицкий монастырь', 'Тихая духовная точка за пределами прогулочной магистрали.', 53.188212, 45.027112, { address: 'ул. Троицкая', locationSlug: 'penza-troickiy-monastyr', mustSeeFilter: 'temple', visitMinutes: 30 }),
  place('Московские торговые ряды', 'Остатки купеческой коммерческой Пензы в главной пешеходной зоне.', 53.194012, 45.015412, { address: 'ул. Московская', locationSlug: 'penza-torgovye-ryady', mustSeeFilter: 'houses', visitMinutes: 15 }),
  place('Дом купца Карпова', 'Хороший пример деревянной и каменной городской усадьбы.', 53.196212, 45.021812, { address: 'ул. Кирова', locationSlug: 'penza-dom-kuptsa-karpova', mustSeeFilter: 'mansions', visitMinutes: 15 }),
  place('Дом-музей Бурденко', 'Медицинская история города и тихий мемориальный формат.', 53.197612, 45.023412, { address: 'ул. Володарского', venueSlug: 'penza-dom-muzey-burdenko', mustSeeFilter: 'museum', visitMinutes: 40 }),
  place('Ротонда в парке Белинского', 'Простая, но фотогеничная парковая точка на верхнем ярусе.', 53.200912, 45.014612, { address: 'парк Белинского', locationSlug: 'penza-rotonda-v-parke-belinskogo', mustSeeFilter: 'views', visitMinutes: 15 }),
  place('Смотровая на старую Пензу', 'Видовая площадка у крепостного холма и исторического ядра.', 53.195212, 45.019312, { address: 'район старой крепости', locationSlug: 'penza-smotrovaya-staraya-penza', mustSeeFilter: 'views', visitMinutes: 20, alsoMain: true }),
  place('Гастроквартал Московской', 'Кофейни, десерты и бары на главной улице без лишних поисков.', 53.194012, 45.015512, { address: 'ул. Московская', locationSlug: 'penza-moskovskaya-gastro-kvartal', mustSeeFilter: 'gastro', visitMinutes: 60 }),
  place('Ресторан с пензенской локальной кухней', 'Поволжская и русская кухня для паузы после центра.', 53.194612, 45.017112, { address: 'центр Пензы', locationSlug: 'penza-restoran-lokalnoy-kuhni', mustSeeFilter: 'gastro', visitMinutes: 75 }),
  place('Кофейни Фонтанной площади', 'Быстрый и недорогой городской отдых до вечернего шоу.', 53.194412, 45.017212, { address: 'Фонтанная площадь', locationSlug: 'penza-kofeyni-fontannoy-ploshchadi', mustSeeFilter: 'gastro', visitMinutes: 40 }),
  place('Центральный рынок Пензы', 'Провинциальный рынок с местными сладостями, молочкой и сезонными продуктами.', 53.191912, 45.018812, { address: 'центр города', locationSlug: 'penza-centralnyy-rynok', mustSeeFilter: 'gastro', visitMinutes: 45 }),
];

export const PENZA_SUBURBS: any[] = [
  {
    name: 'Тарханы',
    desc: 'Большой литературный выезд в лермонтовское Лермонтово: усадьба, парк, церковь и сильное чувство русской провинциальной поэзии.',
    locationSlug: 'penza-tarhany-day-trip',
    mustSeeFilter: 'main',
    visitMinutes: 'полдня',
    latitude: 53.084112,
    longitude: 43.154912,
    address: 'Пензенская обл., с. Лермонтово',
    travelVector: 'Автобус или авто ~1,5-2 часа',
    travelVectorBlurb: 'Лучше выезжать рано: дорога несложная, но сам музейный комплекс большой и требует времени.',
    logisticsExit: 'парковка музея-заповедника / остановка у входа',
    gastroStop: { name: 'Пироги и чай в дороге', blurb: 'Это именно литературный выезд. Полноценный обед чаще удобнее планировать уже после возвращения в Пензу.' },
    places: [
      place('Барский дом Лермонтовых', 'Главное ядро усадьбы и главный музейный рассказ о ранних годах поэта.', 53.084112, 43.154912, { address: 'территория музея', locationSlug: 'penza-tarhany-barskiy-dom', mustSeeFilter: 'museum', visitMinutes: 45 }),
      place('Церковь Марии Египетской', 'Усадебный храм и важная часть ансамбля.', 53.083912, 43.154512, { address: 'территория музея', locationSlug: 'penza-tarhany-cerkov-marii-egipetskoy', mustSeeFilter: 'temple', visitMinutes: 20 }),
      place('Парк и липовые аллеи', 'Тихие маршруты, которые лучше всего объясняют атмосферу Тархан.', 53.084512, 43.154212, { address: 'территория музея', locationSlug: 'penza-tarhany-park', mustSeeFilter: 'park', visitMinutes: 40 }),
      place('Людская изба', 'Бытовой слой усадьбы без музейной лакировки.', 53.084212, 43.155212, { address: 'территория музея', locationSlug: 'penza-tarhany-lyudskaya-izba', mustSeeFilter: 'museum', visitMinutes: 20 }),
      place('Склеп-часовня Арсеньевых', 'Родовой мемориал и еще одна важная эмоциональная точка маршрута.', 53.083512, 43.156112, { address: 'территория музея', locationSlug: 'penza-tarhany-sklep-arsenevyh', mustSeeFilter: 'monument', visitMinutes: 20 }),
    ],
  },
  {
    name: 'Ахунский сосновый бор',
    desc: 'Быстрый природный выезд почти без длинной логистики: сосновый воздух, тропы, санаторный ритм и легкая разгрузка после центра.',
    locationSlug: 'penza-ahunskiy-sosnovyy-bor',
    mustSeeFilter: 'main',
    visitMinutes: '3-4 ч',
    latitude: 53.246112,
    longitude: 45.045112,
    address: 'район Ахуны, Пенза',
    travelVector: 'Автобус или такси ~25-35 минут',
    travelVectorBlurb: 'Можно ехать даже без машины: это самый простой природный day trip прямо из города.',
    logisticsExit: 'остановки района Ахуны / санаторная зона',
    gastroStop: { name: 'Термос и перекус', blurb: 'Это прогулка ради воздуха и сосен. Легкий перекус лучше взять с собой.' },
    places: [
      place('Сосновые аллеи Ахуна', 'Главное, ради чего сюда едут: длинная прогулка по хвойному лесу.', 53.246112, 45.045112, { address: 'лесопарк Ахуны', locationSlug: 'penza-ahuny-sosnovye-allei', mustSeeFilter: 'park', visitMinutes: 60 }),
      place('Смотровые просеки', 'Открытые участки леса с более свободным воздухом и светом.', 53.247112, 45.044412, { address: 'лесопарк Ахуны', locationSlug: 'penza-ahuny-smotrovye-proseki', mustSeeFilter: 'views', visitMinutes: 25 }),
      place('Санаторный квартал', 'Редкий слой советской курортной архитектуры внутри городского леса.', 53.245512, 45.046012, { address: 'район Ахуны', locationSlug: 'penza-ahuny-sanatornyy-kvartal', mustSeeFilter: 'houses', visitMinutes: 20 }),
      place('Лесные тропы здоровья', 'Неспешные кольцевые маршруты без сложного рельефа.', 53.246812, 45.043912, { address: 'лесопарк Ахуны', locationSlug: 'penza-ahuny-tropy-zdorovya', mustSeeFilter: 'park', visitMinutes: 45 }),
    ],
  },
  {
    name: 'Музей-заповедник Радищева',
    desc: 'Небольшой, но содержательный литературный выезд в старую усадебную Россию с Радищевым, церковью и тихим сельским ландшафтом.',
    locationSlug: 'penza-radishchevo-muzey-zapovednik',
    mustSeeFilter: 'main',
    visitMinutes: '5-6 ч',
    latitude: 52.987112,
    longitude: 46.061112,
    address: 'Пензенская обл., с. Радищево',
    travelVector: 'Авто ~2 ч',
    travelVectorBlurb: 'Это спокойный литературный day trip без спешки. Лучше совмещать усадьбу и прогулку по селу в один выезд.',
    logisticsExit: 'парковка у музея-заповедника',
    places: [
      place('Барский дом', 'Главный мемориальный корпус и основа рассказа о семье Радищевых.', 52.987112, 46.061112, { address: 'территория музея', locationSlug: 'penza-radishchevo-barskiy-dom', mustSeeFilter: 'museum', visitMinutes: 40 }),
      place('Преображенская церковь', 'Сельский храм и архитектурный акцент ансамбля.', 52.986812, 46.060712, { address: 'с. Радищево', locationSlug: 'penza-radishchevo-preobrazhenskaya-cerkov', mustSeeFilter: 'temple', visitMinutes: 20 }),
      place('Парк усадьбы', 'Тихий прогулочный слой без музейной спешки.', 52.987412, 46.060412, { address: 'территория музея', locationSlug: 'penza-radishchevo-park-usadby', mustSeeFilter: 'park', visitMinutes: 30 }),
      place('Сельская панорама', 'Лучшая точка, чтобы почувствовать масштаб тихой провинции.', 52.987612, 46.061512, { address: 'окрестности села', locationSlug: 'penza-radishchevo-panorama', mustSeeFilter: 'views', visitMinutes: 20 }),
    ],
  },
  {
    name: 'Наровчат и музей Куприна',
    desc: 'Исторический Наровчат - очень содержательный выезд про Куприна, монастырь и старую уездную Россию.',
    locationSlug: 'penza-narovchat-kuprin',
    mustSeeFilter: 'main',
    visitMinutes: '7-8 ч',
    latitude: 53.876112,
    longitude: 43.694112,
    address: 'Пензенская обл., с. Наровчат',
    travelVector: 'Авто ~2.5-3 ч',
    travelVectorBlurb: 'Это дальний, но насыщенный маршрут. Имеет смысл ехать рано утром и планировать целый день.',
    logisticsExit: 'центр Наровчата / музейный квартал',
    places: [
      place('Дом-музей Куприна', 'Главная причина ехать в Наровчат и лучший литературный слой этого маршрута.', 53.876112, 43.694112, { address: 'центр Наровчата', venueSlug: 'penza-narovchat-dom-muzey-kuprina', mustSeeFilter: 'literature', visitMinutes: 45 }),
      place('Троице-Сканов монастырь', 'Один из самых впечатляющих монастырских комплексов Пензенской области.', 53.872812, 43.699112, { address: 'окрестности Наровчата', locationSlug: 'penza-narovchat-troice-skanov-monastyr', mustSeeFilter: 'temple', visitMinutes: 40 }),
      place('Пещеры Наровчата', 'Подземный слой маршрута для тех, кто хочет больше, чем музей и храм.', 53.872412, 43.699612, { address: 'окрестности Наровчата', locationSlug: 'penza-narovchat-peshchery', mustSeeFilter: 'science', visitMinutes: 30 }),
      place('Уездный центр Наровчата', 'Спокойная прогулка по старому селу с историческим масштабом.', 53.875812, 43.693712, { address: 'центр Наровчата', locationSlug: 'penza-narovchat-uezdnyy-centr', mustSeeFilter: 'street', visitMinutes: 30 }),
    ],
  },
];

export const PENZA_DAY_ROUTE_PRESETS: any[] = [
  {
    id: 'penza-classic-center',
    title: 'Старая крепость и спокойный центр',
    description: 'Первый день в Пензе: крепостной холм, собор, Московская и музей одной картины.',
    travelVector: 'Пешком по центру',
    timingNote: 'Около 4 часов с одной длинной музейной паузой и фонтанным финалом.',
    stops: [
      place('Памятник Первопоселенцу', 'Старт на лучшей исторической смотровой.', 53.195112, 45.019112, { address: 'ул. Кирова', locationSlug: 'penza-pamyatnik-pervoposelentsu', mustSeeFilter: 'monument', visitMinutes: 20, alsoMain: true }),
      place('Спасский собор', 'Полчаса на собор и площадь.', 53.194812, 45.018512, { address: 'Соборная площадь', locationSlug: 'penza-spasskiy-kafedralnyy-sobor', mustSeeFilter: 'temple', visitMinutes: 30, alsoMain: true }),
      place('Музей одной картины', 'Ключевая музейная пауза Пензы.', 53.195512, 45.020112, { address: 'ул. Кирова, 11', venueSlug: 'penza-muzey-odnoy-kartiny-im-g-v-myasnikova', mustSeeFilter: 'museum', visitMinutes: 45, alsoMain: true }),
      place('Улица Московская', 'Главная пешая прогулка центра.', 53.194112, 45.015912, { address: 'ул. Московская', locationSlug: 'penza-penzenskaya-peshehodnaya-ulitsa-moskovskaya', mustSeeFilter: 'street', visitMinutes: 45, alsoMain: true }),
      place('Фонтанная площадь', 'Вечерний финал с фонтаном и кафе.', 53.194312, 45.017012, { address: 'Фонтанная площадь', locationSlug: 'penza-svetozvukovoy-fontan', mustSeeFilter: 'views', visitMinutes: 30, alsoMain: true }),
    ],
  },
  {
    id: 'penza-theatre-art',
    title: 'Театр, Мейерхольд и парк',
    description: 'Культурная Пенза без спешки: Дом Мейерхольда, галерея и зеленый финал в парке Белинского.',
    travelVector: 'Пешком по центру и на холм',
    timingNote: 'Около 4-5 часов с галереей и парком.',
    stops: [
      place('Дом Мейерхольда', 'Старт с театральной биографии города.', 53.196112, 45.020612, { address: 'ул. Володарского, 59', venueSlug: 'penza-dom-meyerholda', mustSeeFilter: 'creative', visitMinutes: 45 }),
      place('Картинная галерея', 'Час-полтора на коллекцию Савицкого.', 53.196612, 45.018212, { address: 'ул. Советская, 3', venueSlug: 'penza-kartinnaya-galereya-im-savickogo', mustSeeFilter: 'museum', visitMinutes: '1-2 ч', alsoMain: true }),
      place('Драмтеатр', 'Театральный фасад и вечерний план.', 53.195812, 45.016712, { address: 'ул. Московская, 89', venueSlug: 'penza-dramaticheskiy-teatr-lunacharskogo', mustSeeFilter: 'creative', visitMinutes: 20 }),
      place('Парк Белинского', 'Длинная зеленая пауза на холме.', 53.201212, 45.014812, { address: 'ул. Карла Маркса, 1', locationSlug: 'penza-park-imeni-v-g-belinskogo', mustSeeFilter: 'park', visitMinutes: 60, alsoMain: true }),
      place('Кофейни Московской', 'Финал без лишней логистики.', 53.194012, 45.015512, { address: 'ул. Московская', locationSlug: 'penza-moskovskaya-gastro-kvartal', mustSeeFilter: 'gastro', visitMinutes: 50 }),
    ],
  },
  ...PENZA_LINE_DAY_ROUTE_PRESETS,
];

export const PENZA_FAQ: Array<{ q: string; a: string }> = [
  { q: 'Правда ли, что в Пензе находится единственный в мире музей Мейерхольда?', a: 'Да, Дом Мейерхольда в Пензе - редкий мемориальный и театральный музейный формат в подлинной городской усадьбе семьи режиссера.' },
  { q: 'Как работает пензенский светомузыкальный фонтан?', a: 'Днем это обычная центральная площадь для прогулок, а самые эффектные программы включают вечером в теплый сезон, особенно по выходным и праздникам.' },
  { q: 'Далеко ли ехать до Тархан?', a: 'От Пензы до Лермонтово около 100 км. На машине или автобусе закладывайте около 1,5-2 часов в одну сторону и минимум полдня на сам музей.' },
  { q: 'Чем Пенза интересна кроме Лермонтова?', a: 'Помимо литературного слоя здесь сильны Мейерхольд, музей одной картины, тихая губернская архитектура, большой парк Белинского и редкий для центра масштаб спокойствия.' },
];

export const PENZA_TRAVEL =
  'Лучшее время для Пензы - с конца мая до начала октября. Летом работает фонтанная площадь, приятнее гулять по Московской и дольше открыт парк Белинского. Осень особенно хороша для спокойного литературного маршрута и выезда в Тарханы. Зимой город не такой событийный, зато музеи и театр собираются в компактный и удобный маршрут без длинной логистики.';
