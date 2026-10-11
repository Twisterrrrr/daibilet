import assert from 'node:assert/strict';
import test from 'node:test';

import { formatEventDescriptionHtml } from './event-description-format.ts';
import {
  headingTitleFromLine,
  htmlToPlainLines,
  isDecorationLine,
  normalizeBulletLine,
  reformatEventDescription,
  splitRunOnParagraph,
} from './event-description-reformat.ts';

/** Real Ticketscloud-style plain description with <br> line breaks. */
const TC_PLAIN_SAMPLE = `пианист-виртуоз и композитор<br>ИЛЬЯ ГОНЧАРОВ<br>фортепианные интерпретации<br>на темы романтических шедевров:<br>Классика, Джаз, Эстрада.<br><br>Знакомая и всеми любимая музыка в новых неожиданных вариациях на крыше вечернего Невского проспекта.<br><br>Романтика отечественных фильмов и песен:<br>— Ирония судьбы / С лёгким паром<br>— Весёлые ребята<br>— Кавказская пленница<br><br>= = =<br><br>Бонус!<br>Это яркое музыкальное явление — уникальный формат нашего салона.`;

/** Real Teplohod-style HTML with paragraphs and lists. */
const TEP_HTML_SAMPLE = `<p>Увлекательная гастрономическая прогулка по Москве реке!</p><p>Причал «Сити-Экспоцентр» - Причал Крымский Мост</p><p>Правила заведения:</p><p>* дресс-код: просим избегать спортивной одежды;</p><p>* ⁠не разрешается приносить свои продукты питания и напитки.</p><p><strong>Во время рейса предусмотрена короткая остановка на причале - на причал Киевский вокзал, с него открывается панорама на центр города и набережные</strong></p>`;

