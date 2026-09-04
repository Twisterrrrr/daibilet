/** Падежи для SEO/UI: именительный, родительный, предложный, винительный, дательный (без предлога). */
export type CityCases = {
  /** {City_Им} — Казань, Екатеринбург */
  nominative: string;
  /** {City_Род} — Казани, Екатеринбурга */
  genitive: string;
  /** {City_Пр} — Казани, Екатеринбурге */
  prepositional: string;
  /** {City_Вин} — Казань, Москву (ехать в …) */
  accusative: string;
  /** {City_Дат} — Перми, Санкт-Петербургу (лайфхаки по …) */
  dative: string;
};

type CityFormRow = { prep: string; gen: string; acc?: string; dat?: string };

/** Предложный / родительный / (опц.) винительный падежи городов. */
const CITY_FORMS: Record<string, CityFormRow> = {
  Абакан: { prep: 'Абакане', gen: 'Абакана' },
  Архангельск: { prep: 'Архангельске', gen: 'Архангельска' },
  Астрахань: { prep: 'Астрахани', gen: 'Астрахани' },
  Барнаул: { prep: 'Барнауле', gen: 'Барнаула' },
  Белгород: { prep: 'Белгороде', gen: 'Белгорода' },
  'Благовещенск (Амурская область)': { prep: 'Благовещенске', gen: 'Благовещенска' },
  Благовещенск: { prep: 'Благовещенске', gen: 'Благовещенска' },
  Брянск: { prep: 'Брянске', gen: 'Брянска' },
  'Великий Новгород': { prep: 'Великом Новгороде', gen: 'Великого Новгорода', acc: 'Великий Новгород', dat: 'Великому Новгороду' },
  Владимир: { prep: 'Владимире', gen: 'Владимира' },
  Владивосток: { prep: 'Владивостоке', gen: 'Владивостока' },
  Владикавказ: { prep: 'Владикавказе', gen: 'Владикавказа' },
  Волгоград: { prep: 'Волгограде', gen: 'Волгограда' },
  Вологда: { prep: 'Вологде', gen: 'Вологды', acc: 'Вологду' },
  Воронеж: { prep: 'Воронеже', gen: 'Воронежа' },
  Екатеринбург: { prep: 'Екатеринбурге', gen: 'Екатеринбурга' },
  Иваново: { prep: 'Иванове', gen: 'Иванова' },
  Ижевск: { prep: 'Ижевске', gen: 'Ижевска' },
  Иркутск: { prep: 'Иркутске', gen: 'Иркутска' },
  'Йошкар-Ола': { prep: 'Йошкар-Оле', gen: 'Йошкар-Олы', acc: 'Йошкар-Олу' },
  Казань: { prep: 'Казани', gen: 'Казани' },
  Калининград: { prep: 'Калининграде', gen: 'Калининграда' },
  Калуга: { prep: 'Калуге', gen: 'Калуги', acc: 'Калугу' },
  Кемерово: { prep: 'Кемерове', gen: 'Кемерова' },
  Киров: { prep: 'Кирове', gen: 'Кирова' },
  'Киров (Кировская область)': { prep: 'Кирове', gen: 'Кирова' },
  'Комсомольск-на-Амуре': { prep: 'Комсомольске-на-Амуре', gen: 'Комсомольска-на-Амуре' },
  Кострома: { prep: 'Костроме', gen: 'Костромы', acc: 'Кострому' },
  Краснодар: { prep: 'Краснодаре', gen: 'Краснодара' },
  Красноярск: { prep: 'Красноярске', gen: 'Красноярска' },
  Курган: { prep: 'Кургане', gen: 'Кургана' },
  Курск: { prep: 'Курске', gen: 'Курска' },
  Липецк: { prep: 'Липецке', gen: 'Липецка' },
  Магадан: { prep: 'Магадане', gen: 'Магадана' },
  Москва: { prep: 'Москве', gen: 'Москвы', acc: 'Москву' },
  Мурманск: { prep: 'Мурманске', gen: 'Мурманска' },
  'Нижний Новгород': { prep: 'Нижнем Новгороде', gen: 'Нижнего Новгорода', acc: 'Нижний Новгород', dat: 'Нижнему Новгороду' },
  Новосибирск: { prep: 'Новосибирске', gen: 'Новосибирска' },
  Омск: { prep: 'Омске', gen: 'Омска' },
  Орёл: { prep: 'Орле', gen: 'Орла' },
  Орел: { prep: 'Орле', gen: 'Орла', acc: 'Орёл' },
  Оренбург: { prep: 'Оренбурге', gen: 'Оренбурга' },
  Пенза: { prep: 'Пензе', gen: 'Пензы', acc: 'Пензу' },
  Пермь: { prep: 'Перми', gen: 'Перми' },
  Псков: { prep: 'Пскове', gen: 'Пскова' },
  Раменское: { prep: 'Раменском', gen: 'Раменского' },
  'Новое Девяткино': {
    prep: 'Новом Девяткино',
    gen: 'Нового Девяткино',
    acc: 'Новое Девяткино',
    dat: 'Новому Девяткино',
  },
  Мурино: { prep: 'Мурино', gen: 'Мурино', acc: 'Мурино', dat: 'Мурино' },
  Кудрово: { prep: 'Кудрово', gen: 'Кудрово', acc: 'Кудрово', dat: 'Кудрово' },
  Парголово: { prep: 'Парголово', gen: 'Парголово', acc: 'Парголово', dat: 'Парголово' },
  'Красное Село': {
    prep: 'Красном Селе',
    gen: 'Красного Села',
    acc: 'Красное Село',
    dat: 'Красному Селу',
  },
  Отрадное: { prep: 'Отрадном', gen: 'Отрадного' },
  Горбунки: { prep: 'Горбунках', gen: 'Горбунок', acc: 'Горбунки', dat: 'Горбункам' },
  Химки: { prep: 'Химках', gen: 'Химок', acc: 'Химки', dat: 'Химкам' },
  Мытищи: { prep: 'Мытищах', gen: 'Мытищ', acc: 'Мытищи', dat: 'Мытищам' },
  'Ростов-на-Дону': { prep: 'Ростове-на-Дону', gen: 'Ростова-на-Дону' },
  Рязань: { prep: 'Рязани', gen: 'Рязани' },
  Самара: { prep: 'Самаре', gen: 'Самары', acc: 'Самару' },
  'Санкт-Петербург': { prep: 'Санкт-Петербурге', gen: 'Санкт-Петербурга', dat: 'Санкт-Петербургу' },
  Саранск: { prep: 'Саранске', gen: 'Саранска' },
  Саратов: { prep: 'Саратове', gen: 'Саратова' },
  Севастополь: { prep: 'Севастополе', gen: 'Севастополя' },
  Симферополь: { prep: 'Симферополе', gen: 'Симферополя' },
  Смоленск: { prep: 'Смоленске', gen: 'Смоленска' },
  Сочи: { prep: 'Сочи', gen: 'Сочи' },
  Сортавала: { prep: 'Сортавале', gen: 'Сортавалы', acc: 'Сортавалу' },
  Ставрополь: { prep: 'Ставрополе', gen: 'Ставрополя' },
  Суздаль: { prep: 'Суздале', gen: 'Суздаля' },
  Сыктывкар: { prep: 'Сыктывкаре', gen: 'Сыктывкара' },
  Тамбов: { prep: 'Тамбове', gen: 'Тамбова' },
  Тверь: { prep: 'Твери', gen: 'Твери' },
  Томск: { prep: 'Томске', gen: 'Томска' },
  Тула: { prep: 'Туле', gen: 'Тулы', acc: 'Тулу' },
  Тюмень: { prep: 'Тюмени', gen: 'Тюмени' },
  'Улан-Удэ': { prep: 'Улан-Удэ', gen: 'Улан-Удэ' },
  Ульяновск: { prep: 'Ульяновске', gen: 'Ульяновска' },
  Уфа: { prep: 'Уфе', gen: 'Уфы', acc: 'Уфу' },
  Хабаровск: { prep: 'Хабаровске', gen: 'Хабаровска' },
  'Ханты-Мансийск': { prep: 'Ханты-Мансийске', gen: 'Ханты-Мансийска' },
  Чебоксары: { prep: 'Чебоксарах', gen: 'Чебоксар' },
  Челябинск: { prep: 'Челябинске', gen: 'Челябинска' },
  Чита: { prep: 'Чите', gen: 'Читы', acc: 'Читу' },
  'Южно-Сахалинск': { prep: 'Южно-Сахалинске', gen: 'Южно-Сахалинска' },
  Якутск: { prep: 'Якутске', gen: 'Якутска' },
  Ярославль: { prep: 'Ярославле', gen: 'Ярославля' },
  Карелия: { prep: 'Карелии', gen: 'Карелии', acc: 'Карелию' },
  'Республика Карелия': {
    prep: 'Республике Карелии',
    gen: 'Республики Карелии',
    acc: 'Республику Карелию',
  },
  Хакасия: { prep: 'Хакасии', gen: 'Хакасии', acc: 'Хакасию' },
  'Республика Хакасия': {
    prep: 'Республике Хакасии',
    gen: 'Республики Хакасии',
    acc: 'Республику Хакасию',
  },
  Коми: { prep: 'Коми', gen: 'Коми', acc: 'Коми' },
  'Республика Коми': { prep: 'Республике Коми', gen: 'Республики Коми', acc: 'Республику Коми' },
  // Вторая часть не склоняется: «Республики Башкортостан», не «…Башкортостана».
  Башкортостан: { prep: 'Башкортостан', gen: 'Башкортостан', acc: 'Башкортостан' },
  'Республика Башкортостан': {
    prep: 'Республике Башкортостан',
    gen: 'Республики Башкортостан',
    acc: 'Республику Башкортостан',
  },
};

