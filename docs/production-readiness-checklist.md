# Production readiness — чеклист Дайбилет

**Обновлено:** 2026-08-28  
**Контекст:** сравнение с [«вайбкодинг в проде»](https://habr.com/ru/articles/1075256/) — демо ≠ система.  
**Prod:** MSK `201.24.125.184` · Next `:3001` + API `:4000` · ветка `feat/next-monorepo`  
**Легенда:** ✅ готово · 🟡 частично · 🔴 gap · ⏳ owner/CODEX

| Owner | Кто закрывает |
|-------|----------------|
| **Owner** | продуктовые решения, секреты, deploy на live, Sentry/Telegram |
| **Agent** | код, CI, docs, скрипты в репо |
| **CODEX** | SSH на MSK, верификация cron/systemd, нагрузочные прогоны |

---

## 1. Архитектура и решения

| | Пункт | Owner | Статус | Evidence |
|---|--------|-------|--------|----------|
| - [x] | Границы сервисов задокументированы (web SSR vs API vs finance `.159`) | Agent | ✅ | [Project.md](./Project.md) § Path B |
| - [x] | Контракты catalog/public в `packages/contracts` | Agent | ✅ | Zod + shared constants |
| - [x] | Geo-routing / region hubs — канон в JSON + docs | Owner | ✅ | `data/geo/`, [region-hub-v1.md](./region-hub-v1.md) |
| - [ ] | ADR на каждый крупный компромисс (widget-first, no internal checkout) | Owner | 🟡 | [decision-log.md](./decision-log.md) — не полный ADR-формат |
| - [ ] | Диаграмма threat model (публичный read vs admin vs user auth) | CODEX | 🔴 | — |

---

## 2. Безопасность

| | Пункт | Owner | Статус | Evidence |
|---|--------|-------|--------|----------|
| - [x] | Admin API: Basic auth + `DAIBILET_REQUIRE_ADMIN_AUTH` | Agent | ✅ | `apps/backend/src/auth.ts`, unit tests |
| - [x] | User auth: scrypt + JWT access/refresh + HttpOnly cookie | Agent | ✅ | `apps/backend/src/user-auth.js` |
| - [x] | Rate limit на auth endpoints (in-memory) | Agent | 🟡 | `assertAuthRateLimit` — не Redis, сброс при restart |
| - [x] | Секреты только в `.env` / GitHub Secrets, не в git | Owner | ✅ | deploy docs |
| - [x] | Postgres не открыт наружу (CI tunnel только к API) | Owner | ✅ | [deploy-msk-web.yml](../.github/workflows/deploy-msk-web.yml) |
| - [ ] | AppSec review user/account API (IDOR, favorites, orders) | CODEX | 🔴 | см. [codex-prod-readiness-handoff.md](./codex-prod-readiness-handoff.md) |
| - [ ] | Dependency audit в CI (`npm audit` / Dependabot) | Agent | 🔴 | — |
| - [ ] | Security headers audit (nginx + Next) | CODEX | 🟡 | частично на nginx |
| - [x] | Widget-first: нет своего checkout / PCI scope | Owner | ✅ | [mvp-spec.md](./mvp-spec.md) |

---

## 3. Тестирование

| | Пункт | Owner | Статус | Evidence |
|---|--------|-------|--------|----------|
| - [x] | Backend unit tests в CI | Agent | ✅ | `pnpm backend:test:ts` |
| - [x] | Web lib unit tests в CI | Agent | ✅ | `pnpm web:test:ci` — 16 файлов / 91 test; full `pnpm web:test` — tech debt ~30 hub tests |
| - [x] | Prisma validate + generate в CI | Agent | ✅ | CI job |
| - [x] | Hub image guards в CI | Agent | ✅ | `hub:check-image-map/quality` |
| - [ ] | E2E smoke (Playwright) на staging | CODEX | 🔴 | ручной [launch-staging-smoke-next.sh](../scripts/launch-staging-smoke-next.sh) |
| - [ ] | Contract/parity tests в weekly cron (staging) | CODEX | 🟡 | [deploy/cron/README.md](../deploy/cron/README.md) |
| - [ ] | Нагрузочный smoke catalog/home (20 parallel) | CODEX | 🟡 | [inc-504-ssr-hardening.md](./inc-504-ssr-hardening.md) smoke plan |

---

## 4. CI/CD и окружения

| | Пункт | Owner | Статус | Evidence |
|---|--------|-------|--------|----------|
| - [x] | CI на push/PR (`feat/next-monorepo`) | Agent | ✅ | [.github/workflows/ci.yml](../.github/workflows/ci.yml) |
| - [x] | Web deploy: GHA build + atomic `.next` swap | Agent | ✅ | [deploy-msk-web.yml](../.github/workflows/deploy-msk-web.yml) |
| - [x] | Deploy lock + auto-rollback `.next.prev` on failed health | Agent | ✅ | [swap-web-next-artifact.sh](../deploy/scripts/swap-web-next-artifact.sh) |
| - [x] | Staging контур документирован | Owner | ✅ | [deploy-staging.md](./deploy-staging.md) |
| - [ ] | Staging = prod parity (DB snapshot script есть, cadence?) | CODEX | 🟡 | [restore-staging-db.sh](../deploy/scripts/restore-staging-db.sh) |
| - [x] | Batch deploy cadence (не каждый UI-fix) | Owner | ✅ | Project.md, `.cursorrules` |

---

## 5. Post-deploy и smoke

| | Пункт | Owner | Статус | Evidence |
|---|--------|-------|--------|----------|
| - [x] | API health + stats после deploy | Agent | ✅ | [post-deploy-check.sh](../scripts/post-deploy-check.sh) |
| - [x] | Widget readiness check | Agent | ✅ | `check:widgets` |
| - [x] | Next web health + `/` smoke (localhost) | Agent | ✅ | post-deploy + swap script (2026-08-28) |
| - [ ] | `POST_DEPLOY_INVARIANTS_STRICT=1` на prod после backfill | Owner | 🟡 | сейчас warn-only |
| - [ ] | Public URL smoke после GHA swap (`https://daibilet.ru`) | Agent | ✅ | GHA step (2026-08-28) |
| - [ ] | `pnpm launch:prod-smoke-next` в runbook после каждого batch | Owner | 🟡 | [launch-qa-and-deploy.md](./launch-qa-and-deploy.md) |

---

## 6. Наблюдаемость и алерты

| | Пункт | Owner | Статус | Evidence |
|---|--------|-------|--------|----------|
| - [x] | SSR healthcheck every minute + restart | CODEX | 🟡 | [daibilet-tasks](../deploy/cron/daibilet-tasks) — verify installed on MSK |
| - [x] | API healthcheck every minute | CODEX | 🟡 | `api-healthcheck.sh` |
| - [x] | OOM watch (swap / MemoryHigh) | CODEX | 🟡 | [oom-watch.sh](../deploy/scripts/oom-watch.sh) |
| - [x] | TC catalog sync nightly + verify script | CODEX | 🟡 | deploy/cron |
| - [ ] | Nightly health (widgets + invariants) **на prod** | CODEX | 🟡 | optional → handoff |
| - [ ] | Centralized errors (Sentry / аналог) | Owner | 🔴 | отложено в MVP |
| - [ ] | Uptime / TTFB dashboard (Metrika + server logs) | Owner | 🟡 | [metrika-goals-checklist.md](./metrika-goals-checklist.md) |
| - [ ] | Telegram alerts проверены end-to-end | CODEX | 🟡 | listing audit cron |

---

## 7. Backup, rollback, восстановление

| | Пункт | Owner | Статус | Evidence |
|---|--------|-------|--------|----------|
| - [x] | Web rollback: `.next.prev` + restore in swap script | Agent | ✅ | swap script |
| - [x] | Pre-next snapshot (nginx + static) | Agent | ✅ | [snapshot-prod-rollback.sh](../deploy/scripts/snapshot-prod-rollback.sh) |
| - [x] | Vite rollback script (legacy) | Agent | ✅ | [rollback-prod-vite.sh](../deploy/scripts/rollback-prod-vite.sh) |
| - [ ] | Postgres backup cadence / restore drill (документирован) | CODEX | 🔴 | Docker PG on MSK |
| - [ ] | Restore drill проведён за последние 6 мес | Owner | 🔴 | — |
| - [x] | Incident runbook | Agent | ✅ | [incident-runbook.md](./incident-runbook.md) |

---

## 8. Поддерживаемость и передача

| | Пункт | Owner | Статус | Evidence |
|---|--------|-------|--------|----------|
| - [x] | Project / Tasktracker / Diary | Agent | ✅ | `docs/` |
| - [x] | Deploy scripts syntax-checked в CI | Agent | ✅ | CI `bash -n` |
| - [ ] | CODEOWNERS / formal review policy | Owner | 🔴 | owner + agent ad-hoc |
| - [ ] | On-call rotation / эскалация | Owner | 🔴 | — |
| - [x] | Finance host `.159` — отдельный контур, не трогать | Owner | ✅ | `.cursorrules`, [spb-finance-host.md](./spb-finance-host.md) |

---

## 9. Экономика и масштаб

| | Пункт | Owner | Статус | Evidence |
|---|--------|-------|--------|----------|
| - [x] | CI build offloaded from 4GB VPS | Agent | ✅ | GHA artifact swap |
| - [x] | Catalog DTO on disk (не inline SQL в hot path) | Agent | ✅ | INC.504 |
| - [ ] | Cost review CDN/images/SSG | Owner | 🟡 | — |

---

## Топ-5 ROI (2026-08-28)

| # | Действие | ROI | Owner | Статус |
|---|----------|-----|-------|--------|
| 1 | **Web unit tests в CI** — allowlist стабильных lib tests | высокий | Agent | ✅ `web:test:ci` |
| 2 | **Post-deploy + GHA public smoke** — ловит «swap прошёл, сайт 502» | высокий | Agent | ✅ post-deploy + deploy-msk-web |
| 3 | **Incident runbook** — один экран для 03:00 | высокий | Agent | ✅ [incident-runbook.md](./incident-runbook.md) |
| 4 | **Prod nightly health cron** — widgets/invariants без ручного grep | средний | CODEX | ⏳ [codex-prod-readiness-handoff.md](./codex-prod-readiness-handoff.md) |
| 5 | **User/account API auth audit** — IDOR до роста ЛК | средний | CODEX | ⏳ handoff § Security |

---

## Как обновлять

1. После закрытия пункта — `[x]`, статус ✅, дата в Diary.
2. Новые gaps — строка в §9 Tasktracker `PROD.*`.
3. Пересмотр чеклиста — раз в квартал или перед paid acquisition.
