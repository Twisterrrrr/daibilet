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

test('narrative returns two readable paragraphs without long dashes or facts', () => {
  const [first, second] = buildNarrativeParagraphs({ title: 'Концерт группы X' }, 0);
  assert.ok(first && second);
  assert.ok(first.split(/\s+/u).length > 8);
  assert.ok(second.split(/\s+/u).length > 12);
  for (const paragraph of [first, second]) {
    assert.doesNotMatch(paragraph, /[\u2013\u2014\u2212]/u);
    assert.doesNotMatch(paragraph, /\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)/iu);
    assert.doesNotMatch(paragraph, /₽/u);
  }
});

test('narrative rotates variants so cards do not repeat', () => {
  const base = { title: 'Концерт группы X' };
  const variants = [0, 1, 2, 3, 4, 5].map((v) => buildNarrativeParagraphs(base, v).join(' '));
  assert.equal(new Set(variants).size, variants.length);
});

test('water kind mentions the boat ride, not the facts', () => {
  const [first] = buildNarrativeParagraphs({ title: 'Прогулка на теплоходе «Москва-29»' }, 0);
  assert.match(first, /прогулка|воду|борт|теплоход|река|палуб/iu);
});

test('adult events get no child/family wording', () => {
  for (const kindTitle of ['Шоу «Мистика»', 'Стендап-концерт', 'Концерт группы X', 'Мастер-класс']) {
    for (let v = 0; v < 12; v += 1) {
      const text = buildNarrativeParagraphs({ title: kindTitle, ageLimit: '18' }, v).join(' ');
      assert.doesNotMatch(text, /дет|ребён|ребен|подрост|семейн|семьёй|семьей/iu);
    }
  }
});

test('containsNarrativeParagraph detects and strips generated paragraphs', () => {
  const [first, second] = buildNarrativeParagraphs({ title: 'Концерт группы X' }, 0);
  const lead = '«Концерт группы X» - концерт в Москве, на площадке «Клуб».';
  const text = `${lead}\n\n${first}\n\n${second}\n\n## Практическая информация`;
  assert.equal(containsNarrativeParagraph(text), true);
  const stripped = stripNarrativeParagraphs(text);
  assert.equal(stripped, `${lead}\n\n## Практическая информация`);
  assert.equal(containsNarrativeParagraph(stripped), false);
  assert.equal(containsNarrativeParagraph(lead), false);
});
