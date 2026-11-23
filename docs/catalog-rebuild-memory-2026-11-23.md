# Catalog DTO rebuild: memory optimization handoff (INC.504.5)

Дата: 2026-11-23
Владелец реализации: **Codex** (`apps/backend`, `scripts/`, `packages/db`)
Диагностика: Cline (SSH `daibilet-msk-cline`)
Статус: техническое задание, ждёт взятия в работу

## Контекст

`daibilet-catalog-dto-rebuild.service` (oneshot, таймер раз в 8 мин) флапает:
ядро периодически убивает его `node` по **global_oom** (`CONSTRAINT_NONE`, не cgroup).
Кэш `/var/cache/public-catalog-dto.json` протухает на 25+ минут.

## Диагноз (факты)

- Пик RSS `node` при выборке + сериализации ~5000 сессий: **~3.2-4.0 ГБ**.
- Журнал OOM: `Out of memory: Killed process (node) ... anon-rss ~3.1-3.3 GB`.
- Основной объём — **C++ буферы вне V8 heap**: libpq (Prisma `$queryRaw`),
  разбор строк, `JSON.stringify` всего дерева DTO. Поэтому `--max-old-space-size`
  НЕ помогает (проверено эмпирически: пик остался ~4 ГБ, V8 heap не виноват).
- Хост 7.8 ГБ разделяет прод-API (~815 МБ) + **staging-API** (~90 МБ + своя память)
  + web + postgres + docker/libvips. Пик 4 ГБ пересбора + всё остальное = global_oom.

## Задача: снизить пик пересбора архитектурно, а не маскировать

Целевой пик RSS: **< 500-800 МБ** (сейчас ~4 ГБ). Без падения быстродействия
прогрева (сейчас успешный прогон ~27-40 с, 5004 сессии).

### Требования к реализации

1. **Пагинация/чанкинг выборки.** Вместо единого `findMany`/`$queryRaw` со всеми
   сессиями + индексами — батчами по 500-1000 событий/сессий с явным
   `getPublicCatalogSessions` по чанкам. Точка входа:
   `apps/backend/src/public-catalog.dto.ts` (`getPublicCatalogSessions`) и
   `scripts/rebuild-public-catalog-dto-cache.mjs`.

2. **Проекция полей (`select`).** На этапе публичного DTO выбирать только нужные
   колонки, не тянуть полные модели (контент/hero/вложенные связи), если они не
   попадают в итоговый снапшот. Убрать лишние `include`.

3. **Освобождение промежуточных структур.** Сбрасывать ссылки на обработанные
   чанки (`list.length = 0` / переназначение) и, при запуске с `--expose-gc`,
   вызывать `global.gc()` между чанками. Не держать в памяти одновременно
   сырые строки + DTO + v2-индексы.

4. **Инкрементальная сборка v2-индексов.** Писать индексы по чанкам в потоке
   (или в отдельный проход), не пересобирать всё дерево в ОЗУ целиком.

5. **Измеримость.** Добавить в лог пик RSS (`process.memoryUsage().rss`) по чанкам
   и итоговый пик, чтобы подтвердить < 800 МБ на проде.

### Критерии приёмки

- Ручной прогон `rebuild-public-catalog-dto-cache.mjs` на MSK: пик RSS < 800 МБ,
  завершение < 60 с, `sessions` не меньше текущих ~5000.
- `journalctl -k` за 24 ч после выката: **нет** `oom-kill` с
  `task_memcg=.../daibilet-catalog-dto-rebuild.service`.
- Кэш `var/cache/public-catalog-dto.json` обновляется стабильно каждые 8 мин,
  `hasIndexes=true`.

## Отдельные (не код пересбора) действия владельца

- **Изоляция стейджинга.** `daibilet-staging` (API+web) крутится на прод-хосте и
  отъедает гарантированно сотни МБ + фоновый CPU/диск. Перенести на отдельный
  сервер либо останавливать (`docker compose stop`), когда не нужен. Это снимает
  часть нагрузки с prod до выкатки фикса.
- **НЕ добавлять swap.** Сброс 3-4 ГБ буферов в swap даст thrashing и деградацию
  TTFB. `MemorySwapMax=1G` в `daibilet-catalog-dto-rebuild.service.d/memory.conf`
  оставляем как есть.
- **Опционально в юните** (не обязательно): `IOSchedulingClass=idle`, чтобы
  фоновый пересбор не душил API/web по I/O при работе. `Nice=15` уже есть.

## Связанное

- `docs/codex-api-catalog-latency-brief.md` (INC.504.5c — вынос пересбора в
  out-of-process worker).
- `deploy/systemd/daibilet-catalog-dto-rebuild.service` + `.service.d/memory.conf`
  (MemoryHigh=3G / MemoryMax=3500M / MemorySwapMax=1G).