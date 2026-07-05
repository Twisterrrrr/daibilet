const CITY_ALIASES = {
  'анкт-петербург': 'Санкт-Петербург',
  'инопской': 'Санкт-Петербург',
  'инопская': 'Санкт-Петербург',
  'основское': 'Сосновское',
  'пуск': 'Санкт-Петербург',
  'плетни': 'Санкт-Петербург',
  'оляной': 'Санкт-Петербург',
  'аунд': 'Санкт-Петербург',
  'ветланская': 'Владивосток',
  'тромынский': 'Москва',
  'партаковская': 'Москва',
  'тороны': 'Москва',
  'ити': 'Владивосток',
  'алиха': 'Казань',
  'ерова': 'Самара',
  'цена': 'Нижний Новгород',
  'вобода': 'Самара',
  'оветская': 'Самара',
  'троителей': 'Тольятти',
  'троение': 'Тольятти',
  'не указан': null,
};

const TYPE_LABEL = {
  museum_art_space: 'музей и выставочное пространство',
  theater: 'театр',
  concert_hall: 'концертная площадка',
  club_bar_restaurant: 'клуб или ресторан',
  pier: 'причал',
  venue: 'локация на набережной',
  outdoor_location: 'открытая локация',
  sport_activity_space: 'площадка для активного отдыха',
};

export function cityLabel(city) {
  if (!city) return 'России';
  return city;
}

/** Фраза «в …» с корректным падежом для частых городов */
export function cityInPhrase(city) {
  if (!city) return 'в России';
  const map = {
    'Санкт-Петербург': 'в Санкт-Петербурге',
    Москва: 'в Москве',
    Казань: 'в Казани',
    'Нижний Новгород': 'в Нижнем Новгороде',
    'Ростов-на-Дону': 'в Ростове-на-Дону',
    'Набережные Челны': 'в Набережных Челнах',
    'Улан-Удэ': 'в Улан-Удэ',
    'Южно-Сахалинск': 'на Южном Сахалине',
    Владивосток: 'во Владивостоке',
    Екатеринбург: 'в Екатеринбурге',
    Новосибирск: 'в Новосибирске',
    Красноярск: 'в Красноярске',
    Сочи: 'в Сочи',
    Пермь: 'в Перми',
    Самара: 'в Самаре',
    Уфа: 'в Уфе',
    Тюмень: 'в Тюмени',
    Омск: 'в Омске',
    Челябинск: 'в Челябинске',
    Воронеж: 'в Воронеже',
    Ярославль: 'в Ярославле',
    Тула: 'в Туле',
    Владимир: 'во Владимире',
    Иркутск: 'в Иркутске',
    Хабаровск: 'в Хабаровске',
    Краснодар: 'в Краснодаре',
    Вологда: 'в Вологде',
    Липецк: 'в Липецке',
    Тверь: 'в Твери',
    Орёл: 'в Орле',
    Калининград: 'в Калининграде',
    Чита: 'в Чите',
    Оренбург: 'в Оренбурге',
    Кемерово: 'в Кемерово',
    Барнаул: 'в Барнауле',
    Саратов: 'в Саратове',
    Ижевск: 'в Ижевске',
    Рязань: 'в Рязани',
    Ставрополь: 'в Ставрополе',
    Курган: 'в Кургане',
    Томск: 'в Томске',
    Геленджик: 'в Геленджике',
    Новороссийск: 'в Новороссийске',
  };
  return map[city] || `в ${city}`;
}

export function normalizeCity(venue) {
  const raw = String(venue.city || '').trim();
  const lower = raw.toLowerCase();
  if (CITY_ALIASES[lower] !== undefined) return CITY_ALIASES[lower];
  if (lower && lower.length > 2 && !/^[а-яё]{2,4}$/i.test(raw)) return raw;

  const address = String(venue.address || '');
  const spb = address.match(/Санкт-Петербург/i);
  if (spb) return 'Санкт-Петербург';
  const msk = address.match(/\bМосква\b/i);
  if (msk) return 'Москва';
  const kzn = address.match(/\bКазань\b/i);
  if (kzn) return 'Казань';

  return raw || null;
}

export function typeLabel(type) {
  return TYPE_LABEL[type] || 'площадка';
}

