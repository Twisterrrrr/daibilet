# Миграция prod: СПб → МСК

**Дата снимка:** 2026-07-29 · **Статус cutover:** 2026-07-30 ✅  
**Цель:** перенести живой prod с Timeweb СПб на Timeweb МСК (Friendly Pheasant) без длительного даунтайма.

Связанные документы: [current-state.md](./current-state.md), [Diary.md](./Diary.md), [Tasktracker.md](./Tasktracker.md), [spb-finance-host.md](./spb-finance-host.md).

### Текущее (после MIG.7/MIG.8, 2026-07-30)

| Роль | IP | Факт |
|------|-----|------|
| **Battle catalog (МСК)** | `201.24.125.184` | Apex DNS `daibilet.ru` / `www` → сюда; TLS+PG+web/api live |
| **Leftover СПб 4 ГБ** | `213.171.7.16` | Public web/api сняты; **build/reserve** до MIG.9.4/.9.6 → retire (не apex DNS) |
| **Battle finance (СПб 8 ГБ)** | `85.193.80.159` | `pay` / `supplier` / `finance-api` DNS+TLS ✅ |

Исторический снимок 2026-07-29 ниже сохранён как audit trail (на момент снимка apex ещё указывал на `.16`).

---

## Серверы (факт на 2026-07-29) - snapshot

| Роль | Хост | IP | SSH | Статус (на дату снимка) |
|------|------|-----|-----|--------|
| **Prod live (СПб)** | `6726557-ls758282.twc1.net` | `213.171.7.16` | `root` + `%USERPROFILE%\.ssh\daibilet_staging_key` | *тогда* DNS apex → сюда; стек полный · **сейчас** leftover build/reserve |
| **Цель (МСК)** | `msk-1-vm-5a5i` | `201.24.125.184` | `ssh daibilet-msk` (`daibilet_msk80_key`) | *тогда* SSH OK; код есть; БД/TLS нет · **сейчас** battle catalog + apex DNS |
| ~~Старый МСК IP~~ | - | ~~`81.19.135.200`~~ | - | Снят: снаружи TCP 22 был `filtered` (TSPU/путь); IP заменён |

Локальный SSH alias (клиент):

```text
Host daibilet-msk msk
    HostName 201.24.125.184
    User root
    IdentityFile ~/.ssh/daibilet_msk80_key
    IdentitiesOnly yes
```

---

## Снимок СПб (источник)

| Параметр | Значение |
|----------|----------|
| Git `/opt/daibilet` | `618fdd6` на `feat/next-monorepo` |
| RAM / disk | 3.8 Gi · `/` 49G ~55% used |
| Services | `daibilet-web`, `daibilet-api`, `nginx`, `docker` active |
| Ports | `:80`, `:443`, `127.0.0.1:4000`, `*:3001`, Docker PG `:5437` |
| Postgres | контейнер `daibilet-tours-postgres` (`postgres:17-alpine`), healthy |
| Public | `https://daibilet.ru` → 200 |
| Cron | `daibilet-tc-catalog-sync.timer` active (nightly) |

---

## Снимок МСК (цель)

| Параметр | Значение |
|----------|----------|
| Git `/opt/daibilet` | `8588ccf` (отстаёт от prod) |
| RAM / disk | **7.8 Gi** · `/` 77G ~8% used |
| Services | `daibilet-web`, `daibilet-api`, `nginx`, `docker` active |
| Ports | `:80`, `127.0.0.1:4000`, `*:3001` · **нет `:443`, нет `:5437`** |
| Postgres | контейнеров нет (`docker ps` пуст) |
| TLS | нет `/etc/letsencrypt/live` |
| Local smoke | web `:3001` → 200; API stats → **500** (ожидаемо без БД); nginx `:80` Host daibilet.ru → 200 |
| cloud-init | `DataSourceNoCloud [seed=/dev/vda]` (Ubuntu 24.04) |

