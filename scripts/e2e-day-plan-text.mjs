/**
 * Owner-path E2E: standalone text planner on /my-day (no catalog).
 * Open /my-day → add text stops through HARD → assert counter without /lock; soft warn ≥SOFT; add disabled at hard.
 *
 * Usage: node scripts/e2e-day-plan-text.mjs
 * Env: BASE_URL (default https://daibilet.ru)
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'https://daibilet.ru';
const OUT = path.resolve('.deploy-tmp/e2e-day-plan-text');
const SOFT = 10;
const MAX = 15; // hard safety
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

async function readPlan(page) {
  return page.evaluate(() => {
    let ls = null;
    try {
      const raw = localStorage.getItem('daibilet:dayRoute');
      ls = raw ? JSON.parse(raw) : null;
    } catch (e) {
      ls = { parseError: String(e) };
    }
    const badge = document.querySelector('[data-day-route-count]');
    const heading = document.querySelector('[data-day-route-count-heading]');
    const label = document.querySelector('[data-day-route-count-label]');
    const addBtn = document.querySelector('[data-day-plan-add]');
    const stops = [...document.querySelectorAll('[data-day-plan-stop]')].map((el) => ({
      id: el.getAttribute('data-day-plan-stop'),
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120),
    }));
    return {
      url: location.href,
      lsCount: ls?.venues?.length ?? 0,
      lsTitles: (ls?.venues || []).map((v) => v.title),
      lsIds: (ls?.venues || []).map((v) => v.id),
      badgeCount: badge?.getAttribute('data-day-route-count') ?? null,
      headingText: heading ? (heading.textContent || '').trim() : null,
      labelText: label ? (label.textContent || '').trim() : null,
      stopCount: stops.length,
      stops,
      hasForm: Boolean(document.querySelector('[data-day-plan-form]')),
      hasAdd: Boolean(addBtn),
      addDisabled: Boolean(addBtn?.disabled),
      err: document.querySelector('[role=alert]')?.textContent?.trim() || null,
    };
  });
}

function assertCountLabel(state, n) {
  // Soft-warn UI: «Точки · N» / «Маршрут · N» (+ optional «плотный день»), no /MAX lock.
  const hay = `${state.headingText || ''} ${state.labelText || ''}`;
  const re = new RegExp(`(?:Точки|Маршрут)\\s*·\\s*${n}(?:\\s*·|\\b)`);
  if (!re.test(hay) && !new RegExp(`\\b${n}\\b`).test(hay)) {
    throw new Error(
      `Count label missing ${n}: heading=${state.headingText} label=${state.labelText}`,
    );
  }
  if (n >= SOFT && !/плотный день/i.test(hay)) {
    throw new Error(
      `Soft warn missing at ${n}: heading=${state.headingText} label=${state.labelText}`,
    );
  }
}

async function addStop(page, title) {
  const input = page.locator('[data-day-plan-title]');
  await input.fill(title);
  await page.locator('[data-day-plan-add]').click();
  await page.waitForTimeout(250);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const result = { ok: false, buildId: null, steps: [] };

  try {
    await page.goto(`${BASE}/my-day`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate(() => localStorage.removeItem('daibilet:dayRoute'));
    await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
    result.buildId = await getBuildId(page);
    log('BUILD_ID', result.buildId);

    await page.waitForSelector('[data-day-plan-form]', { timeout: 20000 });
    let state = await readPlan(page);
    result.steps.push({ step: 'empty', ...state });
    log('empty', state.lsCount, state.labelText);

    if (!state.hasForm || !state.hasAdd) {
      throw new Error('Text planner form missing on /my-day');
    }
    if (state.lsCount !== 0) {
      throw new Error(`Expected empty plan, got ${state.lsCount}`);
    }
    if (state.addDisabled) {
      throw new Error('Add button must be enabled on empty plan');
    }

    for (let n = 1; n <= MAX; n += 1) {
      if (state.addDisabled) {
        throw new Error(`Add disabled before stop ${n} (must stay enabled until ${MAX})`);
      }
      await addStop(page, `Стоп ${n}`);
      state = await readPlan(page);
      result.steps.push({ step: `after-${n}`, ...state });
      log(`after-${n}`, state.lsCount, state.lsTitles, state.headingText, 'disabled=', state.addDisabled);

      if (state.lsCount !== n || state.stopCount !== n) {
        throw new Error(`Expected ${n} stops, ls=${state.lsCount} ui=${state.stopCount}`);
      }
      if (!String(state.lsIds[n - 1] || '').startsWith('text_')) {
        throw new Error(`Expected text_ id at ${n}, got ${state.lsIds[n - 1]}`);
      }
      assertCountLabel(state, n);

      // Critical regression: DAY_ROUTE_MIN=2 must NOT disable add.
      if (n === 2 && state.addDisabled) {
        throw new Error('Add disabled at 2/MAX - MIN leaked as MAX');
      }
      if (n < MAX && state.addDisabled) {
        throw new Error(`Add disabled early at ${n}/${MAX}`);
      }
      if (n === MAX && !state.addDisabled) {
        throw new Error(`Add must be disabled at ${MAX}/${MAX}`);
      }
    }

    // Overflow attempt must not grow past MAX.
    const overflowDisabled = await page.locator('[data-day-plan-add]').isDisabled();
    if (!overflowDisabled) {
      await addStop(page, 'Overflow');
      state = await readPlan(page);
      result.steps.push({ step: 'overflow', ...state });
      if (state.lsCount !== MAX) {
        throw new Error(`Overflow grew plan to ${state.lsCount}, expected ${MAX}`);
      }
    }

    await page.screenshot({ path: path.join(OUT, `after-${MAX}.png`), fullPage: true });
    result.ok = true;
    log(`OK text planner 0→${MAX} without catalog; soft=${SOFT}; hard=${MAX}; add disabled only at hard`);
  } catch (err) {
    result.error = String(err?.stack || err);
    try {
      await page.screenshot({ path: path.join(OUT, 'fail.png'), fullPage: true });
    } catch {
      // ignore
    }
    console.error('FAIL', result.error);
  } finally {
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(result, null, 2));
    await browser.close();
  }

  if (!result.ok) process.exit(1);
}

main();
