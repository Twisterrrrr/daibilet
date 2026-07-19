# Tasktracker — Daibilet

**Обновлено:** 2026-07-19  
**Источники:** [Project.md](./Project.md), [current-state.md](./current-state.md), [widget-etalon-slugs.md](./widget-etalon-slugs.md), [content-blog-plan.md](./content-blog-plan.md)

**Легенда:** ✅ done · 🔄 in progress · ⏳ todo · 🚫 blocked · ⚠️ deferred

---

## Блог / контент (2026-07-19)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| B.1 | Формат «Редакция» (`docs/ai-journalists/00-editorial.md`) | Высокий | ✅ |
| B.2 | Rewrite 4 гидов + SEO/ссылки/`[buy]` | Высокий | ✅ |
| B.3 | Hide `spb-razvod-mostov-kakoi-reis` + 301 → rooftop | Средний | ✅ → **отменено** (статья снова PUBLISHED) |
| B.4 | Commit → deploy-prod-next → `blog:upsert` ×4+hide | Критический | ✅ |
| B.5 | Пакет 10 редакционных статей (verbatim + buy + upsert) | Критический | ✅ |
| B.6 | Вернуть `spb-razvod-mostov-kakoi-reis` PUBLISHED, снять 301 | Высокий | ✅ |
| B.7 | Multi-event: убрать `[buy]`, только `/events` ссылки; цены/meta по prod; Cyrillic READY slug | Критический | ✅ |
| B.8 | Первая колонка Анны «Город крупным планом»: `muzyka-v-osobnyakah-spb` | Критический | ✅ |
| B.9 | Admin: PATCH городов (City SEO/slug/title) + UI | Высокий | ✅ 2026-07-19 |
| B.10 | Admin: дата публикации статей (`publishedAt`) в UI | Высокий | ✅ 2026-07-19 |

---

## Этап 0 — Post-cutover hardening (закрыть первым)

**Цель:** prod Next стабилен, покупка через виджеты проверена в браузере, admin операционен, data debt по TC осознан.

**Exit criteria:** все пункты «Browser smoke» и «Admin smoke» ✅; по `tc:sync` — ✅ run **или** ⚠️ defer с записью в decision-log.

### 0.1 Cutover & infra

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 0.1.1 | Prod nginx → Next `:3001` | Критический | ✅ |
| 0.1.2 | Rollback script / snapshot | Критический | ✅ |
| 0.1.3 | `launch-prod-smoke-next.sh` (SSR curl) green | Критический | ✅ |
| 0.1.4 | Мониторинг 24–48ч post-cutover | Высокий | ✅ |
| 0.1.5 | Deprecate Vite public (`apps/public`) | Средний | ⏳ после закрытия 0.2–0.3 |

### 0.2 Browser smoke — 4 эталонных slug

Список: [widget-etalon-slugs.md](./widget-etalon-slugs.md).  
API-пререквизит: `npm run check:widgets -- --base https://daibilet.ru`

| # | Slug | TC / TEP | API check | Browser «Купить» | Статус |
|---|------|----------|-----------|------------------|--------|
| 0.2.1 | `tc-6a266b49465e94f72b4ef8f6-interaktivnaya-vystavka-nyuton-park` | TC | ✅ 2026-07-13 | ⏳ | ⏳ |
| 0.2.2 | `tc-6a3582f0bbd948da83dece6e-kombo-kvest` | TC | ✅ 2026-07-13 | ⏳ | ⏳ |
| 0.2.3 | `progulka-ot-prichala-kitai-gorod-do-prichala-kievskii-826` | TEP | ✅ 2026-07-13 | ⏳ | ⏳ |
| 0.2.4 | `centralnaya-krugovaya-rechnaya-progulka-ot-parka-zaryade-ves-centr-za-chas-683` | TEP | ✅ 2026-07-13 | ⏳ | ⏳ |

**Чеклист на каждый slug (browser):**

- [ ] Hard refresh `/events/{slug}`
- [ ] Hero / buy card: цена и CTA видны
- [ ] Клик «Купить» → TC modal **или** Teplohod widget
- [ ] DevTools console: нет blocking errors
- [ ] (опц.) тестовая покупка → ExternalOrder в admin

