# -*- coding: utf-8 -*-
import re
from pathlib import Path

CITY_NAMES = {
    "perm": "Пермь",
    "moscow": "Москва",
    "saint-petersburg": "Санкт-Петербург",
    "kaliningrad": "Калининград",
    "nizhny-novgorod": "Нижний Новгород",
    "ekaterinburg": "Екатеринбург",
    "kazan": "Казань",
    "samara": "Самара",
    "krasnodar": "Краснодар",
    "krasnoyarsk": "Красноярск",
    "novosibirsk": "Новосибирск",
    "voronezh": "Воронеж",
    "ufa": "Уфа",
    "omsk": "Омск",
    "chelyabinsk": "Челябинск",
    "tyumen": "Тюмень",
    "rostov-na-donu": "Ростов-на-Дону",
    "penza": "Пенза",
    "tver": "Тверь",
    "ryazan": "Рязань",
    "tula": "Тула",
    "smolensk": "Смоленск",
    "barnaul": "Барнаул",
    "sochi": "Сочи",
    "saratov": "Саратов",
    "yaroslavl": "Ярославль",
    "volgograd": "Волгоград",
}


def unquote(s: str) -> str:
    return s.replace("\\'", "'").replace("\\n", "\n")


def extract_seasons(block: str):
    m = re.search(r"seasons:\s*\[([\s\S]*?)\]\s*,\s*tabs:", block)
    if not m:
        return []
    body = m.group(1)
    item_re = re.compile(
        r"\{\s*id:\s*'([^']+)'\s*,\s*months:\s*\[([^\]]*)\]\s*,\s*"
        r"headline:\s*'((?:\\'|[^'])*)'\s*,\s*body:\s*'((?:\\'|[^'])*)'\s*,?\s*\}"
    )
    out = []
    for sm in item_re.finditer(body):
        out.append(
            {
                "id": sm.group(1),
                "months": re.sub(r"\s", "", sm.group(2)),
                "headline": unquote(sm.group(3)),
                "body": unquote(sm.group(4)),
            }
        )
    return out


def extract_tabs(block: str):
    tabs = []
    st = re.search(r"tabs:\s*seasonTabs\(\s*\{([\s\S]*?)\}\s*\)", block)
    if st:
        labels = {
            "spring": "Весна",
            "summer": "Лето",
            "autumn": "Осень",
            "winter": "Зима",
        }
        for km in re.finditer(r"(\w+):\s*'((?:\\'|[^'])*)'", st.group(1)):
            tabs.append(
                {
                    "id": km.group(1),
                    "label": labels.get(km.group(1), km.group(1)),
                    "body": unquote(km.group(2)),
                }
            )
        return tabs
    ta = re.search(r"tabs:\s*\[([\s\S]*?)\]\s*,?\s*\}\s*;", block)
    if ta:
        item_re = re.compile(
            r"\{\s*id:\s*'([^']+)'\s*,\s*label:\s*'((?:\\'|[^'])*)'\s*,\s*"
            r"body:\s*'((?:\\'|[^'])*)'\s*,?\s*\}"
        )
        for tm in item_re.finditer(ta.group(1)):
            tabs.append(
                {
                    "id": tm.group(1),
                    "label": unquote(tm.group(2)),
                    "body": unquote(tm.group(3)),
                }
            )
    return tabs


def extract_blocks(src: str, file: str):
    out = []
    re_block = re.compile(
        r"(?:export\s+)?const\s+([A-Z0-9_]+_WHEN_TO_GO)\s*"
        r"(?::\s*CityWhenToGoFlavor)?\s*=\s*\{([\s\S]*?)\n\};"
    )
    for m in re_block.finditer(src):
        full = "{" + m.group(2) + "\n};"
        tz_m = re.search(r"timeZone:\s*'([^']+)'", m.group(2))
        out.append(
            {
                "constName": m.group(1),
                "timeZone": tz_m.group(1) if tz_m else "",
                "seasons": extract_seasons(full),
                "tabs": extract_tabs(full),
                "file": file,
            }
        )
    return out


def main():
    files = [
        "apps/web/src/lib/city-hub-local-flavor.ts",
        "apps/web/src/lib/_flavor-sochi.fragment.ts",
        "apps/web/src/lib/_flavor-saratov.fragment.ts",
        "apps/web/src/lib/_flavor-yaroslavl.fragment.ts",
        "apps/web/src/lib/_flavor-volgograd.fragment.ts",
    ]
    all_cities = []
    for f in files:
        src = Path(f).read_text(encoding="utf-8")
        all_cities.extend(extract_blocks(src, f))

    main_src = Path("apps/web/src/lib/city-hub-local-flavor.ts").read_text(encoding="utf-8")
    slug_by_const = {}
    current_slug = None
    for line in main_src.splitlines():
        key_m = re.match(r"\s*(?:'([^']+)'|([a-z0-9-]+)):\s*\{", line)
        if key_m:
            current_slug = key_m.group(1) or key_m.group(2)
        when_m = re.search(r"whenToGo:\s*([A-Z0-9_]+_WHEN_TO_GO)", line)
        if when_m and current_slug:
            slug_by_const[when_m.group(1)] = current_slug

    lines = []
    lines.append("# Когда ехать - текущие тексты")
    lines.append("")
    lines.append(
        "Выгрузка из кода. Источник: `city-hub-local-flavor.ts` + `_flavor-*.fragment.ts`."
    )
    lines.append(f"Дата: 2026-09-21. Городов: **{len(all_cities)}**.")
    lines.append("")
    lines.append("## Оглавление")
    lines.append("")
    for c in all_cities:
        slug = slug_by_const.get(c["constName"], c["constName"])
        title = CITY_NAMES.get(slug, slug)
        lines.append(f"- [{title}](#{slug})")
    lines.append("")

    for c in all_cities:
        slug = slug_by_const.get(c["constName"], c["constName"].lower())
        title = CITY_NAMES.get(slug, slug)
        lines.append("---")
        lines.append("")
        lines.append(f"## {title}")
        lines.append("")
        lines.append(f"- slug: `{slug}`")
        lines.append(f"- const: `{c['constName']}`")
        lines.append(f"- file: `{c['file']}`")
        if c["timeZone"]:
            lines.append(f"- timeZone: `{c['timeZone']}`")
        lines.append("")
        lines.append("### Seasons (основной текст по сезону)")
        if not c["seasons"]:
            lines.append("_не распарсилось_")
        for se in c["seasons"]:
            lines.append("")
            lines.append(
                f"#### {se['headline']} (`{se['id']}`, месяцы {se['months']})"
            )
            lines.append("")
            lines.append(se["body"])
        lines.append("")
        lines.append("### Tabs (короткие подписи в виджете)")
        if not c["tabs"]:
            lines.append("_не распарсилось_")
        for t in c["tabs"]:
            lines.append("")
            lines.append(f"**{t['label']}** (`{t['id']}`)")
            lines.append("")
            lines.append(t["body"])
        lines.append("")

    out = Path("docs/when-to-go-texts.md")
    out.write_text("\n".join(lines), encoding="utf-8")
    print("OK", out, "bytes", out.stat().st_size)
    for c in all_cities:
        print(
            c["constName"],
            f"seasons={len(c['seasons'])}",
            f"tabs={len(c['tabs'])}",
            f"slug={slug_by_const.get(c['constName'], '?')}",
        )


if __name__ == "__main__":
    main()
