/**
 * Owner-path E2E: standalone text planner on /my-day (no catalog).
 * Open /my-day → type stop1 → add → type stop2 → add → count 2.
 *
 * Usage: node scripts/e2e-day-plan-text.mjs
 * Env: BASE_URL (default https://daibilet.ru)
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'https://daibilet.ru';
const OUT = path.resolve('.deploy-tmp/e2e-day-plan-text');
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
      hasAdd: Boolean(document.querySelector('[data-day-plan-add]')),
    };
  });
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

    await addStop(page, 'Стоп один');
    state = await readPlan(page);
    result.steps.push({ step: 'after-1', ...state });
    log('after-1', state.lsCount, state.lsTitles, state.headingText);
    if (state.lsCount !== 1 || state.stopCount !== 1) {
      throw new Error(`Expected 1 stop, ls=${state.lsCount} ui=${state.stopCount}`);
    }
    if (!String(state.lsIds[0] || '').startsWith('text_')) {
      throw new Error(`Expected text_ id, got ${state.lsIds[0]}`);
    }

    await addStop(page, 'Стоп два');
    state = await readPlan(page);
    result.steps.push({ step: 'after-2', ...state });
    log('after-2', state.lsCount, state.lsTitles, state.headingText);
    if (state.lsCount !== 2 || state.stopCount !== 2) {
      throw new Error(`Expected 2 stops, ls=${state.lsCount} ui=${state.stopCount}`);
    }
    if (!/2\s*\/\s*8/.test(state.headingText || '') && !/2\s*\/\s*8/.test(state.labelText || '')) {
      throw new Error(`Count label missing 2/8: heading=${state.headingText} label=${state.labelText}`);
    }

    await page.screenshot({ path: path.join(OUT, 'after-2.png'), fullPage: true });
    result.ok = true;
    log('OK text planner 0→1→2 without catalog');
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
