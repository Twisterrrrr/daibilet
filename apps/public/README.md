# Public

Vite React public-каталог Дайбилета: главная, каталог, страницы событий, городов, площадок, лендингов и покупок.

## Локальный запуск

```bash
pnpm install
pnpm dev:public
```

URL:

```text
http://127.0.0.1:5178
```

## Проверка

```bash
pnpm --filter @daibilet/public typecheck
pnpm public:build
```

В production public собирается со значением `VITE_DAIBILET_API_URL=https://api.daibilet.ru`.
