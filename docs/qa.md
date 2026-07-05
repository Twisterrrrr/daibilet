# QA — открытые архитектурные вопросы

Дата: **2026-07-05**. Связано с [Project.md](./Project.md).

---

## Продукт и границы MVP

1. **Cutover со старого daibilet.ru** — когда полностью отключаем legacy и перенаправляем 301 все URL?
2. **Личный кабинет покупателя** — достаточно ли `SiteUser` + ExternalOrder mirror или нужна полноценная история с email/push?
3. **Возвраты и отмены** — показываем статус из TC/TEP as-is или нужны уведомления пользователю?

---

## Каталог и данные

4. **Группировка событий** — финальное правило `groupKey`: title vs venue vs meta-event — нужна ли админ-настройка per-group?
5. **Saleable filter** — какие `sourceStatus` / `PublishStatus` точно включаются в public catalog? Документировать SQL-условия.
6. **Teplohod Москва** — 16 событий без описания: ждём тексты от контент-команды или генерируем шаблон?
7. **Площадки MEETING_POINT** — показывать в `/locations` или только bus/pier/park?

---

## Производительность

8. **Catalog snapshot** — denormalized table vs materialized view vs Redis: что выбираем для cold <1 s?
9. **Stats endpoint** — отдельная таблица счётчиков обновляемая после sync или кэш в Redis?
10. **CDN** — Cloudflare перед daibilet.ru уже есть? Нужен ли proxy_cache для `/api/public/*`?

---

## Prisma migration

11. **Единый пакет `@daibilet/db`** — экспортировать PrismaClient + типы для backend и scripts?
12. **Import scripts** — мигрировать на Prisma или оставить raw `pg` для bulk insert performance?
13. **`$queryRaw` vs snapshot table** — для `publicCatalogSessions` какой путь утверждаем на Q3 2026?
14. **Transaction boundaries** — sync scripts в одной transaction или batched commits?

---

## Frontend

15. **SSR/SSG** — Next.js App Router vs Remix vs остаёмся SPA + prerender критичных URL?
16. **react-router** — когда переезжаем с routing в App.tsx?
17. **Service Worker** — нужен offline/cache для repeat visits вместо localStorage?
18. **API base URL** — prod: same-origin `/api` через nginx или `api.daibilet.ru`?

---

## SEO и контент

19. **Indexable rules** — `weakVenuePage`, `isIndexable` — финальная матрица для Google?
20. **Canonical URLs** — `/venues` vs `/locations` для одной площадки: кто master?
21. **Structured data** — JSON-LD Event/Venue — в scope MVP?

---

## Инфраструктура

22. **Postgres** — managed Timeweb vs docker на том же VPS: план масштабирования?
23. **Backup** — расписание pg_dump, retention, restore drill?
24. **Monitoring** — Sentry/Prometheus для API latency и cache hit rate?
25. **Staging** — нужен ли отдельный staging.daibilet.ru с копией prod data?

---

## Безопасность

26. **Admin auth** — переход с Basic/password на OAuth/SSO?
27. **Rate limiting** — public API: нужен ли nginx limit_req?
28. **Secrets rotation** — TC API key, admin password: процесс?

---

## Организация

29. **Code owners** — кто approve changes в `dto.js`?
30. **Release process** — только manual scp или обязательный deploy-from-git + CI?

---

*Ответы фиксировать в Project.md и закрывать пункты по мере решения.*
