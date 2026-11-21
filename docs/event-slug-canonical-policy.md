# Канон URL событий (EventPage) — политика slug и редиректов

Цель: **одна группа событий = один вечный публичный URL**, слоты — состояние, а не
страницы. Source of truth для редиректов — версионируемый
`data/redirects/event-pdp-redirects.json`.

## Инварианты (не нарушать)

1. Опубликованный canonical-slug **неизменен навсегда**. Рерайт, смена сезона или
   статуса не меняют URL.
2. Canonical-slug **не содержит**: код билетной системы (`tc-<hex24>` / суффикс
   `-<hex24>`), дату (`20-11-2026`, `2026-11-20`), состояние сеанса.
3. Один EventPage — один slug. Слоты и другие Event ID связываются со страницей,
   а не плодят ссылки.

## Построение slug

- Backend: `eventPageCandidateSlug` (`apps/backend/src/event-pages.js`) снимает
  provider-identity (TC-код) и дату, транслитерирует, fallback — `event`.
- Приоритет ссылки в каталоге (`eventSlug` в `apps/web/src/lib/routes.ts`):
  `eventPageSlug` → `slug` → `sourceSlug` → `title-{id}`. Opaque-ID (20+ hex) не
  используется как канон.
- Коллизия в том же городе: первый свободный суффикс `-2`, `-3`. Городской
  суффикс добавляется при необходимости. Многогородская — без суффикса города.

## Алиас и наследование

- Слот/легаси URL, свёрнутый в опубликованный EventPage, **не теряем** и **не
  редиректим**: страница остаётся 200, но получает `noindex,follow` и
  **self**-canonical (`resolveEventPageUrlPolicy`). Cross-canonical на EventPage
  не ставим — пара «noindex + cross-canonical» сбивает Google
  («канонические версии не совпадают»).
- Истина для индексации — EventPage: как только рерайт опубликован, слоты его
  группы деиндексируются автоматически (noindex). Они выходят из индекса
  постепенно, без потери и без 301-scale.
- 301 оставляем только под реальный flip канона (`EventPageRoute` `PUBLISHED`);
  410 — для путей, которых больше нет (увидели в GSC 404).

## Дисциплина статусов

| Ситуация | HTTP | Примечание |
|---|---|---|
| Слот/легаси свёрнут в EventPage | 200 + noindex | self-canonical, деиндексация без потери |
| Слот/событие ушло навсегда, цели нет | 410 | быстрый вывод из индекса |
| Событие без EventSession | 200 + noindex | вне sitemap, URL/данные не удалять |
| Рекуррент/сезонное, все сеансы прошли | 200 | страница живёт, меняется availability |

## Карта редиректов

- Файл: `data/redirects/event-pdp-redirects.json` (версионируемый, review; заполняется
  скриптами, ключ сверки — Event ID, не slug).
- Запись: `sourcePath`, `eventId`, `kind` (`slot|legacy_slug|tc_code|cyrillic|past_slot`),
  `status` (`301|410`), `targetPath` (`null` для 410).
- Валидируется тестом `apps/web/src/lib/event-redirect-map.test.ts`:
  нет дублей source, нет self-loop, нет redirect-chain, canonical — читаемый
  slug без кода/даты.

## Порядок перехода (не частично)

Пока карта неполна — canonical/sitemap/редиректы не меняем. Релиз кат-овера:
карта + 301/410 в `proxy.ts` + sitemap (только каноны) + canonical едут одним
обычным релизом, чтобы не было промежуточного состояния.