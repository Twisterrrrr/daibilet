# Гастрольные и серийные EventPage: итог кампании

Дата проверки: 13 ноября 2026 года.

## Результат

- Подготовлены и применены три батча редакционных текстов по плану **30 + 30 + 26 = 86 гастрольных программ**. Последние три группы добавлены отдельным дополнением к третьему батчу.
- Опубликованы **485 уникальных EventPage**, связанные с **513 уникальными Event ID**.
- Все 485 страниц в production имеют статус `READY`, `isIndexable = true`, опубликованную дату и активную редакционную версию.
- Во всех 485 страницах раздел «Практическая информация» стоит последним. Проверены минимум два содержательных абзаца и длина основного текста относительно описаний источников и прежних активных редакций.
- Связи EventPage ↔ Event ID, slug и canonical при редакционных обновлениях сохранены.

## Публичная проверка

Проверены все 485 публичных URL: каждый вернул HTTP 200, `index, follow`, canonical на себя, H1 и список практической информации. Все 485 URL присутствуют в свежем sitemap `/sitemaps/events.xml` (в sitemap всего 5 321 URL). Ошибок в финальном smoke-проходе нет.

Основной третий батч: повторно прошли ревалидацию 110 путей — 51 EventPage URL и 59 старых slug; отправлено 51 уведомление IndexNow. Дополнение: ещё 86 путей — 43 EventPage URL и 43 старых slug; отправлено 43 уведомления IndexNow. При общей проверке 10 адресов из основного батча сначала отдавали старые закэшированные 404; кэш сбросили повторно, теперь все 485 страниц отвечают HTTP 200.

В основном батче и дополнении по одной странице не назначено в `TourGroup`: в каждой группе уже есть представитель того же города, а схема допускает одного представителя на город. Обе страницы опубликованы и индексируются; связи и URL не менялись. В дополнении созданы три `TourGroup`, остальные 42 страницы получили связи с представителями своих городов.

## Файлы аудита

- Батч 1: `eventpage-tour-rewrite-batch-01-master-copy-2026-11-13.md`.
- Батч 2: `eventpage-tour-rewrite-batch-02-master-copy-2026-11-13.md`.
- Батч 3: `eventpage-tour-rewrite-batch-03-master-copy-2026-11-13.md`, `eventpage-tour-rewrite-batch-03-production-result-2026-11-13.json`, `eventpage-tour-rewrite-batch-03-revalidation-2026-11-13.json`, `eventpage-tour-rewrite-batch-03-http-smoke-2026-11-13.json`.
- Дополнение к батчу 3: `eventpage-tour-rewrite-batch-03-additions-master-copy-2026-11-13.md`, `eventpage-tour-rewrite-batch-03-additions-audit-2026-11-13.csv`, `eventpage-tour-rewrite-batch-03-additions-source-archive-2026-11-13.json`, `eventpage-tour-rewrite-batch-03-additions-production-result-2026-11-13.json`, `eventpage-tour-rewrite-batch-03-additions-revalidation-2026-11-13.json`, `eventpage-tour-rewrite-batch-03-additions-http-smoke-2026-11-13.json`.
- Общая сверка production: `eventpage-tour-rewrite-campaign-production-audit-2026-11-13.json`.
- Общая HTTP/sitemap-проверка: `eventpage-tour-campaign-http-smoke-2026-11-13.json`.

Production-проверки и публикация выполнялись без коммита и деплоя кода.
