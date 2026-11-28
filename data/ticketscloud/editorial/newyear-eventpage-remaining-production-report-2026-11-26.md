# Новогодние EventPage: публикация приоритетного набора 64 страниц

Дата: 26 ноября 2026 года.

## Результат

- Подготовлено 55 редакционных текстов для 64 EventPage: 22 локальных текста, 28 текстов для 29 страниц и 5 мастер-текстов для 13 страниц.
- Страницы связаны с 85 событиями. Связи EventPage ↔ Event ID, slug и маршруты оставлены без изменений.
- До записи для каждой страницы подтверждены будущие активные слоты и активные предложения. Проверка длины: основной текст не короче исходного, минимум два содержательных абзаца; практическая информация вынесена отдельно.
- Исходные описания сохранены в архиве с отметкой, что это неактивный текст. Редакционный текст сохранён как активный.
- Все 64 страницы переведены в `READY`, `isIndexable = true`, с self-canonical.
- Для пяти групп гастролей настроены связи между 14 городскими EventPage.
- В общем production-реестре после обновления: 1 980 активных индексируемых EventPage, 19 254 строки связи EventPage × Event/Event ID.

## Проверка production

- 64/64 новых EventPage отвечают `200`, canonical указывает на себя, `noindex` отсутствует.
- 85/85 старых URL слотов отвечают `200`, имеют self-canonical и `noindex, follow`.
- Проверено, что список событийных связей на каждой странице совпадает с production-снимком до записи; маршрутные URL не менялись.
- IndexNow поставлен для 64 новых страниц. Проверка не утверждает, что поисковик уже включил их в индекс.
- После записи очищены backend public cache, Next.js ISR и nginx HTML proxy cache. Это потребовалось, чтобы старые HTML-ответы слотов перестали показывать `index, follow`.

## Файлы аудита

- `newyear-eventpage-priority-batch-02-rewrites-2026-11-25.md`
- `newyear-eventpage-priority-batch-03-rewrites-2026-11-26.md`
- `newyear-eventpage-priority-batch-04-rewrites-2026-11-26.md`
- `newyear-eventpage-remaining-editorial-audit-2026-11-26.json`
- `newyear-eventpage-remaining-production-backup-2026-11-26.json`
- `newyear-eventpage-remaining-production-result-2026-11-26.json`
- `newyear-eventpage-remaining-smoke-2026-11-26.json`
- `newyear-eventpage-slot-smoke-2026-11-26.json`
- `newyear-eventpage-revalidation-2026-11-26.json`
- `all-active-eventpage-rewrites-production-2026-11-26.json`

Production content was written through the existing admin service; no application code or SEO routing logic was deployed in this operation.
