#!/usr/bin/env python3
"""Build venue-content-manual.json from user transcript content + prod export."""
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROD_PATH = ROOT / "scripts/data/institution-venues-prod.json"
USER_CONTENT_PATH = Path(r"C:\Users\user\AppData\Local\Temp\user-venue-content.txt")
OUT_PATH = ROOT / "scripts/data/venue-content-manual.json"

SECTION_EMOJI = re.compile(
    r"[\U0001F300-\U0001FAFF][^\w«\"(.]*?(?=[A-Za-zА-Яа-я«\"(.])"
)
NOISE_TAIL = re.compile(
    r"(Вы сказали:|Google|Яндекс|Показать все|Something went wrong|"
    r"\d+\s+сайт(?:ов|а)?|Если (?:вам|у вас|хотите)|Присылайте|Как(?:ое|ую|ие)|"
    r"Ниже представлены|www\.|https?://).*$",
    re.I | re.S,
)
SKIP_TITLES = {
    "вы сказали",
    "something went wrong",
    "обратите внимание",
    "если вам нужно",
    "если хотите продолжить",
    "если у вас есть",
    "если у вас осталась",
    "присылайте следующую",
    "ниже представлены",
    "какое заведение",
    "какие описания",
    "google",
    "яндекс",
    "vkontakte",
    "sites",
    "сайтов",
}


def norm_key(value: str) -> str:
    return (
        str(value or "")
        .lower()
        .replace("ё", "е")
        .replace("«", "")
        .replace("»", "")
        .replace('"', "")
        .replace("'", "")
        .replace("`", "")
        .replace("—", "-")
        .replace("–", "-")
        .replace("№", " no ")
        .replace("/", " ")
    )


def clean_key(value: str) -> str:
    return re.sub(r"[^a-z0-9а-я]+", " ", norm_key(value)).strip()


def short_from_description(text: str, max_len: int = 220) -> str:
    clean = re.sub(r"\s+", " ", str(text or "")).strip()
    if len(clean) <= max_len:
        return clean
    parts = re.split(r"(?<=[.!?])\s+", clean)
    out = parts[0]
    if len(parts) > 1 and len(out) + 1 + len(parts[1]) <= max_len:
        out = f"{out} {parts[1]}"
    if len(out) > max_len:
        cut = out[:max_len]
        dot = cut.rfind(". ")
        out = cut[: dot + 1] if dot > max_len * 0.55 else f"{cut.rstrip()}…"
    return out.strip()


def parse_city_from_address(address: str) -> str | None:
    if not address:
        return None
    parts = [p.strip() for p in address.split(",") if p.strip()]
    if not parts:
        return None
    last = parts[-1]
    last = re.sub(r"\(.*?\)", "", last).strip()
    last = re.sub(r"\s*\(.*$", "", last).strip()
    if re.search(r"[а-яa-z]", last, re.I):
        return last
    return None


def strip_city_from_address(address: str, city: str | None) -> str:
    if not address:
        return address
    addr = address.strip().rstrip(".")
    if city:
        addr = re.sub(rf",\s*{re.escape(city)}\s*$", "", addr, flags=re.I)
        addr = re.sub(rf",\s*{re.escape(city)}\s*,.*$", "", addr, flags=re.I)
    addr = re.sub(r",\s*(Россия|Япония|Респ\..*?)$", "", addr, flags=re.I)
    addr = re.sub(r",\s*\d{5,6}\s*$", "", addr)
    return addr.strip().rstrip(",")


def split_aliases(title: str) -> list[str]:
    title = title.strip()
    if "/" in title:
        return [p.strip() for p in title.split("/") if p.strip()]
    return [title]


def should_skip_title(title: str) -> bool:
    t = clean_key(title)
    if len(t) < 2 or len(title) > 120:
        return True
    if " — " in title or "Вы сказали" in title:
        return True
    if any(x in t for x in SKIP_TITLES):
        return True
    if t.startswith("адрес исправлен") or t.startswith("адрес добавлен"):
        return True
    if re.match(r"^(концертные|клубы|музеи|театры|рестораны|бары|дворцы|легендарные|атмосферные|образование|трендовые|масштабные|премиум|интеллектуальные|историческое|культурные|музыкальные|транспортные|танцевальные|гастрономические|ивент)", t):
        return True
    if re.match(r"^(так,? раздобыл|органом|дские|телей|ов здесь|екте|ысканное|ста |напитков|я в концерт|6,? москва|онцертный|город |с\. я нашел|ганайская)", t):
        return True
    if title.endswith(")") and "(" not in title:
        return True
    if "нашел актуальные данные" in title.lower():
        return True
    return False


