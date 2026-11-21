#!/usr/bin/env python3
"""Port Vite LandingPage and dependencies into apps/web."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUB = ROOT / "apps/public/src"
WEB = ROOT / "apps/web/src"

TYPE_MAP = [
    ("PublicLandingPage", "PublicLandingPageDto"),
    ("PublicLandingContentBlock", "PublicLandingContentBlockDto"),
    ("PublicLanding", "PublicLandingDto"),
    ("PublicSession", "PublicSessionDto"),
]

LANDING_SLUGS_IMPORT = """import {
  CANONICAL_LANDING_SLUGS,
  canonicalLandingSlug,
  isBridgesNightLandingSlug,
  isRiverCruisesLandingSlug,
  isRiverPartyLandingSlug,
  landingFetchCandidates,
  landingSlugVariants,
} from '@/lib/landing-constants';
import {
  busLandingHref,
  landingCategoryHref,
  landingPageHref,
  partyLandingHref,
  riverLandingHref,
} from '@/lib/landing-routes';"""


def transform_types(text: str) -> str:
    text = text.replace("from '@/data'", "from '@/lib/format'")
    text = text.replace("from '@/routes'", "from '@/lib/routes'")
    text = text.replace("from '@/types'", "from '@daibilet/contracts/public'")
    text = re.sub(
        r"from '@/lib/landing-slugs';",
        LANDING_SLUGS_IMPORT,
        text,
    )
    for old, new in TYPE_MAP:
        text = text.replace(old, new)
    return text


def ensure_client(text: str) -> str:
    if not text.startswith("'use client'"):
        text = "'use client';\n\n" + text
    return text


def copy_file(src: Path, dst: Path, *, client: bool = False) -> None:
    text = src.read_text(encoding="utf-8")
    text = transform_types(text)
    if client:
        text = ensure_client(text)
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(text, encoding="utf-8")
    print("copied", dst.relative_to(ROOT))


def copy_lib(name: str) -> None:
    copy_file(PUB / "lib" / name, WEB / "lib" / name)


def copy_data(name: str) -> None:
    copy_file(PUB / "data" / name, WEB / "data" / name)


def copy_landing_component(name: str) -> None:
    text = (PUB / "components/landing" / name).read_text(encoding="utf-8")
    text = transform_types(text)
    text = ensure_client(text)
    text = text.replace("@/components/TcWidget", "@/components/TcWidget.client")
    text = text.replace("@/components/TeplohodWidget", "@/components/TeplohodWidget.client")
    dst = WEB / "components/landing" / name.replace(".tsx", ".client.tsx")
    dst.write_text(text, encoding="utf-8")
    print("copied", dst.relative_to(ROOT))


def port_landing_page() -> None:
    src = (PUB / "components/LandingPage.tsx").read_text(encoding="utf-8")
    src = ensure_client(src)

    src = re.sub(r"import \{ Footer \} from '@/components/Footer';\n", "", src)
    src = re.sub(r"import \{ Header \} from '@/components/Header';\n", "", src)
    src = re.sub(
        r"import \{ readCachedLandingPage, writeCachedLandingPage \} from '@/lib/landing-page-cache';\n",
        "",
        src,
    )
    src = re.sub(
        r"import \{[\s\S]*?\} from '@/data';\n",
        "import { formatMoney, formatNumber } from '@/lib/format';\n",
        src,
        count=1,
    )
    src = src.replace(
        "import { LandingPurchaseButton } from '@/components/landing/LandingPurchaseButton';",
        "import { LandingPurchaseButton } from '@/components/landing/LandingPurchaseButton.client';",
    )
    src = src.replace(
        "import { LandingStickyHeader } from '@/components/landing/LandingStickyHeader';",
        "import { LandingStickyHeader } from '@/components/landing/LandingStickyHeader.client';",
    )
    src = src.replace(
        "import { LandingCityLocations } from '@/components/landing/LandingCityLocations';",
        "import { LandingCityLocations } from '@/components/landing/LandingCityLocations.client';",
    )
    src = src.replace(
        "} from '@/components/landing/BridgesLandingSelling';",
        "} from '@/components/landing/BridgesLandingSelling.client';",
    )
    src = src.replace(
        "import { BridgesScheduleSection } from '@/components/landing/BridgesScheduleSection';",
        "import { BridgesScheduleSection } from '@/components/landing/BridgesScheduleSection.client';",
    )
    src = src.replace(
        "} from '@/components/landing/BridgesLandingGuide';",
        "} from '@/components/landing/BridgesLandingGuide.client';",
    )
    src = re.sub(r"import \{ API_BASE_URL \} from '@/lib/api-base';\n", "", src)
    src = transform_types(src)

    src = src.replace(
        "export function LandingPage({ slug: rawSlug, citySlug }: { slug: string; citySlug?: string }) {",
        "export function LandingPageView({\n"
        "  slug: rawSlug,\n"
        "  citySlug,\n"
        "  initialPayload,\n"
        "  genre: initialGenre,\n"
        "}: {\n"
        "  slug: string;\n"
        "  citySlug?: string;\n"
        "  initialPayload: PublicLandingPageDto;\n"
        "  genre?: string | null;\n"
        "}) {",
    )

    src = re.sub(
        r"const initialCachedPayload = React\.useMemo\(\s*\(\) => readCachedLandingPage\(slug, citySlug\),\s*\[slug, citySlug\],\s*\);",
        "const initialCachedPayload = React.useMemo(() => initialPayload, [initialPayload]);",
        src,
    )
    src = re.sub(
        r"const shell = React\.useMemo\(\(\) => buildLandingShellPage\(slug, citySlug\), \[slug, citySlug\]\);",
        "const shell = React.useMemo(() => initialPayload, [initialPayload]);",
        src,
    )
    src = src.replace(
        "const [category, setCategory] = React.useState(() => readLandingGenreFromUrl());",
        "const [category, setCategory] = React.useState(() => resolveConcertGenreTag(initialGenre) || 'all');",
    )
    src = re.sub(
        r"React\.useEffect\(\(\) => \{\s*if \(slug !== rawSlug\) \{\s*window\.location\.replace\(landingCategoryHref\(slug, citySlug\)\);\s*\}\s*\}, \[rawSlug, slug, citySlug\]\);\s*",
        "",
        src,
    )
    src = src.replace(
        "const [apiPayload, setApiPayload] = React.useState<PublicLandingPageDto | null>(() => initialCachedPayload);",
        "const [apiPayload, setApiPayload] = React.useState<PublicLandingPageDto | null>(() => initialPayload);",
    )
    src = src.replace(
        "setCategory(readLandingGenreFromUrl());",
        "setCategory(resolveConcertGenreTag(initialGenre) || 'all');",
    )

    src = re.sub(
        r"setIsSessionsLoading\(!readCachedLandingPage\(slug, citySlug\)\?\.sessions\?\.length\);\s*setSessionsError\(null\);\s*fetchLandingPayload\(slug, controller\.signal\)",
        "setIsSessionsLoading(false);\n    setSessionsError(null);\n    fetch(`/api/public/landings/${encodeURIComponent(slug)}`, { signal: controller.signal, cache: 'no-store' })",
        src,
    )
    src = re.sub(
        r"\.then\(\(data\) => \{\s*if \(disposed\) return;\s*if \(data\?\.landing\) \{\s*const resolved = finalizeLandingPayload\(data, slug, resolveLandingCityName\(citySlug, slug\)\);\s*setApiPayload\(resolved\);\s*writeCachedLandingPage\(slug, resolved, citySlug\);\s*setSessionsError\(null\);\s*return;\s*\}\s*throw new Error\('landing not found'\);\s*\}\)",
        ".then(async (response) => {\n        if (!response.ok) throw new Error(`HTTP ${response.status}`);\n        return (await response.json()) as PublicLandingPageDto | null;\n      })\n      .then((data) => {\n        if (disposed) return;\n        if (data?.landing) {\n          const resolved = finalizeLandingPayload(data, slug, resolveLandingCityName(citySlug, slug));\n          setApiPayload(resolved);\n          setSessionsError(null);\n          return;\n        }\n        throw new Error('landing not found');\n      })",
        src,
    )
    src = re.sub(
        r"const fallbackPayload = resolveLandingPayload\(slug, citySlug\);\s*if \(fallbackPayload\?\.sessions\.length\) \{\s*setApiPayload\(fallbackPayload\);\s*setSessionsError\(null\);\s*return;\s*\}\s*",
        "",
        src,
    )

    src = src.replace(
        "<Header cityLabel={cityName || 'Все города'} onSection={navigateHome} searchCity={cityName || undefined} />",
        "",
    )
    src = src.replace("<Footer />", "")
    src = re.sub(
        r"if \(!payload\) \{\s*return \(\s*<div className=\"min-h-screen bg-background text-foreground\">\s*<Header cityLabel=\"Все города\" onSection=\{navigateHome\} />\s*<ErrorState message=\"Лендинг не найден\.\" />\s*<Footer />\s*</div>\s*\);\s*\}",
        "if (!payload) {\n    return <ErrorState message=\"Лендинг не найден.\" />;\n  }",
        src,
    )

    src = src.replace("<EventCard key={group.key} event={group.representative} compact landingActions />", "<EventCard key={group.key} session={group.representative} compact landingActions />")
    src = re.sub(r"<EventCard([^>]*)\bevent=", r"<EventCard\1session=", src)

    src = re.sub(r"function fetchLandingPayload[\s\S]*?^}\n", "", src, flags=re.M)
    src = re.sub(r"function resolveLandingPayload[\s\S]*?^}\n", "", src, flags=re.M)
    src = re.sub(r"function buildStaticLandingPage[\s\S]*?^}\n", "", src, flags=re.M)

    dst = WEB / "components/LandingPageView.client.tsx"
    dst.write_text(src, encoding="utf-8")
    print("copied", dst.relative_to(ROOT))


def main() -> None:
    for lib in [
        "landing-copy.ts",
        "landing-seo.ts",
        "bridges-session-utils.ts",
        "bridges-seo.ts",
    ]:
        copy_lib(lib)

    for data in ["bridges-landing.ts", "seasonal-landings.ts", "river-landings.ts"]:
        copy_data(data)

    for comp in [
        "LandingPurchaseButton.tsx",
        "LandingStickyHeader.tsx",
        "LandingCityLocations.tsx",
        "BridgesLandingSelling.tsx",
        "BridgesLandingGuide.tsx",
        "BridgesScheduleSection.tsx",
    ]:
        copy_landing_component(comp)

    port_landing_page()


if __name__ == "__main__":
    main()
