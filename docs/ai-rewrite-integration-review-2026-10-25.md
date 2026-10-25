# Проверка интеграции очереди AI-рерайта — 2026-10-25

## Текущее состояние

Очередь собрана в отдельной локальной ветке `codex/ai-rewrite-rbac-integration`: свежий `origin/feat/next-monorepo` + персональные сессии/RBAC + очередь ревизий, post-sync hook и UI. В основную рабочую копию не переносилась, push и deploy не выполнялись.

Персональный `AdminUser.id` из backend session guard используется как audit actor. Route policy: чтение — `content.read`, генерация/одобрение/отклонение — `content.edit`, публикация — `content.publish`. Копирайтер может одобрять, но не публиковать; публикация доступна редактору каталога/продукту/суперадмину согласно общей матрице. Неизвестные маршруты остаются закрыты.

Если `DAIBILET_ADMIN_RBAC_ENFORCE` выключен, новый rewrite API возвращает 503 `admin_rbac_required` даже при успешном Basic Auth. Это не даёт перепутать Basic Auth с ролевой защитой. С включённым флагом действует общий персональный session guard и route policy. Approval/publish без реального session actor также возвращают отказ.

## Проверки

- `pnpm db:generate` — выполнен локально по корневому `.env`; миграции к базе не применялись.
- Backend typecheck и web typecheck — 0 ошибок.
- Точечные backend тесты очереди, хеширования, маркера происхождения, route policy и fail-closed middleware — **52/52 pass**.
- Web CI — **373/373 pass**. Тест безопасного существующего HTML обновлён под фактическое правило: allowlist-санитизация сохраняет исходную безопасную структуру.
- Для проверки миграционной линии создана отдельная БД `daibilet_rewrite_rbac_test_20261025` на локальном контейнере Postgres `daibilet-fresh-postgres` (порт 5438). Все **54 миграции** применились, `migrate status` чистый.
- Полный backend suite на этой изолированной БД — **450/450 pass**. На общей dev-БД ранее было 443/450: отсутствовали таблицы `SupplierLegalReviewSnapshot`, `IssuedTicket` и `supplier_user_access_logs`; она не изменялась.
- Локальный eslint для web изменённого formatter/test — без замечаний.

## Выпускные границы

Миграция `20261020120000_event_description_revision` применена только к отдельной локальной тестовой БД; content hook и API в production не выкатывались. Следующий шаг — сверить миграционный статус на целевой тестовой БД, применить миграции только к изолированной БД с понятным lineage, затем проверить API с реальными сессиями разных ролей. После этого можно отправлять PR/ветку на ревью. Production deploy и post-sync массовый catch-up — отдельный выпускной шаг.
