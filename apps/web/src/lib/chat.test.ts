import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildChatTelegramNotification,
  escapeChatTelegramHtml,
  isChatVisitorKey,
  sanitizeChatText,
} from './chat.ts';

test('sanitizeChatText trims, caps and rejects empty input', () => {
  assert.equal(sanitizeChatText('  привет  \n'), 'привет');
  assert.equal(sanitizeChatText('   \n '), null);
  assert.equal(sanitizeChatText(undefined), null);
  const long = 'x'.repeat(5000);
  assert.equal(sanitizeChatText(long)?.length, 4000);
});

test('isChatVisitorKey accepts uuid only', () => {
  assert.equal(isChatVisitorKey('123e4567-e89b-42d3-a456-426614174000'), true);
  assert.equal(isChatVisitorKey('not-a-uuid'), false);
  assert.equal(isChatVisitorKey(''), false);
  assert.equal(isChatVisitorKey('../../etc/passwd'), false);
});

test('buildChatTelegramNotification embeds text and session link', () => {
  const note = buildChatTelegramNotification('Здравствуйте!', 'https://admin.daibilet.ru/admin/chats/c1');
  assert.match(note, /Здравствуйте!/);
  assert.match(note, /\/admin\/chats\/c1/);
  assert.match(note, /Reply/);
});

test('escapeChatTelegramHtml escapes html specials', () => {
  assert.equal(escapeChatTelegramHtml('<b> & >'), '&lt;b&gt; &amp; &gt;');
});
