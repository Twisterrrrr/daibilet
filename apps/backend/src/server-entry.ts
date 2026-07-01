import type { Server } from 'node:http';
import { createAdminEventsRouteHandler } from './admin-events-handler.js';
import { createAdminLandingsRouteHandler } from './admin-landings-handler.js';
import { createAdminOrdersRouteHandler } from './admin-orders-handler.js';
import { createAdminAuthConfig } from './auth.js';
import { readBackendEnv } from './env.js';
import { updateAdminEventOverride, updateAdminLandingMatch, upsertAdminOrderTicket } from './dto.js';
import { buildPublicCatalogDto, clearPublicCatalogDtoCache } from './public-catalog.dto.js';
import { createPublicCatalogRouteHandler } from './public-catalog-handler.js';
import { buildPublicCityDto, buildPublicDestinationsDto, clearPublicCityDtoCache } from './public-city.dto.js';
import { createPublicCityRouteHandler } from './public-city-handler.js';
import { buildPublicEventDto, clearPublicEventDtoCache } from './public-event.dto.js';
import { createPublicEventRouteHandler } from './public-event-handler.js';
import { buildPublicVenueDto, buildPublicVenuesDto, clearPublicVenueDtoCache } from './public-venue.dto.js';
import { createPublicVenueRouteHandler } from './public-venue-handler.js';
import {
  db,
  handleRequest,
  invalidatePublicCaches,
  registerPublicCacheInvalidator,
  startServer,
} from './server.js';
import { createValidatedHandler } from './validated-handler.js';

const env = readBackendEnv();
const host = '127.0.0.1';
const adminAuth = createAdminAuthConfig(env);
registerPublicCacheInvalidator(() => {
  clearPublicCatalogDtoCache();
  clearPublicCityDtoCache();
  clearPublicEventDtoCache();
  clearPublicVenueDtoCache();
});
const server = startServer({
  host,
  port: env.PORT,
  handler: createValidatedHandler(handleRequest, {
    adminAuth,
    routeHandlers: [
      createPublicCatalogRouteHandler({
        enabled: env.DAIBILET_TS_PUBLIC_CATALOG === '1',
        buildPublicCatalog: buildPublicCatalogDto,
      }),
      createPublicCityRouteHandler({
        enabled: env.DAIBILET_TS_PUBLIC_CITY === '1',
        buildDestinations: buildPublicDestinationsDto,
        buildCity: buildPublicCityDto,
      }),
      createPublicEventRouteHandler({
        enabled: env.DAIBILET_TS_PUBLIC_EVENT === '1',
        buildPublicEvent: buildPublicEventDto,
      }),
      createPublicVenueRouteHandler({
        enabled: env.DAIBILET_TS_PUBLIC_VENUE === '1',
        buildVenues: buildPublicVenuesDto,
        buildVenue: buildPublicVenueDto,
      }),
      createAdminOrdersRouteHandler({
        db,
        upsertAdminOrderTicket,
      }),
      createAdminEventsRouteHandler({
        db,
        updateAdminEventOverride,
        invalidatePublicCaches,
      }),
      createAdminLandingsRouteHandler({
        db,
        updateAdminLandingMatch,
        invalidatePublicCaches,
      }),
    ],
  }),
}) as Server;

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close(() => {
      process.exit(0);
    });
  });
}

export { server };