### 0.3 Admin smoke (`:4000` + static admin)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 0.3.1 | Login (basic auth / realm) | Критический | ⏳ |
| 0.3.2 | Dashboard metrics загружаются | Высокий | ✅ 2026-07-14 aligned with Events (`admin_event_groups`) |
| 0.3.3 | Sources: TC + Teplohod, last sync | Критический | ⏳ |
| 0.3.4 | Events: list + detail + override save | Высокий | ✅ full catalog (no 10k cap) + override lean texts; UI-подписи на русском (2026-07-18); group readiness: future-sibling снимает NO_FUTURE blocker (2026-07-19, deploy ⏳) |
| 0.3.5 | Orders: список реальных заказов (не mock) | Критический | 🔄 live list; prod cron `tc-orders` */10 2026-07-19 |
| 0.3.6 | Event moderation / publish gate | Средний | 🔄 group readiness recalc после siblings (NO_FUTURE только если нет future в группе); остальное ⏳ |
| 0.3.7 | Зафиксировать результат в Diary / smoke log | Средний | ⏳ |

### 0.4 `tc:sync` widgetUrl backfill (prod)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 0.4.1 | Оценить долг: `check:sync-invariants` на prod | Высокий | ⏳ |
| 0.4.2 | **Вариант A:** `npm run tc:sync` на prod (token, maintenance window) | Средний | ✅ 2026-07-13 (~101s, 17082 widgetUrl) |
| 0.4.3 | **Вариант B:** defer + [decision-log.md](./decision-log.md) (критерии: saleable events OK) | Средний | ✅ 2026-07-13 (до sync) |
| 0.4.4 | Post-sync: `check:widgets` + 0.2 browser smoke повтор | Высокий | API ✅ 2026-07-13 / browser ⏳ |

### 0.5 Ops / auth fixes (post-cutover)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 0.5.home-editors | «Выбор редакции»: дедуп combo-family (макс. 1 «Комбо» на venue), секцию оставить | Высокий | ✅ 2026-07-19 |

### 0.7 Admin grouped readiness (NO_FUTURE_SESSIONS)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 0.7.1 | Backend finalizeGroupedAdminReadiness после group | Высокий | ✅ 2026-07-19 |
| 0.7.2 | Admin UI mirror EventsPage | Высокий | ✅ 2026-07-19 |
| 0.7.3 | Unit-тест admin-group-readiness + test:ts | Средний | ✅ 2026-07-19 |
| 0.7.4 | Deploy API (+ admin static) prod | Высокий | ✅ 2026-07-19 bb7fc9c |

### 0.8 Admin audit holes (2026-07-19)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 0.8.1 | Убрать hard limit 10000 admin catalog | Критический | ✅ уже `eventRows(db, null)` |
| 0.8.2 | Dashboard needsAttention ≡ Events | Критический | ✅ `admin_event_groups` |
| 0.8.3 | GET events/:id → event+override | Высокий | ✅ |
| 0.8.4 | Lean source description (left 4000) | Высокий | ✅ |
| 0.8.5 | canPublish ← high readinessIssues | Высокий | ✅ |
| 0.8.6 | Nav stubs / read-only badges / no localhost:5178 | Высокий | ✅ |
| 0.8.7 | Orders archive: проверить правила (не unarchive) | Средний | ✅ documented (stale cancelled 30d) |
| 0.8.8 | ECR остаётся скрыт в prod | Средний | ✅ |
| 0.8.9 | Deploy API + admin static prod | Высокий | ✅ 2026-07-19 `7882d6d` |

