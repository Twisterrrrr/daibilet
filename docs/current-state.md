# Текущее состояние Daibilet

**Обновлено:** 2026-07-14  
**Ветка migration / prod Next:** `feat/next-monorepo`  
**Prod:** `213.171.7.16` · Next `:3001` · legacy API `:4000` · admin Vite static

> Детальные чеклисты: [Tasktracker.md](./Tasktracker.md)  
> Эталонные slug виджетов: [widget-etalon-slugs.md](./widget-etalon-slugs.md)

---

## Сводка по этапам

| Этап | Фокус | Прогресс | Блокер закрытия |
|------|--------|----------|-----------------|
| **0** | Post-cutover hardening: smoke, widgets, admin, backfill | **~90%** 🔄 | Browser widget smoke + SQL catalog read-model (0.5.8) |
| **1** | Public parity: поиск, breadcrumbs, city FAQ/SEO | **~70%** 🔄 | event/city structured data |
| **2** | SEO foundation: sitemap + SSR JSON-LD | **~40%** 🔄 | title/og:url fixed; sitemap есть |
| **3+** | Admin Next, dto retire, Phase G finance | ⏳ | После 0–2 |

**Легенда статусов:** ✅ done · 🔄 in progress · ⏳ todo · 🚫 blocked · ⚠️ deferred

---

## Prod сейчас (2026-07-14)

| Компонент | Статус | Примечание |
|-----------|--------|------------|
| nginx → Next public | ✅ | cutover 2026-07-10 |
| `www` → apex 301 | ✅ | nginx patch 2026-07-14 + Next middleware |
| Admin list pagination (cities/landings/…) | ✅ | page envelopes + UI pager |
| Compact dashboard metrics | ✅ | grouped catalog = public stats |
| Catalog lean DTO / no list widgets | ✅ | hydrate page-only |
| City/landing SSR trim (≤48 lean) | ✅ | |
| Teplohod account checkout fallback | ✅ | не teplohod.info/event 404 |
| `/api/public/stats` warm after sync | ✅ | + key cities/landings revalidate |
| Backend/admin/web typecheck | ✅ | |
| `pnpm deploy:preflight` | ✅ | |

| Мультисобытие `mergeGroupKey` | 🔄 | код в ветке, нужен `db:deploy` + deploy |

### Production-green gate (Codex audit 4d0fc7e → fix)

| Check | Статус |
|-------|--------|
| `pnpm --filter @daibilet/backend typecheck` | ✅ |
| `pnpm --filter @tours/admin build` | ✅ |
| `pnpm --filter @daibilet/web typecheck` | ✅ |
| `pnpm --filter @daibilet/web build` | ✅ (без БД: empty fallbacks на home/cities/venues) |
| Prisma validate + generate | ✅ |
| `/api/public/stats`, `/destinations` | ✅ |
| `/robots.txt`, `/sitemap.xml` | ✅ |
| `pnpm deploy:preflight` | ✅ новый скрипт |

**Deploy:**

```bash
# preflight (на сервере с DATABASE_URL)
pnpm deploy:preflight

# prod Next
BRANCH=feat/next-monorepo ./deploy/scripts/deploy-prod-next.sh
NODE_OPTIONS='--max-old-space-size=1536' pnpm web:build   # при OOM

# smoke
PUBLIC_BASE=https://daibilet.ru API_BASE=http://127.0.0.1:4000 WEB_BASE=http://127.0.0.1:3001 \
  bash scripts/launch-prod-smoke-next.sh

# widgets API (авто)
npm run check:widgets -- --base https://daibilet.ru
```

---

## Этап 0 — что осталось закрыть

### Browser smoke (4 slug из [widget-etalon-slugs.md](./widget-etalon-slugs.md))

