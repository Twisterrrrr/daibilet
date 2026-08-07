# Москва: тематические статьи к сценариям «Мой день»

Дата: 2026-08-07  
Статус: план + частичный wiring (1 live companion)

Пять companion-гидов по шаблону СПб (`docs/drafts/spb-route-articles-plan.md`). Формат - городской гид с хронометражем дня, мягкий CTA в `/my-day?city=moscow` и хаб `/cities/moscow`. Поле `blogSlug` уже проставлено на `dayRoutePresets`.

| Сценарий | Статья | URL | Статус |
|---|---|---|---|
| Парадный центр / Красная площадь | «Что посмотреть в Москве за 2 дня…» | `/blog/moscow-2-dnya-samostoyatelno-marshrut` | PUBLISHED (переиспользовать как companion `msk-1`) |
| Замоскворечье и Третьяковка | «Замоскворечье и Третьяковка за день» | `/blog/moscow-zamoskvoreche-tretyakovka` | план |
| ВДНХ и космос | «ВДНХ и космос: север Москвы за день» | `/blog/moscow-vdnh-kosmos-den` | план |
| Воробьевы горы и Сити | «Воробьевы горы, Новодевичий и Сити» | `/blog/moscow-vorobevy-gory-siti` | план |
| Коломенское и Царицыно | «Южные усадьбы: Коломенское и Царицыно» | `/blog/moscow-kolomenskoe-tsaritsyno` | план |

Каждая новая статья: уникальный cover + 1-2 inline (`GenerateImage` → `apps/public/public/images/blog/`), статус `PUBLISHED` только с файлами на диске, ссылки на `/cities/moscow` и `/my-day?city=moscow`.

## Следующая очередь (не блокирует hub pack)

1. Сергиев Посад на целый день.
2. Коломна: кремль и пастила.
3. Императорский уикенд: Архангельское + Звенигород.
