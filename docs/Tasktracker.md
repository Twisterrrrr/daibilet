# Tasktracker — Daibilet

Обновлено: **2026-07-10**. Источник: [Project.md](./Project.md), [phase-f-next-fullstack.md](./phases/phase-f-next-fullstack.md).

---

## F1 — Monorepo shell ✅

| Задача | Приоритет | Статус |
|--------|-----------|--------|
| pnpm-workspace + apps/web Next 15 | Критический | ✅ |
| packages/contracts, packages/config | Высокий | ✅ |
| /api/health + Prisma | Высокий | ✅ |
| CI web:build | Средний | ✅ |
| deploy/scripts/start-web.sh | Средний | ✅ |

---

## F2 — Public SSR ✅

| Задача | Приоритет | Статус |
|--------|-----------|--------|
| public-read barrel (catalog, event, city, venue) | Критический | ✅ |
| /events SSR + pagination + metadata | Критический | ✅ |
| /events/[slug] SSR + metadata | Критический | ✅ |
| /cities, /venues, /locations SSR | Высокий | ✅ |
| Route Handlers /api/public/* | Высокий | ✅ |
| Catalog sizes 100/200/300 | Высокий | ✅ |
| **Landings ISR/SSG** (/podborki, SEO paths) | Высокий | ✅ |
| **public-landing.dto + API landings** | Высокий | ✅ |
| **Catalog filters SSR** (city, date, sort, q) | Высокий | ✅ |
| **Widgets TC/Teplohod** client на event page | Высокий | ✅ |
| **backend:next:parity** script | Средний | ✅ |
| Tailwind + EventCard + SiteLayout | Средний | ✅ |

---

## F3 — Cutover public 🔄

| Задача | Приоритет | Статус |
|--------|-----------|--------|
| Staging deploy apps/web | Критический | ⏳ |
| nginx public → Next :3000 | Критический | ⏳ |
| Staging smoke (parity HTTP, widgets, View Source) | Критический | ⏳ |
| Prod cutover + rollback plan | Критический | ⏳ |
| Deprecate apps/public Vite | Высокий | ⏳ |

Чеклист: [phase-f3-cutover-checklist.md](./phases/phase-f3-cutover-checklist.md).

---

## F4 — Admin + worker ⏳

| Задача | Приоритет | Статус |
|--------|-----------|--------|
| Admin route group (admin) в Next | Высокий | ⏳ |
| Port admin pages from Vite | Высокий | ⏳ |
| Sync jobs → apps/worker | Средний | ⏳ |

---

## F5 — Retire legacy ⏳

| Задача | Приоритет | Статус |
|--------|-----------|--------|
| dto.js read paths → pure Prisma | Высокий | ⏳ |
| Remove server.js / DAIBILET_TS_* flags | Средний | ⏳ |

---

## Codex (параллельно)

| Задача | Приоритет | Статус |
|--------|-----------|--------|
| codex/phase2-finance-next schema foundation | Средний | 🔄 |
| Phase G finance runtime | Низкий | ⏳ после F5 |

---

## Ops backlog

| Задача | Приоритет | Статус |
|--------|-----------|--------|
| tc:sync widgetUrl backfill prod | Средний | ⏳ |
| qa.md — открытые вопросы архитектуры | Низкий | ⏳ |