def cleanup_title(title: str) -> str:
    title = re.sub(r"\s+", " ", title).strip(" .")
    title = re.sub(r"^[\W\d_]+", "", title).strip()
    title = re.sub(r"^Обратите внимание.*?(?=\.)\.\s*", "", title, flags=re.I | re.S)
    title = re.sub(r"\(адрес (?:исправлен|добавлен)\)\.?$", "", title, flags=re.I).strip()
    return title.strip()


def cleanup_description(description: str) -> str:
    description = re.sub(r"\s+", " ", description).strip(" .")
    description = NOISE_TAIL.sub("", description).strip()
    description = re.sub(r"\(.*?(адрес исправлен|исправлен|адрес добавлен).*?\)", "", description, flags=re.I).strip()
    description = re.split(r"[\U0001F300-\U0001FAFF]", description)[0].strip()
    description = re.split(r"\bАдрес:", description)[0].strip()
    description = re.split(r'"', description)[0].strip()
    description = re.sub(
        r"\.[A-ZА-Яa-zа-я«\"(][^\.]{2,80}$",
        "",
        description,
    ).strip()
    return description.rstrip(" .")


def strip_noise(text: str) -> str:
    text = re.sub(r"\d+\s+сайт(?:ов|а)?.*?(?=Вы сказали:|$)", "", text, flags=re.I | re.S)
    text = re.sub(r"Google(?:\n|.)*?Показать все", "", text, flags=re.I | re.S)
    text = re.sub(r"Something went wrong.*?(?=Вы сказали:|$)", "", text, flags=re.I | re.S)
    return text


SECTION_PREFIXES = re.compile(
    r"^(?:"
    r"Концертные и культурные залы|Концертные площадки и рок-клубы|"
    r"Культурные центры и театры|Театры, культура и исторические пространства|"
    r"Музеи, культурные центры и выставочные залы|Рестораны и гастрономия|"
    r"Рестораны, клубы и бары|Концертные залы и ивент-площадки|"
    r"Клубы, музыкальные бары и пабы|Бары, пабы и ночная жизнь|"
    r"Масштабные концертные площадки|Трендовые концептуальные бары и пабы|"
    r"Дворцы культуры, театры и зрелищные центры|Легендарные рестораны|"
    r"Атмосферные бары, клубы и арт-пространства|Образование и гастрономия|"
    r"Премиум лаунж-пространства|Интеллектуальные пространства|"
    r"Танцевальные клубы и концертные бары|Историческое наследие|"
    r"Клубы и бары Санкт-Петербурга|Музыкальные бары и пабы в регионах|"
    r"Транспортные узлы|Театры, планетарии и музеи"
    r")",
    re.I,
)


def extract_title_before_marker(chunk: str) -> str:
    chunk = chunk.split('"')[-1]
    chunk = SECTION_EMOJI.sub("", chunk)
    chunk = re.sub(r"Обратите внимание[^.]*\.(?:\s*[^.]*\.)*", "", chunk, flags=re.S)
    chunk = re.sub(r"[А-Яа-яA-Za-z0-9\s\./,\-]+ — [^\.\"]{5,120}, [А-Яа-я\-]+", "", chunk)
    chunk = NOISE_TAIL.sub("", chunk)
    chunk = chunk.strip()
    if not chunk:
        return ""

    title = chunk.rsplit(".", 1)[-1] if "." in chunk else chunk
    title = cleanup_title(title[-180:])
    title = SECTION_PREFIXES.sub("", title).strip()
    return cleanup_title(title)


def store_item(out: dict[str, dict], title: str, address: str | None, description: str) -> None:
    title = cleanup_title(title)
    description = cleanup_description(description)
    if should_skip_title(title) or len(description) < 40:
        return

    city = parse_city_from_address(address) if address else None
    if address and city:
        address = strip_city_from_address(address.strip().rstrip("."), city)

    for alias in split_aliases(title):
        key = clean_key(alias)
        item = {
            "title": alias,
            "address": address,
            "city": city,
            "description": description,
        }
        if key not in out:
            out[key] = item
        elif len(description) > len(out[key].get("description") or ""):
            out[key] = {**out[key], **{k: v for k, v in item.items() if v}}


