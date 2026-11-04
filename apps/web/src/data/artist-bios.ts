/**
 * Verified artist bios for concert leads.
 *
 * Rules:
 * - only general, checkable facts: genre, city, year, key releases;
 * - paraphrase, never copy provider text verbatim;
 * - `bio` continues the lead sentence, so it starts with "Екатеринбургская
 *   группа...", not with the artist name again;
 * - user-facing copy uses a hyphen, not an en/em dash;
 * - `sourceUrl` is kept for editorial review and is not rendered.
 */
export type ArtistBio = {
  artist: string;
  aliases: string[];
  bio: string;
  sourceUrl: string;
  /** `prefix` allows "Сова. Большой концерт"; default is exact match only. */
  match?: 'exact' | 'prefix';
};

export const ARTIST_BIOS: ArtistBio[] = [
  {
    artist: 'Сова',
    aliases: ['сова'],
    bio: 'Екатеринбургская группа, основанная в 2017 году Тарасом Овсянниковым и Павлом Штонденко. Играет на стыке инди-попа и пост-панка, известна песнями «Гроза», «Сериал» и «Главный герой».',
    sourceUrl: 'https://live.mts.ru/persons/gruppa_sova',
  },
  {
    artist: 'Нурминский',
    aliases: ['нурминский'],
    bio: 'Рэпер из Татарстана, настоящее имя Альберт Шарафутдинов. Начал карьеру в 2017 году, широкую известность получил с песней «Мент», основал лейбл Tatlanta Music.',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Нурминский_(музыкант)',
  },
  {
    artist: 'МЕГАМОЗГ',
    aliases: ['мегамозг'],
    bio: 'Российская группа в масках, играет на стыке ню-метала, альтернативного рока и электроники. Известна треками «Это всё» (совместно с Sagath) и «Корабли», альбомом «Красный Октябрь».',
    sourceUrl: 'https://www.ticketland.ru/journal/interview/blitz/about-megamozg/',
  },
  {
    artist: 'IVAN ZOLO',
    aliases: ['ivan zolo', 'иван золо'],
    bio: 'Московский тиктокер, стример и музыкант, настоящее имя Иван Золочевский. Известен вирусными треками «Баобаб», «Альтушка» и «Медоед», начинал с TikTok и стримов.',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Иван_Золо',
  },
  {
    artist: 'Шура',
    aliases: ['шура'],
    bio: 'Российский эстрадный певец Александр Медведев, выступает под псевдонимом Шура. Работает в поп- и евродэнс-звучании с 1996 года, известен песнями «Ты не верь слезам», «Холодная луна» и «Твори добро».',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Шура_(певец)',
  },
  {
    artist: 'Uglystephan',
    aliases: ['uglystephan'],
    bio: 'Московский рэп-исполнитель, выступает под псевдонимом Uglystephan. Начал карьеру в 2018 году, известен треками «Slime Love», «Red Dot» и «G19», дебютный альбом выпустил в 2020 году.',
    sourceUrl: 'https://aboutan.ru/muzyka/uglystephan.html',
  },
  {
    artist: 'Kamazz',
    aliases: ['kamazz'],
    bio: 'Российский рэп- и трэп-исполнитель Денис Розыскул, родился в Астрахани. Начинал с региональных конкурсов, позже переехал в Москву; известен лирическими треками и кавер-версией «Текила-любовь».',
    sourceUrl: 'https://biographe.ru/znamenitosti/kamazz/',
  },
  {
    artist: 'Интонация',
    aliases: ['интонация'],
    bio: 'Российский поп-дуэт Дениса FILL и Александра ЛИРа. Работает с 2010-х, известен альбомами «Всё просто» и «Вера внутри».',
    sourceUrl: 'https://www.zvuki.ru/A/P/66095/members/',
  },
  {
    artist: 'Aikko',
    aliases: ['aikko', 'айкко'],
    bio: 'Рэп-исполнитель из Минска, настоящее имя Владислав Кособуцкий. С 2015 года участник объединения «КаждаяБарбиСтерва», известен альбомами «Делаю любовь» и «Боюсь Остыть».',
    sourceUrl: 'https://artchange.ru/biography/aikko',
  },
  {
    artist: 'Света',
    aliases: ['света'],
    bio: 'Российская поп-певица Светлана Колтунова, выступает под псевдонимом Света. Начала карьеру в 1998 году, известна песнями «Что мне делать?», «Твои глаза» и «Сердце моё».',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Света_(певица)',
  },
  {
    artist: 'Lizer',
    aliases: ['lizer', 'лизер'],
    bio: 'Московский рэп-исполнитель Арсен Магомадов, бывший участник объединения «Закат 99.1». Известен треками «False Mirror», «Между нами» и «Корабли», альбомом «Не ангел».',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Lizer',
  },
  {
    artist: 'Anna Asti',
    aliases: ['anna asti', 'анна асти'],
    bio: 'Поп-певица Анна Дзюба, выступает под псевдонимом Anna Asti. Бывшая солистка Artik & Asti, сольную карьеру начала в 2022 году; известна песнями «По барам», «Ночью на кухне» и «Царица».',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Anna_Asti',
  },
  {
    artist: 'Мираж',
    aliases: ['мираж'],
    bio: 'Советская и российская группа, основанная в 1986 году в Москве. Работает в стиле евродиско, художественный руководитель - Андрей Литягин; известна песнями «Музыка нас связала» и «Снова вместе».',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Мираж_(группа)',
  },
  {
    artist: 'Сергей Маврин',
    aliases: ['сергей маврин'],
    bio: 'Российский гитарист и композитор, родился в Казани. Играл в «Чёрном кофе», «Арии» и «Кипелове», в 1997 году основал группу «Маврин», работающую в жанре хеви-метал.',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Маврин,_Сергей_Константинович',
  },
  {
    artist: 'Многоточие',
    aliases: ['многоточие'],
    bio: 'Московская рэп-группа, основанная в 1998 году. Лидер и автор большинства текстов - Рустам Аляутдинов (Руставели); работает в жанре осознанного хип-хопа, известна альбомами «Жизнь и Свобода» и «Зеркала».',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Многоточие_(группа)',
  },
  {
    artist: 'Анастасия Высоцкая LADYNSAX',
    aliases: ['анастасия высоцкая ladynsax', 'ladynsax'],
    bio: 'Саксофонистка Анастасия Высоцкая, выступает с проектом LADYNSAX. Строит программу вокруг живого саксофона и гитары Сергея Филиппова, соединяя лиричные и танцевальные пьесы.',
    sourceUrl: 'https://ladynsax.ru/',
  },
  {
    artist: 'Марко Поло',
    aliases: ['марко поло'],
    bio: 'Московская фолк-рок группа, основанная в 2014 году. Вокалистка и автор песен - Людмила Савостьянова; коллектив соединяет русский фолк с западным фолк-роком, известен альбомами «Изумрудный город» и «Алые паруса».',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Марко_Поло_(группа)',
  },
  {
    artist: 'Питоны 3000',
    aliases: ['питоны 3000'],
    bio: 'Пензенская панк-группа, основанная в 2006 году. Играет на стыке панк-рока, ска и рэпкора; известна альбомами «Хорошие манеры плохого тона» и «Мама».',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Питоны_3000',
  },
  {
    artist: 'TumaniYO',
    aliases: ['tumaniyo'],
    bio: 'Рэп-исполнитель Александр Селезнёв, родом из Астрахани. Первый артист лейбла Hajime Records (Miyagi & Andy Panda), известен треком «Dance Up» и сотрудничеством со Скриптонитом.',
    sourceUrl: 'https://the-flow.ru/new-flow/new-flow-vol4-tumaniyo',
  },
];
