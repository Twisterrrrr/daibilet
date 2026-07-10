# Tasktracker — Daibilet

Обновлено: **2026-07-10**. Источник: [Project.md](./Project.md), [phase-f-next-fullstack.md](./phases/phase-f-next-fullstack.md), [codex-phase2-next-handoff.md](./codex-phase2-next-handoff.md).

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

## F3 — Cutover public ✅

| Задача | Приоритет | Статус |
|--------|-----------|--------|
| systemd `daibilet-web-staging` | Критический | ✅ artifact |
| nginx `staging-next.conf.snippet` | Критический | ✅ artifact |
| `deploy-staging-next.sh` | Критический | ✅ artifact |
| `launch-staging-smoke-next.sh` | Высокий | ✅ artifact |
| Staging deploy на сервере | Критический | ✅ 2026-07-10 |
| nginx → Next :3000 | Критический | ✅ patch-staging-next.py |
| Staging smoke green | Критический | ✅ auto (widgets — manual) |
| Prod cutover + rollback plan | Критический | ✅ 2026-07-10 |
| Prod nginx → Next :3001 | Критический | ✅ patch-prod-next.py |
| Prod smoke (SSR via nginx) | Критический | ✅ (parity optional WARN) |
| **Next UI polish** (design system, header, home) | Высокий | 🔄 slice 1 |
| Deprecate apps/public Vite | Высокий | ⏳ после мониторинга 24–48ч |

Чеклист: [phase-f3-cutover-checklist.md](./phases/phase-f3-cutover-checklist.md).

---

## Codex integration (Post-F3) 🔄

| Задача | Приоритет | Статус |
|--------|-----------|--------|
| Cherry-pick Phase 2 schema migrations | Критический | ✅ checkout Codex |
| Cherry-pick Event Change Requests (backend) | Высокий | ✅ wired server-entry |
| Merge `packages/contracts/src/admin.ts` | Высокий | ✅ |
| Admin EventChangeRequestsPage (Vite) | Средний | ✅ за `VITE_DAIBILET_EVENT_CHANGE_REQUESTS=1` |
| `pnpm db:deploy` staging + prod | Критический | ✅ staging 4 migrations; prod already current |
| **Не мержить** Codex Next/proxy (`5b18225`) | — | 🚫 |

План: [codex-cherry-pick-plan.md](./codex-cherry-pick-plan.md).  
Ветка Codex: **`codex/phase2-foundation`** (не `phase2-finance-next`).

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
| Codex ветка `codex/phase2-foundation` — Phase 2 backend | Средний | 🔄 (Codex) |
| Cherry-pick на `feat/next-monorepo` | Высокий | 🔄 schema + ECR landed |
| Phase G finance runtime | Низкий | ⏳ после F5 |

---

## Ops backlog

| Задача | Приоритет | Статус |
|--------|-----------|--------|
| tc:sync widgetUrl backfill prod | Средний | ⏳ |
| qa.md — открытые вопросы архитектуры | Низкий | ⏳ |