def normalize_address_line(rest: str) -> str:
    rest = rest.split('"')[0].strip()
    rest = re.split(r"[\U0001F300-\U0001FAFF]", rest)[0].strip()
    return rest


def parse_address_list(text: str) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for raw in re.split(r"[\r\n]+", text):
        line = raw.strip().lstrip(".")
        if " — " not in line:
            continue
        title, rest = line.split(" — ", 1)
        title = title.strip()
        if should_skip_title(title):
            continue
        if "адрес не указан" in rest.lower():
            continue
        rest = normalize_address_line(rest)
        parts = [p.strip() for p in rest.split(",") if p.strip()]
        city = parts[-1] if parts else None
        address = ", ".join(parts[:-1]) if len(parts) > 1 else rest.strip()
        for alias in split_aliases(title):
            out[clean_key(alias)] = {"title": alias, "address": address, "city": city}
    return out


def parse_structured_blocks(text: str) -> dict[str, dict]:
    out: dict[str, dict] = {}
    text = strip_noise(text)
    pattern = re.compile(
        r"Адрес:\s*(?P<address>.*?)\.\s*Описание:\s*(?P<description>.*?)(?=Адрес:|Вы сказали:|$)",
        re.S,
    )
    for m in pattern.finditer(text):
        chunk = text[max(0, m.start() - 600) : m.start()]
        title = extract_title_before_marker(chunk)
        store_item(out, title, m.group("address"), m.group("description"))
    return out


def peel_trailing_title(desc_chunk: str) -> tuple[str, str | None]:
    """Split `description.NextTitle` chunks from the intro section."""
    desc_chunk = desc_chunk.strip()
    m = re.search(r"^(.*)\.([A-Za-zА-Яа-я«\"(.][^\.]{1,180})$", desc_chunk, re.S)
    if not m:
        return desc_chunk, None
    tail = SECTION_EMOJI.sub("", m.group(2)).strip()
    tail = SECTION_PREFIXES.sub("", tail).strip()
    if not tail or len(tail.split()) > 14 or tail.endswith(",") or tail.endswith(")"):
        return desc_chunk, None
    if not re.match(r'^[A-Za-zА-Яа-я«"(]', tail):
        return desc_chunk, None
    return m.group(1).strip(), cleanup_title(tail)


def parse_simple_descriptions(text: str) -> dict[str, dict]:
    out: dict[str, dict] = {}
    intro = text.split("Вы сказали:", 1)[0]
    parts = re.split(r"Описание:\s*", intro)
    if len(parts) < 2:
        return out

    pending_title: str | None = None
    first_chunk = parts[0].strip()
    first_title_match = re.search(r"[\U0001F300-\U0001FAFF][^\w«\"(.]*(.+)$", first_chunk, re.S)
    if first_title_match:
        pending_title = cleanup_title(SECTION_PREFIXES.sub("", first_title_match.group(1)).strip())

    for idx in range(1, len(parts)):
        title = pending_title or extract_title_before_marker(parts[idx - 1])
        description, pending_title = peel_trailing_title(parts[idx])
        pending_title = pending_title or None
        if title and description and "Адрес:" not in title:
            store_item(out, title, None, description)
    return out


def merge_user_content(text: str) -> dict[str, dict]:
    address_map = parse_address_list(text)
    structured = parse_structured_blocks(text)
    simple = parse_simple_descriptions(text)

    merged: dict[str, dict] = {}
    for src in (address_map, simple, structured):
        for key, item in src.items():
            if key not in merged:
                merged[key] = dict(item)
                continue
            for field in ("title", "address", "city", "description"):
                if item.get(field) and not merged[key].get(field):
                    merged[key][field] = item[field]
            if item.get("description") and len(item["description"]) > len(merged[key].get("description") or ""):
                merged[key]["description"] = item["description"]
    return merged


