# Рерайты и фактические связи EventPage на staging — 2026-11-04

Сверка выполнена read-only непосредственно в `daibilet_staging` после staging deploy `8dbfa7dc5`. Production-БД напрямую не читалась и не изменялась; использована только сохранённая матрица production от 4 ноября. Изменений и публикаций не было.

## Фактические черновики и связи

| EventPage | EventPage ID | Связанный Event ID | Slug | Состояние |
|---|---|---|---|---|
| Новогодняя сказка: вечерний Петербург | `59da85e2-6f5d-4631-bc6c-916048021920` | `evt_6ae406ced3ffb1769732ac1f` | `novogodnyaya-skazka-vechernii-peterburg-sankt-peterburg` | DRAFT, noindex |
| Петровский Петербург — золотое кольцо от Петроградской стороны в мини-группе | `883e1088-13ba-4939-bb42-692fa03445ed` | `evt_6aa6e87d8747b2be059a9394` | `petrovskii-peterburg-zolotoe-kolco-ot-petrogradskoi-storony-v-mini-gruppe-sankt-peterburg` | DRAFT, noindex |
| Васса Железнова | `cc9f3cea-d804-4d45-abf1-cbdb6bdae091` | `evt_6ad4e50c24fe87fee52d12c4` | `vassa-zheleznova-sankt-peterburg` | DRAFT, noindex |

В staging обнаружено **3 EventPage, 3 записи EventPageEvent и 3 связанных Event ID**. В плане `eventpage-three-new-staging-drafts-2026-11-04.csv` перечислено **302 ID**, но к фактическим черновикам привязаны только три representative ID. Остальные **299 ID из плана не связаны в staging**. Это расхождение требует отдельного исправления/подтверждения перед переносом контента.

Ни один из трёх фактически связанных Event ID не найден в редакционном crosswalk. Значит, сейчас **нет рерайтов с доказанной связью** ни с одним из трёх staging-черновиков. Совпадения по названию не использовались.

## Редакционные источники

В worktree доступны: `batch-cline-30.md`, `batch-cline-nodesc.md`, `batch-30-event-descriptions.md`, `batch-30-tc-event-descriptions.md`, `batch-teplohod-active-2026-10-27.md`, `batch-ticketscloud-active-2026-10-27.md`. Из 60 ID с уникальным slug-кандидатом полный текст источника отсутствует для 34 ID: crosswalk содержит ID, но три соответствующих редакционных файла не найдены. Тело рерайта доступно для 26 ID: 18 Cline-текстов без оригинала в том же файле, 6 TEP текстов и 2 TC записи из активных пакетов. Для одного из двух TC нет итогового рерайта - он оставлен на редакторской паузе, поэтому реально готовых тел рерайта в доступных источниках 25.

`batch-30-event-descriptions.md` и `batch-30-tc-event-descriptions.md` помечены авторами как устаревшие выборки; использовать их как очередь переноса нельзя. В `batch-cline-30.md` и `batch-cline-nodesc.md` исходный текст отдельно не включён. Активные TEP/TC-пакеты содержат исходник и итоговый текст, но в самих файлах указано, что 9 TEP-описаний и одно TC-описание уже применялись к `EventOverride` в production; один TC текст поставлен на редакторскую паузу. Повторно применять их нельзя без проверки текущего production-текста и решения, как перенести оригинал на EventPage.

Три редакционных файла из прежнего crosswalk локально не найдены: `batch-30-empty-description-rewrites-2026-10-27.md`, `batch-30-empty-descriptions-2026-10-27.md`, `batch-next-empty-description-2026-10-27.md`. Для них остались только строки crosswalk без исходного тела текста.

## Кандидаты вне текущих staging-черновиков

Для 60 Event ID есть уникальный slug-кандидат в общей матрице, но это **не staging-связи**. Полный список — в `rewrite-eventpage-crosswalk-2026-11-04-staging-verified.csv`, фильтр `catalog_eventpage_candidate_unique=True`. 34 текста исходников отсутствуют, а 8 ID дублируются между старым пакетом и более поздним активным пакетом; выбирая текст, сверяйтесь с `rewrite_source_state`. Гастрольные карточки остаются отдельными городскими страницами; группировку по туру только по названию не делал.

В текущей crosswalk-выгрузке есть 235 строк. Поля `staging_link_verified`, `staging_eventpage_id` и `target_for_staging_rewrite` показывают только фактически проверенные staging-связи. Поля `catalog_eventpage_candidate_*` — кандидаты матрицы, они не доказывают существование или связь staging EventPage.

Никакие тексты в БД не записывались; оригиналы и текущие рерайты не перезаписывались. Перед будущей записью требуется для каждого связанного EventPage хранить источник/оригинал отдельно, а рерайт обозначать как активный editorial content.