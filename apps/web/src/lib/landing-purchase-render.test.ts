import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { LandingPurchaseButton } from '@/components/landing/LandingPurchaseButton.client';
import type { PublicSessionDto } from '@daibilet/contracts/public';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function renderPurchaseButton(session: Record<string, unknown>) {
  return renderToStaticMarkup(
    React.createElement(LandingPurchaseButton, {
      session: session as unknown as PublicSessionDto,
      label: 'Купить билет',
    }),
  );
}

test('collection TC CTA uses Ticketscloud and never emits a Daibilet checkout link', () => {
  const html = renderPurchaseButton({
    id: 'evt_0123456789abcdef01234567',
    purchaseProvider: 'TICKETSCLOUD',
    purchaseUrl: 'https://ticketscloud.com/v1/widgets/common?token=jwt&event=0123456789abcdef01234567',
  });

  assert.match(html, /Купить билет/);
  assert.match(html, /data-tc-event="0123456789abcdef01234567"/);
  assert.match(html, /data-tc-token="jwt"/);
  assert.doesNotMatch(html, /daibilet\.ru|\/checkout/i);
});

test('collection TEP CTA does not expose an internal checkout URL', () => {
  const html = renderPurchaseButton({
    id: 'evt_tep_12345',
    purchaseProvider: 'TEPLOHOD',
    purchaseUrl: 'https://daibilet.ru/checkout/order/12345',
  });

  assert.match(html, /Купить билет/);
  assert.doesNotMatch(html, /daibilet\.ru|\/checkout/i);
});

test('unknown collection provider with a Daibilet checkout URL fails closed', () => {
  const html = renderPurchaseButton({
    id: 'event-123',
    purchaseUrl: 'https://pay.daibilet.ru/checkout/order/123',
  });

  assert.match(html, /disabled/);
  assert.doesNotMatch(html, /href=/i);
});
