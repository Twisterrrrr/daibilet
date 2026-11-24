#!/usr/bin/env python3
"""Route the New Year landing filter API to Next instead of the legacy API."""

from __future__ import annotations

import os
from pathlib import Path
import stat
import subprocess
import tempfile


CONF = Path(os.environ.get("NGINX_CONF", "/etc/nginx/sites-enabled/daibilet.conf"))
PUBLIC_SERVER = "server_name daibilet.ru *.daibilet.ru;"
FALLBACK_LOCATION = "    location /api/ {"
NEW_YEAR_LOCATION = "    location = /api/new-year-ux-preview {"
LOCATION_BLOCK = "\n".join(
    [
        "    # New Year landing filters are Next.js API requests, not legacy API routes.",
        "    location = /api/new-year-ux-preview {",
        "        limit_req zone=daibilet_public_api burst=15 nodelay;",
        "        proxy_pass http://daibilet_web;",
        "        proxy_http_version 1.1;",
        "        proxy_set_header Host $host;",
        "        proxy_set_header X-Real-IP $remote_addr;",
        "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
        "        proxy_set_header X-Forwarded-Proto $scheme;",
        "    }",
        "",
        "",
    ]
)


def patch_config(text: str) -> str:
    marker = text.find(PUBLIC_SERVER)
    if marker < 0:
        raise ValueError("public daibilet.ru server block not found")
    start = text.rfind("server {", 0, marker)
    if start < 0:
        raise ValueError("public server block start not found")
    end = text.find("\n}\n", marker)
    if end < 0:
        raise ValueError("public server block end not found")
    block = text[start : end + 3]
    if NEW_YEAR_LOCATION in block:
        route = block.split(NEW_YEAR_LOCATION, 1)[1].split("\n    }", 1)[0]
        if "proxy_pass http://daibilet_web;" not in route:
            raise ValueError("New Year route exists but does not point to daibilet_web")
        return text
    fallback = block.find(FALLBACK_LOCATION)
    if fallback < 0:
        raise ValueError("legacy /api/ fallback not found in public server block")
    block = block[:fallback] + LOCATION_BLOCK + block[fallback:]
    return text[:start] + block + text[end + 3 :]


def write_atomic(path: Path, content: str) -> None:
    metadata = path.stat()
    fd, temp_name = tempfile.mkstemp(prefix=path.name + ".", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temp_name, stat.S_IMODE(metadata.st_mode))
        os.chown(temp_name, metadata.st_uid, metadata.st_gid)
        os.replace(temp_name, path)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)


def main() -> None:
    original = CONF.read_text(encoding="utf-8")
    updated = patch_config(original)
    if updated == original:
        print("New Year Next API route already configured")
        return
    write_atomic(CONF, updated)
    try:
        subprocess.run(["/usr/sbin/nginx", "-t"], check=True)
        subprocess.run(["systemctl", "reload", "nginx"], check=True)
    except Exception:
        write_atomic(CONF, original)
        subprocess.run(["/usr/sbin/nginx", "-t"], check=True)
        subprocess.run(["systemctl", "reload", "nginx"], check=True)
        raise
    print("New Year landing API routed to Next")


if __name__ == "__main__":
    main()