### 0.6 CPU/RAM mitigation (prod 3.8Gi)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 0.6.1 | Stop legacy Docker + staging на prod (без rm -v) | Критический | ✅ 2026-07-19 |
| 0.6.2 | systemd MemoryMax/High + NODE_OPTIONS web/api | Высокий | ✅ 2026-07-19 |
| 0.6.3 | TEP sync реже + warm delay + nice | Высокий | ✅ 2026-07-19 |
| 0.6.4 | watch-tep-sync-load + oom-watch cron | Средний | ✅ 2026-07-19 |
| 0.6.5 | Сэмпл нагрузки на следующем auto-sync окне | Средний | 🔄 скрипт готов / at optional |

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 0.5.1 | `USER_JWT_SECRET` prod/staging | Критический | ✅ |
| 0.5.2 | Teplohod widget bootstrap / related cards | Высокий | ✅ |
| 0.5.3 | EventCard title + «Подробнее» links | Высокий | ✅ |
| 0.5.4 | Catalog city filter instant apply | Средний | ✅ |
| 0.5.5 | Мультисобытие `mergeGroupKey` + HP script | Средний | 🔄 код готов, deploy ⏳ |
| 0.5.6 | Admin lists pagination / lean payloads (orders, buyers, events, venues) | Критический | ✅ 2026-07-13 deploy prod |
| 0.5.7 | Admin cities/landings page envelopes + landing detail events pager + compact dashboard | Критический | ✅ 2026-07-14 |
| 0.5.8 | Быстрые переключения админки: SWR catalog + landings base-cache + sources SWR | Высокий | ✅ 2026-07-14 |
| 0.5.8 | Events/landings SQL read-model (no full grouped catalog before slice) | Высокий | ⏳ perf blocker |
| 0.5.9 | Catalog quick wins: lean DTO, no widgets in list, hydrate page-only, unified metrics, www/SEO redirects, SSR trim, warmup | Критический | ✅ 2026-07-14 |
| 0.5.10 | Teplohod checkout fallback → account.teplohod.info (не teplohod.info/event 404) | Высокий | ✅ 2026-07-14 |
| 0.5.11 | Post-deploy: clear `.next/cache` + revalidate; ChunkLoadError → one reload | Высокий | ✅ 2026-07-14 |
| 0.5.12 | Teplohod: restore TI_Tickets bootstrap on event page + landing `evt_tep_*` buy | Критический | ✅ 2026-07-18 deploy |
| 0.5.13 | Яндекс.Метрика на `apps/web` (ID 106786540, не admin) | Высокий | ✅ код 2026-07-19; deploy ⏳ |

---

## Этап 1 — Public parity & SEO gaps

**Цель:** Next public ≈ legacy по UX/SEO на event/city; глобальный поиск в header.

### 1.1 Header & navigation

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 1.1.1 | Port `HeaderSearch` → `apps/web` SiteHeader | Высокий | ✅ |
| 1.1.2 | `/api/public/search` parity (debounce, keyboard nav) | Высокий | ✅ |
| 1.1.3 | Mobile: search в drawer | Средний | ✅ |
| 1.1.4 | Страница `/about` | Низкий | ⏳ |

### 1.2 Event page

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 1.2.1 | Breadcrumbs: Главная → События → Город? → Title | Высокий | ⏳ |
| 1.2.2 | SSR JSON-LD: `Event` + `Offer` | Высокий | ⏳ |
| 1.2.3 | SSR JSON-LD: `BreadcrumbList` | Высокий | ⏳ |
| 1.2.4 | `generateMetadata` | — | ✅ |
| 1.2.5 | Sticky buy card + TC/TEP widgets | — | ✅ |
| 1.2.6 | Мультисобытие «Варианты билетов» | Средний | 🔄 |

### 1.3 City page

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 1.3.1 | FAQ block (редакционный / из payload) | Высокий | ⏳ |
| 1.3.2 | SEO text block (intro + перелинковка) | Высокий | ⏳ |
| 1.3.3 | SSR JSON-LD: `FAQPage` | Высокий | ⏳ |
| 1.3.4 | SSR JSON-LD: `BreadcrumbList` | Средний | ⏳ |
| 1.3.5 | Hero, categories, venues, events grid | — | ✅ |
| 1.3.6 | `generateMetadata` | — | ✅ |

### 1.4 Прочие public routes

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 1.4.1 | Venues / locations breadcrumbs | Средний | 🔄 частично |
| 1.4.2 | `/help` FAQ + JSON-LD | — | ✅ |
| 1.4.3 | Landings JSON-LD (client) | — | ✅ |
| 1.4.4 | Фильтр cross-transport subcategories в карточках | Средний | 🔄 |

---

## Этап 2 — SEO foundation (старт параллельно с 1.2–1.3)

**Цель:** indexable routes в sitemap; structured data в HTML source (не только client).

### 2.1 robots & sitemap

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 2.1.1 | `apps/web/app/robots.ts` | Высокий | ⏳ |
| 2.1.2 | `app/sitemap.ts` — index | Высокий | ⏳ |
| 2.1.3 | Sitemap chunk: `/events/*` (indexable only) | Высокий | ⏳ |
| 2.1.4 | Sitemap chunk: `/cities/*` | Высокий | ⏳ |
| 2.1.5 | Sitemap chunk: `/venues/*`, landings | Средний | ⏳ |
| 2.1.6 | Smoke: `/robots.txt`, `/sitemap.xml` 200 | Средний | ⏳ |

