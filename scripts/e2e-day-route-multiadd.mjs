/**
 * Owner-path E2E: catalog multi-add on live daibilet.ru.
 * Fails loudly on 2nd point with full dump (toast, LS, buttons, console, HTML).
 *
 * Usage: node scripts/e2e-day-route-multiadd.mjs
 * Env: BASE_URL (default https://daibilet.ru)
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'https://daibilet.ru';
const CITY = 'Санкт-Петербург';
const OUT = path.resolve('.deploy-tmp/e2e-day-route-multiadd');
fs.mkdirSync(OUT, { recursive: true });

function log(...args) {
  console.log(...args);
}

async function getBuildId(page) {
  return page.evaluate(() => {
    const scripts = [...document.querySelectorAll('script[src*="/_next/static/"]')];
    for (const s of scripts) {
      const m = String(s.src || '').match(/\/_next\/static\/([^/]+)\//);
      if (m && m[1] && m[1] !== 'chunks' && m[1] !== 'css' && m[1] !== 'media') return m[1];
    }
    const html = document.documentElement.innerHTML;
    const m2 = html.match(/\/_next\/static\/([A-Za-z0-9_-]{10,})\//);
    return m2?.[1] || null;
  });
}

async function dumpState(page, label) {
  const data = await page.evaluate(() => {
    let ls = null;
    let lsRaw = null;
    try {
      lsRaw = localStorage.getItem('daibilet:dayRoute');
      ls = lsRaw ? JSON.parse(lsRaw) : null;
    } catch (e) {
      ls = { parseError: String(e) };
    }
    const badge = document.querySelector('[data-day-route-count]');
    const toast = document.getElementById('daibilet-day-route-toast');
    const buttons = [...document.querySelectorAll('button[data-venue-id]')].map((b) => ({
      id: b.getAttribute('data-venue-id'),
      live: b.getAttribute('data-day-route-live'),
      intent: b.getAttribute('data-day-route-intent'),
      pressed: b.getAttribute('aria-pressed'),
      disabled: b.disabled,
      title: b.getAttribute('title'),
      aria: b.getAttribute('aria-label'),
      text: (b.textContent || '').trim().replace(/\s+/g, ' '),
      html: b.outerHTML.slice(0, 500),
    }));
    const idle = buttons.filter(
      (b) =>
        b.live === '1' &&
        !b.disabled &&
        b.pressed !== 'true' &&
        (b.intent === 'route' || !b.intent) &&
        /маршрут/i.test(b.text || b.aria || ''),
    );
    return {
      url: location.href,
      lsRaw,
      ls,
      lsCount: ls?.venues?.length ?? 0,
      lsIds: (ls?.venues || []).map((v) => v.id),
      lsSlugs: (ls?.venues || []).map((v) => v.slug),
      lsCityIds: (ls?.venues || []).map((v) => v.cityId ?? null),
      badgeCount: badge?.getAttribute('data-day-route-count') ?? null,
      badgeText: badge ? (badge.textContent || '').trim() : null,
      toastText: toast && !toast.hidden ? (toast.textContent || '').trim() : null,
      toastHidden: toast ? toast.hidden : null,
      buttons: buttons.slice(0, 16),
      idleRouteButtons: idle.slice(0, 8).map((b) => ({
        id: b.id,
        live: b.live,
        text: b.text,
        disabled: b.disabled,
      })),
      uniqueButtonIds: [...new Set(buttons.map((b) => b.id))].length,
      runtime: typeof window.__daibiletDayRouteRuntime !== 'undefined',
    };
  });
  const file = path.join(OUT, `${label}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  log(`\n=== ${label} ===`);
  log(
    JSON.stringify(
      {
        lsCount: data.lsCount,
        lsIds: data.lsIds,
        lsCityIds: data.lsCityIds,
        badgeCount: data.badgeCount,
        toastText: data.toastText,
        idle: data.idleRouteButtons,
      },
      null,
      2,
    ),
  );
  await page.screenshot({ path: path.join(OUT, `${label}.png`), fullPage: false });
  return data;
}

async function waitLive(page) {
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('button[data-day-route-live="1"][data-venue-id]')].length >= 2,
    { timeout: 30000 },
  );
}

async function pickIdleRouteButton(page, excludeIds = new Set()) {
  return page.evaluate((exclude) => {
    const excludeSet = new Set(exclude);
    const buttons = [...document.querySelectorAll('button[data-venue-id]')];
    for (const b of buttons) {
      const id = b.getAttribute('data-venue-id') || '';
      const live = b.getAttribute('data-day-route-live');
      const intent = b.getAttribute('data-day-route-intent') || 'route';
      const pressed = b.getAttribute('aria-pressed');
      const text = (b.textContent || '').trim();
      if (live !== '1' || b.disabled) continue;
      if (pressed === 'true') continue;
      if (intent !== 'route') continue;
      if (!/маршрут/i.test(text) && !/маршрут/i.test(b.getAttribute('aria-label') || '')) continue;
      if (excludeSet.has(id)) continue;
      b.setAttribute('data-e2e-pick', '1');
      return {
        id,
        text,
        html: b.outerHTML.slice(0, 600),
      };
    }
    return null;
  }, [...excludeIds]);
}

async function clickPicked(page) {
  const loc = page.locator('button[data-e2e-pick="1"]');
  await loc.scrollIntoViewIfNeeded();
  await loc.click({ timeout: 10000 });
  await page.evaluate(() => {
    document.querySelectorAll('button[data-e2e-pick="1"]').forEach((b) => b.removeAttribute('data-e2e-pick'));
  });
  await page.waitForTimeout(700);
}

async function runCatalogScenario(page, tag) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.failure()?.errorText || 'fail'} ${req.url()}`);
  });

  const url = `${BASE}/locations?city=${encodeURIComponent(CITY)}`;
  log(`\n######## ${tag} CATALOG ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(1500);

  await page.evaluate(() => localStorage.removeItem('daibilet:dayRoute'));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
  await waitLive(page);
  await page.waitForTimeout(400);

  const buildId = await getBuildId(page);
  log('BUILD_ID', buildId);
  fs.writeFileSync(path.join(OUT, `${tag}-build.txt`), String(buildId));

  let state = await dumpState(page, `${tag}-0-cleared`);
  if (state.lsCount !== 0) {
    throw new Error(`${tag}: clear failed, lsCount=${state.lsCount}`);
  }

  const clickedIds = [];
  for (let step = 1; step <= 3; step += 1) {
    const pick = await pickIdleRouteButton(page, new Set(clickedIds));
    if (!pick) {
      await dumpState(page, `${tag}-FAIL-no-idle-at-${step}`);
      throw new Error(`${tag}: no idle route button at step ${step}`);
    }
    log(`click #${step}`, pick.id, pick.text);
    fs.writeFileSync(path.join(OUT, `${tag}-btn-${step}.html`), pick.html);

    const before = await dumpState(page, `${tag}-before-${step}`);
    await clickPicked(page);
    const after = await dumpState(page, `${tag}-after-${step}`);

    const okCount = after.lsCount === step;
    const okBadge = Number(after.badgeCount) === step;
    const okDistinct = new Set(after.lsIds).size === step;
    const toast = after.toastText || '';
    const toastOk =
      step === 1
        ? /Добавлено/i.test(toast)
        : /Добавлено/i.test(toast);

    if (!okCount || !okBadge || !okDistinct || !toastOk) {
      const failDump = {
        step,
        clickedId: pick.id,
        before,
        after,
        expectedCount: step,
        toast,
        consoleErrors,
        pageErrors,
        failedRequests: failedRequests.slice(-20),
        buttonHtml: pick.html,
        prevButtonHtml:
          step > 1 && fs.existsSync(path.join(OUT, `${tag}-btn-${step - 1}.html`))
            ? fs.readFileSync(path.join(OUT, `${tag}-btn-${step - 1}.html`), 'utf8')
            : null,
      };
      fs.writeFileSync(path.join(OUT, `${tag}-FAIL-step-${step}.json`), JSON.stringify(failDump, null, 2));
      throw new Error(
        `${tag}: FAIL at step ${step} (owner symptom). ` +
          `ls=${after.lsCount} badge=${after.badgeCount} toast=${JSON.stringify(toast)} ` +
          `ids=${JSON.stringify(after.lsIds)}`,
      );
    }
    clickedIds.push(pick.id);
  }

  return { buildId, clickedIds, consoleErrors, pageErrors };
}

async function runHardNavDetail(page, tag) {
  log(`\n######## ${tag} HARD NAV DETAIL`);
  await page.goto(`${BASE}/locations?city=${encodeURIComponent(CITY)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.evaluate(() => localStorage.removeItem('daibilet:dayRoute'));
  const hrefs = await page.$$eval('a[href*="/locations/"]', (as) =>
    [...new Set(as.map((a) => a.getAttribute('href')).filter(Boolean))]
      .filter((h) => /\/locations\/[^/?#]+/.test(h) && !h.includes('?'))
      .slice(0, 3),
  );
  if (hrefs.length < 2) throw new Error(`${tag}: need 2 detail hrefs, got ${hrefs.length}`);

  for (let i = 0; i < 2; i += 1) {
    const href = hrefs[i].startsWith('http') ? hrefs[i] : `${BASE}${hrefs[i]}`;
    await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await waitLive(page);
    const main = page.locator(
      'button[data-day-route-live="1"][data-day-route-intent="route"][aria-pressed="false"]',
    ).first();
    await main.click({ timeout: 10000 });
    await page.waitForTimeout(600);
    const s = await dumpState(page, `${tag}-hard-${i + 1}`);
    if (s.lsCount !== i + 1) {
      throw new Error(`${tag} hard-nav fail at ${i + 1}: ls=${s.lsCount} toast=${s.toastText}`);
    }
    if (i === 1 && !/Добавлено/i.test(s.toastText || '')) {
      throw new Error(`${tag} hard-nav toast not Добавлено: ${s.toastText}`);
    }
  }
  return hrefs.slice(0, 2);
}

async function runSoftNavDetail(page, tag) {
  log(`\n######## ${tag} SOFT NAV DETAIL`);
  await page.goto(`${BASE}/locations?city=${encodeURIComponent(CITY)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.evaluate(() => localStorage.removeItem('daibilet:dayRoute'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitLive(page);

  const hrefs = await page.$$eval('a[href*="/locations/"]', (as) =>
    [...new Set(as.map((a) => a.getAttribute('href')).filter(Boolean))]
      .filter((h) => /\/locations\/[^/?#]+/.test(h) && !h.includes('?'))
      .slice(0, 3),
  );
  if (hrefs.length < 2) throw new Error(`${tag}: soft need 2 hrefs`);

  // Open first detail via client navigation (click link)
  await page.locator(`a[href="${hrefs[0]}"]`).first().click();
  await page.waitForURL(/\/locations\/[^/?]+/, { timeout: 30000 });
  await waitLive(page);
  await page
    .locator('button[data-day-route-live="1"][data-day-route-intent="route"][aria-pressed="false"]')
    .first()
    .click();
  await page.waitForTimeout(600);
  let s = await dumpState(page, `${tag}-soft-1`);
  if (s.lsCount !== 1) throw new Error(`${tag} soft1 fail ls=${s.lsCount} toast=${s.toastText}`);

  // Soft nav to second: go back to catalog then click, or navigate via router link on page
  await page.goto(`${BASE}/locations?city=${encodeURIComponent(CITY)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await waitLive(page);
  await page.locator(`a[href="${hrefs[1]}"]`).first().click();
  await page.waitForURL(/\/locations\/[^/?]+/, { timeout: 30000 });
  await waitLive(page);
  await page
    .locator('button[data-day-route-live="1"][data-day-route-intent="route"][aria-pressed="false"]')
    .first()
    .click();
  await page.waitForTimeout(600);
  s = await dumpState(page, `${tag}-soft-2`);
  if (s.lsCount !== 2) {
    throw new Error(`${tag} soft2 FAIL ls=${s.lsCount} toast=${s.toastText} ids=${JSON.stringify(s.lsIds)}`);
  }
  if (!/Добавлено/i.test(s.toastText || '')) {
    throw new Error(`${tag} soft2 toast not Добавлено: ${s.toastText}`);
  }
  return hrefs.slice(0, 2);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = { ok: true, scenarios: {} };

  try {
    // Desktop catalog (owner path)
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        locale: 'ru-RU',
      });
      const page = await context.newPage();
      results.scenarios.desktopCatalog = await runCatalogScenario(page, 'desktop');
      results.scenarios.desktopHard = await runHardNavDetail(page, 'desktop');
      results.scenarios.desktopSoft = await runSoftNavDetail(page, 'desktop');
      await context.close();
    }

    // Mobile catalog
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        locale: 'ru-RU',
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      });
      const page = await context.newPage();
      results.scenarios.mobileCatalog = await runCatalogScenario(page, 'mobile');
      await context.close();
    }

    log('\nALL PASS');
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
    process.exit(0);
  } catch (err) {
    results.ok = false;
    results.error = String(err?.stack || err);
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
    console.error('\nE2E FAILED:', err);
    process.exit(2);
  } finally {
    await browser.close();
  }
}

main();
