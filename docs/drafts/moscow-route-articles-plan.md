# Москва: тематические статьи к сценариям «Мой день»

Дата: 2026-08-07  
Статус: CTA wiring ✅; articles msk-2…5 - очередь (после seed/images)

Пять companion-гидов по шаблону СПб (`docs/drafts/spb-route-articles-plan.md`). Формат - городской гид с хронометражем дня, мягкий CTA в `/my-day?city=moscow` и хаб `/cities/moscow`. Поле `blogSlug` уже проставлено на `dayRoutePresets` (UI ссылка «Читать гид» работает; 404 пока статьи нет).

| Сценарий | Статья | URL | Статус |
|---|---|---|---|
| Парадный центр / Красная площадь | «Что посмотреть в Москве за 2 дня…» | `/blog/moscow-2-dnya-samostoyatelno-marshrut` | PUBLISHED (companion `msk-1`) |
| Замоскворечье и Третьяковка | «Замоскворечье и Третьяковка за день» | `/blog/moscow-zamoskvoreche-tretyakovka` | план (CTA wired) |
| ВДНХ и космос | «ВДНХ и космос: север Москвы за день» | `/blog/moscow-vdnh-kosmos-den` | план (CTA wired) |
| Воробьевы горы и Сити | «Воробьевы горы, Новодевичий и Сити» | `/blog/moscow-vorobevy-gory-siti` | план (CTA wired) |
| Коломенское и Царицыно | «Южные усадьбы: Коломенское и Царицыно» | `/blog/moscow-kolomenskoe-tsaritsyno` | план (CTA wired) |

Каждая новая статья: уникальный cover + 1-2 inline (`GenerateImage` → `apps/public/public/images/blog/`), статус `PUBLISHED` только с файлами на диске, ссылки на `/cities/moscow` и `/my-day?city=moscow`.

## Следующая очередь (не блокирует hub pack)

1. Написать + cover/inline для msk-2…msk-5 (4 статьи).
2. Сергиев Посад на целый день.
3. Коломна: кремль и пастила.
4. Императорский уикенд: Архангельское + Звенигород.
5. Owner gastro list для chip «Гастрономические точки».
