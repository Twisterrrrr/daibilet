/**
 * Убирает латиницу из названий, городов и адресов:
 * — словарные замены брендов и топонимов;
 * — замена латинских омографов (Кuybysheva → Куйbysheva);
 * — транслитерация оставшейся латиницы.
 */

const HOMOGLYPHS = {
  A: 'А', a: 'а', B: 'В', b: 'в', C: 'С', c: 'с', E: 'Е', e: 'е',
  H: 'Н', h: 'н', K: 'К', k: 'к', M: 'М', m: 'м', O: 'О', o: 'о',
  P: 'Р', p: 'р', T: 'Т', t: 'т', X: 'Х', x: 'х', Y: 'У', y: 'у',
};

const PHRASES = [
  ['Nakanoshima, 4 Chome-3-1, Kita Ward, Osaka', 'Осака, район Кита, Наканосима, 4-3-1'],
  ['Suvar Plaza', 'ТЦ «Сувар Плаза»'],
  ['The Right Place (Правильное место)', 'Правильное место'],
  ['The Right Place', 'Правильное место'],
  ['Santa Monica stereo cafe', 'Санта Моника, стерео-кафе'],
  ['Lounge Bar 1/2 of You НЕВСКИЙ', 'Лаунж-бар «Половина тебя» Невский'],
  ['Lounge MOЁТ', 'Лаунж МОЁТ'],
  ['Machine Head Club', 'Клуб «Машин Хед»'],
  ['MILO Concert Hall', 'Концерт-холл МИЛО'],
  ['Music Hall 27', 'Мьюзик-холл 27'],
  ['Concert-Hall КИНО', 'Концерт-холл КИНО'],
  ['Harat`s pub', 'Харатс Паб'],
  ["Harat's pub", 'Харатс Паб'],
  ['Leps Bar', 'Лепс Бар'],
  ['POPRAVKA BAR', 'ПОПРАВКА БАР'],
  ['Roof Place', 'Руф Плейс'],
  ['ABRIKOS ARENA', 'АБРИКОС АРЕНА'],
  ['Arena Hall', 'Арена Холл'],
  ['Art club Площадка', 'Арт-клуб «Площадка»'],
  ['Buddha-Bar', 'Будда-Бар'],
  ['City Hall', 'Сити Холл'],
  ['Barrock', 'Баррок'],
  ['Nebar', 'Небар'],
  ['WERK', 'ВЕРК'],
  ['Агутин Music Bar', 'Агутин, музыкальный бар'],
  ['Бар SUMBUR', 'Бар «Сумбур»'],
  ['бар-ресторан Douglas (Дуглас)', 'Бар-ресторан «Дуглас»'],
  ['Клуб "Route 148"', 'Клуб «Роут 148»'],
  ['Клуб «Black Tie»', 'Клуб «Блэк Тай»'],
  ['Музей современного искусства PERMM', 'Музей современного искусства ПЕРММ'],
  ['Мята Lounge', 'Мята Лаунж'],
  ['Паб URBAN', 'Паб УРБАН'],
  ['Ресторан Cherish', 'Ресторан «Чериш»'],
  ['Сплетни Бар by Anna Asty', 'Бар «Сплетни»'],
  ['Школа Sushi Lover', 'Школа «Суши Ловер»'],
  ['Банкетный зал Arbat Hall', 'Банкетный зал «Арбат Холл»'],
  ['Кулёva, 26', 'ул. Кулёва, 26'],
];

const TRANSLIT = {
  sh: 'ш', ch: 'ч', zh: 'ж', kh: 'х', ts: 'ц', ya: 'я', yo: 'ё', yu: 'ю',
  a: 'а', b: 'б', c: 'к', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'х', i: 'и', j: 'дж',
  k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'к', r: 'р', s: 'с', t: 'т',
  u: 'у', v: 'в', w: 'в', x: 'кс', y: 'й', z: 'з',
};

function fixHomoglyphs(value) {
  return String(value || '').replace(/[A-Za-z]/g, (ch) => HOMOGLYPHS[ch] || ch);
}

function transliterateLatinWord(word) {
  let input = word.toLowerCase();
  let out = '';
  while (input.length) {
    let matched = false;
    for (const len of [4, 3, 2]) {
      const chunk = input.slice(0, len);
      if (TRANSLIT[chunk]) {
        out += TRANSLIT[chunk];
        input = input.slice(len);
        matched = true;
        break;
      }
    }
    if (matched) continue;
    out += TRANSLIT[input[0]] || input[0];
    input = input.slice(1);
  }
  return out;
}

function transliterateRemainingLatin(value) {
  return String(value || '').replace(/[A-Za-z]+(?:['`][A-Za-z]+)?/g, (word) => {
    const lettersOnly = word.replace(/[`']/g, '');
    if (!lettersOnly) return word;
    const upper = lettersOnly === lettersOnly.toUpperCase() && lettersOnly.length > 1;
    const transliterated = transliterateLatinWord(lettersOnly);
    return upper ? transliterated.toUpperCase() : transliterated;
  });
}

function normalizePublicText(value) {
  if (!value) return value;
  let text = String(value).trim();
  for (const [from, to] of PHRASES) {
    text = text.split(from).join(to);
  }
  text = fixHomoglyphs(text);
  text = transliterateRemainingLatin(text);
  return text.replace(/\s{2,}/g, ' ').replace(/\s+([,.])/g, '$1').trim();
}

module.exports = { normalizePublicText };