def apply_manual_fixes(item: dict) -> None:
    title = item.get("title") or ""
    key = clean_key(title)

    if "владимирский дворец" in key or key.startswith("экскурсия"):
        item["city"] = "Санкт-Петербург"
        item["address"] = "Дворцовая набережная, 26"
        item.setdefault("match", [])
        for alias in ("экскурсия Владимирский дворец", "Владимирский дворец", "Дом ученых"):
            if alias not in item["match"]:
                item["match"].append(alias)

    if "arbat hall" in key or "арбат холл" in key:
        item["city"] = "Москва"
        item["address"] = "ул. Новый Арбат, 21"
        item.setdefault("match", [])
        for alias in ("Банкетный зал Arbat Hall", "Банкетный зал Арбат Холл", "Arbat Hall"):
            if alias not in item["match"]:
                item["match"].append(alias)

    if "лицеде" in key:
        item["city"] = "Санкт-Петербург"
        item["address"] = "ул. Льва Толстого, 9"

    if key == clean_key("Ресторан Максимилианс") and item.get("address") and "спартак" in item["address"].lower():
        item["city"] = "Казань"

    if "саунд" in key and "sound" in norm_key(title):
        item["city"] = "Санкт-Петербург"
        item["address"] = "Кожевенная линия, 40Б"
    elif key == clean_key("Клуб Саунд") or key == clean_key('Клуб «Саунд» (Sound)'):
        item["city"] = "Санкт-Петербург"
        item["address"] = "Кожевенная линия, 40Б"

    if key in {clean_key("Клуб чиж и компания"), clean_key("Life Pub"), clean_key("Клуб «Чиж и компания» / Life Pub")}:
        item["city"] = "Москва"
        item["address"] = "ул. Фридриха Энгельса, 20с1"

    if "сайдаш" in key:
        item["city"] = "Казань"
        item["address"] = "Свободы пл., 3"

    if "огни уфы" in key or "колизео" in key:
        item["title"] = "Огни Уфы"
        item["city"] = "Уфа"
        item["address"] = "ул. 50-летия Октября, 19"

    if "дворец культуры железнодорожников" in key and item.get("city") == "Тула":
        item["title"] = "Дворец культуры железнодорожников"

    if key == clean_key("ДК ЖД") or key == clean_key("Дворец культуры железнодорожников (Чита)"):
        item["title"] = "ДК ЖД"
        item["city"] = "Чита"
        item.setdefault("match", [])
        if "Дворец культуры железнодорожников (Чита)" not in item["match"]:
            item["match"].append("Дворец культуры железнодорожников (Чита)")

    if key == clean_key("Дворец культуры железнодорожников (Тула)"):
        item["title"] = "Дворец культуры железнодорожников"
        item["city"] = "Тула"

    if key == clean_key("ДК ЖЕЛЕЗНОДОРОЖНИКОВ") or key == clean_key("ДК Железнодорожников"):
        item["city"] = "Калининград"

    if key == clean_key("Buddha-Bar"):
        item["city"] = "Санкт-Петербург"
        item["address"] = "Синопская наб., 78"

    if key == clean_key("Огни Уфы") or key == clean_key('РК «Огни Уфы» (Колизео)'):
        item["title"] = "Огни Уфы"
        item["city"] = "Уфа"
        item["address"] = "ул. 50-летия Октября, 19"

    if item.get("city") and item.get("address"):
        item["address"] = strip_city_from_address(item["address"], item["city"])


GENERIC_TITLE_TOKENS = {
    "ресторан",
    "клуб",
    "бар",
    "дк",
    "дворец",
    "максимилианс",
    "театр",
    "музей",
    "центр",
    "кафе",
    "pub",
    "hall",
    "концерт",
    "пространство",
}


def distinctive_tokens(key: str) -> set[str]:
    return {t for t in clean_key(key).split() if len(t) > 2 and t not in GENERIC_TITLE_TOKENS}


def score_match(user_key: str, user_item: dict, venue: dict) -> float:
    prod_key = clean_key(venue["title"])
    if user_key == prod_key:
        return 100
    if prod_key in user_key or user_key in prod_key:
        score = 80
    else:
        ut = set(user_key.split())
        pt = set(prod_key.split())
        if not ut or not pt:
            return 0
        score = len(ut & pt) / max(len(ut), len(pt)) * 70

    if score < 80 and not (distinctive_tokens(user_key) & distinctive_tokens(prod_key)):
        return 0

    uc = clean_key(user_item.get("city") or "")
    pc = clean_key(venue.get("city") or "")
    if uc and pc:
        if uc == pc:
            score += 15
        elif uc in pc or pc in uc:
            score += 8
        else:
            score -= 25

    ua = clean_key(user_item.get("address") or "")
    pa = clean_key(venue.get("address") or "")
    if ua and pa:
        ua_tokens = {t for t in ua.split() if len(t) > 2}
        pa_tokens = {t for t in pa.split() if len(t) > 2}
        overlap = len(ua_tokens & pa_tokens)
        if overlap >= 2:
            score += 15
        elif overlap == 1:
            score += 8
        elif score < 90:
            score -= 15

    return score


