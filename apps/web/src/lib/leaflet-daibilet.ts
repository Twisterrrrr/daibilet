/**
 * Shared Leaflet bootstrap for Daibilet OSM maps.
 *
 * Leaflet 1.9 injects a UA flag SVG into the default attribution prefix
 * (`.leaflet-attribution-flag`). Upstream leaflet.css also forces
 * `display: inline !important`, which wins over globals.css when the
 * stylesheet is loaded dynamically after app styles. Strip the flag in JS
 * and re-hide via CSS imported after leaflet.css.
 */
const LEAFLET_PREFIX =
  '<a href="https://leafletjs.com" title="A JavaScript library for interactive maps" target="_blank" rel="noreferrer">Leaflet</a>';

/**
 * `@types/leaflet` declares named exports only (`export as namespace L`), so the
 * module namespace itself is the Leaflet API - there is no `default` key in the
 * types. At runtime leaflet is CommonJS and the bundler exposes
 * `module.exports` as `.default`, so read that when present and fall back to the
 * namespace itself.
 */
type LeafletNamespace = typeof import('leaflet');

let loadPromise: Promise<LeafletNamespace> | null = null;

export function loadDaibiletLeaflet(): Promise<LeafletNamespace> {
  if (!loadPromise) {
    loadPromise = (async () => {
      const leaflet = await import('leaflet');
      await import('leaflet/dist/leaflet.css');
      await import('@/styles/leaflet-daibilet.css');
      const L = (leaflet as unknown as { default?: LeafletNamespace }).default ?? leaflet;
      L.Control.Attribution.mergeOptions({ prefix: LEAFLET_PREFIX });
      return L;
    })();
  }
  return loadPromise;
}
