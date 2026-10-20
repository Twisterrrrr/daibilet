# Staff-сессии админки: план (2026-10-20)

Одна страница, **не код**. Цель — снять блокер с трёх тикетов: `CONT.APPROVED-BY-IDENTITY`, `ADMIN.REWRITE-ROLE`, `DB.APPROVEDBY-FK`. Без идентичности «аудит одобрений» пишет `'admin'`, то есть не является аудитом.

## 1. Кто ходит в админку сегодня

Один общий логин: HTTP Basic (`ADMIN_USER`/`ADMIN_PASSWORD` из env), проверка `isAuthorizedAdminRequest` в `apps/backend/src/auth.ts`, тот же конфиг для Next-слоя (`admin-basic-auth.ts`), matcher `/admin/:path*`. Per-user идентичности нет ни у одного действия: ни у одобрений, ни у правок контента, ни у заказов. `AdminUser`, `AdminSession`, `AdminInvitation`, `AdminAuditLog` в схеме есть и не используются в рантайме.

## 2. Вход: что оставляем, что добавляем

Схема уже содержит всё нужное, **миграция под сессии не требуется**:

- `AdminUser`: `email` (unique), `displayName`, `passwordHash?`, `state` (`INVITED | ACTIVE | SUSPENDED`), `roles AdminRole[]`, `permissionEpoch`, `emailVerifiedAt`, `lastLoginAt`;
- `AdminInvitation`: `tokenHash`, `expiresAt`, `acceptedAt`, `revokedAt`, `invitedById` — то есть приглашение с одноразовым токеном уже спроектировано;
- `AdminSession`: `tokenHash` (unique), `expiresAt`, `revokedAt`, `lastSeenAt`, индекс `(userId, revokedAt)` и `(expiresAt)` — таблица рассчитана на **opaque-токен, хранимый хешем**, а не на server-side session id.

Два варианта, оба совместимы с текущим доступом:

- **A. Per-user Basic (дешёвый промежуточный).** Оставить Basic, но завести по строке `AdminUser` на человека и маппить Basic-username → `AdminUser.id`. Даёт идентичность и роли **без** логин-страницы, cookie и expiry. Минусы: нет logout и срока жизни, пароль живёт в браузере, `state`/`permissionEpoch` не работают как механизм отзыва.
- **B. Сессии (целевой).** Form-login на `AdminUser.passwordHash`, приглашение через `AdminInvitation`, сессия — случайный 32-байтный токен, в БД только `tokenHash`, в браузер — HttpOnly + SameSite=Lax cookie на admin-хосте; `expiresAt` (например 12 ч idle через `lastSeenAt`, 30 дней абсолютный), logout ставит `revokedAt`, смена ролей бампает `permissionEpoch` и обесценивает кэш прав.

Рекомендация: **A сейчас, B отдельной работой.** A снимает блокер с ролей и аудита за один коммит и не трогает авторизацию админки целиком; B строится спокойно, не блокируя очередь рерайтов.

## 3. `resolveActor`

Из сессии (вариант B) или из Basic-username (вариант A) → `AdminUser.id`. Обязательные проверки: `state = ACTIVE`, сессия не `revokedAt` и не истекла (для B). Отсутствие/истечение → `null`. Поведение при `null` уже реализовано и менять его не нужно: handler возвращает **409 `actor_unresolved`** и ничего не пишет. UI при этом должен уводить на вход, а не показывать 409 как ошибку сервера.

## 4. Переход от Basic (порядок выката)

1. Фаза 1 — появляется per-user идентичность (A или B), Basic продолжает работать для остальных путей. Ничего не ломается.
2. Фаза 2 — из композиционного корня убирается `allowLegacyActor: true` (сейчас стоит явным флагом с TODO в `server-entry.ts`); approve и publish начинают требовать реального актора.
3. Фаза 3 — Basic сужается до bootstrap/ops-путей либо убирается.

Порядок обязателен: убрать флаг **до** появления идентичности = сломать approve целиком (409 на каждом вызове). Именно поэтому флаг назван явно и его видно одним `grep allowLegacyActor`.

## 5. Ownership

- `packages/db` — миграция под сессии не нужна (схема готова). Единственное, что потребует миграции, — `publishedBy`/`publishedAt` на `EventDescriptionRevision` и, при желании, FK `approvedBy → AdminUser` (тикет `DB.APPROVEDBY-FK`). Это зона Codex: ревью или явное «ок».
- `apps/backend` (session/basic-username middleware, `resolveActor`) и `apps/web` (логин, если выбран B) — Cline, с ревью Codex по точкам касания схемы.
- Продуктовое решение по карте ролей — владелец (см. decision-log 2026-10-20: approve — `CATALOG_EDITOR`/`COPYWRITER`/`SUPERADMIN`, publish — `CATALOG_EDITOR`/`SUPERADMIN`; `EDITOR`/`PUBLISHER` в enum нет).

## 6. Вопросы владельцу до старта

1. Сколько людей ходят в админку и нужен ли им раздельный вход, или общий логин сохраняется как ops-канал?
2. Вариант A или B первым (рекомендация — A)?
3. Кто владелец `packages/db`-части: Codex делает миграцию под `publishedBy`/`publishedAt` или Cline готовит diff, Codex ревьюит?
