# Public

Vite React public-каталог Дайбилета: главная, каталог, страницы событий, городов, площадок, лендингов и покупок.

## Локальный запуск

```bash
npm --prefix apps/public install
npm run public:serve
```

URL:

```text
http://127.0.0.1:5178
```

## Проверка

```bash
npm --prefix apps/public run typecheck
npm run public:build
```

В production public собирается со значением `VITE_DAIBILET_API_URL=https://api.daibilet.ru`.
