# Organizer email intake (info@daibilet.ru)

Организаторы присылают доп.инфо и фото о событиях на `info@daibilet.ru` (почта на Timeweb).
Пайплайн: IMAP → staging на сервере → ручное ревью → публикация в каталог.

## Ставка на безопасность

- Креды IMAP — только через env (`ORGANIZER_IMAP_USER` / `ORGANIZER_IMAP_PASS`),
  никогда в репозиторий. Пароль — app-password из панели Timeweb.
- Ничего не публикуется автоматически: письма попадают в staging, оператор
  проверяет текст и фото перед apply (правило «не выдумывать факты»).

## Поток

1. **Fetch** — `node apps/worker/bin/run.mjs organizer-inbox`
   (или `node scripts/ingest-organizer-emails.js --since-days 3`).
   Стейджит каждое письмо как `tmp-organizer-inbox/<key>/record.json` + фото.
   Ссылка `daibilet.ru/events/<slug>` в письме автоматически становится `eventSlug`.
   **Фильтр отправителя**: стейджатся только письма от `agent@ticketscloud.com`
   (Ticketscloud пересылает письма организаторов) — остальные пропускаются.
2. **Ревью** — оператор читает `record.json`: сверяет текст, фото, событие
   (без ссылки в письме — дописать `eventSlug` в record.json вручную).
3. **Apply** — `node scripts/apply-organizer-email.js --key <key> --with-text --apply`.
   Фото → `apps/web/public/images/organizer/<slug>/` (nginx `/images/*` с диска,
   кэш 30 дней). Текст → `EventOverride.description` (проверки: без строк
   дат-сеансов, без HTML, normalizeUserFacingCopy).

## Backfill: уже имеющиеся письма

Скрипт идемпотентен: каждое письмо стейджится в папку с именем = хеш Message-ID,
повторный прогон перезаписывает те же записи, дублей не появляется. Поэтому
старую почту закрываем одним прогоном с широким окном:

```bash
# 1. сначала посмотреть объём (ничего не пишет, кроме last-run.json)
node scripts/ingest-organizer-emails.js --dry-run --since-days 365 --limit 1000

# 2. затем застейджить всё окно
node scripts/ingest-organizer-emails.js --since-days 365 --limit 1000
```

(`--limit` по умолчанию 50 — для backfill поднять; если писем больше, повторить
прогон, выборка идёт от старых к новым.)

Политика разбора старых записей при ревью:

1. **Событие уже прошло** — текст не заливать (расписание в нём устарело),
   запись пометить/удалить. Фото при желании оставить в staging как архив.
2. **Событие текущее/будущее** — обычный apply (`--key <key> --with-text --apply`).
3. **Фото площадки без явной привязки** — можно сохранить как справочные
   материалы, но не привязывать к событию задним числом.

## Cron (после выкладки кода на MSK)

```cron
*/15 * * * * cd /opt/daibilet && node apps/worker/bin/run.mjs organizer-inbox >> /var/log/daibilet/organizer-inbox.log 2>&1
```

Env для сервиса (systemd `daibilet-worker` или crontab): `ORGANIZER_IMAP_USER=info@daibilet.ru`,
`ORGANIZER_IMAP_PASS=<app password>`, по умолчанию `ORGANIZER_IMAP_HOST=imap.timeweb.ru:993`.

## Код

- `scripts/lib/organizer-email-intake.js` — парсинг/матчинг (unit-тесты рядом)
- `scripts/ingest-organizer-emails.js` — IMAP fetch → staging
- `scripts/apply-organizer-email.js` — ревью → фото в каталог + опц. текст
