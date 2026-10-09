/**
 * Lazy city place images — preloads image data on first use.
 * The data module is loaded once and cached. After preload,
 * synchronous access is available via getEditorialPlaceImage.
 */

let loadedData: {
  EDITORIAL_IMAGES_BY_SLUG: Record<string, string>;
  PLACE_IMAGE_ALIASES: Record<string, string>;
} | null = null;

let loadPromise: Promise<void> | null = null;

/** Start loading the image data module. Call once in a component's useEffect. */
export function preloadPlaceImages(): Promise<void> {
  if (loadedData) return Promise.resolve();
  if (!loadPromise) {
    loadPromise = import('./city-place-images-data.ts').then((mod) => {
      loadedData = {
        EDITORIAL_IMAGES_BY_SLUG: mod.EDITORIAL_IMAGES_BY_SLUG,
        PLACE_IMAGE_ALIASES: mod.PLACE_IMAGE_ALIASES,
      };
    });
  }
  return loadPromise;
}

function normalizeKey(slug: string | null | undefined): string {
  return String(slug || '').trim().toLowerCase().replace(/-+$/g, '');
}

/** Synchronous lookup — returns null if data not loaded yet. */
export function getEditorialPlaceImage(slug: string | null | undefined): string | null {
  if (!loadedData) return null;
  const key = normalizeKey(slug);
  if (!key) return null;
  const direct = loadedData.EDITORIAL_IMAGES_BY_SLUG[key];
  if (direct) return direct;
  const alias = loadedData.PLACE_IMAGE_ALIASES[key];
  if (!alias) return null;
  return loadedData.EDITORIAL_IMAGES_BY_SLUG[alias] || null;
}

/** Check if data is loaded. */
export function isPlaceImagesLoaded(): boolean {
  return loadedData !== null;
}
