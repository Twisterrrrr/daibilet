import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createDb } from '../apps/backend/src/db.js';
import { buildCatalogSessions, buildPublicHome, buildPublicStats, clearPublicDataCaches } from '../apps/backend/src/dto.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = createDb(rootDir);
const httpBaseUrl = String(process.env.PUBLIC_PERF_BASE_URL || process.env.DAIBILET_API_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');
const scenarios = [
  {
    name: 'Главная',
    kind: 'home',
    run: () => buildPublicHome(db),
    summarize: (payload) => `${payload.stats?.events || 0} событий, ${payload.stats?.venues || 0} площадок`,
  },
  {
    name: 'Статистика hero',
    kind: 'stats',
    run: () => buildPublicStats(db),
    summarize: (payload) => `${payload.stats?.events || 0} событий, ${payload.stats?.destinations || 0} городов/регионов`,
  },
  {
    name: 'Каталог: первые 60',
    kind: 'catalog',
    params: 'limit=60&sort=time',
  },
  {
    name: 'Каталог: Санкт-Петербург сегодня/ближайшее',
    kind: 'catalog',
    params: 'limit=60&city=Санкт-Петербург&sort=time',
  },
  {
    name: 'Каталог: речные прогулки',
    kind: 'catalog',
    params: 'limit=60&landing=river-walks&sort=time',
  },
  {
    name: 'Каталог: поиск "каналы"',
    kind: 'catalog',
    params: 'limit=60&q=каналы&sort=time',
  },
  {
    name: 'Каталог: цена до 1000',
    kind: 'catalog',
    params: 'limit=60&maxPrice=1000&sort=price',
  },
];
const httpScenarios = [
  {
    name: 'HTTP stats',
    path: '/api/public/stats?refresh=1',
    warmPath: '/api/public/stats',
    coldBudgetMs: 300,
    warmBudgetMs: 300,
    summarize: (payload) => `${payload.stats?.events || 0} событий, ${payload.stats?.destinations || 0} городов/регионов`,
  },
  {
    name: 'HTTP home',
    path: '/api/public/home?refresh=1',
    warmPath: '/api/public/home',
    coldBudgetMs: 1000,
    warmBudgetMs: 300,
    summarize: (payload) => `${payload.stats?.events || 0} событий, ${payload.sessions?.length || 0} карточек на главной`,
  },
  {
    name: 'HTTP catalog',
    path: '/api/public/events?refresh=1&limit=60&sort=time',
    warmPath: '/api/public/events?limit=60&sort=time',
    coldBudgetMs: 3000,
    warmBudgetMs: 100,
    summarize: summarizeCatalog,
  },
];

const rows = [];
for (const scenario of scenarios) {
  clearPublicDataCaches();
  const cold = await measureScenario(scenario);
  const warm = await measureScenario(scenario);
  rows.push({
    name: scenario.name,
    params: scenario.params || '-',
    coldMs: cold.ms,
    warmMs: warm.ms,
    total: cold.total,
    returned: cold.returned,
    summary: cold.summary,
    status: '-',
  });
}

const httpRows = [];
for (const scenario of httpScenarios) {
  const result = await measureHttpPair(scenario);
  httpRows.push(result);
}

const generatedAt = new Date().toISOString();
const output = [
  '# Public Performance Snapshot',
  '',
  `Сгенерировано: ${generatedAt}`,
  '',
  'Замер выполняется напрямую через backend DTO на текущей локальной БД. Cold показывает первый проход после очистки public DTO cache, warm показывает повторный проход в том же процессе.',
  '',
  '## DTO',
  '',
  '| Сценарий | Параметры | Cold, ms | Warm, ms | Всего | Возвращено | Сводка |',
  '|---|---|---:|---:|---:|---:|---|',
  ...rows.map((row) => `| ${cleanCell(row.name)} | ${cleanCell(row.params)} | ${row.coldMs} | ${row.warmMs} | ${row.total} | ${row.returned} | ${cleanCell(row.summary)} |`),
  '',
  '## HTTP',
  '',
  `Backend: ${httpBaseUrl}`,
  '',
  '| Сценарий | Cold, ms | Warm, ms | Бюджет cold | Бюджет warm | Статус | Сводка |',
  '|---|---:|---:|---:|---:|---|---|',
  ...httpRows.map((row) =>
    `| ${cleanCell(row.name)} | ${formatMs(row.coldMs)} | ${formatMs(row.warmMs)} | ${row.coldBudgetMs} | ${row.warmBudgetMs} | ${row.status} | ${cleanCell(row.summary)} |`,
  ),
  '',
  '## Следующий контроль',
  '',
  '- HTTP stats cold должен быть меньше 300 ms.',
  '- HTTP catalog warm должен быть меньше 100 ms.',
  '- HTTP home cold желательно держать ниже 1000 ms; если выше, ускорять buildPublicHome.',
  '- Если DTO cold catalog снова выше 3000 ms, переносить фильтры глубже в SQL.',
  '- Для production добавить HTTP/CDN cache policy отдельно от локального backend cache.',
  '',
].join('\n');

writeFileSync(path.join(rootDir, 'docs', 'public-performance-snapshot.md'), output, 'utf8');
console.log(output);

async function measureScenario(scenario) {
  const startedAt = performance.now();
  const payload =
    scenario.kind === 'catalog'
      ? await buildCatalogSessions(db, new URLSearchParams(scenario.params))
      : await scenario.run();
  const ms = Math.round(performance.now() - startedAt);
  const total = payload.total ?? payload.stats?.events ?? payload.sessions?.length ?? payload.items?.length ?? 0;
  const returned = payload.items?.length ?? payload.sessions?.length ?? 0;
  return {
    ms,
    total,
    returned,
    summary: scenario.summarize ? scenario.summarize(payload) : summarizeCatalog(payload),
  };
}

async function measureHttpPair(scenario) {
  try {
    const cold = await measureHttp(scenario.path, scenario.summarize);
    const warm = await measureHttp(scenario.warmPath || scenario.path, scenario.summarize);
    const ok = cold.ms <= scenario.coldBudgetMs && warm.ms <= scenario.warmBudgetMs;
    return {
      name: scenario.name,
      coldMs: cold.ms,
      warmMs: warm.ms,
      coldBudgetMs: scenario.coldBudgetMs,
      warmBudgetMs: scenario.warmBudgetMs,
      status: ok ? 'ok' : 'warn',
      summary: cold.summary || warm.summary,
    };
  } catch (error) {
    return {
      name: scenario.name,
      coldMs: null,
      warmMs: null,
      coldBudgetMs: scenario.coldBudgetMs,
      warmBudgetMs: scenario.warmBudgetMs,
      status: 'skip',
      summary: error instanceof Error ? error.message : String(error),
    };
  }
}

async function measureHttp(relativePath, summarize) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  const startedAt = performance.now();
  try {
    const response = await fetch(`${httpBaseUrl}${relativePath}`, { signal: controller.signal });
    const text = await response.text();
    const ms = Math.round(performance.now() - startedAt);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = text ? JSON.parse(text) : {};
    return { ms, summary: summarize ? summarize(payload) : summarizeCatalog(payload) };
  } finally {
    clearTimeout(timeout);
  }
}

function summarizeCatalog(payload) {
  const facets = payload.facets || {};
  const cityCount = facets.cities?.length || 0;
  const categoryCount = facets.categories?.length || 0;
  return `${cityCount} городов/регионов, ${categoryCount} категорий`;
}

function formatMs(value) {
  return value == null ? '-' : value;
}

function cleanCell(value) {
  return String(value || '-')
    .replace(/\s+/g, ' ')
    .replace(/\|/g, '/')
    .trim();
}