| Slug | Провайдер | API `check:widgets` | Browser «Купить» |
|------|-----------|---------------------|------------------|
| `tc-6a266b49465e94f72b4ef8f6-interaktivnaya-vystavka-nyuton-park` | TC | ✅ 2026-07-13 | ⏳ |
| `tc-6a3582f0bbd948da83dece6e-kombo-kvest` | TC | ✅ 2026-07-13 | ⏳ |
| `progulka-ot-prichala-kitai-gorod-do-prichala-kievskii-826` | Teplohod | ✅ 2026-07-13 | ⏳ |
| `centralnaya-krugovaya-rechnaya-progulka-ot-parka-zaryade-ves-centr-za-chas-683` | Teplohod | ✅ 2026-07-13 | ⏳ |

**Критерий OK:** hard refresh → «Купить» → модал TC / iframe Teplohod без console error.

### Admin smoke (`http://127.0.0.1:4000` + static admin)

| Проверка | Статус |
|----------|--------|
| Basic auth / realm login | ⏳ |
| Sources: TC + Teplohod status visible | ⏳ |
| Events: список + override save | ⏳ |
| Orders: реальные ExternalOrder, не mock | ⏳ |
| Sync trigger / last sync timestamp | ⏳ |

### `tc:sync` backfill prod

| Вариант | Статус | Условие |
|---------|--------|---------|
| **A.** Запустить `npm run tc:sync` на prod с token | ✅ 2026-07-13 | 17356 events, 17082 widgetUrl |
| **B.** Осознанный defer | ✅ 2026-07-13 | до sync; см. [decision-log.md](./decision-log.md) |

---

## Этап 1 — gaps (после 0)

| Задача | Статус | Где |
|--------|--------|-----|
| **HeaderSearch** в шапке Next | ✅ | `HeaderSearch.client.tsx` + `/api/public/search` |
| **Event breadcrumbs** | ⏳ | `/events` ✅; `/events/[slug]` ⏳ |
| **Event JSON-LD** (`Event`, `Offer`, `BreadcrumbList`) SSR | ✅ | `structured-data.ts` + event RSC |
| **City FAQ + SEO text** SSR | ⏳ | `CityPageView` без FAQ-блока |
| **City JSON-LD** (`FAQPage`, `BreadcrumbList`) SSR | ⏳ | только client `document.title` |
| `/about` | ⏳ | route отсутствует в `apps/web` |

**Уже есть:** `generateMetadata` event/city, catalog breadcrumbs, `/help` + FAQ JSON-LD, landings JSON-LD (client).

---

## Этап 2 — старт (параллельно с хвостом 1)

| Задача | Статус | Примечание |
|--------|--------|------------|
| `app/robots.ts` | ⏳ | |
| `app/sitemap.ts` index | ⏳ | |
| sitemap events / cities / venues | ⏳ | chunked, только indexable |
| SSR JSON-LD event page | ✅ | `<script type="application/ld+json">` в RSC |
| SSR JSON-LD city page | ⏳ | FAQ + breadcrumbs |
| canonical / www policy audit | ⏳ | nginx + metadata cross-check |

Очередность: [spbboats-next-prisma-extraction.md § Step A](./spbboats-next-prisma-extraction.md).

---

## Архитектура (кратко)

```
apps/web     — Next 15 SSR/ISR (:3001 prod)
apps/backend — server.js + dto.js sync/admin (:4000)
apps/admin   — Vite SPA (static)
packages/db  — Prisma
```

Read path: `@daibilet/backend/public-read` → `public-*.dto.ts` (+ частично dto.js).

---

## Немедленные next steps (приоритет)

1. **Этап 0:** browser smoke 4 slug + admin smoke → отметить в Tasktracker.
2. **Этап 1:** event/city breadcrumbs + JSON-LD SSR (один PR).
3. **Deploy:** `pnpm deploy:preflight` + выкат HeaderSearch / multievent.

---

## Связанные документы

- [Tasktracker.md](./Tasktracker.md) — чеклисты с ✅/🔄/⏳/🚫/⚠️
- [Project.md](./Project.md) — архитектура F1–F5
- [phases/phase-f3-cutover-checklist.md](./phases/phase-f3-cutover-checklist.md)
- [seo-public-mvp.md](./seo-public-mvp.md)
- [launch-qa-and-deploy.md](./launch-qa-and-deploy.md)