/** Slug / alias → именительный (роутинг landings + city hubs). */
const CITY_NAME_BY_SLUG: Record<string, string> = {
  moscow: 'Москва',
  moskva: 'Москва',
  msk: 'Москва',
  spb: 'Санкт-Петербург',
  'saint-petersburg': 'Санкт-Петербург',
  'sankt-peterburg': 'Санкт-Петербург',
  peterburg: 'Санкт-Петербург',
  kazan: 'Казань',
  ekaterinburg: 'Екатеринбург',
  'nizhny-novgorod': 'Нижний Новгород',
  'nizhniy-novgorod': 'Нижний Новгород',
  samara: 'Самара',
  volgograd: 'Волгоград',
  yaroslavl: 'Ярославль',
  krasnoyarsk: 'Красноярск',
  perm: 'Пермь',
  novosibirsk: 'Новосибирск',
  tver: 'Тверь',
  rostov: 'Ростов-на-Дону',
  'rostov-on-don': 'Ростов-на-Дону',
  'rostov-na-donu': 'Ростов-на-Дону',
  sochi: 'Сочи',
  kaliningrad: 'Калининград',
  'respublika-kareliya': 'Республика Карелия',
  kareliya: 'Карелия',
  'respublika-bashkortostan': 'Республика Башкортостан',
  bashkortostan: 'Башкортостан',
};

