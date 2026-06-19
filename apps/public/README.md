# Public

Vite React public-каталог на данных Ticketscloud full sync.

## Что перенесено из старого frontend

- Tailwind config и `globals.css`.
- Header-композиция: sticky topbar, логотип, навигация, город, поиск, иконки.
- `container-page`, `btn-primary`, `btn-secondary`, `card` utility layer.
- EventCard-паттерн: image area, gradient overlay, бейджи, цена, город, теги, hover-scale.
- Landing-card и quick-buy table паттерны.

## Запуск

```bash
npm.cmd run public:data
npm.cmd run public:build
npm.cmd run public:serve
```

URL:

```text
http://127.0.0.1:5173
```

`public:serve` сейчас запускает preview из `dist`, потому что dev-режим через внешний Vite toolchain нестабилен в этой локальной связке. Для текущего визуального просмотра preview надежнее.

