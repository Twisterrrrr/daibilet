import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BUYER_ACCOUNT_EMPTY_HINT,
  BUYER_LOGIN_INTRO,
  BUYER_ORDERS_EMPTY_TITLE,
  BUYER_REGISTER_INTRO,
  buyerAccountHero,
  buyerAccountListLabel,
  buyerOrdersEmptyBody,
} from './buyer-account-copy.ts';

const allCopy = () => [
  buyerAccountHero('user@example.com'),
  buyerAccountListLabel('user@example.com'),
  BUYER_ACCOUNT_EMPTY_HINT,
  BUYER_ORDERS_EMPTY_TITLE,
  buyerOrdersEmptyBody('user@example.com', 'unknown'),
  buyerOrdersEmptyBody('user@example.com', 'verified'),
  buyerOrdersEmptyBody('user@example.com', 'unverified'),
  BUYER_LOGIN_INTRO,
  BUYER_REGISTER_INTRO,
];

test('тексты ЛК описывают единый список внешних и внутренних заказов', () => {
  const hero = buyerAccountHero('user@example.com');
  assert.match(hero, /заказы Дайбилета/);
  assert.match(hero, /внешн/);
  assert.doesNotMatch(hero, /только Ticketscloud/i);
  assert.doesNotMatch(hero, /из Ticketscloud и Teplohod/);
});

test('гостевые покупки появляются только после подтверждения email', () => {
  for (const text of allCopy()) {
    assert.doesNotMatch(text, /подтянут(ся|и)?\s+автоматически/i);
    assert.doesNotMatch(text, /указан тот же email/i);
    assert.doesNotMatch(text, /все заказы на вашем email/i);
    assert.doesNotMatch(text, /подтянутся автоматически/i);
  }
  assert.match(BUYER_REGISTER_INTRO, /После подтверждения email/);
});

test('пустое состояние для неподтверждённого адреса появляется только по признаку DTO', () => {
  const unverified = buyerOrdersEmptyBody('user@example.com', 'unverified');
  assert.match(unverified, /не подтвержд/);
  assert.match(unverified, /Отправьте письмо для подтверждения/);

  const unknown = buyerOrdersEmptyBody('user@example.com', 'unknown');
  assert.doesNotMatch(unknown, /Email.*не подтвержд/);
  assert.doesNotMatch(unknown, /подтверждённому/);

  const verified = buyerOrdersEmptyBody('user@example.com', 'verified');
  assert.match(verified, /подтверждённому/);
});

test('пользовательские тексты без длинного и среднего тире', () => {
  for (const text of allCopy()) {
    assert.equal(/[\u2013\u2014]/.test(text), false, `тире в тексте: ${text}`);
  }
});