/** Города с отдельными SEO-шаблонами meta (Казань / Екатеринбург). */
const SEO_EXPANSION_CITY_NAMES = new Set(['Казань', 'Екатеринбург']);
const SEO_EXPANSION_CITY_SLUGS = new Set(['kazan', 'ekaterinburg']);

function inferAdjectivePrep(adj: string): string {
  if (/ая$/i.test(adj)) return `${adj.slice(0, -2)}ой`;
  if (/яя$/i.test(adj)) return `${adj.slice(0, -2)}ей`;
  if (/ое$/i.test(adj)) return `${adj.slice(0, -2)}ом`; // Новое → Новом
  if (/ее$/i.test(adj)) return `${adj.slice(0, -2)}ем`;
  if (/ий$/i.test(adj) || /ый$/i.test(adj) || /ой$/i.test(adj)) return `${adj.slice(0, -2)}ом`;
  return adj;
}

function inferAdjectiveGen(adj: string): string {
  if (/ая$/i.test(adj)) return `${adj.slice(0, -2)}ой`;
  if (/яя$/i.test(adj)) return `${adj.slice(0, -2)}ей`;
  if (/ое$/i.test(adj)) return `${adj.slice(0, -2)}ого`; // Новое → Нового
  if (/ее$/i.test(adj)) return `${adj.slice(0, -2)}его`;
  if (/ий$/i.test(adj) || /ый$/i.test(adj) || /ой$/i.test(adj)) return `${adj.slice(0, -2)}ого`;
  return adj;
}

