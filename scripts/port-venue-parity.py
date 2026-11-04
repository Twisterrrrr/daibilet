#!/usr/bin/env python3
"""Port Vite venue layouts and VenuePageView into apps/web."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUB = ROOT / "apps/public/src"
WEB = ROOT / "apps/web/src"

TYPE_IMPORT = """import type {
  PublicSessionDto,
  PublicVenueDto,
  PublicVenuePageDto,
} from '@daibilet/contracts/public';"""


def transform_types(text: str) -> str:
    text = text.replace("from '@/data'", "from '@/lib/format'")
    text = text.replace("from '@/routes'", "from '@/lib/routes'")
    text = text.replace("from '@/types'", "from '@daibilet/contracts/public'")
    for old, new in [
        ("PublicVenuePage", "PublicVenuePageDto"),
        ("PublicVenue", "PublicVenueDto"),
        ("PublicSession", "PublicSessionDto"),
    ]:
        text = text.replace(old, new)
    return text


def copy_component(name: str, dst_name: str | None = None) -> None:
    dst_name = dst_name or name
    text = (PUB / "components" / name).read_text(encoding="utf-8")
    if not text.startswith("'use client'"):
        text = "'use client';\n\n" + text
    text = transform_types(text)
    if name == "LocationCard.tsx":
        text = "import Link from 'next/link';\n" + text.split("\n", 1)[1]
        text = text.replace("<a\n", "<Link\n").replace("</a>", "</Link>")
    if name in {"InstitutionVenueLayout.tsx", "LocationVenueLayout.tsx"}:
        text = text.replace(
            "import { InstitutionCard } from '@/components/InstitutionCard';",
            "import { InstitutionCard } from '@/components/InstitutionCard.client';",
        )
        text = text.replace(
            "import { LocationCard } from '@/components/LocationCard';",
            "import { LocationCard } from '@/components/LocationCard.client';",
        )
        text = re.sub(
            r"import \{[\s\S]*?SessionBuyButton[\s\S]*?\} from '@/components/TcWidget';\n",
            "import Link from 'next/link';\n",
            text,
        )
        text = text.replace(
            "<InstitutionCard venue={item} href={venueHref(item)} />",
            "<InstitutionCard venue={item} href={venueHref(item)} />",
        )
    (WEB / "components" / dst_name).write_text(text, encoding="utf-8")
    print("copied", dst_name)


def port_venue_page_view() -> None:
    src = (PUB / "components/VenuePage.tsx").read_text(encoding="utf-8")
    src = "'use client';\n\n" + src
    src = re.sub(r"import \{ Footer \} from '@/components/Footer';\n", "", src)
    src = re.sub(r"import \{ Header \} from '@/components/Header';\n", "", src)
    src = re.sub(r"import \{[\s\S]*?\} from '@/components/TcWidget';\n", "", src)
    src = re.sub(r"import \{[\s\S]*?\} from '@/lib/venue-page-cache';\n", "", src)
    src = re.sub(r"import \{ applyVenueSeo \} from '@/lib/venue-seo';\n", "", src)
    src = src.replace(
        "import type { PublicVenue, PublicVenuePage } from '@/types';",
        TYPE_IMPORT
        + "\nimport { InstitutionVenueLayout } from '@/components/InstitutionVenueLayout.client';\n"
        + "import { LocationVenueLayout } from '@/components/LocationVenueLayout.client';",
    )
    src = transform_types(src)
    src = src.replace(
        "export function VenuePage({ slug }: VenuePageProps) {",
        "export function VenuePageView({ slug, initialPayload }: { slug: string; initialPayload: PublicVenuePageDto | null }) {",
    )
    src = src.replace(
        "const [payload, setPayload] = React.useState<PublicVenuePageDto | null>(\n    () => readCachedVenuePage(slug),\n  );",
        "const [payload, setPayload] = React.useState<PublicVenuePageDto | null>(initialPayload);",
    )
    src = src.replace(
        "const [contentReady, setContentReady] = React.useState(() => Boolean(readCachedVenuePage(slug)?.sessions?.length));",
        "const [contentReady, setContentReady] = React.useState(() => Boolean(initialPayload?.sessions?.length));",
    )

    fetch_block = re.search(r"  React\.useEffect\(\(\) => \{.*?  \}, \[slug\]\);", src, re.S)
    if fetch_block:
        new_fetch = """  React.useEffect(() => {
    if (initialPayload?.sessions?.length) return;
    const controller = new AbortController();
    fetch(`/api/public/venues/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as PublicVenuePageDto | null;
        if (!data?.venue) throw new Error('Страница не найдена');
        return data;
      })
      .then((data) => {
        setPayload(data);
        setContentReady(true);
        setError(null);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setError(requestError instanceof Error ? requestError.message : 'Страница не найдена');
      });
    return () => controller.abort();
  }, [slug, initialPayload?.sessions?.length]);"""
        src = src[: fetch_block.start()] + new_fetch + src[fetch_block.end() :]

    src = src.replace("venue.template || venuePageTemplate(venue.type)", "venuePageTemplate(venue.type)")
    src = src.replace(
        "<Header cityLabel={venue?.city || 'Дайбилет'} onSection={(section) => navigateHome(section)} searchCity={venue?.city} />\n\n      ",
        "",
    )
    src = src.replace("      <Footer />\n", "")
    src = src.replace(
        "<EventCard key={group.key} event={group.representative}",
        "<EventCard key={group.key} session={group.representative}",
    )
    src = re.sub(
        r"function BuyLink\(\{ group \}: \{ group: VenueEventGroup \}\) \{[\s\S]*?\n\}",
        """function BuyLink({ group }: { group: VenueEventGroup }) {
  return (
    <a href={eventHref(group.representative)} className="inline-flex min-h-9 items-center justify-center rounded-full bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700">
      Купить
    </a>
  );
}""",
        src,
    )
    (WEB / "components/VenuePageView.client.tsx").write_text(src, encoding="utf-8")
    print("created VenuePageView.client.tsx")


if __name__ == "__main__":
    copy_component("OsmMapEmbed.tsx")
    copy_component("LocationCard.tsx", "LocationCard.client.tsx")
    copy_component("InstitutionVenueLayout.tsx", "InstitutionVenueLayout.client.tsx")
    copy_component("LocationVenueLayout.tsx", "LocationVenueLayout.client.tsx")
    port_venue_page_view()
