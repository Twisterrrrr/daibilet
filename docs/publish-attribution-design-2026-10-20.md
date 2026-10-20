# publishedBy / publishedAt: design note (2026-10-20)

Одна страница, **не diff**. Собирается одним пакетом со `docs/staff-session-plan-2026-10-20.md` на одно ревью Codex — отдельный дифф создал бы иллюзию прогресса, а ревью уперлось бы в вопрос «откуда вообще publishedBy».

## Где живёт факт публикации

**Рекомендация: на `EventDescriptionRevision`, не на `EventOverride`.**

- `EventOverride` хранит **текущее состояние** публичной копии (текст + `descriptionOrigin` + `descriptionSourceHash`). Добавлять туда историю публикаций — смешивать два разных смысла в одной таблице и менять схему публичной копии, которая сейчас трогается только обновлением текста.
- `EventDescriptionRevision` уже хранит историю пары «одобрено/опубликовано» для `approved`: `approvedBy`, `approvedAt`. `publishedBy`/`publishedAt` продолжают ту же логику теми же типами, и `APPROVED → PUBLISHED` остаётся одной историей одной ревизии.

## Что значит `publishedAt`

**Момент записи текста в `EventOverride`**, то есть момент выполнения перехода `APPROVED → PUBLISHED`. Не «момент первой публикации» и не момент появления текста в выдаче: пере-публикация того же текста после `STALE` → новая ревизия, свой `publishedAt`.

## Как это соотносится со статусами

```
QUEUED → GENERATED → CHECKED → APPROVED (+approvedBy, approvedAt) → PUBLISHED (+publishedBy, publishedAt)
                                            └── STALE (вход изменился) → повторная генерация
```

`APPROVED` — редакционное решение, `PUBLISHED` — внешнее действие. Аудит имеет смысл только если это два разных события с двумя разными исполнителями: одобрение батчевое, публикация по окну.

## Что нужно от Codex

1. Решение по размещению (см. выше) — это `packages/db`, и оно же закрывает `DB.APPROVEDBY-FK`: `publishedBy String` без FK и `approvedBy String` без FK — **один и тот же долг**, а не два.
2. Миграция: `publishedBy TEXT`, `publishedAt TIMESTAMP` на `EventDescriptionRevision` (nullable). FK на `AdminUser` — общий пакет с `approvedBy`, решается один раз.
3. Ответ на вопрос «заполнять ли `publishedBy` сейчас»: **нет** — без идентичности писать туда `'admin'` значит завести второй долг того же класса, что и `approvedBy`. Колонки могут появиться в миграции, но остаются NULL до staff-сессий.

## Вопрос владельцу

Подтвердить размещение на ревизии и определение `publishedAt` как «момент записи в override». Если владелец считает, что публикация должна быть видна на `EventOverride` (например, для UI), то это read-model/представление, а не второе место хранения.
