# ADR: город по геолокации на визит

**Статус:** принято (обновлено 2026-09-03)  
**Контекст:** UX.LOC D3, city gate на `/events` и `/podborki`

## Решение

Home (`/`) **не** ждёт GPS перед показом города: cookie/`localStorage` сразу, чтобы рельсы не мигали «все города». SSR каталога главной берёт тот же cookie-город. GPS на `/` **не** перебивает уже показанный город (иначе рельсы дёргаются после загрузки). На каталожных индексах GPS по-прежнему может перебить stale storage.

На **каталожных индексах** (`/events`, `/podborki`, `/places`, …) в новой вкладке, если нет явного `?city=` / хаб-роута / лендинга с городом:

1. Запрашиваем `navigator.geolocation` на **всех** viewport (mobile + desktop).
2. Ближайший каталожный город в радиусе **80 км** применяем **молча** в шапку и `localStorage`.
3. **GPS перебивает stale storage** (например Москва в localStorage при фактическом визите в СПб).
4. До завершения geo-попытки storage **не** подмешиваем в шапку и `?city=` на `/events`.
5. Модалку «Ваш город?» не показываем - смена в шапке.

### Fallback

- Отказ / нет GPS / далеко от хаба → город из `localStorage`, иначе «Все города».
- Повтор в той же вкладке: только storage / URL / хаб (session flag `daibilet:geo-session-attempt`).

## Исключения

Не запускаем гео на: `/admin`, `/checkout`, `/login`, `/account`.

## Поведение каталога

Пока идёт session geo-попытка, city gate на `/events` и `/podborki` **не показываем** (`geoBootstrapPending`).

## Мобильная адаптация (Вебмастер)

Явный `viewport` в `app/layout.tsx` (`width=device-width`, `initialScale: 1`). После правок - переобход в Вебмастере.

## Ограничения

- Точность: центры городов в `city-map-coords`.
- VPN / неточный GPS → неверный город; пользователь меняет в шапке.
- Desktop: системный prompt геолокации при первом визите в вкладке.

## Файлы

- `apps/web/src/lib/first-visit-city.ts`
- `apps/web/src/components/SelectedCityProvider.client.tsx`
- `CatalogShell.client.tsx`, `LandingsCatalogView.client.tsx`
- `apps/web/app/layout.tsx`