def build_prod_aliases() -> dict[str, list[str]]:
    raw = {
        "экскурсия Владимирский дворец": ["экскурсия Владимирский дворец", "Экскурсия «Владимирский дворец» (Дом ученых)"],
        "Экскурсия «Владимирский дворец» (Дом ученых)": ["экскурсия Владимирский дворец"],
        "Банкетный зал Arbat Hall / Арбат Холл": ["Банкетный зал Arbat Hall", "Arbat Hall", "Банкетный зал Арбат Холл"],
        "Клуб «Чиж и компания» / Life Pub": ["Клуб чиж и компания", "Life Pub"],
        "РК «Огни Уфы» (Колизео)": ["Огни Уфы"],
        "Harat`s Pub": ["Harat`s pub"],
        "The Right Place (Правильное место)": ["The Right Place"],
        "Мята Lounge (на Ультрамариновой)": ["Мята Lounge"],
        "Ресторан «Максимилианс» (Новосибирск)": ["Максимилианс"],
        "Ресторан «Максимилианс» (Казань)": ["Ресторан Максимилианс"],
        "Ресторан «Максимилианс» (Красноярск)": ["Максимилианс"],
        "Ресторан «Максимилианс» (Тольятти)": ["Максимилианс"],
        "Ресторан «Максимилианс» (Тюмень)": ["Максимилианс"],
        "Ресторан «Максимилианс» (Челябинск)": ["Максимилианс"],
        "Ресторан «Максимилианс» (Набережные Челны)": ["Максимилианс"],
        "Ресторан «Максимилианс» (Екатеринбург)": ["Ресторан «Максимилианс»"],
        "Дворец культуры железнодорожников (Тула)": ["Дворец культуры железнодорожников"],
        "Дворец культуры железнодорожников (Чита)": ["ДК ЖД"],
        "ДК Железнодорожников": ["ДК ЖЕЛЕЗНОДОРОЖНИКОВ"],
        "Клуб «Саунд» (Sound)": ["Клуб Саунд"],
        "Железнодорожный вокзал (Владимир)": ["железнодорожный вокзал"],
        "ГОРТЕАТР (Новороссийский городской театр)": ["ГОРТЕАТР"],
        "Клуб «Биг Бен» (Big Ben)": ["Клуб Биг Бен"],
        "Клуб ОЗЗ (OZZ Underground)": ["Клуб ОЗЗ"],
        "Бар «Барan на корове»": ["Барan на корове"],
        "Бар «Гора»": ["«Гора» бар"],
        "Школа «Sushi Lover»": ["Школа Sushi Lover"],
        "Lounge MOЁT": ["Lounge MOЁТ"],
        "Лёвен (Löwen)": ["Лёвен"],
        "Бар Тринити (Trinity Irish Pub)": ["Бар Тринити"],
        "Хофбройхаус (Hofbräuhaus)": ["Хофбройхаус"],
        "Клуб «Ленинград»": ["Ленинград"],
        ". ABRIKOS ARENA": ["ABRIKOS ARENA"],
        "Nebar": ["Nebar"],
        "Свобода Концерт Холл": ["Свобода Концерт Холл"],
        "Концерт ХОЛЛ": ["Концерт ХОЛЛ"],
        "ГБУК РТ «Государственный Большой концертный зал имени Салиха Сайдашева»": ["ГБУК РТ"],
        "Пространство культуры «Часовой завод»": ['Пространство культуры "Часовой завод"'],
        "«Синий Пушкин» (бар Сергея Шнурова)": ['"Синий Пушкин" бар Шнурова'],
        "Малибу (ресторан-клуб)": ["Малибу, ресторан-клуб"],
        "Art club «Площадка»": ["Art club Площадка"],
        "КРЦ «Звезда»": ["КРЦ Звезда"],
        "Кафе | Бар | Караоке «СОНАТА»": ["Кафе | Бар | Караоке «СОНАТА»"],
        "Московский художественный театр комедии (МХТК)": ["Московский художественный театр комедии"],
        "Алькатрас (Alcatraz)": ["Алькатрас"],
        "Урбан (Urban)": ["Урбан"],
        "Agutin Music Bar (Владивосток)": ["Agutin Music Bar"],
        "Паб URBAN (Барнаул)": ["Паб URBAN"],
        "Ресторан-пивоварня «Макс Брой» (Владимир)": ["Ресторан-пивоварня Макс Брой"],
        "Железнодорожный вокзал (Владимир)": ["железнодорожный вокзал"],
        "Leps Bar": ["Leps Bar"],
        'Клуб "Route 148"': ['Клуб "Route 148"'],
        "ДК «Орбита»": ['ДК "Орбита"'],
        "ДК «Рубин»": ['ДК "Рубин"'],
        "ДК «Экспресс»": ["ДК Экспресс"],
        "Клуб «Ангар»": ['Клуб "Ангар"'],
        "Клуб «Космонавт»": ['Клуб "Космонавт"'],
        "Культурно-досуговый центр «Рассвет»": ['Культурно-досуговый центр "Рассвет"'],
        "Концертно-зрелищный центр «Миллениум»": ['Концертно-зрелищный центр "Миллениум"'],
        "Concert-Hall КИНО": ["Concert-Hall КИНО"],
        "Santa Monica stereo cafe": ["Santa Monica stereo cafe"],
        "Music Hall 27": ["Music Hall 27"],
        "City Hall": ["City Hall"],
        "POPRAVKA BAR": ["POPRAVKA BAR"],
        "Roof Place": ["Roof Place"],
        "Lounge Bar 1/2 of You НЕВСКИЙ": ["Lounge Bar 1/2 of You НЕВСКИЙ"],
        "Machine Head Club": ["Machine Head Club"],
        "ДОМ ПЕЧАТИ": ["ДОМ ПЕЧАТИ"],
        "Почаина. Летняя сцена": ["Почаина. Летняя сцена"],
        "Книжный клуб «Наследие»": ["Книжный клуб Наследие"],
        "Зоотеатр кошек в ТРК «Седанка Сити»": ['Зоотеатр кошек в ТРК "Седанка Сити"'],
        "Дворец Молодежи (бывш. «Гигант»)": ["Дворец Молодежи (бывш. ГИГАНТ)"],
        "Дворец культуры профсоюзов (Хабаровск)": ["Дворец культуры профсоюзов"],
        "Дворец культуры профсоюзов Приморского края": ["Дворец культуры профсоюзов Приморского края"],
        "Музыкальный ресторан «Джекилл»": ["Музыкальный ресторан «Джекилл»"],
        "Ресторан Cherish": ["Ресторан Cherish"],
        "бар-ресторан Douglas (Дуглас)": ["бар-ресторан Douglas (Дуглас)"],
        "Бар SUMBUR": ["Бар SUMBUR"],
        "Бар «Сплетни»": ["Бар Сплетни"],
        "Сплетни Бар by Anna Asty": ["Сплетни Бар by Anna Asty"],
        "Бар «Без Названия»": ["Бар Без Названия"],
        "Пена Паб": ["Пена Паб"],
        "Buddha-Bar": ["Buddha-Bar"],
        "Barrock": ["Barrock"],
        "Arena Hall": ["Arena Hall"],
        "MILO Concert Hall": ["MILO Concert Hall"],
        "KИНОФАКТУРА": ["КИНОФАКТУРА"],
        "КИНОФАКТУРА": ["КИНОФАКТУРА"],
        "WERK": ["WERK"],
        "Евгенич": ["Евгенич"],
        "Гримерка": ["Гримерка"],
        "БАУНС (Bounce)": ["БАУНС"],
        "БАУНС": ["БАУНС"],
        "Интегративный джазовый центр": ["Интегративный джазовый центр"],
        "Свобода": ["Свобода"],
        "Руки ВВерх! Бар": ["Руки ВВерх! Бар"],
        "Lounge MOЁT": ["Lounge MOЁT"],
        "Lounge MOЁТ": ["Lounge MOЁT"],
        "Nebar": ["Nebar"],
    }
    return {clean_key(k): v for k, v in raw.items()}


