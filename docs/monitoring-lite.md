# Monitoring Lite

Дата: 2026-07-13.

Цель: в первые дни продаж иметь простой read-only контроль, не внедряя тяжелый мониторинг.

## Команда

Локально:

```bash
pnpm monitor:lite -- --skip-admin
```

Production:

```bash
PUBLIC_BASE_URL=https://daibilet.ru \
API_BASE_URL=https://api.daibilet.ru \
ADMIN_BASE_URL=https://api.daibilet.ru \
ADMIN_EMAIL=admin@daibilet.ru \
ADMIN_PASSWORD='<password>' \
pnpm monitor:lite
```

JSON для внешнего runner:

```bash
pnpm monitor:lite -- --json
```

## Что Проверяет

- backend `/api/health`;
- public `/api/public/stats`;
- public `/api/public/events?limit=1`;
- API alias `/api/public/stats` на `api.daibilet.ru`;
- admin Sources freshness, если переданы credentials;
- response time budgets:
  - stats warning выше 500 ms;
  - catalog sample warning выше 1500 ms.

## Fail

Скрипт падает, если:

- backend health не отвечает;
- events/venues/destinations равны 0;
- catalog sample пустой;
- первая карточка не purchase-ready;
- public API alias не работает;
- source health stale/error и не передан `--allow-stale-sources`.

## Warning

Warnings не роняют процесс:

- медленный stats/catalog;
- admin credentials не переданы;
- source stale при `--allow-stale-sources`.

## Режим В Первые Сутки

После запуска:

```bash
pnpm monitor:lite
```

Периодичность руками:

- сразу после деплоя;
- после fresh sync TC;
- после fresh sync Teplohod;
- после первой тестовой покупки;
- каждые 1-2 часа в первые сутки.

Позже можно повесить cron:

```cron
*/15 * * * * cd /opt/daibilet && /usr/bin/pnpm monitor:lite -- --json >> /var/log/daibilet-monitor.log 2>&1
```

## Что Делать При Fail

1. Проверить `systemctl status daibilet-api daibilet-public`.
2. Проверить `journalctl -u daibilet-api -n 100`.
3. Проверить `journalctl -u daibilet-public -n 100`.
4. Если stats/catalog равны 0, не трогать public UI, сначала проверить БД и sync.
5. Если stale source, прогнать fresh sync и затем `acceptance:catalog`.
6. Если виджет не открывается, проверить provider env и конкретный event detail payload.
