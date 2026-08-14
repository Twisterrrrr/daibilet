#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PUB = ROOT / "apps/public/src/components"
WEB = ROOT / "apps/web/src/components"


def port_layout(name: str) -> None:
    text = (PUB / name).read_text(encoding="utf-8")
    text = "'use client';\n\n" + text
    text = text.replace("from '@/data'", "from '@/lib/format'")
    text = text.replace("from '@/routes'", "from '@/lib/routes'")
    text = text.replace(
        "import type { PublicSession, PublicVenue, PublicVenuePage } from '@/types';",
        "import type { PublicSessionDto, PublicVenueDto, PublicVenuePageDto } from '@daibilet/contracts/public';",
    )
    for old, new in [
        ("PublicVenuePage", "PublicVenuePageDto"),
        ("PublicVenue", "PublicVenueDto"),
        ("PublicSession", "PublicSessionDto"),
    ]:
        text = text.replace(old, new)
    text = text.replace("PublicVenueDtoPageDto", "PublicVenuePageDto")
    text = text.replace(
        "from '@/components/InstitutionCard'",
        "from '@/components/InstitutionCard.client'",
    )
    text = text.replace(
        "from '@/components/LocationCard'",
        "from '@/components/LocationCard.client'",
    )
    text = text.replace(
        "  Navigation,\n",
        "  Navigation as NavigationIcon,\n",
    )
    text = text.replace("<Navigation ", "<NavigationIcon ")
    text = text.replace(
        "import {\n  buildTcPurchaseTargets,\n  expandSessionPurchaseVariants,\n  isSessionPurchaseBlocked,\n  SessionBuyButton,\n} from '@/components/TcWidget';",
        "import { expandSessionPurchaseVariants } from '@/lib/event-purchase';",
    )
    text = text.replace(
        "import { SessionBuyButton } from '@/components/TcWidget';",
        "",
    )
    text = re.sub(
        r"<SessionBuyButton[\s\S]*?/>",
        '<a href={eventHref(session)} className="inline-flex min-h-9 items-center justify-center rounded-full bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700">Купить</a>',
        text,
    )
    text = re.sub(
        r"const purchaseTargets = buildTcPurchaseTargets\(group\.sessions\);[\s\S]*?/>",
        '<a href={eventHref(group.representative)} className="inline-flex min-h-9 items-center justify-center rounded-full bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700">Купить</a>',
        text,
    )
    out = WEB / name.replace(".tsx", ".client.tsx")
    out.write_text(text, encoding="utf-8")
    print("fixed", out.name)


def fix_location_card() -> None:
    text = (WEB / "LocationCard.client.tsx").read_text(encoding="utf-8")
    text = text.replace(
        "import { pluralEvents, venueTypeIcon, venueTypeLabel } from '@/lib/venue-meta';",
        "import { pluralEvents } from '@/lib/format';\nimport { venueTypeIcon, venueTypeLabel } from '@/lib/venue-meta';",
    )
    text = text.replace(
        "import type { PublicVenueDto } from '@daibilet/contracts/public';",
        "import type { PublicVenueDto } from '@daibilet/contracts/public';\nimport Link from 'next/link';",
    )
    if "<Link" not in text:
        text = text.replace("<a\n", "<Link\n").replace("</a>", "</Link>")
    (WEB / "LocationCard.client.tsx").write_text(text, encoding="utf-8")
    print("fixed LocationCard")


if __name__ == "__main__":
    port_layout("InstitutionVenueLayout.tsx")
    port_layout("LocationVenueLayout.tsx")
    fix_location_card()
