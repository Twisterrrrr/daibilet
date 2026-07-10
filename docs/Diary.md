# Diary — Daibilet

Технический дневник проекта. Формат записи: **Наблюдения**, **Решения**, **Проблемы**.

---

## 2026-07-10 — Codex audit + split стратегия + старт F3

### Наблюдения

- На GitHub **нет** ветки `codex/phase2-finance-next`; Codex работает в **`codex/phase2-foundation`** (`229ad3b`, unrelated history с `feat/next-monorepo`).
- Codex сделал Phase 2 schema (~66 models), Event Change Requests, admin queue — **ценно для cherry-pick**.
- Codex также перевёл **`apps/public` на Next с proxy** на `:4000` (`5b18225`) — **конфликтует** с Path B (`apps/web`, full-stack read).
- Cursor F2 complete: `apps/web`, 36 landing SSG paths, parity script.

### Решения

- **Canonical public Next:** только `apps/web` на `feat/next-monorepo`. Codex Next/proxy **не мержить**.
- **Интеграция Codex:** cherry-pick schema + event change requests + admin contracts **после F3 cutover** ([codex-cherry-pick-plan.md](./codex-cherry-pick-plan.md)).
- Handoff обновлён: [codex-phase2-next-handoff.md](./codex-phase2-next-handoff.md).
- F3 артефакты: `deploy-staging-next.sh`, `daibilet-web-staging.service`, `staging-next.conf.snippet`, `launch-staging-smoke-next.sh`.

### Проблемы

- Wholesale merge `codex/phase2-foundation` → guaranteed conflicts (schema, Next app location, lockfile).
- F3 server-side deploy требует ops на staging (213.171.7.16) — локально только scripts/docs.

---

## 2026-07-10 — F2 закрыт: landings ISR, filters, widgets, parity

### Наблюдения

- Legacy landings используют сложную URL-схему: category-first (`/rechnye-progulki/moscow/`) и city-first (`/saint-petersburg/night-bridges/`). Логика портирована из `landing-routes.ts` SPA.
- `buildPublicLandingPage` / `buildPublicLandingPageManaged` уже в `dto.js`; для Next достаточно wrapper `public-landing.dto.ts` по аналогии с venue/city.
- Next build pre-renderит 36 landing paths (9 one-segment + 23 two-segment) с `revalidate=3600`.
- Каталог typed DTO использует `from`/`to` для date range; legacy URL — `dateFrom`/`dateTo`. Маппинг добавлен в `parseCatalogPageQuery`.

### Решения

- Landings: ISR + `generateStaticParams` для top slugs; catch-all `[segment]`/`[segment2]`/`[segment3]` с `notFound()` для не-landing путей.
- Middleware 301: `/landings/*` и misordered `/{city}/{category}` → canonical landing href.
- Widgets: SSR рендерит цену/описание; `PurchaseWidget.client.tsx` — Teplohod → TC → external link.
- Parity: `pnpm backend:next:parity` — расширенный catalog (city/date/sort) + landing slugs + optional HTTP compare (`WEB_BASE_URL` vs `LEGACY_BASE_URL`).
- F3 checklist вынесен в отдельный doc.

### Проблемы

- `pnpm` не в PATH на некоторых Windows-средах — сборка через `npm exec pnpm -- web:build`.
- `/podborki` с `searchParams` остаётся dynamic (ƒ) несмотря на `revalidate` — приемлемо для MVP.
- Полный UI landings (3600 строк SPA) не портирован — упрощённый SSR view + EventCard grid.

---

## 2026-07-10 — F2 core: catalog, event, city, venue SSR

### Наблюдения

- Next bundler ломал `createRequire` в `db.ts` — заменён на прямой `import pg`.
- `@daibilet/backend` в `transpilePackages`, `pg` в `serverExternalPackages`.

### Решения

- Read path через `@daibilet/backend/public-read` без HTTP proxy.
- Catalog default 100, selector 100/200/300 в `@daibilet/contracts/catalog`.

### Проблемы

- Type casts в public-city.dto.ts для совместимости с Next build — временно до F5.

---

## 2026-07-10 — F1: monorepo shell

### Наблюдения

- Path B утверждён: SEO не откладываем, full-stack Next.

### Решения

- pnpm workspaces, apps/web Next 15, packages/contracts + config.

### Проблемы

- Prod остаётся на Vite до F3 cutover.
