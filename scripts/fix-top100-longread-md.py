# -*- coding: utf-8 -*-
"""Split fused Top-100 place headings and remove rubric HR clutter."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BLOG = ROOT / "content" / "blog"

SLUGS = [
    "spb-top-100-chast-1-zolotoy-treugolnik",
    "spb-top-100-chast-2-muzei",
    "spb-top-100-chast-3-dvory-paradnye",
    "spb-top-100-chast-4-neformalnyy",
    "spb-top-100-chast-5-gastro",
]

PLACE_HEADING_RE = re.compile(r"^(### \d+\.\s+.+?):\s+([А-ЯЁA-Z«\"].+)$")


def split_fm(text: str) -> tuple[str, str]:
    if not text.startswith("---"):
        return "", text
    end = text.find("\n---\n", 3)
    if end < 0:
        return "", text
    return text[: end + 5], text[end + 5 :].lstrip("\n")


def split_place_heading(line: str) -> str | None:
    m = PLACE_HEADING_RE.match(line.strip())
    if not m:
        return None
    title, catchphrase = m.group(1).strip(), m.group(2).strip()
    return f"{title}\n\n**{catchphrase}**"


def remove_rubric_hr(text: str) -> str:
    return re.sub(r"(^## [^\n]+\n)\n---\n", r"\1", text, flags=re.M)


def process_body(body: str) -> str:
    lines = body.replace("\r\n", "\n").splitlines()
    new_lines: list[str] = []
    for line in lines:
        split = split_place_heading(line)
        if split:
            new_lines.extend(split.splitlines())
        else:
            new_lines.append(line)
    text = "\n".join(new_lines)
    text = remove_rubric_hr(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def main() -> None:
    for slug in SLUGS:
        path = BLOG / f"{slug}.md"
        raw = path.read_text(encoding="utf-8")
        fm, body = split_fm(raw)
        path.write_text(fm + "\n" + process_body(body), encoding="utf-8")
        split_count = len(PLACE_HEADING_RE.findall(body))
        print(f"{slug}: split_headings={split_count}")


if __name__ == "__main__":
    main()
