# ADR: город по геолокации на первом визите

**Статус:** принято (2026-09-01)  
**Контекст:** UX.LOC D3, city gate на `/events` и `/podborki`

## Решение

На **первом визите** без сохранённого города в storage:

### Mobile (viewport ≤ 1023px)

1. Один раз запрашиваем `navigator.geolocation` (системный prompt ОС) на **любой** странице каталога, включая `/events` и `/podborki`.
2. Ближайший каталожный город в радиусе **80 км** применяем **молча** в шапку и `localStorage`.
3. Модалку «Ваш город?» не показываем - смена в шапке.

### Desktop

1. Модалку confirm только если geolocation **уже разрешён** (без surprise-prompt).
2. Иначе - «Выберите город» / picker в шапке; на `/events` и `/podborki` - city gate.

### Общее

- Отказ / нет GPS / далеко от хаба → «Все города»; повторно не спрашиваем (`markCityPromptCompleted`).
- Повторные визиты: только storage / URL / хаб-роут.

## Исключения

Не запускаем гео на: `/admin`, `/checkout`, `/login`, `/account`.

## Поведение каталога (mobile)

Пока идёт первая geo-попытка, city gate на `/events` и `/podborki` **не показываем** (`geoBootstrapPending`).

## Ограничения

- Точность: центры городов в `city-map-coords`.
- VPN / неточный GPS → неверный город; пользователь меняет в шапке.

## Файлы

- `apps/web/src/lib/first-visit-city.ts`
- `apps/web/src/components/SelectedCityProvider.client.tsx`
- `CatalogShell.client.tsx`, `LandingsCatalogView.client.tsx`
