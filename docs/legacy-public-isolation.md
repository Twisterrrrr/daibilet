# Изоляция legacy `apps/public`

Дата решения: 2026-11-16.

## Зафиксированная граница

- Единственное активное публичное приложение — `apps/web` на Next.js.
- `apps/public` — замороженная Vite-копия. Она исключена из pnpm workspace, поэтому не участвует в recursive install/typecheck/build и не доступна через workspace-фильтр.
- Команды старого root-level public build/serve убраны; утилиты подготовки старых prototype-данных явно помечены `legacy:public:*`.
- `deploy/scripts/deploy-from-git.sh` и `deploy/scripts/deploy-staging.sh` теперь сразу завершаются с ошибкой, до чтения env, git checkout, миграций, rsync или рестарта. Использовать Next deploy scripts/workflows.
- Старые исходники остаются в Git как read-only архив для аудита/переноса; новые фичи сюда не добавлять.

Исключение каталога из workspace поддерживается штатным отрицательным glob `!apps/public` в `pnpm-workspace.yaml` ([pnpm workspace settings](https://pnpm.io/settings#packages)).

## Единственная оставшаяся техническая связь

`apps/web/scripts/sync-public-assets.mjs`, который запускает `apps/web` build, всё ещё может читать изображения из `apps/public/public/images`. Это временный read-only источник, не runtime импорт Vite-приложения. В image migration audit за 13.11 зафиксировано около 1 622 уникальных legacy-изображений; удалять их каталог или отключать sync до замены источника нельзя: Next build может потерять файлы, нужные на CI/production.

Перед полной физической изоляцией нужно:

1. Сформировать SHA-256 manifest этих legacy-only/различающихся изображений и связать его с архивом на Яндекс.Диске.
2. Определить, как CI получает необходимые сжатые изображения без доступа к пользовательскому диску: versioned artifact, объектное хранилище или отдельный deploy asset package.
3. Переключить `sync-public-assets.mjs` на этот источник и проверить сборку/предпросмотр через штатный CI/staging.
4. Перенести read-only audit/port скрипты на явный архивный путь или пометить снятыми с эксплуатации.
5. Только после проверки отключить sync из `apps/public`, затем удалить Vite-код и локальные копии изображений отдельным этапом.

До этих шагов `apps/public` не участвует в запуске и выкладке сайта, но остаётся хранилищем исходных изображений и исторического кода.

## Проверка после изменения

Проверить, что `pnpm install --frozen-lockfile` видит текущие пакеты без `@tours/public`, что CI собирает `apps/web`, а старые deploy-скрипты завершаются до любых побочных действий. Изменение этого контура само по себе не выкатывает production.
