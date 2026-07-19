/** Предложный («в …») и родительный («…») падежи городов. */
const CITY_FORMS: Record<string, { prep: string; gen: string }> = {
  Абакан: { prep: 'Абакане', gen: 'Абакана' },
  Архангельск: { prep: 'Архангельске', gen: 'Архангельска' },
  Астрахань: { prep: 'Астрахани', gen: 'Астрахани' },
  Барнаул: { prep: 'Барнауле', gen: 'Барнаула' },
  Белгород: { prep: 'Белгороде', gen: 'Белгорода' },
  'Благовещенск (Амурская область)': { prep: 'Благовещенске', gen: 'Благовещенска' },
  Благовещенск: { prep: 'Благовещенске', gen: 'Благовещенска' },
  Брянск: { prep: 'Брянске', gen: 'Брянска' },
  'Великий Новгород': { prep: 'Великом Новгороде', gen: 'Великого Новгорода' },
  Владимир: { prep: 'Владимире', gen: 'Владимира' },
  Владивосток: { prep: 'Владивостоке', gen: 'Владивостока' },
  Волгоград: { prep: 'Волгограде', gen: 'Волгограда' },
  Вологда: { prep: 'Вологде', gen: 'Вологды' },
  Воронеж: { prep: 'Воронеже', gen: 'Воронежа' },
  Екатеринбург: { prep: 'Екатеринбурге', gen: 'Екатеринбурга' },
  Иваново: { prep: 'Иванове', gen: 'Иванова' },
  Ижевск: { prep: 'Ижевске', gen: 'Ижевска' },
  Иркутск: { prep: 'Иркутске', gen: 'Иркутска' },
  'Йошкар-Ола': { prep: 'Йошкар-Оле', gen: 'Йошкар-Олы' },
  Казань: { prep: 'Казани', gen: 'Казани' },
  Калининград: { prep: 'Калининграде', gen: 'Калининграда' },
  Калуга: { prep: 'Калуге', gen: 'Калуги' },
  Кемерово: { prep: 'Кемерове', gen: 'Кемерова' },
  Киров: { prep: 'Кирове', gen: 'Кирова' },
  'Киров (Кировская область)': { prep: 'Кирове', gen: 'Кирова' },
  'Комсомольск-на-Амуре': { prep: 'Комсомольске-на-Амуре', gen: 'Комсомольска-на-Амуре' },
  Кострома: { prep: 'Костроме', gen: 'Костромы' },
  Краснодар: { prep: 'Краснодаре', gen: 'Краснодара' },
  Красноярск: { prep: 'Красноярске', gen: 'Красноярска' },
  Курган: { prep: 'Кургане', gen: 'Кургана' },
  Курск: { prep: 'Курске', gen: 'Курска' },
  Липецк: { prep: 'Липецке', gen: 'Липецка' },
  Магадан: { prep: 'Магадане', gen: 'Магадана' },
  Москва: { prep: 'Москве', gen: 'Москвы' },
  Мурманск: { prep: 'Мурманске', gen: 'Мурманска' },
  'Нижний Новгород': { prep: 'Нижнем Новгороде', gen: 'Нижнего Новгорода' },
  Новосибирск: { prep: 'Новосибирске', gen: 'Новосибирска' },
  Омск: { prep: 'Омске', gen: 'Омска' },
  Орёл: { prep: 'Орле', gen: 'Орла' },
  Орел: { prep: 'Орле', gen: 'Орла' },
  Оренбург: { prep: 'Оренбурге', gen: 'Оренбурга' },
  Пенза: { prep: 'Пензе', gen: 'Пензы' },
  Пермь: { prep: 'Перми', gen: 'Перми' },
  Псков: { prep: 'Пскове', gen: 'Пскова' },
  'Ростов-на-Дону': { prep: 'Ростове-на-Дону', gen: 'Ростова-на-Дону' },
  Рязань: { prep: 'Рязани', gen: 'Рязани' },
  Самара: { prep: 'Самаре', gen: 'Самары' },
  'Санкт-Петербург': { prep: 'Санкт-Петербурге', gen: 'Санкт-Петербурга' },
  Саранск: { prep: 'Саранске', gen: 'Саранска' },
  Саратов: { prep: 'Саратове', gen: 'Саратова' },
  Севастополь: { prep: 'Севастополе', gen: 'Севастополя' },
  Симферополь: { prep: 'Симферополе', gen: 'Симферополя' },
  Смоленск: { prep: 'Смоленске', gen: 'Смоленска' },
  Сочи: { prep: 'Сочи', gen: 'Сочи' },
  Сортавала: { prep: 'Сортавале', gen: 'Сортавалы' },
  Ставрополь: { prep: 'Ставрополе', gen: 'Ставрополя' },
  Суздаль: { prep: 'Суздале', gen: 'Суздаля' },
  Сыктывкар: { prep: 'Сыктывкаре', gen: 'Сыктывкара' },
  Тамбов: { prep: 'Тамбове', gen: 'Тамбова' },
  Тверь: { prep: 'Твери', gen: 'Твери' },
  Томск: { prep: 'Томске', gen: 'Томска' },
  Тула: { prep: 'Туле', gen: 'Тулы' },
  Тюмень: { prep: 'Тюмени', gen: 'Тюмени' },
  'Улан-Удэ': { prep: 'Улан-Удэ', gen: 'Улан-Удэ' },
  Ульяновск: { prep: 'Ульяновске', gen: 'Ульяновска' },
  Уфа: { prep: 'Уфе', gen: 'Уфы' },
  Хабаровск: { prep: 'Хабаровске', gen: 'Хабаровска' },
  Чебоксары: { prep: 'Чебоксарах', gen: 'Чебоксар' },
  Челябинск: { prep: 'Челябинске', gen: 'Челябинска' },
  Чита: { prep: 'Чите', gen: 'Читы' },
  'Южно-Сахалинск': { prep: 'Южно-Сахалинске', gen: 'Южно-Сахалинска' },
  Якутск: { prep: 'Якутске', gen: 'Якутска' },
  Ярославль: { prep: 'Ярославле', gen: 'Ярославля' },
};

