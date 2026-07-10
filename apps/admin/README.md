# Admin

Vite React админка для операционной работы с каталогом, источниками, площадками, лендингами, заказами и покупателями.

## Локальный запуск

```bash
pnpm install
pnpm dev:admin
```

URL:

```text
http://127.0.0.1:5176
```

## Проверка

```bash
pnpm --filter @daibilet/admin typecheck
pnpm admin:build
```

В production админка собирается со значением `VITE_DAIBILET_API_URL=/api`, чтобы запросы шли через `admin.daibilet.ru/api` и попадали под basic auth.
