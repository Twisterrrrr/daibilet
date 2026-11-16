from __future__ import annotations

import re


def point_staging_web_upstream_to_next(config: str, port: int = 3000) -> str:
    """Set only the staging web upstream to the selected Next.js port."""
    pattern = re.compile(
        r"(?P<prefix>upstream\s+daibilet_web_staging\s*\{\s*server\s+127\.0\.0\.1:)"
        r"(?P<port>\d+)"
        r"(?P<suffix>;[^}]*\})",
        re.MULTILINE,
    )
    matches = list(pattern.finditer(config))
    if len(matches) != 1:
        raise ValueError("expected exactly one daibilet_web_staging upstream")
    match = matches[0]
    return config[:match.start()] + match.group("prefix") + str(port) + match.group("suffix") + config[match.end():]
