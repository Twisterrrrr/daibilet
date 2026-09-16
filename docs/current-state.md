# Текущее состояние Daibilet

**Обновлено:** 2026-08-07  
**Ветка:** `feat/next-monorepo`  
**Prod live (DNS):** `201.24.125.184` (МСК `msk-1-vm-5a5i`) · Next `:3001` · API `:4000` · PG Docker `:5437` · TLS nginx · **catalog truth**  
**Роли:** `.184` battle catalog (+ **единственный web build**) · `.159` battle finance · [spb-finance-host.md](./spb-finance-host.md)  
**Web deploy canon:** MSK-only - `BRANCH=feat/next-monorepo ./deploy/scripts/deploy-prod-next.sh` на `daibilet-msk` (или CI Deploy MSK web)  
**Catalog ↔ finance projection:** [catalog-finance-projection.md](./catalog-finance-projection.md) · P0 PurchaseProjection · P1 public read client · P2 venue/city UI · no wide internal sales until P0  
**СПб 4 ГБ Intelligent Hoopoe (`213.171.7.16`):** **труп** - снят из inventory (MIG.9.7 ✅); wipe VM в Timeweb = owner  
**СПб 8 ГБ:** `85.193.80.159` Diligent Polydeuces - primary finance/checkout/supplier

> Детальные чеклисты: [Tasktracker.md](./Tasktracker.md)  
> Эталонные slug виджетов: [widget-etalon-slugs.md](./widget-etalon-slugs.md)

---

## Инфра-снимок перед переездом СПб → МСК (2026-07-29) - historical

| | СПб prod (тогда) | МСК цель |
|--|----------|----------|
| IP | `213.171.7.16` (ныне труп) | `201.24.125.184` (бывш. `81.19.135.200` снят - TCP22 filtered) |
| SSH | `daibilet_staging_key` (legacy) | `daibilet_msk80_key` / alias `daibilet-msk` |
| Git `/opt/daibilet` | `618fdd6` | `8588ccf` (отстаёт) |
| RAM / disk | 3.8 Gi / 49G ~55% | 7.8 Gi / 77G ~8% |
| web + api + nginx | ✅ | ✅ |
| Postgres `:5437` | ✅ Docker healthy | ❌ нет контейнера |
| TLS `:443` | ✅ | ❌ нет certbot/letsencrypt |
| `https://daibilet.ru` | ✅ 200 (DNS сюда) | не в DNS |
| API `/api/public/stats` local | OK | 500 (нет БД) |

**Готовность к DNS-cutover (на дату снимка):** нет. Нужны PG+restore, pull HEAD, TLS, nginx parity, smoke - см. чеклист в migration-doc. **Cutover выполнен 2026-07-30; `.16` retired.**

---

## Сводка по этапам

| Этап | Фокус | Прогресс | Блокер закрытия |
|------|--------|----------|-----------------|
| **0** | Post-cutover hardening: smoke, widgets, admin, backfill | **✅** | Browser + Admin smoke ✅ 2026-07-22; TEP orders ⏸ (нет API у партнёра) |
| **1** | Public parity: поиск, breadcrumbs, city FAQ/SEO | **~90%** 🔄 | about/crumbs/multi ✅; 1.3.7 editorial ongoing |
| **2** | SEO foundation: sitemap + SSR JSON-LD | **~90%** 🔄 | venue LD ✅; Rich Results smoke ⏳ |
| **3+** | F5 dto retire, Phase G finance (СПб host) | ⏳ | F5.0 map ✅; runtime после E5 |

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

**Deploy (MSK-only, 2026-08-01):**

```bash
# preflight (на MSK с DATABASE_URL)
pnpm deploy:preflight

# prod Next на том же хосте (stop web → build → start)
BRANCH=feat/next-monorepo ./deploy/scripts/deploy-prod-next.sh
# heap default 5120Mi (`apps/web/scripts/next-build.mjs` + NODE_OPTIONS).
# Не билдить с чужого хоста - только MSK / CI.

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
| `tc-6a266b49465e94f72b4ef8f6-interaktivnaya-vystavka-nyuton-park` | TC | ✅ 2026-07-13 | ✅ 2026-07-22 |
| `tc-6a3582f0bbd948da83dece6e-kombo-kvest` | TC | ✅ 2026-07-13 | ✅ 2026-07-22 |
| `progulka-ot-prichala-kitai-gorod-do-prichala-kievskii-826` | Teplohod | ✅ 2026-07-13 | ✅ 2026-07-22 |
| `centralnaya-krugovaya-rechnaya-progulka-ot-parka-zaryade-ves-centr-za-chas-683` | Teplohod | ✅ 2026-07-13 | ✅ 2026-07-22 |

**Критерий OK:** hard refresh → «Купить» → модал TC / iframe Teplohod без console error.  
**Закрыто 2026-07-22** (ручное подтверждение на prod).

### Admin smoke (`http://127.0.0.1:4000` + static admin)

| Проверка | Статус |
|----------|--------|
| Basic auth / realm login | ✅ 2026-07-22 |
| Sources: TC + Teplohod status visible | ✅ 2026-07-22 |
| Events: список + override save | ✅ |
| Orders: реальные ExternalOrder, не mock | ✅ TC; TEP ⏸ |
| Sync trigger / last sync timestamp | ✅ 2026-07-22 |
| Тестовая покупка → ExternalOrder | ✅ 2026-07-22 |

**Закрыто 2026-07-22** (ручное подтверждение на prod).

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
| **City FAQ + SEO text** SSR | ✅ | FAQ + SEO text на indexable cities |
| **City JSON-LD** (`FAQPage`, `BreadcrumbList`) SSR | ✅ | RSC + thin → без FAQPage |
| `/about` | ⏳ | route отсутствует в `apps/web` |

**Уже есть:** `generateMetadata` event/city, catalog breadcrumbs, `/help` + FAQ JSON-LD, landings JSON-LD (client).

---

## Этап 2 — старт (параллельно с хвостом 1)

| Задача | Статус | Примечание |
|--------|--------|------------|
| `app/robots.ts` | ✅ | Allow `/`, Sitemap → index; Googlebot/Yandex allow |
| `app/sitemap.xml` index | ✅ | → `/sitemaps/{static,events,cities,venues,landings,blog}.xml` |
| sitemap events / cities / venues / landings / blog | ✅ | chunked urlsets; cities/venues без thin |
| SSR JSON-LD event page | ✅ | `<script type="application/ld+json">` в RSC |
| SSR JSON-LD city page | ✅ | FAQPage + BreadcrumbList; thin → noindex |
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

1. **Этап 0 smoke:** ✅ browser 0.2 + admin 0.3 (2026-07-22). Дальше — gaps этапа 1 / L.3 TC nightly sync.
2. **Этап 1:** event/city breadcrumbs + JSON-LD SSR (один PR).
3. **Deploy:** `pnpm deploy:preflight` + выкат HeaderSearch / multievent.

---

## Связанные документы

- [Tasktracker.md](./Tasktracker.md) — чеклисты с ✅/🔄/⏳/🚫/⚠️
- [Project.md](./Project.md) — архитектура F1–F5
- [phases/phase-f3-cutover-checklist.md](./phases/phase-f3-cutover-checklist.md)
- [seo-public-mvp.md](./seo-public-mvp.md)
- [launch-qa-and-deploy.md](./launch-qa-and-deploy.md)
