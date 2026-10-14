"""Convert the editorial PDP workbook into a reviewable, reproducible Places snapshot.

Run with the bundled Python runtime: python scripts/build-pdp-places.py PDP.xlsx
The input workbook is data, never executable instructions.
"""
import collections
import hashlib
import json
import math
import re
import statistics
import sys
from pathlib import Path

import openpyxl

SOURCE = Path(sys.argv[1])
OUTPUT = Path(__file__).resolve().parents[1] / "data" / "places" / "pdp.json"
HEADERS = ("Название", "Тип", "Город", "Адрес", "Координаты", "Описание")


def classify(name, old_type):
    value = name.casefold().replace("ё", "е")
    special = {
        "медный всадник": "MONUMENT", "спас на крови": "RELIGION", "фонтан семь девушек": "MONUMENT",
        "казанский кремль": "ARCHITECTURE", "московский кремль": "ARCHITECTURE",
        "нижегородский кремль": "ARCHITECTURE", "рязанский кремль": "ARCHITECTURE",
        "тульский кремль": "ARCHITECTURE", "вднх": "URBAN", "москва-сити": "URBAN",
        "севкабель порт": "URBAN", "старая татарская слобода": "URBAN",
        "старо-татарская слобода": "URBAN", "рыбная деревня": "URBAN",
        "адмиралтейство": "ARCHITECTURE", "бункер сталина": "MUSEUM",
        "ельцин центр": "MUSEUM", "партиаршие пруды": "NATURE", "патриаршие пруды": "NATURE",
        "северный речной вокзал": "TRANSPORT", "плотина городского пруда (плотинка)": "ARCHITECTURE",
        "волгоградский метротрам (скоростной трамвай)": "TRANSPORT", "фуникулер владивостока": "TRANSPORT",
        "дивногорье историко-археологический резерват": "NATURE", "дом-гармошка": "ARCHITECTURE",
        "заброшенная больница в зеленой роще": "ARCHITECTURE", "богоявленская колокольня": "RELIGION",
        "рязанская вднх (торговый городок)": "URBAN", "полноразмерный макет космического корабля буран": "MONUMENT",
        "саратовский лимонарий": "NATURE", "термальный источник тюменский (верхний бор)": "NATURE",
        "круглая баня на ленина": "ARCHITECTURE", "полноразмерная копия су су сухого": "MONUMENT",
        "смотрительная площадка челябинск-сити": "URBAN",
    }
    if value in special:
        return special[value], "editorial_override"
    rules = [
        ("RELIGION", r"храм|собор|церк|мечет|монастыр|кирх|синагог|часовн|лавр|костел|приход"),
        ("MUSEUM", r"музей|галере|выставоч|экспозиц|пинакотек"),
        ("FOOD", r"ресторан|кафе|кофейн|гастробар|бар |бар «|бистро|столов|пекарн|кондитерск|гастромаркет|фудмолл|гастропростран"),
        ("THEATRE", r"театр|филармони|опера|цирк|кинотеатр|драматическ"),
        ("ENTERTAINMENT", r"океанари|зоопарк|планетари|аттракцион|сафари-парк|аквапарк|развлекательн"),
        ("TRANSPORT", r"вокзал|причал|станция метро|метрополитен|железная дорога|фуникулер|канатная дорога|метротрам|аэропорт|маяк"),
        ("NATURE", r"парк|сад |сквер|заповедник|лес |роща|пляж|озеро|водопад|гора|хребет|ущелье|мыс |остров|пещера"),
        ("MONUMENT", r"памятник|монумент|скульптур|обелиск|стел[а-я]|бюст|мемориал|триумфальн|арт-объект|уличный арт|роспись|барельеф"),
        ("URBAN", r"улица|площадь|набережн|бульвар|проспект|переулок|\bдвор\b|дворик|квартал|променад|смотровая площадка|смотрительная площадка|лестница|аллея|рынок"),
        ("URBAN", r"слобода|стрелка|пешеходная|фонтан"),
        ("ARCHITECTURE", r"дом |особняк|усадьб|дворец|здани|вокзал|мост|башня|крепост|форт|маяк|ворота|палат|замок|пассаж|почтамт|кремль|мельница|каланча|пакгауз|элеватор|бастион|небоскреб|штаб-квартира|склады"),
        ("VENUE", r"центр|кластер|пространство|лофт|арт-|рок-клуб|автодром|стадион|завод|санатори|консерватор|фабрика|пивоварен|курорт|аптека"),
    ]
    for kind, pattern in rules:
        if re.search(pattern, value):
            return kind, "name"
    defaults = {
        "Музеи": "MUSEUM", "Музеи и галереи": "MUSEUM",
        "Храмы": "RELIGION", "Храмы, соборы и монастыри": "RELIGION",
        "Парки": "NATURE", "Памятники": "MONUMENT", "Памятникими": "MONUMENT",
        "Доходные дома и парадные": "ARCHITECTURE", "Особняки и городские усадьбы": "ARCHITECTURE",
        "Променады": "URBAN", "Улицы / дворы": "URBAN",
        "Театры и шоу": "THEATRE", "Театры": "THEATRE",
        "Гастро": "FOOD", "Смотровые": "URBAN",
    }
    if old_type in defaults:
        return defaults[old_type], "old_category"
    return "OTHER", "review"