function inferAdjectiveDat(adj: string): string {
  if (/ая$/i.test(adj)) return `${adj.slice(0, -2)}ой`;
  if (/яя$/i.test(adj)) return `${adj.slice(0, -2)}ей`;
  if (/ое$/i.test(adj)) return `${adj.slice(0, -2)}ому`; // Новое → Новому
  if (/ее$/i.test(adj)) return `${adj.slice(0, -2)}ему`;
  if (/ий$/i.test(adj)) return `${adj.slice(0, -2)}ему`;
  if (/ый$/i.test(adj) || /ой$/i.test(adj)) return `${adj.slice(0, -2)}ому`;
  return adj;
}

function inferAdjectiveAcc(adj: string): string {
  if (/ая$/i.test(adj)) return `${adj.slice(0, -2)}ую`;
  if (/яя$/i.test(adj)) return `${adj.slice(0, -2)}юю`;
  // Neut / masc inanimate adjectives keep nominative in accusative.
  return adj;
}

/** «Новое Девяткино», «Красное Село» - first token is an adjective. */
const ADJECTIVAL_FIRST =
  /^(\S+(?:ое|ее|ая|яя|ий|ый|ой))\s+(.+)$/iu;
/**
 * Modern settlement tails -ино/-ово often stay undeclined (в Мурино, в Девяткино).
 * With an adjective only the adjective declines: в Новом Девяткино.
 */
const INDECLINABLE_SETTLEMENT_TAIL = /(?:ино|ыно|ово|ево|ёво)$/iu;

function splitAdjectivalToponym(name: string): { adj: string; rest: string } | null {
  const match = name.match(ADJECTIVAL_FIRST);
  if (!match) return null;
  return { adj: match[1], rest: match[2] };
}

function isIndeclinableSettlementTail(rest: string): boolean {
  return INDECLINABLE_SETTLEMENT_TAIL.test(rest.trim());
}

/**
 * Эвристика предложного падежа, если города нет в словаре.
 * Не склоняет только последнее слово: «Республика Карелия» иначе становится «Республика Карелие».
 */
