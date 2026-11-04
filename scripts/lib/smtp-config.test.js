import assert from 'node:assert/strict';
import test from 'node:test';

import {
  describeSmtpConfig,
  isSmtpConfigured,
  resolveOwnerNotifyTo,
  resolveSmtpPort,
  resolveSmtpSecure,
  resolveSmtpTransportOptions,
} from './smtp-config.js';

test('Timeweb 465 implies SSL when SMTP_SECURE is unset', () => {
  const env = { SMTP_HOST: 'smtp.timeweb.ru', SMTP_PORT: '465' };
  assert.equal(resolveSmtpPort(env), 465);
  assert.equal(resolveSmtpSecure(env), true);
  assert.equal(resolveSmtpTransportOptions(env).secure, true);
});

test('Timeweb 587 stays STARTTLS (secure false) when SMTP_SECURE is unset', () => {
  const env = { SMTP_HOST: 'smtp.timeweb.ru', SMTP_PORT: '587' };
  assert.equal(resolveSmtpSecure(env), false);
  assert.equal(resolveSmtpTransportOptions(env).secure, false);
});

test('explicit SMTP_SECURE wins over the port-derived default', () => {
  assert.equal(resolveSmtpSecure({ SMTP_PORT: '465', SMTP_SECURE: '0' }), false);
  assert.equal(resolveSmtpSecure({ SMTP_PORT: '587', SMTP_SECURE: '1' }), true);
  assert.equal(resolveSmtpSecure({ SMTP_PORT: '587', SMTP_SECURE: 'TRUE' }), true);
  assert.equal(resolveSmtpSecure({ SMTP_PORT: '465', SMTP_SECURE: 'off' }), false);
});

test('port falls back to 587 on missing or invalid values', () => {
  assert.equal(resolveSmtpPort({}), 587);
  assert.equal(resolveSmtpPort({ SMTP_PORT: '' }), 587);
  assert.equal(resolveSmtpPort({ SMTP_PORT: 'smtp' }), 587);
  assert.equal(resolveSmtpPort({ SMTP_PORT: '-1' }), 587);
  assert.equal(resolveSmtpPort({ SMTP_PORT: ' 465 ' }), 465);
});

test('auth is built only when both login and password are present', () => {
  const withAuth = resolveSmtpTransportOptions({
    SMTP_HOST: 'smtp.timeweb.ru',
    SMTP_PORT: '465',
    SMTP_USER: 'info@daibilet.ru',
    SMTP_PASS: 'secret',
  });
  assert.deepEqual(withAuth.auth, { user: 'info@daibilet.ru', pass: 'secret' });

  const noPass = resolveSmtpTransportOptions({ SMTP_HOST: 'smtp.timeweb.ru', SMTP_USER: 'info@daibilet.ru' });
  assert.equal(noPass.auth, undefined);
});

test('smtp is configured only with host and from address', () => {
  assert.equal(isSmtpConfigured({ SMTP_HOST: 'smtp.timeweb.ru', SMTP_FROM: 'info@daibilet.ru' }), true);
  assert.equal(isSmtpConfigured({ SMTP_HOST: 'smtp.timeweb.ru' }), false);
  assert.equal(isSmtpConfigured({ SMTP_FROM: 'info@daibilet.ru' }), false);
  assert.equal(isSmtpConfigured({}), false);
});

test('owner notify recipient defaults to info@daibilet.ru', () => {
  assert.equal(resolveOwnerNotifyTo({}), 'info@daibilet.ru');
  assert.equal(resolveOwnerNotifyTo({ ORDER_NOTIFY_TO: ' owner@daibilet.ru ' }), 'owner@daibilet.ru');
});

test('describeSmtpConfig masks the password and reports readiness', () => {
  const summary = describeSmtpConfig({
    SMTP_HOST: 'smtp.timeweb.ru',
    SMTP_PORT: '465',
    SMTP_USER: 'info@daibilet.ru',
    SMTP_PASS: 'super-secret',
    SMTP_FROM: 'Дайбилет <info@daibilet.ru>',
    ORDER_NOTIFY_TO: 'owner@daibilet.ru',
  });
  assert.equal(summary.configured, true);
  assert.equal(summary.secure, true);
  assert.equal(summary.passwordSet, true);
  assert.equal(summary.user, 'info@daibilet.ru');
  assert.equal(summary.ownerNotifyTo, 'owner@daibilet.ru');
  assert.ok(!JSON.stringify(summary).includes('super-secret'));
});

test('describeSmtpConfig reports ORDER_NOTIFY_DISABLE', () => {
  assert.equal(describeSmtpConfig({ ORDER_NOTIFY_DISABLE: '1' }).notifyDisabled, true);
  assert.equal(describeSmtpConfig({}).notifyDisabled, false);
});