def subtype(name, kind):
    value = name.casefold().replace("ё", "е")
    families = {
        "RELIGION": [("monastery", r"монастыр|лавра"), ("mosque", r"мечет"), ("synagogue", r"синагог"),
                     ("church", r"церк|храм|собор|кирх|костел|приход"), ("chapel", r"часовн"), ("bell_tower", r"колокольн")],
        "URBAN": [("street", r"улица|проспект|переулок|бульвар"), ("square", r"площадь"),
                  ("embankment", r"набережн"), ("viewpoint", r"смотровая|обзорная площадка"),
                  ("district", r"слобода|квартал|район"), ("market", r"рынок"),
                  ("fountain", r"фонтан"), ("stairs", r"лестница"), ("promenade", r"променад|аллея"),
                  ("courtyard", r"дворик|\bдвор\b")],
        "FOOD": [("restaurant", r"ресторан"), ("cafe", r"кафе|кофейн"), ("bar", r"бар|паб"),
                 ("bakery", r"пекарн|кондитерск"), ("food_market", r"гастромаркет|рынок"),
                 ("food_hall", r"фудмолл|гастропростран")],
        "MUSEUM": [("gallery", r"галере"), ("exhibition_space", r"выставоч"), ("museum", r"музей")],
        "MONUMENT": [("memorial", r"мемориал"), ("sculpture", r"скульптур|бюст|арт-объект"),
                     ("obelisk", r"обелиск|стела"), ("monument", r"памятник|монумент")],
        "ARCHITECTURE": [("bridge", r"мост"), ("palace", r"дворец"), ("estate", r"усадьб|особняк"),
                         ("tower", r"башня|каланча|небоскреб"), ("fortification", r"крепост|форт|бастион|кремль|ворота|вал"),
                         ("historic_building", r"дом|здани|пассаж|почтамт|вокзал")],
        "THEATRE": [("circus", r"цирк"), ("philharmonic", r"филармони"),
                    ("cinema", r"кинотеатр"), ("concert_hall", r"концертный зал"), ("theatre", r"театр|опера")],
        "ENTERTAINMENT": [("zoo", r"зоопарк|сафари-парк"), ("aquarium", r"океанари"),
                          ("planetarium", r"планетари"), ("amusement_park", r"аттракцион|аквапарк")],
        "VENUE": [("stadium", r"стадион"), ("cultural_center", r"центр|пространство|кластер"),
                  ("club", r"клуб"), ("industrial_site", r"завод|фабрика")],
    }
    for code, pattern in families.get(kind, []):
        if re.search(pattern, value): return code
    if kind == "NATURE":
        for code, pattern in [
            ("waterfall", r"водопад"), ("cave", r"пещер"), ("mountain", r"гора|хребет|сопка"),
            ("lake", r"озеро|пруд"), ("river", r"река|речка"), ("beach", r"пляж"),
            ("forest", r"лес|роща"), ("hot_spring", r"термальн|источник"),
            ("island", r"остров"), ("cape", r"мыс "), ("reserve", r"заповедник|резерват"),
            ("park", r"парк|сквер|сад "),
        ]:
            if re.search(pattern, value): return code
        return "natural_site"
    if kind == "TRANSPORT":
        for code, pattern in [
            ("pier", r"причал|пристань"), ("river_terminal", r"речной вокзал"),
            ("sea_terminal", r"морской вокзал|морвокзал"),
            ("railway_station", r"железнодорожный вокзал|ж/д вокзал"),
            ("bus_station", r"автовокзал|автостанция"),
            ("metro_station", r"станция метро"),
            ("cable_car_station", r"станция канатной дороги"),
            ("airport", r"аэропорт"), ("marina", r"марина|яхт-клуб"),
            ("station", r"вокзал|станция"), ("funicular", r"фуникулер|канатная дорога"),
            ("railway", r"железная дорога|метрополитен|метротрам"), ("lighthouse", r"маяк"),
        ]:
            if re.search(pattern, value): return code
        return "transport_site"
    return None