function inferPrepositional(name: string): string {
  const republic = name.match(/^Республика\s+(.+)$/i);
  if (republic) return `Республике ${inferPrepositional(republic[1])}`;
  const republicTail = name.match(/^(.+)\s+Республика$/i);
  if (republicTail) return `${inferAdjectivePrep(republicTail[1])} Республике`;
  const oblast = name.match(/^(.+)\s+область$/i);
  if (oblast) return `${inferAdjectivePrep(oblast[1])} области`;
  const kray = name.match(/^(.+)\s+край$/i);
  if (kray) return `${inferAdjectivePrep(kray[1])} крае`;

  const adjectival = splitAdjectivalToponym(name);
  if (adjectival) {
    // Новое Девяткино → Новом Девяткино (хвост не склоняем).
    if (isIndeclinableSettlementTail(adjectival.rest)) {
      return `${inferAdjectivePrep(adjectival.adj)} ${adjectival.rest}`;
    }
    // Красное Село → Красном Селе.
    return `${inferAdjectivePrep(adjectival.adj)} ${inferPrepositional(adjectival.rest)}`;
  }

  // Мурино / Девяткино: не «Мурине».
  if (/(?:ино|ыно)$/i.test(name)) return name;

  // Мн.ч. топонимы: Горбунки → Горбунках (до несклоняемого «…и»).
  if (/ки$/i.test(name)) return `${name.slice(0, -2)}ках`;
  if (/цы$/i.test(name)) return `${name.slice(0, -2)}цах`;
  if (/щи$/i.test(name)) return `${name.slice(0, -2)}щах`;

  if (/ы$/i.test(name)) return `${name.slice(0, -1)}ах`; // Чебоксары → …ах (fallback)
  if (/ия$/i.test(name)) return `${name.slice(0, -1)}и`; // Карелия → Карелии
  if (/а$/i.test(name)) return `${name.slice(0, -1)}е`; // Самара → Самаре
  if (/я$/i.test(name)) return `${name.slice(0, -1)}е`;
  if (/ь$/i.test(name)) return `${name.slice(0, -1)}и`; // Казань → Казани
  if (/ий$/i.test(name)) return `${name.slice(0, -2)}ом`;
  if (/ый$/i.test(name) || /ой$/i.test(name)) return `${name.slice(0, -2)}ом`;
  if (/ое$/i.test(name)) return `${name.slice(0, -2)}ом`; // Раменское → Раменском
  if (/ее$/i.test(name)) return `${name.slice(0, -2)}ем`;
  if (/о$/i.test(name)) return `${name.slice(0, -1)}е`; // Иваново → Иванове (словарь перекрывает Кудрово)
  if (/[еиуюэ]$/i.test(name)) return name; // несклоняемые, в т.ч. Коми
  return `${name}е`; // Мурманск → Мурманске
}

function inferGenitive(name: string): string {
  const republic = name.match(/^Республика\s+(.+)$/i);
  if (republic) return `Республики ${inferGenitive(republic[1])}`;
  const republicTail = name.match(/^(.+)\s+Республика$/i);
  if (republicTail) return `${inferAdjectiveGen(republicTail[1])} Республики`;
  const oblast = name.match(/^(.+)\s+область$/i);
  if (oblast) return `${inferAdjectiveGen(oblast[1])} области`;
  const kray = name.match(/^(.+)\s+край$/i);
  if (kray) return `${inferAdjectiveGen(kray[1])} края`;

  const adjectival = splitAdjectivalToponym(name);
  if (adjectival) {
    if (isIndeclinableSettlementTail(adjectival.rest)) {
      return `${inferAdjectiveGen(adjectival.adj)} ${adjectival.rest}`;
    }
    return `${inferAdjectiveGen(adjectival.adj)} ${inferGenitive(adjectival.rest)}`;
  }

  if (/(?:ино|ыно)$/i.test(name)) return name;

  if (/ки$/i.test(name)) return `${name.slice(0, -2)}ок`; // Горбунки → Горбунок
  if (/цы$/i.test(name)) return `${name.slice(0, -2)}цев`;
  if (/щи$/i.test(name)) return `${name.slice(0, -2)}щ`; // Мытищи → Мытищ

  if (/ы$/i.test(name)) return name.slice(0, -1); // Чебоксары → Чебоксар
  if (/ия$/i.test(name)) return `${name.slice(0, -1)}и`;
  if (/а$/i.test(name)) return `${name.slice(0, -1)}ы`;
  if (/я$/i.test(name)) return `${name.slice(0, -1)}и`;
  if (/ь$/i.test(name)) return `${name.slice(0, -1)}и`;
  if (/ий$/i.test(name)) return `${name.slice(0, -2)}ого`;
  if (/ый$/i.test(name) || /ой$/i.test(name)) return `${name.slice(0, -2)}ого`;
  if (/ое$/i.test(name)) return `${name.slice(0, -2)}ого`; // Раменского
  if (/ее$/i.test(name)) return `${name.slice(0, -2)}его`;
  if (/о$/i.test(name)) return `${name.slice(0, -1)}а`;
  if (/[еиуюэ]$/i.test(name)) return name;
  return `${name}а`;
}