export function isOperationalShort(text) {
  if (!text) return false;
  const t = text.trim();
  if (t.length < 25) return false;
  // Служебные подписи Teplohod: названия теплоходов, расписание судов
  if (/москва-\d|флагман|ривер palace|теплоход|яхта\s|сектор\s*[«"a-z]/i.test(t)) return false;
  if (/\d{1,2}:\d{2}/.test(t) && /,/.test(t)) return false;
  if ((t.match(/«/g) || []).length >= 2) return false;
  if (t.split(',').length >= 3 && t.length < 120) return false;
  if (t === t.toUpperCase() && t.length < 50) return false;
  // Нормальный маркeting-текст: есть глагол или несколько слов
  if (!/[.!?]/.test(t) && t.split(/\s+/).length < 6) return false;
  return true;
}

export function cleanWikiText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/\[\d+\]/g, '')
    .trim();
}

export function truncate(text, max) {
  const t = cleanWikiText(text);
  if (t.length <= max) return t;
  const slice = t.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  return `${slice.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trim()}…`;
}

export function firstSentence(text, maxLen = 220) {
  const t = cleanWikiText(text);
  const match = t.match(/^(.{40,}?[.!?])(?:\s|$)/);
  const sentence = match ? match[1] : t;
  return truncate(sentence, maxLen);
}

/** Прямые ссылки на статьи Wikipedia для известных площадок */
const WIKI_OVERRIDES = {
  'Зимний театр': 'Зимний театр (Сочи)',
  'Музей современного искусства PERMM': 'PERMM',
  'Планетарий 1': 'Планетарий № 1',
  'Московский художественный театр комедии': 'Московский художественный театр',
  'Клуб "Космонавт"': 'Космонавт (клуб, Санкт-Петербург)',
  'Клуб «Космонавт»': 'Космонавт (клуб, Санкт-Петербург)',
  'Национальный центр «Россия»': 'Павильон «Россия» на ВДНХ',
  'Красный Октябрь': 'Красный Октябрь (шоколадная фабрика)',
  'Коломенское': 'Коломенское',
  'Крымский мост': 'Крымский мост',
  'Дворцовая набережная, 18': 'Дворцовая набережная',
};

export async function searchWikipedia(title, city) {
  if (/причал|сектор|пристань|речной вокзал|набережн/i.test(title)) {
    return null;
  }

  const overrideTitle = WIKI_OVERRIDES[title];
  if (overrideTitle) {
    const summary = await fetchWikipediaSummary(overrideTitle);
    if (summary) return { ...summary, wikiTitle: overrideTitle, query: 'override' };
  }

  const queries = [
    `${title} ${city || ''}`.trim(),
    title,
    title.replace(/«|»|"/g, ''),
  ].filter(Boolean);

  for (const q of queries) {
    const url = new URL('https://ru.wikipedia.org/w/api.php');
    url.searchParams.set('action', 'query');
    url.searchParams.set('list', 'search');
    url.searchParams.set('srsearch', q);
    url.searchParams.set('srlimit', '3');
    url.searchParams.set('format', 'json');
    url.searchParams.set('origin', '*');

    const res = await fetch(url);
    if (!res.ok) continue;
    const data = await res.json();
    const hits = data?.query?.search || [];
    for (const hit of hits) {
      const summary = await fetchWikipediaSummary(hit.title);
      if (summary && isRelevantWikiHit(title, city, hit.title, summary.extract)) {
        return { ...summary, wikiTitle: hit.title, query: q };
      }
    }
  }
  return null;
}

export async function fetchWikipediaSummary(pageTitle) {
  const encoded = encodeURIComponent(pageTitle.replace(/ /g, '_'));
  const res = await fetch(`https://ru.wikipedia.org/api/rest_v1/page/summary/${encoded}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.type === 'disambiguation' || !data.extract) return null;
  return {
    title: data.title,
    extract: cleanWikiText(data.extract),
    description: cleanWikiText(data.description || ''),
    url: data.content_urls?.desktop?.page || null,
  };
}

function tokenizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !['театр', 'музей', 'клуб', 'бар', 'ресторан', 'концертный', 'зал', 'дворец', 'культуры'].includes(w));
}

function isRelevantWikiHit(venueName, city, wikiTitle, extract) {
  const nameLower = String(venueName).toLowerCase();
  if (/причал|сектор|пристань|речной вокзал/i.test(nameLower)) {
    return false;
  }

  const venueTokens = tokenizeName(venueName);
  const wikiLower = `${wikiTitle} ${extract}`.toLowerCase();
  if (venueTokens.length === 0) return extract.length > 80;

  let hits = 0;
  for (const token of venueTokens) {
    if (wikiLower.includes(token)) hits += 1;
  }
  const ratio = hits / venueTokens.length;
  if (ratio >= 0.5) return true;
  return false;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
