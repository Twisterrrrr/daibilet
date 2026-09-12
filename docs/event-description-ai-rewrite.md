# AI-рерайт описаний событий (admin MVP)

**Дата:** 2026-09-08  
**Статус:** UI-only MVP (без draft в БД, без batch)

## Зачем

Source-описания с Ticketscloud / других фидов часто копируются 1:1. Поисковики пессимизируют дубли. Рерайт в `EventOverride.description` даёт уникальный текст, не ломая sync source.

## Flow

1. Админ открывает карточку события → блок «Контент (override)».
2. Кнопка **«Сгенерировать рерайт»** → `POST /api/admin/events/:id/rewrite-description`.
3. Backend читает source description (fallback: текущий override), а также `startsAt` / `endsAt` активных сеансов, и вызывает OpenAI с системным промптом «шестиугольник безопасности».
4. Ответ **только в UI** (колонки Было / Стало). В БД ничего не пишется.
5. Админ правит textarea и жмёт **«Сохранить контент»** → существующий `PATCH .../override`.

TC sync **не затирает** override (import-guard).

## Канон длительности

- Если организатор явно указал длительность в исходном описании, сохраняем её без пересчёта.
- Если в тексте длительности нет, вычисляем её по активным сеансам: `endsAt - startsAt`.
- Расчётное значение округляем до ближайших 5 минут: 67 минут → 65, 68 минут → 70.
- Если все сеансы после округления имеют одинаковую длительность, рерайт может назвать одно значение.
- Если длительность различается, пишем «зависит от сеанса» и называем варианты; при большом числе вариантов — диапазон. Одно фиксированное значение в таком случае запрещено.
- При отсутствующем, некорректном или более раннем `endsAt` длительность не выводим и не придумываем.
- В готовом тексте не упоминаем Ticketscloud и технические поля расписания.

## Env

```bash
OPENAI_API_KEY=sk-...
# optional:
OPENAI_REWRITE_MODEL=gpt-4.1-mini
```

Ключ — на **backend** (куда ходит admin API). Без ключа кнопка показывает понятную ошибку, сайт не падает.

## Границы MVP

- Нет auto-rewrite на sync, нет batch/cron, нет Anthropic dual-provider.
- Нет draft-статуса в БД и нет автосохранения рерайта.
- SEO override (`seoTitle` / `seoDescription`) уже в схеме — рерайт их не трогает.
- Rate limit: ~1 запрос / event / 5 с (in-process).

## Код

- [`apps/backend/src/ai-rewrite-description.ts`](../apps/backend/src/ai-rewrite-description.ts) — промпт + OpenAI + sanitize
- [`apps/backend/src/admin-events-handler.ts`](../apps/backend/src/admin-events-handler.ts) — endpoint
- [`apps/web/src/components/admin/AdminEventDescriptionRewrite.client.tsx`](../apps/web/src/components/admin/AdminEventDescriptionRewrite.client.tsx) — UI
- [`apps/web/src/server/admin-event-actions.ts`](../apps/web/src/server/admin-event-actions.ts) — `rewriteAdminEventDescriptionAction`
