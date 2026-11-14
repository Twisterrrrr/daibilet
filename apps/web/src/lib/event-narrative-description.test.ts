import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildNarrativeParagraphs,
  containsNarrativeParagraph,
  detectNarrativeKind,
  stripNarrativeParagraphs,
} from './event-narrative-description.ts';

test('detects narrative kind from title and category', () => {
  assert.equal(detectNarrativeKind({ title: 'Концерт группы X', category: 'Мероприятия' }), 'concert');
  assert.equal(detectNarrativeKind({ title: 'STAND UP: девочки на опыте' }), 'standup');
  assert.equal(detectNarrativeKind({ title: 'Спектакль «Чайка»' }), 'theatre');
  assert.equal(detectNarrativeKind({ title: 'Лекция о космосе' }), 'lecture');
  assert.equal(detectNarrativeKind({ title: 'Мастер-класс по керамике' }), 'workshop');
  assert.equal(detectNarrativeKind({ title: 'Выставка современного искусства' }), 'exhibition');
  assert.equal(detectNarrativeKind({ title: 'Речная прогулка на теплоходе' }), 'water');
  assert.equal(detectNarrativeKind({ title: 'Обзорная экскурсия по городу' }), 'walk');
  assert.equal(detectNarrativeKind({ title: 'Квиз «Мозгобойня»' }), 'quiz');
  assert.equal(detectNarrativeKind({ title: 'Новогодняя вечеринка' }), 'party');
  assert.equal(detectNarrativeKind({ title: 'Что-то неведомое' }), 'generic');
});

test('narrative returns one readable paragraph without long dashes or facts', () => {
  const [paragraph] = buildNarrativeParagraphs({ title: 'Концерт группы X' }, 0);
  assert.ok(paragraph);
  assert.ok(paragraph.split(/\s+/u).length > 20);
  assert.doesNotMatch(paragraph, /[\u2013\u2014\u2212]/u);
  assert.doesNotMatch(paragraph, /\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)/iu);
  assert.doesNotMatch(paragraph, /₽/u);
});

test('narrative rotates variants so cards do not repeat', () => {
  const base = { title: 'Концерт группы X' };
  const variants = [0, 1, 2, 3, 4, 5].map((v) => buildNarrativeParagraphs(base, v).join(' '));
  assert.equal(new Set(variants).size, variants.length);
});

test('water kind mentions the boat ride, not the facts', () => {
  const [first] = buildNarrativeParagraphs({ title: 'Прогулка на теплоходе «Москва-29»' }, 0);
  assert.match(first, /вод|борт|теплоход|река|палуб|прогулк/iu);
});

test('adult events get no child/family wording', () => {
  for (const kindTitle of ['Шоу «Мистика»', 'Стендап-концерт', 'Концерт группы X', 'Мастер-класс']) {
    for (let v = 0; v < 12; v += 1) {
      const text = buildNarrativeParagraphs({ title: kindTitle, ageLimit: '18' }, v).join(' ');
      assert.doesNotMatch(text, /дет|ребён|ребен|подрост|семейн|семьёй|семьей/iu);
    }
  }
});

test('venue signals refine generic cards', () => {
  assert.equal(detectNarrativeKind({ title: 'Сова', venue: 'Театр Локус СПб' }), 'theatre');
  assert.equal(detectNarrativeKind({ title: 'Сова', venue: 'Филармония им. Шостаковича' }), 'concert');
  assert.equal(detectNarrativeKind({ title: 'Вечер', venue: 'Музей современного искусства' }), 'exhibition');
  assert.equal(detectNarrativeKind({ title: 'Вечер', venue: 'Причал №3, теплоход «Москва»' }), 'water');
  assert.equal(detectNarrativeKind({ title: 'Шоу', venue: 'Цирк шапито' }), 'show');
  assert.equal(detectNarrativeKind({ title: 'Вечер', venue: 'Клуб «Правда»' }), 'concert');
  assert.equal(detectNarrativeKind({ title: 'Вечер', venue: 'Бар SUMBUR' }), 'concert');
  assert.equal(detectNarrativeKind({ title: 'Занятие', venue: 'Арт-студия «Палитра»' }), 'workshop');
  assert.equal(detectNarrativeKind({ title: 'Сова', venue: null }), 'generic');
});

test('containsNarrativeParagraph detects and strips generated wording', () => {
  const [narrative] = buildNarrativeParagraphs({ title: 'Концерт группы X' }, 0);
  const lead = '«Концерт группы X» - концерт в Москве, на площадке «Клуб».';
  const text = `${lead}\n\n${narrative}\n\n## Практическая информация`;
  assert.equal(containsNarrativeParagraph(text), true);
  const stripped = stripNarrativeParagraphs(text);
  assert.equal(stripped, `${lead}\n\n## Практическая информация`);
  assert.equal(containsNarrativeParagraph(stripped), false);
  assert.equal(containsNarrativeParagraph(lead), false);
});

test('narrative wording is stripped when glued onto the lead line', () => {
  const [narrative] = buildNarrativeParagraphs({ title: 'Сова' }, 3);
  const lead = '«Сова» - мероприятие в Смоленске, на площадке «1865».';
  const glued = `${lead} ${narrative}`;
  assert.equal(containsNarrativeParagraph(glued), true);
  assert.equal(stripNarrativeParagraphs(glued), lead);
});

test('retired phrase variants from earlier rounds are still stripped', () => {
  const lead = '«Сова» - мероприятие в Смоленске, на площадке «1865».';
  const legacy = 'Это событие из тех, ради которых стоит выйти из дома: живой формат, живая публика и реальные впечатления.';
  assert.equal(containsNarrativeParagraph(`${lead} ${legacy}`), true);
  assert.equal(stripNarrativeParagraphs(`${lead} ${legacy}`), lead);
});

test('narrative pool avoids AI stock phrases', () => {
  const titles = ['Концерт группы X', 'Сова', 'Выставка современного искусства', 'Спектакль «Чайка»', 'Новогодняя вечеринка'];
  for (const title of titles) {
    for (let v = 0; v < 40; v += 1) {
      const text = buildNarrativeParagraphs({ title }, v).join(' ');
      assert.doesNotMatch(text, /без спешки|без суеты|живые эмоции|эффект присутствия|зарядиться/iu);
    }
  }
});
