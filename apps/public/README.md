# Legacy public (Vite)

Этот каталог сохранён как архив исходников старого публичного приложения.
Единственный активный public runtime — `apps/web` (Next.js).

- `apps/public` исключён из pnpm workspace и рекурсивных build/typecheck задач.
- Старые Vite deploy-скрипты закрыты; production и staging обслуживаются Next.
- Исходники и ассеты здесь не редактировать и не собирать для публикации.
- `apps/public/public/images` пока остаётся только read-only источником для
  переходной миграции ассетов, вызываемой из `apps/web/scripts/sync-public-assets.mjs`.
  Удалять его можно после отдельной сверки ассетов и перевода сборки на
  самостоятельный архив изображений.

Решение и оставшиеся шаги: [`docs/legacy-public-isolation.md`](../../docs/legacy-public-isolation.md).
