/**
 * Owner regression: 2 text stops with coords → add Grand Maket (address+city+coords)
 * under near-full localStorage (page caches) → must reach 3/8 (not red error).
 *
 * Usage: node scripts/e2e-day-plan-grand-maket.mjs
 * Env: BASE_URL (default https://daibilet.ru)
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'https://daibilet.ru';
const OUT = path.resolve('.deploy-tmp/e2e-day-plan-grand-maket');
fs.mkdirSync(OUT, { recursive: true });

async function getBuildId(page) {
  return page.evaluate(() => {
    const scripts = [...document.querySelectorAll('script[src*="/_next/static/"]')];
    for (const s of scripts) {
      const m = String(s.src || '').match(/\/_next\/static\/([^/]+)\//);
      if (m && m[1] && !['chunks', 'css', 'media'].includes(m[1])) return m[1];
    }
    return null;
  });
}

async function expandAdvanced(page) {
  const btn = page.getByRole('button', { name: /Город и координаты|Скрыть город/ });
  const t = (await btn.textContent()) || '';
  if (!t.includes('Скрыть')) await btn.click();
  await page.waitForSelector('[data-day-plan-coords]', { timeout: 5000 });
}

async function addFull(page, { title, note, city, coords }) {
  await expandAdvanced(page);
  await page.fill('[data-day-plan-title]', title);
  await page.fill('[data-day-plan-note]', note);
  await page.fill('[data-day-plan-city]', city);
  await page.fill('[data-day-plan-coords]', coords);
  await page.click('[data-day-plan-add]');
  await page.waitForTimeout(400);
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
    return {
      lsCount: ls?.venues?.length ?? 0,
      lsTitles: (ls?.venues || []).map((v) => v.title),
      last: (ls?.venues || []).at(-1) || null,
      label: document.querySelector('[data-day-route-count-label]')?.textContent?.trim() || null,
      heading: document.querySelector('[data-day-route-count-heading]')?.textContent?.trim() || null,
      err: document.querySelector('[role=alert]')?.textContent?.trim() || null,
      addDisabled: Boolean(document.querySelector('[data-day-plan-add]')?.disabled),
      cacheKeys: Object.keys(localStorage).filter((k) =>
        /daibilet:(venue-page|event-page|city-page|landing-page)/.test(k),
      ).length,
    };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const result = { ok: false, buildId: null, steps: [] };

  try {
    await page.goto(`${BASE}/my-day`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    result.buildId = await getBuildId(page);
    console.log('BUILD_ID', result.buildId);

    await page.waitForSelector('[data-day-plan-form]', { timeout: 20000 });

    await addFull(page, {
      title: 'Эрмитаж',
      note: 'Дворцовая площадь, 2, Санкт-Петербург',
      city: 'Санкт-Петербург',
      coords: '59.9398, 30.3146',
    });
    let state = await readPlan(page);
    result.steps.push({ step: 'after-1', ...state });
    if (state.lsCount !== 1) throw new Error(`Expected 1 after Hermitage, got ${state.lsCount}`);

    await addFull(page, {
      title: 'Русский музей',
      note: 'Инженерная улица, 2-4Д, Санкт-Петербург',
      city: 'Санкт-Петербург',
      coords: '59.9387, 30.3322',
    });
    state = await readPlan(page);
    result.steps.push({ step: 'after-2', ...state });
    if (state.lsCount !== 2) throw new Error(`Expected 2 after Russian Museum, got ${state.lsCount}`);
    if (state.addDisabled) throw new Error('Add disabled at 2/8');

    // Fill LS with disposable page caches until near quota (owner failure mode).
    await page.evaluate(() => {
      const chunk = 'z'.repeat(80000);
      for (let i = 0; i < 200; i += 1) {
        try {
          localStorage.setItem(`daibilet:venue-page:v2:pad-${i}`, chunk);
        } catch {
          // top up remaining
          let lo = 1;
          let hi = 80000;
          let best = 0;
          while (lo <= hi) {
            const mid = Math.floor((lo + hi) / 2);
            try {
              localStorage.setItem('daibilet:event-page:tail', 'y'.repeat(mid));
              best = mid;
              lo = mid + 1;
            } catch {
              hi = mid - 1;
            }
          }
          void best;
          break;
        }
      }
    });

    await addFull(page, {
      title: 'Гранд Макет Россия',
      note: 'Цветочная ул., 16Л, ОНТ Пулково-2',
      city: 'Санкт-Петербург',
      coords: '59.887991, 30.330520',
    });
    state = await readPlan(page);
    result.steps.push({ step: 'after-3-grand-maket', ...state });
    console.log('after-3', state.lsCount, state.err, state.label, state.last?.latitude);

    if (state.err) {
      throw new Error(`Form error after Grand Maket: ${state.err}`);
    }
    if (state.lsCount !== 3) {
      throw new Error(`Expected 3/8 after Grand Maket, ls=${state.lsCount}`);
    }
    if (state.lsTitles[2] !== 'Гранд Макет Россия') {
      throw new Error(`Unexpected 3rd title: ${state.lsTitles[2]}`);
    }
    if (state.last?.latitude !== 59.887991 || state.last?.longitude !== 30.33052) {
      throw new Error(`Coords not persisted: ${state.last?.latitude},${state.last?.longitude}`);
    }
    if (!/3\s*\/\s*8/.test(state.label || '') && !/3\s*\/\s*8/.test(state.heading || '')) {
      throw new Error(`Counter missing 3/8: ${state.label} / ${state.heading}`);
    }

    await page.screenshot({ path: path.join(OUT, 'after-3.png'), fullPage: true });
    result.ok = true;
    console.log('OK 2→Grand Maket→3/8 under near-full LS');
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
