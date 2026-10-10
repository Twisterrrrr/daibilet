#!/usr/bin/env python3
"""Port Vite public parity files into apps/web."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUB = ROOT / "apps/public/src"
WEB = ROOT / "apps/web/src"


def copy_libs() -> None:
    for name in ["cityInfo.ts", "city-card-styles.ts", "catalog-tags.ts", "catalog-links.ts"]:
        (WEB / "lib" / name).write_text((PUB / "lib" / name).read_text(encoding="utf-8"), encoding="utf-8")
        print("copied", name)

    text = (PUB / "lib/cityRegionHub.ts").read_text(encoding="utf-8")
    text = text.replace(
        "import type { PublicDestination } from '@/types';",
        "import type { PublicDestinationDto } from '@daibilet/contracts/public';",
    )
    text = text.replace("PublicDestination", "PublicDestinationDto")
    (WEB / "lib/cityRegionHub.ts").write_text(text, encoding="utf-8")
    print("copied cityRegionHub.ts")

    text = (PUB / "lib/city-image-focus.ts").read_text(encoding="utf-8")
    text = text.replace("from '@/routes'", "from '@/lib/routes'")
    (WEB / "lib/city-image-focus.ts").write_text(text, encoding="utf-8")
    print("copied city-image-focus.ts")


def port_city_page_view() -> None:
    src = (PUB / "components/CityPage.tsx").read_text(encoding="utf-8")
    src = "'use client';\n\n" + src
    src = re.sub(r"import \{ Footer \} from '@/components/Footer';\n", "", src)
    src = re.sub(r"import \{ Header \} from '@/components/Header';\n", "", src)
    src = re.sub(
        r"import \{\n  buildCityPageShell,\n  readCachedCityPage,\n  writeCachedCityPage,\n\} from '@/lib/city-page-cache';\n",
        "",
        src,
    )
    src = re.sub(r"import \{ API_BASE_URL \} from '@/lib/api-base';\n", "", src)
    src = src.replace("from '@/routes'", "from '@/lib/routes'")
    src = src.replace("from '@/data'", "from '@/lib/format'")
    src = src.replace("from '@/lib/landing-slugs'", "from '@/lib/landing-routes'")
    src = src.replace(
        "import type { PublicCity, PublicCityPage, PublicLanding, PublicSession, PublicVenue } from '@/types';",
        "import type {\n  PublicCityDto,\n  PublicCityPageDto,\n  PublicLandingDto,\n  PublicSessionDto,\n  PublicVenueDto,\n} from '@daibilet/contracts/public';",
    )
    for old, new in [
        ("PublicCityPage", "PublicCityPageDto"),
        ("PublicCity", "PublicCityDto"),
        ("PublicLanding", "PublicLandingDto"),
        ("PublicSession", "PublicSessionDto"),
        ("PublicVenue", "PublicVenueDto"),
    ]:
        src = src.replace(old, new)

    src = src.replace(
        "export function CityPage({ slug }: { slug: string }) {",
        "export function CityPageView({ slug, initialPayload }: { slug: string; initialPayload: PublicCityPageDto | null }) {",
    )
    src = src.replace(
        "const [payload, setPayload] = React.useState<PublicCityPageDto | null>(() => readCachedCityPage(slug) || buildCityPageShell(slug));",
        "const [payload, setPayload] = React.useState<PublicCityPageDto | null>(initialPayload);",
    )
    src = src.replace(
        "const [contentReady, setContentReady] = React.useState(() => Boolean(readCachedCityPage(slug)?.sessions?.length));",
        "const [contentReady, setContentReady] = React.useState(() => Boolean(initialPayload?.sessions?.length));",
    )

    fetch_block = re.search(r"  React\.useEffect\(\(\) => \{.*?  \}, \[slug\]\);", src, re.S)
    if fetch_block:
        new_fetch = """  React.useEffect(() => {
    if (initialPayload?.sessions?.length) return;
    const controller = new AbortController();
    fetch(`/api/public/cities/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as PublicCityPageDto | null;
      })
      .then((data) => {
        if (!data?.city) throw new Error('Город не найден');
        setPayload(data);
        setContentReady(true);
        setError(null);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setError(requestError instanceof Error ? requestError.message : String(requestError));
      });
    return () => controller.abort();
  }, [slug, initialPayload?.sessions?.length]);"""
        src = src[: fetch_block.start()] + new_fetch + src[fetch_block.end() :]

    src = src.replace(
        "<Header cityLabel={city?.name || 'Дайбилет'} onSection={(section) => navigateHome(section)} searchCity={city?.name} />\n\n      ",
        "",
    )
    src = src.replace("      <Footer />\n", "")
    src = src.replace(
        '<div className="min-h-screen bg-white text-slate-900">',
        '<div className="bg-white text-slate-900">',
    )

    (WEB / "components/CityPageView.client.tsx").write_text(src, encoding="utf-8")
    print("created CityPageView.client.tsx", len(src))


if __name__ == "__main__":
    copy_libs()
    port_city_page_view()
