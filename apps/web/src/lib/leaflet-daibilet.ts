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

type LeafletDefault = (typeof import('leaflet'))['default'];

let loadPromise: Promise<LeafletDefault> | null = null;

export function loadDaibiletLeaflet(): Promise<LeafletDefault> {
  if (!loadPromise) {
    loadPromise = (async () => {
      const leaflet = await import('leaflet');
      await import('leaflet/dist/leaflet.css');
      await import('@/styles/leaflet-daibilet.css');
      const L = leaflet.default;
      L.Control.Attribution.mergeOptions({ prefix: LEAFLET_PREFIX });
      return L;
    })();
  }
  return loadPromise;
}
