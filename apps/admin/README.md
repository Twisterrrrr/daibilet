# Admin

Vite React админка для операционной работы с каталогом, источниками, площадками, лендингами, заказами и покупателями.

## Локальный запуск

```bash
npm --prefix apps/admin install
npm run admin:serve
```

URL:

```text
http://127.0.0.1:5176
```

## Проверка

```bash
npm --prefix apps/admin run typecheck
npm run admin:build
```

В production админка собирается со значением `VITE_DAIBILET_API_URL=/api`, чтобы запросы шли через `admin.daibilet.ru/api` и попадали под basic auth.
