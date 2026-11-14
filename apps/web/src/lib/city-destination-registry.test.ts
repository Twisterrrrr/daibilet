import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BALTIYSK_SUBURB_CARD,
  DIVEEVO_SUBURB_CARD,
  DESTINATION_REGISTRY,
  GORODETS_SUBURB_CARD,
  KURSHKAYA_KOSA_SUBURB_CARD,
  MAKARYEV_SUBURB_CARD,
  SEMYONOV_SUBURB_CARD,
  SVETLOGORSK_SUBURB_CARD,
  TORZHOK_SUBURB_CARD,
  VYBORG_SUBURB_CARD,
  YANTARNY_SUBURB_CARD,
  ZELENOGRADSK_SUBURB_CARD,
  applyDestinationRegistryToCityInfo,
  buildDestinationParentHubHref,
  buildDestinationRegionLinkLabel,
  buildDestinationRegionPageHref,
  listDestinationCoverageRows,
  resolveDestination,
  resolveDestinationByCatalogSlug,
  resolveDestinationForHubSuburb,
  resolveDestinationForRegionChild,
  resolveDestinationPageGuideForRegionChild,
  resolveDestinationRegionLinkForSuburb,
  resolveDestinationsForHub,
} from './city-destination-registry.ts';
import { PETERHOF_SUBURB_CARD } from './saint-petersburg-suburbs.ts';
import { SERGIEV_POSAD_SUBURB_CARD } from './moscow-suburbs.ts';
import { CITY_INFO, type CityInfoEntry } from './cityInfo.ts';

