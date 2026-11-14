/**
 * Shared loader for `data/geo/city-routing.ru.json`.
 * Safe for Next-bundled routes: never throws on missing CI-baked paths.
 */
import { readFileSync } from 'node:fs';
import { resolveCityRoutingPath } from './project-root.js';

/**
 * @typedef {{
 *   standaloneCities?: string[];
 *   cityToRegion?: Record<string, string>;
 *   foreignCities?: string[];
 *   publicRegions?: string[];
 * }} CityRoutingConfig
 */

/**
 * @param {string | URL | undefined} importMetaUrl
 * @returns {CityRoutingConfig}
 */
export function loadCityRoutingConfig(importMetaUrl) {
  try {
    return JSON.parse(readFileSync(resolveCityRoutingPath(importMetaUrl), 'utf8'));
  } catch {
    return {
      standaloneCities: [],
      cityToRegion: {},
      foreignCities: [],
      publicRegions: [],
    };
  }
}
