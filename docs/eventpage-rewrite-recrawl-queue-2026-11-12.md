# Индексируемые EventPage с активными рерайтами

Срез production на 12 ноября 2026 года. Полный список: [CSV с 181 URL](./eventpage-rewrite-recrawl-queue-2026-11-12.csv).

- **181** EventPage имеют `READY`, `isIndexable=true`, `publishedAt` и `activeEditorialText.status=ACTIVE_EDITORIAL_REWRITE`.
- Все **181/181** URL присутствуют в production sitemaps/events.xml (HTTP 200, 4336 URL в карте).
- **89** из 181 записаны в серверный accepted-набор cron-задачи IndexNow; **92** пока там отсутствуют. Этот набор фиксирует факт принятия URL когда-либо, но не дату последнего обхода.
- В production HTTP-проверке выборки из 11 URL все ответили 200, имели self-canonical и `index, follow`.

## Что известно об отправках

- Система хранит accepted-набор для первоначальной отправки sitemap URL в IndexNow, а backend-журнал пишет только количество URL в каждом revalidate POST, не сами адреса.
- Для последнего батча из 30 URL (активный маркер `eventpage-rewrite-2026-11-11`) мы вызвали ревалидацию всех 30 страниц; журнал подтверждает, что 30 URL приняты Yandex IndexNow 11 ноября в 12:19 UTC.
- Второй endpoint `api.indexnow.org` возвращает 403; уведомления Yandex при этом приняты.
- Поэтому CSV - полный набор текущих индексируемых активных рерайтов. Последние 30 уже уведомлены; для остальных 151 точная история уведомлений не ведётся, так что исключить возможные повторы нельзя.
- Google Search Console не ведёт у нас журнал запросов на переобход. IndexNow уведомляет Yandex и Bing; отправка URL в IndexNow сама по себе не подтверждает, что поисковик уже обновил индекс.