/** Эвристика предложного падежа, если города нет в словаре. */
function inferPrepositional(name: string): string {
  if (/ы$/i.test(name)) return `${name.slice(0, -1)}ах`;
  if (/а$/i.test(name)) return `${name.slice(0, -1)}е`;
  if (/я$/i.test(name)) return `${name.slice(0, -1)}е`;
  if (/ь$/i.test(name)) return `${name.slice(0, -1)}и`;
  if (/ий$/i.test(name)) return `${name.slice(0, -2)}ом`;
  if (/ый$/i.test(name) || /ой$/i.test(name)) return `${name.slice(0, -2)}ом`;
  if (/о$/i.test(name)) return `${name.slice(0, -1)}е`;
  if (/е$/i.test(name) || /у$/i.test(name) || /ю$/i.test(name) || /э$/i.test(name)) return name;
  return `${name}е`;
}

function inferGenitive(name: string): string {
  if (/ы$/i.test(name)) return name.slice(0, -1);
  if (/а$/i.test(name)) return `${name.slice(0, -1)}ы`;
  if (/я$/i.test(name)) return `${name.slice(0, -1)}и`;
  if (/ь$/i.test(name)) return `${name.slice(0, -1)}и`;
  if (/ий$/i.test(name)) return `${name.slice(0, -2)}ого`;
  if (/ый$/i.test(name) || /ой$/i.test(name)) return `${name.slice(0, -2)}ого`;
  if (/о$/i.test(name)) return `${name.slice(0, -1)}а`;
  if (/е$/i.test(name) || /у$/i.test(name) || /ю$/i.test(name) || /э$/i.test(name)) return name;
  return `${name}а`;
}

function lookupCityForms(city: string): { prep: string; gen: string } | null {
  const normalized = city.trim();
  if (!normalized) return null;
  return CITY_FORMS[normalized] || null;
}

/** «Москве», «Перми», «Мурманске» — без предлога. */
export function cityToPrepositional(city: string): string {
  const normalized = city.trim();
  if (!normalized) return normalized;
  return lookupCityForms(normalized)?.prep || inferPrepositional(normalized);
}

/** «Москвы», «Перми» — без предлога. */
export function cityToGenitive(city: string): string {
  const normalized = city.trim();
  if (!normalized) return normalized;
  return lookupCityForms(normalized)?.gen || inferGenitive(normalized);
}

/** «в Москве», «в Мурманске» — никогда «в городе X». */
export function inCityPrepositional(city: string): string {
  const normalized = city.trim();
  if (!normalized) return 'в городе';
  return `в ${cityToPrepositional(normalized)}`;
}
