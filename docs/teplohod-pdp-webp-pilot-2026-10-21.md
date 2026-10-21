# Teplohod PDP WebP pilot - 21.10.2026

## Scope and behavior

The pilot replaces only the hero image on five event PDPs, and only while its exact Teplohod CDN source path is present:

| Teplohod event | PDP | Original | 750 px WebP | Reduction |
|---:|---|---:|---:|---:|
| 51 | `/events/vechernyaya-progulka-na-teplohode-muz-ekspress-s-uzhinom-i-di-dzheem-na-bortu-51` | 1,671,095 B | 87,088 B | 19.2× |
| 1360 | `/events/rechnaya-progulka-po-centru-moskvy-ot-parka-zaryade-krugovaya-1360` | 1,526,004 B | 80,542 B | 18.9× |
| 1332 | `/events/rechnaya-progulka-na-komfortabelnom-elektrohode-strelna-1332` | 1,523,774 B | 59,704 B | 25.5× |
| 1402 | `/events/obzornaya-progulka-na-komfortabelnom-teplohode-ot-parka-zaryade-po-centru-moskvy-1402` | 1,092,888 B | 50,116 B | 21.8× |
| 605 | `/events/rechnaya-progulka-na-premium-teplohode-legenda-s-uzhinom-i-saksofonом-na-bortu-605` | 1,396,837 B | 70,978 B | 19.7× |

Each source was downloaded from its current `cdn.teplohod.info` URL, inspected as a real supplier image, and converted to WebP with Sharp, quality 75. No generated or invented scene was used. Source byte sizes, dimensions, URLs, and SHA-256 hashes are printed by the generator script.

The HTML `<picture>` source offers 750, 1125, 1280, and 1536 px candidates. At a 375 px viewport and DPR 3, 1125 px is available; at 412 px and DPR 3, 1280 px is available. The 1536 px file covers wider desktop viewports. The `<img>` fallback points to the 750 px WebP. If any bundled candidate fails to load, the component falls back to the original CDN URL. Asset filenames include the first eight characters of the source SHA-256, so a reviewed new source produces a new cache URL.

Only the event hero uses this exact-source allowlist. Listing cards, related events, social metadata, all other Teplohod images, and the global Next AVIF/WebP order are unchanged. Because these are pre-generated static assets, Sharp does not run during page rendering or when a visitor first requests a variant.

## Generated asset results

All 750 px variants are 50-88 KB. The other candidates range from 104-166 KB at 1125 px, 134-199 KB at 1280 px, and 188-261 KB at 1536 px. Originals range from 1.09-1.67 MB. This proves transfer-size reduction for this sample, not a measured LCP improvement.

The previous Lighthouse run identified the Event1360 hero as the mobile LCP element at viewport 412×823, DPR 1.75; it loaded a 1.526 MB JPEG. At that DPR the new source set should select a candidate around 750 px, but `currentSrc`, transferred bytes, and LCP must still be captured in a real browser after deploying to staging.

An isolated Chrome probe of the same `<picture>`/`srcset` rule selected the 750 px file at a 375 px viewport and the 1280 px file at a 1280 px viewport. The probe's device scale factor remained 1 and it did not render the production PDP component, so it does not close the DPR 3 or after-change Lighthouse checks.

## Rebuild the static variants

The source assets are from the supplier and are not checked into this repository. Regenerate the checked-in output with:

```bash
pnpm --filter @daibilet/web exec node scripts/build-teplohod-pdp-webp.mjs
```

The generated files live in `apps/public/public/images/events/teplohod-pdp/`. `pnpm web:build` syncs them into Next's public image directory, which nginx serves from `/images/` with a 30-day browser cache.

For a reproducible review, record the script's source checksums and output byte counts. If the supplier changes an original URL or image, it will not match the exact allowlist and the page continues using its existing original image until the asset and mapping are reviewed together.

## Rollback

The component already falls back to the original CDN JPEG if a generated asset returns an error. For an immediate no-build rollback after the static files have been deployed, move the one allowlisted asset directory out of nginx's `/images/` root on the affected host:

```bash
mv /opt/daibilet/apps/web/public/images/events/teplohod-pdp \
  /opt/daibilet/apps/web/public/images/events/teplohod-pdp.disabled
```

No web service restart is required for this nginx-served static path. New requests get a 404 for the derivative, then the image component retries the supplier original. Restore the directory to re-enable the pilot. Previously cached WebP files may remain in visitors' browser caches until their normal cache expiry.

## Verification gates

1. Run the new mapping unit test and the web CI test allowlist; confirm all 20 WebP files exist and their dimensions are correct.
2. Build the web package so `sync-public-assets` copies the pilot files to `apps/web/public/images/events/teplohod-pdp/`.
3. Deploy to staging only. For all five routes, check HTML has the expected `<picture>`, responsive `srcset`, 200 asset response, `Content-Type: image/webp`, and immutable/currently configured cache headers.
4. In mobile Chrome, capture `currentSrc`, natural dimensions, actual transferred bytes, viewport, DPR, and LCP node for 2-3 cold-cache runs before and after. Repeat for desktop. Event1360 is the primary comparison because its hero was previously measured as the LCP element.
5. Compare LCP, FCP, TBT, and page bytes. Do not report the 18-25× image-byte reduction as an LCP percentage improvement.
6. Run a concurrent burst of image requests on staging with warmed and empty caches. Observe `daibilet-web-staging` CPU, RSS/cgroup memory, healthcheck, PDP TTFB, and 5xx; then verify that cache hits do not invoke Sharp again.
7. Keep production unchanged until the staging browser and load results pass review. Observe SSR health, TTFB, and 5xx after any later production release.

## Cline handoff

- Code allowlist: `apps/web/src/lib/teplohod-pdp-image-map.ts`.
- PDP integration: `apps/web/src/components/HeroImageWithBlur.client.tsx`.
- Asset builder: `apps/web/scripts/build-teplohod-pdp-webp.mjs`.
- Regression test: `apps/web/src/lib/teplohod-pdp-image-map.test.ts`.
- Do not add other Teplohod sources to the allowlist without storing their original URL/checksum, generating real-source WebP derivatives, and measuring the page.
- Keep `next.config.ts` global image formats unchanged. The pilot deliberately bypasses on-demand AVIF/Sharp for these known assets.
- Staging remains the next required gate: this branch has not been deployed, and no post-change browser/Lighthouse or live cgroup test has yet been run.
