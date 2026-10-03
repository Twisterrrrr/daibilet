/** Perm hub suburb cards. Hyphen-only copy. */
import type { CitySuburbItem } from './cityInfo.ts';

export const PERM_SUBURBS: CitySuburbItem[] = [
  {
    name: 'Хохловка',
    visitMinutes: 'полдня',
    desc: 'Архитектурно-этнографический музей на Каме - деревянное зодчество Прикамья.',
    address: 'Пермский край, Ильинский район',
    venueSlug: 'muzej-hohlovka',
    latitude: 58.26186,
    longitude: 56.26314,
    travelVector: 'Камский / Ильинский вектор',
    travelVectorBlurb:
      'Закладывайте на автобус ~1 час, чтобы приехать к 9 утра.',
    timingNote:
      'По маршруту двигайтесь против часовой стрелки, напоследок оставив Усть-Боровский сользавод и смотровую площадку над заливом.',
    places: [
      { name: 'Усадьба Баяндиных', locationSlug: 'perm-usadba-bayandinyh', desc: 'купеческая усадьба с жилым домом и надворными постройками.', latitude: 58.2612, longitude: 56.2642 },
      { name: 'Ветряная мельница', locationSlug: 'perm-vetryanaya-melnitsa-hohlovka', desc: 'классический ветряк среди изб и хозяйственных построек.', latitude: 58.2598, longitude: 56.2612 },
      { name: 'Богородицкая церковь', locationSlug: 'perm-bogoroditskaya-tserkov-hohlovka', desc: 'деревянный храм экспозиции (+ Георгиевская церковь рядом в музейном секторе), перевезенный с берегов Камы.', latitude: 58.2609, longitude: 56.2621 },
      { name: 'Сторожевая башня', locationSlug: 'perm-storozhevaya-bashnya-hohlovka', desc: 'оборонительная деревянная башня на холме над заливом.', latitude: 58.2624, longitude: 56.2639 },
      { name: 'Охотничий дом / Заимка', locationSlug: 'perm-ohotnichiy-dom-hohlovka', desc: 'деревянный охотничий дом и заимка в музейной экспозиции - быт промыслов Прикамья.', latitude: 58.2605, longitude: 56.2635 },
      { name: 'Усть-Боровский сользавод', locationSlug: 'perm-ust-borovskiy-solzavod', desc: 'комплекс солеваренного промысла - визитная карточка музейной экспозиции; ближе к финалу круга.', latitude: 58.2632, longitude: 56.2648 },
      { name: 'Смотровая над заливом', locationSlug: 'perm-smotrovaya-nad-zalivom-hohlovka', desc: 'панорама Камского залива с холма музея - финальный кадр Хохловки.', latitude: 58.2628, longitude: 56.2618 },
    ]
  },
  {
    name: 'Кунгур',
    desc: 'Город купечества и ледяной пещеры в 90 км от Перми.',
    address: 'г. Кунгур, Пермский край',
    locationSlug: 'perm-kungur',
    latitude: 57.4333,
    longitude: 56.95,
    travelVector: 'Юго-восточный / Кунгурский вектор',
    travelVectorBlurb:
      'Пешком по центру Кунгура, затем на авто к ледяной пещере, на обратном пути - Вязовская пряничная.',
    places: [
      { name: 'Пуп Земли', locationSlug: 'perm-pup-zemli-kungur', desc: 'Необычный малый архитектурный памятник на набережной Кунгура, установленный в точке пересечения важнейших исторических дорог.', address: 'Пермский край, Кунгур, ул. Карла Маркса (на набережной реки Сылвы)', visitMinutes: 15, latitude: 57.428588, longitude: 56.938883 },
      { name: 'Набережная Сылвы', locationSlug: 'perm-naberezhnaya-sylvy', desc: 'прогулка вдоль реки в центре - часть пешеходного круга до авто-блока.', visitMinutes: 30, latitude: 57.4295, longitude: 56.9485 },
      { name: 'Тихвинская церковь', locationSlug: 'perm-tihvinskaya-tserkov-kungur', desc: 'храмовая доминанта старого Кунгура.', latitude: 57.4308, longitude: 56.9512 },
      { name: 'Гостиный двор', locationSlug: 'perm-gostinyy-dvor-kungur', desc: 'купеческий центр старого Кунгура - торговые ряды и каменная застройка.', latitude: 57.4328, longitude: 56.9438 },
      { name: 'Музей истории купечества', locationSlug: 'perm-muzey-istorii-kupechestva-kungur', desc: 'быт и история кунгурских купцов в историческом особняке.', latitude: 57.4335, longitude: 56.9455 },
      { name: 'Кунгурская ледяная пещера', desc: 'Одна из крупнейших и красивейших карстовых пещер в мире с подземными озерами и многовековыми ледяными гротами.', locationSlug: 'perm-kungurskaya-ledyanaya-peshchera', address: 'Пермский край, Кунгур, с. Филипповка', visitMinutes: 90, latitude: 57.440263, longitude: 57.006206, transitTip: 'Авто к пещере после центра (~15-20 мин)' },
      { name: 'Камень Ермак', locationSlug: 'perm-kamen-ermak', desc: 'скальный останец на Сылве, связанный с маршрутами Ермака - экстра к кунгурскому дню.', latitude: 57.3736, longitude: 57.0667, transitTip: 'Авто к Сылве; не совмещать с Белой горой и Плакуном' },
      { name: 'Вязовская пряничная', locationSlug: 'perm-vyazovskaya-pryanichnaya', desc: 'местная пряничная традиция - сладкий сувенир на выезде обратно в Пермь.', latitude: 57.4322, longitude: 56.9442, transitTip: 'На выезде обратно в Пермь - остановка у пряничной' },
    ]
  },
  {
    name: 'Православный Урал',
    desc: 'Белогорский монастырь, Царский крест, купель у горы и водопад Плакун за один день.',
    address: 'с. Белая Гора / Суксунский район',
    locationSlug: 'perm-belaya-gora',
    latitude: 57.39202,
    longitude: 56.229,
    travelVector: 'Южный / Суксунский вектор',
    travelVectorBlurb:
      'Трасса Р-242 / Суксун: монастырь - Царский крест - купель/источник у горы - Плакун. Не совмещать с камнем Ермак за один день - крюк под 100 км.',
    places: [
      { name: 'Белогорский Свято-Николаевский монастырь', desc: 'Величественный православный монастырь на вершине Белой горы, часто называемый «Уральским Афоном» за свою красоту и строгий устав.', locationSlug: 'perm-belogorskiy-monastyr', address: 'Пермский край, Кунгурский округ, д. Белая Гора, Монастырская ул., 1', visitMinutes: 60, latitude: 57.392398, longitude: 56.229415, transitTip: 'Авто по Р-242 / Суксун к монастырю' },
      { name: 'Царский крест', locationSlug: 'perm-tsarskiy-krest', desc: 'Огромный памятный крест в Белогорском монастыре, установленный в память о спасении цесаревича Николая Александровича после покушения в Японии.', address: 'Пермский край, Кунгурский округ, д. Белая Гора (у монастыря)', visitMinutes: 15, latitude: 57.391745, longitude: 56.22905 },
      { name: 'Купель / источник', locationSlug: 'perm-kupel-belaya-gora', desc: 'святой источник и купель у подножия монастырской горы - в связке с обителью.', visitMinutes: 20, latitude: 57.3906, longitude: 56.2278, transitTip: 'Спуск к купели у подножия - в связке с монастырём' },
      { name: 'Водопад Плакун', locationSlug: 'perm-vodopad-plakun', desc: 'живописный известняковый водопад в Суксунском районе - финал православного дня.', visitMinutes: 30, latitude: 57.3481, longitude: 57.0506, transitTip: 'Авто к Плакуну (Суксун); Ермак - в день Кунгура' },
    ]
  },
  {
    name: 'Усьва / Губаха за 2 дня',
    desc: 'Горнозаводской край на 2 дня: Усьвинские столбы и «Сердце Пармы», затем Каменный город и гора Крестовая.',
    address: 'Губаха / Усьва, Пермский край',
    locationSlug: 'perm-gubakha-usva',
    latitude: 58.723,
    longitude: 57.633,
    travelVector: 'Горнозаводской / Чусовской вектор',
    travelVectorBlurb:
      'День 1 - Усьва (столбы, смотровая, Загубашка); день 2 - Губаха (Каменный город, пещера Российская, Крестовая на закат). Полюд (~250 км) с этой поездкой не совмещать.',
    places: [
      {
        name: 'Усьвинские столбы',
        visitMinutes: 180,
        desc: 'Величественная многометровая каменная стена на берегу реки Усьвы, знаменитая отдельно стоящей скалой Чёртов Палец.',
        locationSlug: 'perm-usvinskie-stolby',
        latitude: 58.653457,
        longitude: 57.568472,
        dayLabel: 'День 1 - Усьва',
        transitTip: 'Трек / авто к столбам',
        address: 'Пермский край, Гремячинский городской округ, близ поселка Усьва',
      },
      {
        name: 'Смотровая Усьвинских столбов',
        locationSlug: 'perm-smotrovaya-usvinskie-stolby',
        visitMinutes: 30,
        desc: 'площадка с видом на отвесные скалы над Усьвой - главная панорама дня.',
        latitude: 58.7168,
        longitude: 57.6145,
        transitTip: 'После трека - Загубашка; Каменный город оставьте на день 2',
      },
      {
        name: 'Сердце Пармы (Загубашка)', locationSlug: 'perm-serdtse-parmy-zagubashka',
        visitMinutes: 60,
        desc: 'декорации и виды фильма/книги о Парме - после трека, неторопясь.',
        latitude: 58.705,
        longitude: 57.602,
      },
      {
        name: 'Каменный город',
        visitMinutes: 120,
        desc: 'Уникальный природный памятник из причудливых скальных останцев, напоминающих улочки, дома и площади древнего заброшенного города.',
        locationSlug: 'perm-kamennyy-gorod',
        latitude: 58.723049,
        longitude: 57.633454,
        dayLabel: 'День 2 - Губаха',
        transitTip: 'Авто/трек к Каменному городу',
        address: 'Пермский край, Гремячинский городской округ, близ поселка Шумихинский',
      },
      {
        name: 'Пещера Российская',
        locationSlug: 'perm-peschera-rossiyskaya',
        visitMinutes: 40,
        desc: 'карстовая пещера у Каменного города - осторожно на входе, без неоправданного риска и лишних приключений.',
        latitude: 58.7245,
        longitude: 57.636,
      },
      {
        name: 'Гора Крестовая',
        locationSlug: 'perm-gora-krestovaya',
        visitMinutes: 60,
        desc: 'отличный вид на закате.',
        latitude: 58.82861,
        longitude: 57.585,
        transitTip: 'К смотровой площадке',
      },
    ]
  },

];