/** Дательный для «по …»: Перми, Санкт-Петербургу, Нижнему Новгороду. */
function inferDative(name: string): string {
  const republic = name.match(/^Республика\s+(.+)$/i);
  if (republic) return `Республике ${inferDative(republic[1])}`;
  const republicTail = name.match(/^(.+)\s+Республика$/i);
  if (republicTail) return `${inferAdjectiveDat(republicTail[1])} Республике`;
  const oblast = name.match(/^(.+)\s+область$/i);
  if (oblast) return `${inferAdjectiveDat(oblast[1])} области`;
  const kray = name.match(/^(.+)\s+край$/i);
  if (kray) return `${inferAdjectiveDat(kray[1])} краю`;

  const naCompound = name.match(/^(.+)-на-(.+)$/i);
  if (naCompound) return `${inferDative(naCompound[1])}-на-${naCompound[2]}`;

  const adjectival = splitAdjectivalToponym(name);
  if (adjectival) {
    if (isIndeclinableSettlementTail(adjectival.rest)) {
      return `${inferAdjectiveDat(adjectival.adj)} ${adjectival.rest}`;
    }
    return `${inferAdjectiveDat(adjectival.adj)} ${inferDative(adjectival.rest)}`;
  }

  if (/(?:ино|ыно)$/i.test(name)) return name;

  if (/ки$/i.test(name)) return `${name.slice(0, -2)}кам`; // Горбунки → Горбункам
  if (/цы$/i.test(name)) return `${name.slice(0, -2)}цам`;
  if (/щи$/i.test(name)) return `${name.slice(0, -2)}щам`;

  if (/ы$/i.test(name)) return `${name.slice(0, -1)}ам`;
  if (/ия$/i.test(name)) return `${name.slice(0, -1)}и`;
  if (/а$/i.test(name)) return `${name.slice(0, -1)}е`;
  if (/я$/i.test(name)) return `${name.slice(0, -1)}е`;
  if (/ь$/i.test(name)) {
    // Ярославль / Ставрополь (м.р. -ль) → …лю; Пермь / Казань → …и
    if (/л$/i.test(name.slice(0, -1))) return `${name.slice(0, -1)}ю`;
    return `${name.slice(0, -1)}и`;
  }
  if (/ий$/i.test(name)) return `${name.slice(0, -2)}ему`;
  if (/ый$/i.test(name) || /ой$/i.test(name)) return `${name.slice(0, -2)}ому`;
  if (/ое$/i.test(name)) return `${name.slice(0, -2)}ому`;
  if (/ее$/i.test(name)) return `${name.slice(0, -2)}ему`;
  if (/о$/i.test(name)) return `${name.slice(0, -1)}у`;
  if (/[еиуюэ]$/i.test(name)) return name;
  return `${name}у`;
}

/** Винительный для «ехать в …»: -а/-я → -у/-ю; иначе = именительный (неодуш.). */
function inferAccusative(name: string): string {
  const republic = name.match(/^Республика\s+(.+)$/i);
  if (republic) return `Республику ${inferAccusative(republic[1])}`;
  const republicTail = name.match(/^(.+)\s+Республика$/i);
  if (republicTail) return `${inferAdjectiveAcc(republicTail[1])} Республику`;
  const oblast = name.match(/^(.+)\s+область$/i);
  if (oblast) return `${inferAdjectiveAcc(oblast[1])} область`;
  const kray = name.match(/^(.+)\s+край$/i);
  if (kray) return `${inferAdjectiveAcc(kray[1])} край`;

  const adjectival = splitAdjectivalToponym(name);
  if (adjectival) {
    if (isIndeclinableSettlementTail(adjectival.rest)) {
      return `${inferAdjectiveAcc(adjectival.adj)} ${adjectival.rest}`;
    }
    return `${inferAdjectiveAcc(adjectival.adj)} ${inferAccusative(adjectival.rest)}`;
  }

  if (/-/.test(name)) return name;
  if (/ия$/i.test(name)) return `${name.slice(0, -1)}ю`;
  if (/а$/i.test(name)) return `${name.slice(0, -1)}у`;
  if (/я$/i.test(name)) return `${name.slice(0, -1)}ю`;
  return name;
}

function lookupCityForms(city: string): CityFormRow | null {
  const normalized = city.trim();
  if (!normalized) return null;
  return CITY_FORMS[normalized] || null;
}