test('TC plain sample: caps becomes ## heading, dashes normalized, wall split', () => {
  const out = reformatEventDescription(TC_PLAIN_SAMPLE);
  assert.match(out, /## ИЛЬЯ ГОНЧАРОВ/);
  assert.match(out, /## Романтика отечественных фильмов и песен/);
  assert.match(out, /- Ирония судьбы \/ С лёгким паром/);
  assert.match(out, /- Весёлые ребята/);
  assert.match(out, /- Кавказская пленница/);
  assert.doesNotMatch(out, /[\u2013\u2014\u2212]/);
  assert.doesNotMatch(out, /<br|&nbsp;|= = =/);
  assert.match(out, /музыка в новых неожиданных вариациях/);
  assert.match(out, /уникальный формат нашего салона\./);
});

test('TEP HTML sample: paragraphs, star bullets and long bold stay safe', () => {
  const out = reformatEventDescription(TEP_HTML_SAMPLE);
  assert.doesNotMatch(out, /<[a-z/]/i);
  assert.match(out, /Увлекательная гастрономическая прогулка по Москве реке!/);
  assert.match(out, /## Правила заведения/);
  assert.match(out, /- дресс-код: просим избегать спортивной одежды;/);
  assert.match(out, /- не разрешается приносить свои продукты питания и напитки\./);
  assert.match(out, /\*\*Во время рейса предусмотрена короткая остановка/);
});

test('renderer turns reformatted text into h3/ul/p without marker leaks', () => {
  const out = reformatEventDescription(`${TC_PLAIN_SAMPLE}\n\n${TEP_HTML_SAMPLE}`);
  const html = formatEventDescriptionHtml(out);
  assert.match(html, /<h3>ИЛЬЯ ГОНЧАРОВ<\/h3>/);
  assert.match(html, /<h3>Романтика отечественных фильмов и песен<\/h3>/);
  assert.match(html, /<h3>Правила заведения<\/h3>/);
  assert.match(html, /<ul><li>Ирония судьбы/);
  assert.match(html, /<p>/);
  assert.doesNotMatch(html, /##/);
  assert.doesNotMatch(html, /<br\s*\/?>\s*<br/i);
});

test('reformat is idempotent on mixed samples', () => {
  for (const sample of [TC_PLAIN_SAMPLE, TEP_HTML_SAMPLE]) {
    const once = reformatEventDescription(sample);
    const twice = reformatEventDescription(once);
    assert.equal(twice, once);
  }
});


test('bullet marker without space and dash variants normalize to "- item"', () => {
  assert.equal(normalizeBulletLine('-знакомство с материалами'), '- знакомство с материалами');
  assert.equal(normalizeBulletLine('– Оливье;'), '- Оливье;');
  assert.equal(normalizeBulletLine('• Кремль'), '- Кремль');
  assert.equal(normalizeBulletLine('✅ Приходите'), '- Приходите');
  assert.equal(normalizeBulletLine('* дресс-код'), '- дресс-код');
  assert.equal(normalizeBulletLine('*важно* одеваться по погоде'), null);
});

test('caps heading with trailing semicolon is normalized, sentences are not', () => {
  assert.equal(headingTitleFromLine('ВХОДНОЙ;'), 'ВХОДНОЙ');
  assert.equal(headingTitleFromLine('ПРОГРАММА'), 'ПРОГРАММА');
  assert.equal(headingTitleFromLine('Всё включено. Приходите!'), null);
  assert.equal(headingTitleFromLine('Картина, которая будет существовать в единственном экземпляре.'), null);
});

test('canonical and owner-requested section titles become headings', () => {
  for (const title of ['Преимущества', 'Кому рекомендуется', 'Зачем стоит посетить', 'Что вас ждет:', 'Организационные детали:']) {
    const out = reformatEventDescription(`${title}\nТекст раздела без завершающей точки`);
    assert.match(out, /^## /m);
  }
});

test('decoration and html sampling helpers', () => {
  assert.equal(isDecorationLine('= = ='), true);
  assert.equal(isDecorationLine('***'), true);
  assert.equal(isDecorationLine('- Троицкий собор'), false);
  const lines = htmlToPlainLines('<p>Первый</p><ul><li>A</li><li>B</li></ul><p>Второй</p>');
  assert.deepEqual(
    lines.map((l) => l.trim()).filter(Boolean),
    ['Первый', '- A', '- B', 'Второй'],
  );
});

test('run-on paragraph is split into readable parts; abbreviations are safe', () => {
  const sentence = 'Посетители узнают историю места и увидят редкие экспонаты музея.';
  const wall = Array(12).fill(sentence).join(' ');
  const parts = splitRunOnParagraph(wall);
  assert.ok(parts.length > 1);
  assert.equal(parts.join(' ').replace(/\s+/g, ' '), wall.replace(/\s+/g, ' '));

  const withAbbrev =
    'Экспозиция рассказывает о жизни города, ремеслах и торговле, т. е. о самом быте горожан прошлых веков. ' +
    'Гид объяснит символику вывесок и покажет архивные документы, фотографии и гравюры из фондов. ' +
    'Маршрут проходит по старым кварталам, где сохранились купеческие особняки и доходные дома. ' +
    'В финале группы ждет смотровая площадка с панорамой и короткая беседа о планах города.';
  const abbrevParts = splitRunOnParagraph(withAbbrev);
  assert.ok(abbrevParts.length >= 1);
  assert.equal(abbrevParts.join(' ').replace(/\s+/g, ' '), withAbbrev.replace(/\s+/g, ' '));
});

test('xss and scripts are stripped, entities decoded', () => {
  const out = reformatEventDescription('<p>Цена A &amp; B &lt; 100</p><script>alert(1)</script><p>&laquo;Цитата&raquo;</p>');
  assert.match(out, /Цена A & B < 100/);
  assert.match(out, /«Цитата»/);
  assert.doesNotMatch(out, /script|alert/i);
});

test('typography glue fixes and plus runs', () => {
  const glued = reformatEventDescription('Мы устраиваем эксклюзивные концерты на корабле .Насладитесь музыкой.');
  assert.match(glued, /на корабле\. Насладитесь музыкой\./);

  const doubleSpace = reformatEventDescription('Свяжитесь с организатором удобным способом . Некоторые площадки не передают контакты.');
  assert.match(doubleSpace, /способом\. Некоторые площадки/);
  assert.doesNotMatch(doubleSpace, /\. {2,}/);

  const plus = reformatEventDescription(
    'В цену входит:\n+ обзор коллекции\n+ угощение\n+ фотосессия на террасе\n\n+ СУПЕР БОНУС!',
  );
  assert.match(plus, /## В цену входит/);
  assert.match(plus, /- обзор коллекции/);
  assert.match(plus, /- угощение/);
  assert.match(plus, /- фотосессия на террасе/);
  assert.match(plus, /\+ СУПЕР БОНУС!/);
});

test('soft-wrapped provider lines merge into paragraphs; headings survive', () => {
  const sample =
    'Одно письмо. Один Новый год. Которого может не быть…<br>У российского деда Мороза есть братья-морозы по всему миру. Они<br>прекрасно справляются со своей работой - дарят подарки и ощущение<br>праздника каждому ребенку. Но в этом году мальчик Миша создал им<br>огромные проблемы…';
  const out = reformatEventDescription(sample);
  assert.match(out, /Они прекрасно справляются со своей работой/);
  assert.doesNotMatch(out, /Они\nпрекрасно/);
  assert.doesNotMatch(out, /миру\. Они\n/);

  const withHeading = reformatEventDescription(
    'пианист-виртуоз и композитор<br>ИЛЬЯ ГОНЧАРОВ<br>фортепианные интерпретации<br>на темы шедевров',
  );
  assert.match(withHeading, /## ИЛЬЯ ГОНЧАРОВ/);
  assert.match(withHeading, /фортепианные интерпретации на темы шедевров/);
});

test('mid-sentence breaks merge; markerless landmark runs stay separate lines', () => {
  const broken =
    'Золотая джазовая лихорадка, время свинга и километровых очередей в танцевальные залы - такую атмосферу воскрешает на своих выступлениях Большой Джазовый<br>Оркестр Петра Востокова. Воссоздавая подлинное звучание музыки того времени, Оркестр представляет программы.';
  const out = reformatEventDescription(broken);
  assert.match(out, /Большой Джазовый Оркестр Петра Востокова\./);
  assert.doesNotMatch(out, /Джазовый\nОркестр/);

  const landmarks = reformatEventDescription('По маршруту видны:<br>Московский Кремль<br>Парк Горького<br>Лужники');
  const lines = landmarks.split('\n');
  assert.ok(lines.includes('Московский Кремль'));
  assert.ok(lines.includes('Парк Горького'));
  assert.ok(lines.includes('Лужники'));
});

test('one-sentence provider lines group into 3-5 sentence paragraphs', () => {
  const wall = `<p>Этот концерт посетили 24000 тысячи зрителей за 7 месяцев!</p><p>Незабываемый концерт на корабле в Москве - Романтика и Музыка.</p><p>Ищете идеальное место для особенного вечера? Мечтаете совместить изысканный ужин, захватывающие виды и живую музыку?</p><p>Ресторан на теплоходе - это то, что вам нужно! Представляем уникальную возможность насладиться концертом на корабле. Наш красивый ресторан на теплоходе предлагает уникальную атмосферу.</p><p>Панорамные окна открывают завораживающие виды на достопримечательности Москвы.</p><p>Сидя за столиками, вы сможете любоваться Кремлем, Храмом Христа Спасителя и другими шедеврами архитектуры.</p><p>А с верхней палубы открывается еще более широкий обзор.</p>`;
  const out = reformatEventDescription(wall);
  const paragraphs = out.split(/\n\s*\n/).filter(Boolean);
  assert.ok(paragraphs.length <= 3, `expected <=3 paragraphs, got ${paragraphs.length}`);
  assert.match(paragraphs[0], /24000 тысячи зрителей/);
  assert.match(paragraphs[0], /Романтика и Музыка/);
  assert.match(paragraphs[0], /живую музыку\?/);

  const html = formatEventDescriptionHtml(out);
  const pCount = (html.match(/<p>/g) || []).length;
  assert.ok(pCount <= 3, `expected <=3 <p>, got ${pCount}`);
});

test('concert line-up gets "В программе" heading and a list', () => {
  const sample =
    'В программе концерта самые популярные хиты советской и мировой эстрады 80-90 годов.\n\n' +
    'Екатерина Французова - Вокал\nЭлина Шатская - Вокал\nМихаил Зыков - Вокал\nВедущий концерта - Максим Ратинер';
  const out = reformatEventDescription(sample);
  assert.match(out, /## В программе/);
  assert.match(out, /\nЕкатерина Французова - Вокал\n/);
  assert.match(out, /Ведущий концерта - Максим Ратинер/);
  const html = formatEventDescriptionHtml(out);
  assert.match(html, /<h3>В программе<\/h3>/);
  assert.match(html, /<ul><li>Екатерина Французова - Вокал<\/li>/);
});

test('bullet line-up (already dashed) also gets "В программе" heading', () => {
  const sample =
    'В программе концерта хиты 80-90 годов.\n\n- Екатерина Французова - Вокал\n- Элина Шатская - Вокал\n- Михаил Зыков - Вокал';
  const out = reformatEventDescription(sample);
  assert.match(out, /## В программе/);
  assert.match(out, /- Екатерина Французова - Вокал/);
  const html = formatEventDescriptionHtml(out);
  assert.match(html, /<h3>В программе<\/h3>/);
  assert.match(html, /<ul><li>Екатерина Французова - Вокал<\/li><li>Элина Шатская - Вокал<\/li>/);
});

test('space before sentence dot is normalized', () => {
  const out = reformatEventDescription('Хиты эстрады под которые просто не возможно усидеть на месте . Красивые виды Москвы.');
  assert.doesNotMatch(out, /\s\./);
  assert.match(out, /на месте\. Красивые виды/);
});

test('phrase with a dash before colon is not a false h3', () => {
  const out = reformatEventDescription(
    'Концерт на корабле - это: Эксклюзивные мероприятия: Уникальные концерты и тематические вечера.',
  );
  const html = formatEventDescriptionHtml(out);
  assert.doesNotMatch(html, /<h3>Концерт на корабле/);
  assert.match(html, /Концерт на корабле - это/);
});

test('existing override rewrite wording survives; dash normalized and paragraphs grouped', () => {
  const override =
    'Самый громкий тур лидеров альтернативного рок-попа.\n\nПодойдёт фанатам тяжёлых гитарных риффов.\n\nВсероссийский тур — 23 города.';
  const out = reformatEventDescription(override);
  assert.doesNotMatch(out, /[\u2013\u2014\u2212]/);
  assert.match(out, /Самый громкий тур лидеров альтернативного рок-попа\./);
  assert.match(out, /Подойдёт фанатам тяжёлых гитарных риффов\./);
  assert.match(out, /Всероссийский тур - 23 города\./);
  assert.equal(
    out,
    'Самый громкий тур лидеров альтернативного рок-попа. Подойдёт фанатам тяжёлых гитарных риффов. Всероссийский тур - 23 города.',
  );
});
