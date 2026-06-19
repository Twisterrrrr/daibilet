import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createDb } from '../apps/backend/src/db.js';
import { buildCatalogSessions, buildPublicHome, buildPublicStats, clearPublicDataCaches } from '../apps/backend/src/dto.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = createDb(rootDir);
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
  });
}

const generatedAt = new Date().toISOString();
const output = [
  '# Public Performance Snapshot',
  '',
  `Сгенерировано: ${generatedAt}`,
  '',
  'Замер выполняется напрямую через backend DTO на текущей локальной БД. Cold показывает первый проход после очистки public DTO cache, warm показывает повторный проход в том же процессе.',
  '',
  '| Сценарий | Параметры | Cold, ms | Warm, ms | Всего | Возвращено | Сводка |',
  '|---|---|---:|---:|---:|---:|---|',
  ...rows.map((row) => `| ${cleanCell(row.name)} | ${cleanCell(row.params)} | ${row.coldMs} | ${row.warmMs} | ${row.total} | ${row.returned} | ${cleanCell(row.summary)} |`),
  '',
  '## Следующий контроль',
  '',
  '- Если cold catalog снова выше 3000 ms, переносить фильтры глубже в SQL.',
  '- Если warm catalog выше 300 ms, искать лишнюю работу после cache hit.',
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

function summarizeCatalog(payload) {
  const facets = payload.facets || {};
  const cityCount = facets.cities?.length || 0;
  const categoryCount = facets.categories?.length || 0;
  return `${cityCount} городов/регионов, ${categoryCount} категорий`;
}

function cleanCell(value) {
  return String(value || '-')
    .replace(/\s+/g, ' ')
    .replace(/\|/g, '/')
    .trim();
}