def find_prod_match(user_item: dict, prod: list[dict], used_ids: set[str], prod_aliases: dict) -> dict | None:
    keys = [clean_key(user_item.get("title"))]
    for alias in user_item.get("match") or []:
        keys.append(clean_key(alias))
    for key in list(keys):
        if key in prod_aliases:
            keys.extend(clean_key(a) for a in prod_aliases[key])

    best = None
    best_score = 0
    for venue in prod:
        if venue["id"] in used_ids:
            continue
        for key in keys:
            s = score_match(key, user_item, venue)
            if s > best_score:
                best_score = s
                best = venue
    if best_score >= 45:
        return best
    return None


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    text = USER_CONTENT_PATH.read_text(encoding="utf-8")
    prod = json.loads(PROD_PATH.read_text(encoding="utf-8"))
    user_items = merge_user_content(text)

    address_keys = {k for k, v in user_items.items() if not v.get("description")}
    expanded: dict[str, dict] = {}
    for key, item in user_items.items():
        if not item.get("description"):
            continue
        if should_skip_title(item.get("title", "")):
            continue
        apply_manual_fixes(item)
        expanded[key] = item
        for alias in split_aliases(item.get("title", "")):
            ak = clean_key(alias)
            if ak not in expanded:
                clone = dict(item)
                clone["title"] = alias
                apply_manual_fixes(clone)
                expanded[ak] = clone

    # Prefer canonical address-list titles when the same description was parsed with a broken title.
    by_desc: dict[str, str] = {}
    for key, item in list(expanded.items()):
        desc_key = clean_key(item["description"][:120])
        prev = by_desc.get(desc_key)
        if prev is None:
            by_desc[desc_key] = key
            continue
        prev_item = expanded[prev]
        prev_has_addr = clean_key(prev_item.get("title", "")) in address_keys or prev_item.get("city")
        cur_has_addr = key in address_keys or item.get("city")
        if cur_has_addr and not prev_has_addr:
            del expanded[prev]
            by_desc[desc_key] = key
        elif prev_has_addr:
            del expanded[key]

    prod_aliases = build_prod_aliases()
    used_ids: set[str] = set()
    venues_out = []
    unmatched = []

    seen_keys: set[str] = set()
    for key, item in sorted(expanded.items(), key=lambda x: x[1].get("title", "")):
        if not item.get("description"):
            continue
        if key in seen_keys:
            continue
        prod_match = find_prod_match(item, prod, used_ids, prod_aliases)
        if not prod_match:
            unmatched.append(item.get("title") or key)
            continue
        used_ids.add(prod_match["id"])
        seen_keys.add(key)

        city = item.get("city") or prod_match.get("city")
        address = item.get("address") or prod_match.get("address")
        if city and address:
            address = strip_city_from_address(address, city)

        entry = {
            "id": prod_match["id"],
            "title": prod_match["title"],
            "city": city,
            "address": address,
            "description": item["description"],
            "shortDescription": short_from_description(item["description"]),
        }
        match_keys = []
        for alias in split_aliases(item.get("title", "")):
            if clean_key(alias) != clean_key(prod_match["title"]):
                match_keys.append(alias)
        for alias in item.get("match") or []:
            if alias not in match_keys:
                match_keys.append(alias)
        if match_keys:
            entry["match"] = sorted(set(match_keys))
        venues_out.append(entry)

    still_unmatched = []
    for title in unmatched:
        item = next(
            (v for k, v in expanded.items() if (v.get("title") or k) == title or clean_key(v.get("title", "")) == clean_key(title)),
            None,
        )
        if not item:
            still_unmatched.append(title)
            continue
        best = None
        best_score = 0
        for venue in prod:
            if venue["id"] in used_ids:
                continue
            s = score_match(clean_key(item.get("title", "")), item, venue)
            if s > best_score:
                best_score = s
                best = venue
        if best and best_score >= 35:
            used_ids.add(best["id"])
            city = item.get("city") or best.get("city")
            address = item.get("address") or best.get("address")
            if city and address:
                address = strip_city_from_address(address, city)
            venues_out.append(
                {
                    "id": best["id"],
                    "title": best["title"],
                    "city": city,
                    "address": address,
                    "description": item["description"],
                    "shortDescription": short_from_description(item["description"]),
                    **({"match": [item["title"]]} if clean_key(item["title"]) != clean_key(best["title"]) else {}),
                }
            )
        else:
            still_unmatched.append(item.get("title") or title)

    venues_out.sort(key=lambda x: x["title"].lower())

    result = {
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "venues": venues_out,
    }
    OUT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    with_desc = sum(1 for v in user_items.values() if v.get("description"))
    print(f"Parsed {with_desc} user descriptions, wrote {len(venues_out)} venues to {OUT_PATH}")
    print(f"Unmatched user titles ({len(still_unmatched)}):")
    for name in still_unmatched:
        print(f"  - {name}")


if __name__ == "__main__":
    main()