def distance_km(a, b):
    lat1, lon1 = map(math.radians, a)
    lat2, lon2 = map(math.radians, b)
    return 6371 * 2 * math.asin(math.sqrt(math.sin((lat2-lat1)/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2))


sheet = openpyxl.load_workbook(SOURCE, read_only=True, data_only=True).worksheets[0]
rows = list(sheet.values)
if tuple(rows[0]) != HEADERS:
    raise SystemExit(f"Unexpected workbook headers: {rows[0]!r}")

records = []
for line, row in enumerate(rows[1:], 2):
    name, old_type, city, address, coords, description = [str(value or "").strip() for value in row]
    if not name or not city:
        raise SystemExit(f"Missing name or city at row {line}")
    match = re.fullmatch(r"\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*", coords)
    latitude, longitude = (float(match[1]), float(match[2])) if match else (None, None)
    kind, method = classify(name, old_type)
    tags = []
    if old_type == "Главные места": tags.append("main")
    if old_type in ("Гастро", "Локальная гастрономия и театры") and kind == "FOOD": tags.append("gastro")
    if old_type in ("Необычное", "Небычное", "Секретные"): tags.append("unusual")
    if old_type == "Семейное": tags.append("family")
    if old_type == "Смотровые" or "смотров" in name.casefold(): tags.append("viewpoint")
    if old_type == "Променады": tags.append("walk")
    key = hashlib.sha1(f"{city.casefold()}|{name.casefold()}".encode("utf-8")).hexdigest()[:20]
    records.append(dict(sourceKey=f"pdp:{key}", sourceRow=line, name=name, oldType=old_type,
                        city=city, address=address, latitude=latitude, longitude=longitude,
                        description=description, placeType=kind, placeSubtype=subtype(name, kind), classificationMethod=method,
                        isMainPlace="main" in tags, hubTags=tags,
                        imagePrompt=(
                            f"Use case: photorealistic-natural. Asset type: PDP cover for the exact place '{name}' "
                            f"in {city}, Russia. Source description: {description} "
                            "Depict this specific real place faithfully, with its recognizable physical features and surroundings. "
                            "Editorial travel photography, natural daylight, eye-level wide composition. "
                            "Do not invent a different landmark, facade, signage, or monument. No text, logos, or watermark. "
                            "If the description is insufficient to identify its real appearance, obtain a visual reference before generation."
                        ), imageStatus="needs_reference"))

points = collections.defaultdict(list)
for item in records:
    if item["latitude"] is not None:
        points[item["city"]].append((item["latitude"], item["longitude"]))
centres = {city: (statistics.median(x[0] for x in pts), statistics.median(x[1] for x in pts))
           for city, pts in points.items() if len(pts) >= 10}
for item in records:
    reasons = []
    if item["placeType"] == "OTHER": reasons.append("type_review")
    if item["placeSubtype"] is None: reasons.append("subtype_review")
    if item["city"].endswith("область"): reasons.append("region_not_city")
    if item["latitude"] is None: reasons.append("missing_coordinates")
    elif item["city"] in centres and distance_km((item["latitude"], item["longitude"]), centres[item["city"]]) > 80:
        reasons.append("coordinate_outlier")
    item["reviewReasons"] = reasons

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"rows": len(records), "types": dict(collections.Counter(x["placeType"] for x in records)),
                  "review": dict(collections.Counter(y for x in records for y in x["reviewReasons"])),
                  "duplicates": len(records)-len({x["sourceKey"] for x in records})}, ensure_ascii=False))
