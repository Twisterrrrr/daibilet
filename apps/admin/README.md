# Admin

Vite React админка, перенесенная с дизайн-слоя `SPBBOATS/packages/frontend-admin-v4`.

## Что скопировано из Admin V4

- Tailwind theme и CSS tokens.
- `AdminShell` и `AppSidebar`.
- shadcn/Lovable primitives: sidebar, button, card, badge, input, tooltip, sheet.
- Admin primitives: `PageHeader`, `FilterBar`, `QuickFilterBar`, `DataTableShell`, `StatusBadge`, `SourceBadge`, `InfoNote`.

## Что новое

- Локальный data adapter поверх `apps/admin/data.js`.
- Events Workbench на реальных TC full sync данных.
- Dashboard, Sources, Mapping, Venues, Landings, Cities в MVP-составе.
- Без auth и без backend API, пока работаем локально.

## Запуск

```bash
npm.cmd run admin:data
npm.cmd run admin:serve
```

URL:

```text
http://127.0.0.1:5176
```

## Проверка

```bash
npm.cmd --prefix apps/admin run typecheck
npm.cmd --prefix apps/admin run build
```

Зависимости временно подключены через junction на уже установленный `D:\coding\SPBBOATS\packages\frontend-admin-v4\node_modules`, чтобы не скачивать пакеты заново.