Вывод: МСК - тёплый standby (Next/API/nginx уже подняты), но **не готов принять трафик** без Postgres + миграции данных + TLS + pull до текущего HEAD + DNS.

---

## Почему меняли IP МСК

1. На `81.19.135.200` ICMP проходил, TCP 22 с дома и LTE = `filtered` / timeout.
2. В guest: sshd на `:22`, ufw off, iptables INPUT ACCEPT, fail2ban нет.
3. `tcpdump -ni eth0 'tcp port 22'` во время внешних проб = **0 packets** → фильтр до NIC.
4. Timeweb: смена публичного IP; после привязки `201.24.125.184` на eth0 SSH и ключ `daibilet_msk80_key` работают.

---

## План cutover (чеклист)

### A. Подготовка МСК (без DNS)

1. ⏳ Поднять Postgres (как на СПб: Docker `postgres:17-alpine` → host `:5437`) + volume.
2. ⏳ Скопировать `.env` / секреты со СПб (не коммитить); поправить `DATABASE_URL` на localhost МСК.
3. ⏳ Dump/restore БД со СПб (`pg_dump` / `pg_restore` или `pg_dump | psql`).
4. ⏳ `git fetch` + checkout `feat/next-monorepo` на SHA prod (сейчас цель ≥ `618fdd6` / origin HEAD).
5. ⏳ `pnpm install` / `db:deploy` / `deploy-prod-next` (или эквивалент) · heap/OOM: на МСК 7.8 Gi - запас лучше, чем на СПб.
6. ⏳ Сертификат: certbot / Timeweb SSL на `daibilet.ru` + `www` **до** или в момент DNS (вариант: сначала IP-only smoke по `/etc/hosts`).
7. ⏳ nginx: parity с СПб (443, www→apex, admin host rewrite, proxy timeouts).
8. ⏳ Timers/cron: `tc-catalog-sync`, audit и т.д.
9. ⏳ Локальный smoke на МСК: `/`, `/events`, виджеты, admin Basic Auth, API stats ≠ 500.

### B. Cutover DNS

1. ✅ TTL заранее снизить (если ещё не низкий).
2. ✅ A-записи `daibilet.ru` / `www` → `201.24.125.184` (MIG.7, 2026-07-30).
3. ✅ Проверка снаружи: HTTPS 200 post-cutover (см. Tasktracker MIG.7).
4. ✅ СПб public снят (MIG.8); IP `.16` оставлен как build/reserve до finance smoke (MIG.9.4/.9.6), не удалять сразу.

### C. После стабилизации

1. ✅ Обновить docs (`current-state.md`) - prod IP = МСК.
2. ⏳ Обновить deploy-скрипты/CI secrets, если захардкожен `213.171.7.16`.
3. ✅ MIG.8 (2026-07-30): СПб public web/api + TC timer + crontab catalog/orders sync сняты; PG snapshot в `/root/backups/`; `.16` = leftover build/reserve ([spb-finance-host.md](./spb-finance-host.md)). IP СПб не удалять до MIG.9.7.
4. ⏳ Отвязать старый floating IP `81.19.135.200` в панели при необходимости.

---

## Риски

| Риск | Митигация |
|------|-----------|
| Долгий dump/restore | `pg_dump -Fc`, измеренный dry-run; окно ночью |
| Расхождение SHA | МСК сначала догнать до prod HEAD, потом DNS |
| TLS до DNS | `/etc/hosts` smoke или DNS-01 / временный cert |
| Потеря заказов в окне | короткий TTL + freeze записей / read-only API на СПб на время dump |
| Старый IP МСК снова «залипнет» в доках/скриптах | grep по `81.19.135.200` / `213.171.7.16` после cutover |

---

## Явно не делать в первом коммите миграции

- Не переключать DNS, пока API на МСК отдаёт 500.
- Не удалять СПб-диск/IP в день cutover.
- Не коммитить `.env` / дампы БД в git.
