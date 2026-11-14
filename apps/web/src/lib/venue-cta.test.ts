import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasVenueCommercialCenter,
  resolveVenuePrimaryCta,
} from './venue-cta.ts';

const LABELS = {
  admissionLabel: 'К входным билетам',
  programLabel: 'Выбрать спектакль',
  visitLabel: 'Как посетить',
} as const;

test('CTA priority: LC admission wins over program and editorial', () => {
  const cta = resolveVenuePrimaryCta({
    ...LABELS,
    hasAdmission: true,
    hasProgram: true,
    editorialTickets: {
      href: 'https://example.com/tickets',
      priceFromRub: 500,
    },
    hasVisitAnchor: true,
  });
  assert.equal(cta?.kind, 'admission');
  assert.equal(cta?.href, '#venue-admission');
  assert.equal(cta?.external, undefined);
});

test('CTA priority: program wins over editorial tickets', () => {
  const cta = resolveVenuePrimaryCta({
    ...LABELS,
    hasAdmission: false,
    hasProgram: true,
    editorialTickets: {
      href: 'https://example.com/tickets',
      priceFromRub: 500,
      badge: 'Официальный сайт',
    },
  });
  assert.equal(cta?.kind, 'program');
  assert.equal(cta?.href, '#venue-program');
  assert.equal(cta?.label, 'Выбрать спектакль');
});

test('CTA priority: editorial tickets when no LC and no program', () => {
  const cta = resolveVenuePrimaryCta({
    ...LABELS,
    hasAdmission: false,
    hasProgram: false,
    editorialTickets: {
      href: 'https://pushkinmuseum.art/tickets/',
      priceFromRub: 550,
      badge: 'Официальный сайт',
    },
    hasVisitAnchor: true,
  });
  assert.equal(cta?.kind, 'editorial_tickets');
  assert.equal(cta?.external, true);
  assert.equal(cta?.href, 'https://pushkinmuseum.art/tickets/');
  assert.equal(cta?.priceFromRub, 550);
  assert.equal(cta?.badge, 'Официальный сайт');
});

test('CTA priority: editorial tickets without price still resolves', () => {
  const cta = resolveVenuePrimaryCta({
    ...LABELS,
    hasAdmission: false,
    hasProgram: false,
    editorialTickets: {
      href: 'https://bolshoi.ru/tickets/',
      badge: 'Официальный сайт',
    },
  });
  assert.equal(cta?.kind, 'editorial_tickets');
  assert.equal(cta?.href, 'https://bolshoi.ru/tickets/');
  assert.equal(cta?.priceFromRub, undefined);
  assert.equal(cta?.badge, 'Официальный сайт');
});

test('CTA priority: visit fallback when nothing commercial', () => {
  const cta = resolveVenuePrimaryCta({
    ...LABELS,
    hasAdmission: false,
    hasProgram: false,
    editorialTickets: null,
    hasVisitAnchor: true,
  });
  assert.equal(cta?.kind, 'visit');
  assert.equal(cta?.href, '#visit');
});

test('CTA priority: null when no actionable target', () => {
  const cta = resolveVenuePrimaryCta({
    ...LABELS,
    hasAdmission: false,
    hasProgram: false,
    editorialTickets: null,
    hasVisitAnchor: false,
  });
  assert.equal(cta, null);
});

test('CTA priority: rejects editorial tickets without href', () => {
  assert.equal(
    resolveVenuePrimaryCta({
      ...LABELS,
      hasAdmission: false,
      hasProgram: false,
      editorialTickets: { href: '', priceFromRub: 500 },
      hasVisitAnchor: false,
    }),
    null,
  );
  assert.equal(
    resolveVenuePrimaryCta({
      ...LABELS,
      hasAdmission: false,
      hasProgram: false,
      editorialTickets: { href: '   ', priceFromRub: 0 },
      hasVisitAnchor: false,
    }),
    null,
  );
});

test('museum profile prefers admission label on editorial tickets', () => {
  const cta = resolveVenuePrimaryCta({
    admissionLabel: 'К входным билетам',
    programLabel: 'Афиша и выставки',
    hasAdmission: false,
    hasProgram: false,
    editorialTickets: { href: 'https://garagemca.org/visit', priceFromRub: 500 },
  });
  assert.equal(cta?.label, 'К входным билетам');
});

test('theater profile: program CTA when afisha exists', () => {
  const cta = resolveVenuePrimaryCta({
    admissionLabel: 'К билетам',
    programLabel: 'Выбрать спектакль',
    hasAdmission: false,
    hasProgram: true,
    editorialTickets: { href: 'https://mxat.ru/', priceFromRub: 800 },
  });
  assert.equal(cta?.kind, 'program');
  assert.equal(cta?.label, 'Выбрать спектакль');
});

test('pier/park profile: program CTA for routes', () => {
  const cta = resolveVenuePrimaryCta({
    admissionLabel: 'К билетам',
    programLabel: 'Выбрать рейс',
    hasAdmission: false,
    hasProgram: true,
    programHref: '#location-routes',
  });
  assert.equal(cta?.kind, 'program');
  assert.equal(cta?.href, '#location-routes');
  assert.equal(cta?.label, 'Выбрать рейс');
});

test('park profile: stop-excursions programHref', () => {
  const cta = resolveVenuePrimaryCta({
    admissionLabel: 'К билетам',
    programLabel: 'Посмотреть экскурсии',
    hasAdmission: false,
    hasProgram: true,
    programHref: '#venue-stop-events',
  });
  assert.equal(cta?.href, '#venue-stop-events');
});

test('commercial center flag mirrors real blocks', () => {
  assert.equal(
    hasVenueCommercialCenter({
      hasAdmission: false,
      hasProgram: false,
      showEditorialTickets: false,
    }),
    false,
  );
  assert.equal(
    hasVenueCommercialCenter({
      hasAdmission: false,
      hasProgram: false,
      showEditorialTickets: true,
    }),
    true,
  );
  assert.equal(
    hasVenueCommercialCenter({
      hasAdmission: true,
      hasProgram: false,
      showEditorialTickets: false,
    }),
    true,
  );
});

test('empty venue: no commercial blocks and no CTA without visit anchor', () => {
  assert.equal(
    hasVenueCommercialCenter({
      hasAdmission: false,
      hasProgram: false,
      showEditorialTickets: false,
    }),
    false,
  );
  assert.equal(
    resolveVenuePrimaryCta({
      ...LABELS,
      hasAdmission: false,
      hasProgram: false,
      editorialTickets: null,
      hasVisitAnchor: false,
    }),
    null,
  );
});