### 2.2 SSR JSON-LD (пересечение с Этап 1)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 2.2.1 | Shared helper `lib/structured-data.ts` | Высокий | ⏳ |
| 2.2.2 | Event page LD+JSON в RSC (View Source) | Высокий | ⏳ |
| 2.2.3 | City page LD+JSON в RSC | Высокий | ⏳ |
| 2.2.4 | Venue page LD+JSON | Средний | ⏳ |
| 2.2.5 | Google Rich Results / validator smoke | Низкий | ⏳ |
| 2.2.6 | Root WebSite/Organization JSON-LD + Google favicon PNG (48/96/192) | Высокий | ✅ 2026-07-19 deploy prod |
| 2.2.7 | Favicon fill ~90%: 32/48/96/180/192/512 + site.webmanifest | Высокий | ✅ |
| 2.2.8 | Favicon: Flaticon ticket_1912 → бренд `#4A7FD4`, classic horizontal | Высокий | ✅ 2026-07-19 deploy prod |

### 2.3 Canonical & indexing policy

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 2.3.1 | www → non-www (nginx) audit | Средний | ⏳ |
| 2.3.2 | `noindex` для thin city/venue | Средний | ⏳ |
| 2.3.3 | staging `noindex` | — | ✅ |

### 2.4 Blog / content ops

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 2.4.0 | Инвентарь статей (статика + prod `Article`), запрет дублей | Высокий | ✅ 2026-07-19 |
| 2.4.1 | 5 уникальных заголовков + план ([content-blog-plan.md](./content-blog-plan.md)) | Средний | ✅ 2026-07-19 (сверено с инвентарём) |
| 2.4.2 | Написать/опубликовать 4 статьи (без «как купить»; без пересечения с 13) | Высокий | ✅ 2026-07-19 prod upsert + URL 200 |
| 2.4.3 | Weekly digest script → Article `REVIEW` + cron | Средний | ✅ 2026-07-19 cron + первый REVIEW |
| 2.4.4 | ИИ-журналисты: 5 персон (Макс/Анна/Елена/Игорь/Артур) + style guides + `personas.json` | Высокий | ✅ 2026-07-19 канон [ai-journalists/](./ai-journalists/); Макс + референс Perito |
| 2.4.5 | Первый пилотный материал в стиле письма колонки (по теме от пользователя) | Высокий | ✅ 2026-07-19 full Max text + `[buy]` на `fentezi-fest-bylinnyy-bereg` |
| 2.4.6 | Byline / `authorId` в CMS или frontmatter (без деплоя до пилота ок) | Средний | ✅ hero byline `authorName` + frontmatter/API |

---

## F1–F3 — Next migration (справочно, закрыто)

| Блок | Статус |
|------|--------|
| F1 Monorepo shell | ✅ |
| F2 Public SSR (catalog, event, city, venue, landings) | ✅ |
| F3 Cutover staging + prod | ✅ (хвост = **Этап 0**) |

Детали: [phases/phase-f-next-fullstack.md](./phases/phase-f-next-fullstack.md), [phase-f3-cutover-checklist.md](./phases/phase-f3-cutover-checklist.md).

---

## F4–F5 — Backlog (после этапов 0–2)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| F4.1 | Admin route group в Next | Высокий | ⏳ |
| F4.2 | Sync jobs → apps/worker | Средний | ⏳ |
| F5.1 | dto.js read → pure Prisma | Высокий | ⏳ |
| F5.2 | Retire server.js / TS flags | Средний | ⏳ |

---

## Codex / Phase G

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| C.1 | Cherry-pick Phase 2 schema + ECR | Критический | ✅ |
| C.2 | Admin EventChangeRequestsPage | Средний | ✅ (flag) |
| C.3 | Phase G finance runtime | Низкий | ⏳ после F5 |

---

## Ops backlog (сквозной)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| O.1 | `qa.md` — открытые архитектурные вопросы | Низкий | ⏳ |
| O.2 | Staging DB отдельно от prod | Средний | ⏳ |
| O.3 | Automated browser smoke (Playwright) для 0.2 | Средний | ⏳ |

---

## Журнал обновлений

| Дата | Изменение |
|------|-----------|
| 2026-07-19 | Admin: editable Cities (PATCH) + Articles `publishedAt` UI (B.9/B.10) |
| 2026-07-13 | Roadmap перестроен на **Этапы 0–2** с чеклистами browser/admin smoke, tc:sync, SEO gaps |
| 2026-07-11 | F3 cutover prod, Codex cherry-pick |
| 2026-07-10 | F2 SSR complete, staging Next |

## Google Search Console verification
- [x] **Критический** — файл `googleb3313872246ac993.html` в `apps/web/public/`, deploy prod, curl 200 (2026-07-19)

