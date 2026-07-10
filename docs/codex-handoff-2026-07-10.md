# Codex / Cursor handoff — launch contour

Дата: **2026-07-10**  
Ветка: **`integrate/mvp-launch`** @ `09af701`

## Решения владельца / Codex

| Вопрос | Решение |
|--------|---------|
| Порядок | staging browser → tc:sync staging → checks → prod deploy → tc:sync prod → smoke |
| Prod runtime | **`server.js`**, не `start:ts`, не `DAIBILET_TS_*` |
| Backfill widgetUrl | **`tc:sync`** с token, не SQL первым |
| Staging DB | отдельная — до Phase 2, не блокер launch |
| Prod stash | `stash show -p` first, не discard вслепую |
| Parity / typed stack | после backfill, не blocker |
| Продажа | желательна, **не blocker** |

## Фаза 2 / marketplace

**На паузе.** Не трогать: YooKassa, Supplier LC, marketplace migrations, `packages/contracts`.

## Exit criteria (виджеты без продажи)

- health staging + prod
- `check:widgets` 4/4 на обоих
- browser: TC + TEP modal открываются
- нет critical JS errors (главная, каталог, event)
- `check:sync-invariants` без critical
- import guards (slug, HIDDEN, overrides)
- admin Sources без mock-as-real

## Реализовано в коде (09af701)

- `check:widgets`, `check:sync-invariants`, `tc-import-catalog.js`, ProviderLink sync
- `post-deploy-check.sh`, CI, deploy scripts

## Не закрыто

- Browser smoke (ручной/Playwright)
- Prod deploy latest
- tc:sync backfill (62613 offers legacy)
- Prod stash
- Отдельная staging DB

См. [phases/README.md](./phases/README.md)