/** Именительный по slug/alias или имени; иначе исходная строка. */
export function cityToNominative(cityOrSlug: string): string {
  const raw = stripCityDisambiguator(String(cityOrSlug || '').trim());
  if (!raw) return raw;
  if (CITY_FORMS[raw]) return raw;
  const bySlug = CITY_NAME_BY_SLUG[raw.toLowerCase()];
  if (bySlug) return bySlug;
  return raw;
}

/**
 * Catalog sometimes stores «Отрадное (Ленинградская область)».
 * Declension must use the city alone - otherwise «в … области)е».
 */
export function stripCityDisambiguator(name: string): string {
  const raw = String(name || '').trim();
  if (!raw) return raw;
  return raw.replace(/\s*\([^)]*\)\s*$/u, '').trim() || raw;
}

/** Полный набор падежей по имени или slug города. */
export function resolveCityCases(cityOrSlug: string): CityCases {
  const nominative = cityToNominative(cityOrSlug) || 'город';
  const forms = lookupCityForms(nominative);
  return {
    nominative,
    genitive: forms?.gen || inferGenitive(nominative),
    prepositional: forms?.prep || inferPrepositional(nominative),
    accusative: forms?.acc || inferAccusative(nominative),
    dative: forms?.dat || inferDative(nominative),
  };
}

/** Казань / Екатеринбург - отдельные формулы Title/Description. */
export function isSeoExpansionCity(input: {
  name?: string | null;
  slug?: string | null;
  sourceSlug?: string | null;
} | string | null | undefined): boolean {
  if (input == null) return false;
  if (typeof input === 'string') {
    const raw = input.trim();
    if (!raw) return false;
    if (SEO_EXPANSION_CITY_NAMES.has(raw)) return true;
    const slug = raw.toLowerCase();
    if (SEO_EXPANSION_CITY_SLUGS.has(slug)) return true;
    return SEO_EXPANSION_CITY_NAMES.has(cityToNominative(raw));
  }
  const name = String(input.name || '').trim();
  if (name && SEO_EXPANSION_CITY_NAMES.has(name)) return true;
  for (const candidate of [input.slug, input.sourceSlug]) {
    const key = String(candidate || '')
      .trim()
      .toLowerCase();
    if (key && SEO_EXPANSION_CITY_SLUGS.has(key)) return true;
    if (key && SEO_EXPANSION_CITY_NAMES.has(cityToNominative(key))) return true;
  }
  return false;
}

/** «Москве», «Перми», «Мурманске» — без предлога. */
export function cityToPrepositional(city: string): string {
  return resolveCityCases(city).prepositional;
}

/** «Москвы», «Перми» — без предлога. */
export function cityToGenitive(city: string): string {
  return resolveCityCases(city).genitive;
}

/** «в Москве», «в Мурманске» — никогда «в городе X». */
export function inCityPrepositional(city: string): string {
  const normalized = String(city || '').trim();
  if (!normalized) return 'в городе';
  return `в ${cityToPrepositional(normalized)}`;
}

/** «Москву», «Владимир» — без предлога. */
export function cityToAccusative(city: string): string {
  return resolveCityCases(city).accusative;
}

/** «Перми», «Санкт-Петербургу» — без предлога (по …). */
export function cityToDative(city: string): string {
  return resolveCityCases(city).dative;
}

/** «по Перми», «по Санкт-Петербургу». */
export function poCityDative(city: string): string {
  const normalized = String(city || '').trim();
  if (!normalized) return 'по городу';
  return `по ${cityToDative(normalized)}`;
}

/**
 * «в Москву», «во Владимир», «в Орёл» - винительный с предлогом в/во
 * (во перед в/ф + согласная).
 */
export function inCityAccusative(city: string): string {
  const normalized = String(city || '').trim();
  if (!normalized) return 'в город';
  const acc = cityToAccusative(normalized);
  if (/^[ВФвф][^аеёиоуыэюяАЕЁИОУЫЭЮЯ]/.test(acc)) return `во ${acc}`;
  return `в ${acc}`;
}