test('registry has unique destination ids', () => {
  const ids = DESTINATION_REGISTRY.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('pilot satellite cities have parent hub and suburb cards', () => {
  const vyborg = resolveDestination('vyborg');
  assert.ok(vyborg);
  assert.equal(vyborg.parentHubSlug, 'saint-petersburg');
  assert.equal(vyborg.catalogCitySlug, 'vyborg');
  assert.equal(vyborg.regionSlug, 'leningradskaya-oblast');
  assert.ok((vyborg.suburbCard.places?.length || 0) >= 4);

  const torzhok = resolveDestination('tver-torzhok');
  assert.ok(torzhok);
  assert.equal(torzhok.parentHubSlug, 'tver');
  assert.equal(torzhok.catalogCitySlug, 'torzhok');
  assert.ok((torzhok.suburbCard.places?.length || 0) >= 4);
});

test('resolveDestinationsForHub returns migrated suburbs for SPB and Tver', () => {
  const spb = resolveDestinationsForHub('saint-petersburg');
  assert.equal(spb.length, 11);
  assert.ok(spb.some((entry) => entry.id === 'vyborg'));
  assert.ok(spb.some((entry) => entry.id === 'spb-peterhof'));
  assert.ok(spb.some((entry) => entry.id === 'spb-sosnovy-bor'));

  const moscow = resolveDestinationsForHub('moscow');
  assert.equal(moscow.length, 8);
  assert.ok(moscow.some((entry) => entry.id === 'moscow-sergiev-posad'));
  assert.ok(moscow.some((entry) => entry.id === 'moscow-melihovo'));

  const tver = resolveDestinationsForHub('tver');
  assert.ok(tver.some((entry) => entry.id === 'tver-torzhok'));

  const kaliningrad = resolveDestinationsForHub('kaliningrad');
  assert.ok(kaliningrad.some((entry) => entry.id === 'kaliningrad-zelenogradsk'));
  assert.ok(kaliningrad.some((entry) => entry.id === 'kaliningrad-svetlogorsk'));
  assert.ok(kaliningrad.some((entry) => entry.id === 'kaliningrad-kurshskaya-kosa'));
  assert.ok(kaliningrad.some((entry) => entry.id === 'kaliningrad-baltiysk'));
  assert.ok(kaliningrad.some((entry) => entry.id === 'kaliningrad-yantarny'));

  const nn = resolveDestinationsForHub('nizhny-novgorod');
  assert.ok(nn.some((entry) => entry.id === 'nn-gorodets'));
  assert.ok(nn.some((entry) => entry.id === 'nn-semyonov'));
  assert.ok(nn.some((entry) => entry.id === 'nn-diveevo'));
  assert.ok(nn.some((entry) => entry.id === 'nn-makaryev'));
});

test('CITY_INFO wires registry suburb cards on parent hubs', () => {
  const spbSuburbs = CITY_INFO['saint-petersburg']?.significantSuburbs || [];
  assert.equal(spbSuburbs.length, 11);
  const vyborg = spbSuburbs.find((suburb) => suburb.name === 'Выборг');
  assert.ok(vyborg);
  assert.equal(vyborg, VYBORG_SUBURB_CARD);

  const peterhof = spbSuburbs.find((suburb) => suburb.name === 'Петергоф');
  assert.ok(peterhof);
  assert.equal(peterhof, PETERHOF_SUBURB_CARD);

  const moscowSuburbs = CITY_INFO.moscow?.significantSuburbs || [];
  assert.equal(moscowSuburbs.length, 8);
  const sergiev = moscowSuburbs.find((suburb) => suburb.name === 'Сергиев Посад');
  assert.ok(sergiev);
  assert.equal(sergiev, SERGIEV_POSAD_SUBURB_CARD);

  const tverSuburbs = CITY_INFO.tver?.significantSuburbs || [];
  const torzhok = tverSuburbs.find((suburb) => suburb.name === 'Торжок');
  assert.ok(torzhok);
  assert.equal(torzhok, TORZHOK_SUBURB_CARD);

  const kalSuburbs = CITY_INFO.kaliningrad?.significantSuburbs || [];
  assert.equal(kalSuburbs.find((suburb) => suburb.name === 'Куршская коса'), KURSHKAYA_KOSA_SUBURB_CARD);
  assert.equal(
    kalSuburbs.find((suburb) => suburb.name === 'Зеленоградск (Кранц)'),
    ZELENOGRADSK_SUBURB_CARD,
  );
  assert.equal(
    kalSuburbs.find((suburb) => suburb.name === 'Светлогорск (Раушен)'),
    SVETLOGORSK_SUBURB_CARD,
  );
  assert.equal(kalSuburbs.find((suburb) => suburb.name === 'Балтийск (Пиллау)'), BALTIYSK_SUBURB_CARD);
  assert.equal(kalSuburbs.find((suburb) => suburb.name === 'Янтарный (Пальмикен)'), YANTARNY_SUBURB_CARD);

  const nnSuburbs = CITY_INFO['nizhny-novgorod']?.significantSuburbs || [];
  assert.equal(nnSuburbs.find((suburb) => suburb.name === 'Городец'), GORODETS_SUBURB_CARD);
  assert.equal(nnSuburbs.find((suburb) => suburb.name === 'Семёнов'), SEMYONOV_SUBURB_CARD);
  assert.equal(nnSuburbs.find((suburb) => suburb.name === 'Дивеево'), DIVEEVO_SUBURB_CARD);
  assert.equal(nnSuburbs.find((suburb) => suburb.name === 'Макарьевский монастырь'), MAKARYEV_SUBURB_CARD);
});

test('applyDestinationRegistryToCityInfo swaps matching suburb names', () => {
  const clone: Record<string, CityInfoEntry> = {
    'saint-petersburg': {
      brief: 'test',
      mustSee: [],
      significantSuburbs: [{ name: 'Выборг', desc: 'old copy' }],
    },
  };
  applyDestinationRegistryToCityInfo(clone);
  assert.equal(clone['saint-petersburg']?.significantSuburbs?.[0], VYBORG_SUBURB_CARD);
});

test('listDestinationCoverageRows includes migrated and pending suburbs', () => {
  const rows = listDestinationCoverageRows(CITY_INFO);
  const vyborg = rows.find((row) => row.destinationId === 'vyborg');
  assert.ok(vyborg);
  assert.equal(vyborg.registryStatus, 'migrated');
  assert.equal(vyborg.wiredInHub, true);

  const pending = rows.filter((row) => row.registryStatus === 'pending');
  assert.equal(pending.length, 0);
  assert.equal(rows.filter((row) => row.registryStatus === 'migrated').length, rows.length);
});

test('region child guide resolves for Vyborg on Leningrad Oblast hub', () => {
  const entry = resolveDestinationForRegionChild({
    childSlug: 'vyborg',
    childName: 'Выборг',
    regionSlug: 'leningradskaya-oblast',
  });
  assert.ok(entry);
  assert.equal(entry.id, 'vyborg');

  const guide = resolveDestinationPageGuideForRegionChild({
    childSlug: 'vyborg',
    regionSlug: 'leningradskaya-oblast',
  });
  assert.ok(guide);
  assert.equal(guide.places.length, 8);
  assert.equal(guide.regionPageHref, '/cities/leningradskaya-oblast?city=vyborg');
  assert.equal(
    guide.parentHubHref,
    '/cities/saint-petersburg?suburb=vyborg#city-suburbs',
  );
});

test('hub suburb cross-link points to region scoped page for Vyborg', () => {
  const link = resolveDestinationRegionLinkForSuburb('saint-petersburg', 'Выборг');
  assert.ok(link);
  assert.equal(link.href, '/cities/leningradskaya-oblast?city=vyborg');
  assert.equal(link.label, 'Афиша и события Выборга');

  assert.equal(resolveDestinationRegionLinkForSuburb('tver', 'Торжок'), null);
});

test('region link label uses genitive case for satellite names', () => {
  assert.equal(buildDestinationRegionLinkLabel('Выборг'), 'Афиша и события Выборга');
  assert.equal(buildDestinationRegionLinkLabel('Зеленоградск (Кранц)'), 'Афиша и события Зеленоградска');
  assert.equal(buildDestinationRegionLinkLabel('Светлогорск (Раушен)'), 'Афиша и события Светлогорска');
  assert.equal(buildDestinationRegionLinkLabel('Городец'), 'Афиша и события Городца');
  assert.equal(buildDestinationRegionLinkLabel('Семёнов'), 'Афиша и события Семёнова');
  assert.equal(buildDestinationRegionLinkLabel('Балтийск (Пиллау)'), 'Афиша и события Балтийска');
  assert.equal(buildDestinationRegionLinkLabel('Янтарный (Пальмикен)'), 'Афиша и события Янтарного');
  assert.equal(buildDestinationRegionLinkLabel('Дивеево'), 'Афиша и события Дивеева');
});

test('Kaliningrad and NN suburb cross-links point to region scoped pages', () => {
  const zelenogradsk = resolveDestinationRegionLinkForSuburb('kaliningrad', 'Зеленоградск (Кранц)');
  assert.ok(zelenogradsk);
  assert.equal(zelenogradsk.href, '/cities/kaliningradskaya-oblast?city=zelenogradsk');

  const svetlogorsk = resolveDestinationRegionLinkForSuburb('kaliningrad', 'Светлогорск (Раушен)');
  assert.ok(svetlogorsk);
  assert.equal(svetlogorsk.href, '/cities/kaliningradskaya-oblast?city=svetlogorsk');

  const gorodets = resolveDestinationRegionLinkForSuburb('nizhny-novgorod', 'Городец');
  assert.ok(gorodets);
  assert.equal(gorodets.href, '/cities/nizhegorodskaya-oblast?city=gorodets');

  const semyonov = resolveDestinationRegionLinkForSuburb('nizhny-novgorod', 'Семёнов');
  assert.ok(semyonov);
  assert.equal(semyonov.href, '/cities/nizhegorodskaya-oblast?city=semyonov');

  const baltiysk = resolveDestinationRegionLinkForSuburb('kaliningrad', 'Балтийск (Пиллау)');
  assert.ok(baltiysk);
  assert.equal(baltiysk.href, '/cities/kaliningradskaya-oblast?city=baltiysk');
  assert.equal(baltiysk.label, 'Афиша и события Балтийска');

  const yantarny = resolveDestinationRegionLinkForSuburb('kaliningrad', 'Янтарный (Пальмикен)');
  assert.ok(yantarny);
  assert.equal(yantarny.href, '/cities/kaliningradskaya-oblast?city=yantarnyy');

  const diveevo = resolveDestinationRegionLinkForSuburb('nizhny-novgorod', 'Дивеево');
  assert.ok(diveevo);
  assert.equal(diveevo.href, '/cities/nizhegorodskaya-oblast?city=diveevo');

  assert.equal(resolveDestinationRegionLinkForSuburb('kaliningrad', 'Куршская коса'), null);
  assert.equal(resolveDestinationRegionLinkForSuburb('nizhny-novgorod', 'Макарьевский монастырь'), null);
});

test('region child guide resolves for Kaliningrad coast satellites', () => {
  const zelenogradsk = resolveDestinationPageGuideForRegionChild({
    childSlug: 'zelenogradsk',
    regionSlug: 'kaliningradskaya-oblast',
  });
  assert.ok(zelenogradsk);
  assert.equal(zelenogradsk.places.length, 7);
  assert.equal(
    zelenogradsk.parentHubHref,
    '/cities/kaliningrad?suburb=zelenogradsk#city-suburbs',
  );

  const svetlogorsk = resolveDestinationForRegionChild({
    childSlug: 'svetlogorsk',
    regionSlug: 'kaliningradskaya-oblast',
  });
  assert.ok(svetlogorsk);
  assert.equal(buildDestinationRegionPageHref(svetlogorsk!), '/cities/kaliningradskaya-oblast?city=svetlogorsk');
});

test('region child guide resolves for NN craft satellites', () => {
  const gorodets = resolveDestinationPageGuideForRegionChild({
    childSlug: 'gorodets',
    regionSlug: 'nizhegorodskaya-oblast',
  });
  assert.ok(gorodets);
  assert.equal(gorodets.places.length, 7);

  const semyonov = resolveDestinationByCatalogSlug('semyonov');
  assert.ok(semyonov);
  assert.equal(
    buildDestinationParentHubHref(semyonov!),
    '/cities/nizhny-novgorod?suburb=semyonov#city-suburbs',
  );
});

test('catalog slug lookup and parent hub href builders', () => {
  const bySlug = resolveDestinationByCatalogSlug('vyborg');
  assert.ok(bySlug);
  assert.equal(buildDestinationRegionPageHref(bySlug!), '/cities/leningradskaya-oblast?city=vyborg');
  assert.equal(
    buildDestinationParentHubHref(bySlug!),
    '/cities/saint-petersburg?suburb=vyborg#city-suburbs',
  );

  const peterhofEntry = resolveDestinationForHubSuburb('saint-petersburg', 'Петергоф');
  assert.ok(peterhofEntry);
  assert.equal(peterhofEntry!.id, 'spb-peterhof');
  assert.equal(peterhofEntry!.presentation.showStandalonePage, false);
});
