import type { Server } from 'node:http';
import { buildAdminDashboardDto, clearAdminDashboardDtoCache } from './admin-dashboard.dto.js';
import { createAdminDashboardRouteHandler } from './admin-dashboard-handler.js';
import { buildAdminEventChangeRequestsDto } from './admin-event-change-requests.dto.js';
import { createAdminEventChangeRequestsRouteHandler } from './admin-event-change-requests-handler.js';
import { createAdminEventsRouteHandler } from './admin-events-handler.js';
import { createAdminLandingsRouteHandler } from './admin-landings-handler.js';
import { createAdminOrdersRouteHandler } from './admin-orders-handler.js';
import { buildAdminSourcesDto } from './admin-sources.dto.js';
import { createAdminSourcesRouteHandler } from './admin-sources-handler.js';
import { createAdminAuthConfig } from './auth.js';
import { applyApprovedEventChangeRequest } from './event-change-request-applier.js';
import { reviewEventChangeRequest } from './event-change-request-review.js';
import { readBackendEnv } from './env.js';
import { updateAdminEventOverride, updateAdminLandingMatch, upsertAdminOrderTicket } from './dto.js';
import { buildPublicCatalogDto, clearPublicCatalogDtoCache, getPublicCatalogSessions } from './public-catalog.dto.js';
import { createPublicCatalogRouteHandler } from './public-catalog-handler.js';
import { buildPublicCityDto, buildPublicDestinationsDto, clearPublicCityDtoCache } from './public-city.dto.js';
import { createPublicCityRouteHandler } from './public-city-handler.js';
import { buildPublicEventDto, clearPublicEventDtoCache } from './public-event.dto.js';
import { createPublicEventRouteHandler } from './public-event-handler.js';
import {
  buildPublicHomeDto,
  buildPublicHomePreviewDto,
  buildPublicStatsDto,
  clearPublicHomeDtoCache,
} from './public-home.dto.js';
import { createPublicHomeRouteHandler } from './public-home-handler.js';
import { buildPublicVenueDto, buildPublicVenuesDto, clearPublicVenueDtoCache } from './public-venue.dto.js';
import { createPublicVenueRouteHandler } from './public-venue-handler.js';
import { createPublicReadStackWarmer } from './public-warmup.js';
import {
  db,
  handleRequest,
  invalidatePublicCaches,
  registerPublicCacheInvalidator,
  registerPublicCacheWarmer,
  startServer,
} from './server.js';
import { createValidatedHandler } from './validated-handler.js';

const env = readBackendEnv();
const host = '127.0.0.1';
const adminAuth = createAdminAuthConfig(env);
const publicFlags = {
  home: env.DAIBILET_TS_PUBLIC_HOME === '1',
  catalog: env.DAIBILET_TS_PUBLIC_CATALOG === '1',
  city: env.DAIBILET_TS_PUBLIC_CITY === '1',
  event: env.DAIBILET_TS_PUBLIC_EVENT === '1',
  venue: env.DAIBILET_TS_PUBLIC_VENUE === '1',
};
registerPublicCacheInvalidator(() => {
  clearAdminDashboardDtoCache();
  clearPublicHomeDtoCache();
  clearPublicCatalogDtoCache();
  clearPublicCityDtoCache();
  clearPublicEventDtoCache();
  clearPublicVenueDtoCache();
});
const warmPublicReadStack = createPublicReadStackWarmer({
  flags: publicFlags,
  getCatalogSessions: getPublicCatalogSessions,
  buildDestinations: buildPublicDestinationsDto,
  buildVenues: buildPublicVenuesDto,
  buildHome: buildPublicHomeDto,
  buildHomePreview: buildPublicHomePreviewDto,
  buildStats: buildPublicStatsDto,
});
registerPublicCacheWarmer(async (reason: string) => {
  const result = await warmPublicReadStack(reason);
  await buildAdminDashboardDto(true);
  return result;
});
const server = startServer({
  host,
  port: env.PORT,
  prewarmBeforeListen: env.DAIBILET_PUBLIC_PREWARM_BEFORE_LISTEN === '1',
  handler: createValidatedHandler(handleRequest, {
    adminAuth,
    routeHandlers: [
      createAdminDashboardRouteHandler({
        buildDashboard: buildAdminDashboardDto,
      }),
      createPublicHomeRouteHandler({
        enabled: publicFlags.home,
        buildHome: buildPublicHomeDto,
        buildHomePreview: buildPublicHomePreviewDto,
        buildStats: buildPublicStatsDto,
        invalidateCaches: invalidatePublicCaches,
      }),
      createPublicCatalogRouteHandler({
        enabled: publicFlags.catalog,
        buildPublicCatalog: buildPublicCatalogDto,
      }),
      createPublicCityRouteHandler({
        enabled: publicFlags.city,
        buildDestinations: buildPublicDestinationsDto,
        buildCity: buildPublicCityDto,
      }),
      createPublicEventRouteHandler({
        enabled: publicFlags.event,
        buildPublicEvent: buildPublicEventDto,
      }),
      createPublicVenueRouteHandler({
        enabled: publicFlags.venue,
        buildVenues: buildPublicVenuesDto,
        buildVenue: buildPublicVenueDto,
      }),
      createAdminOrdersRouteHandler({
        db,
        upsertAdminOrderTicket,
      }),
      createAdminEventChangeRequestsRouteHandler({
        buildEventChangeRequests: buildAdminEventChangeRequestsDto,
        reviewEventChangeRequest,
        applyEventChangeRequest: applyApprovedEventChangeRequest,
        invalidatePublicCaches,
      }),
      createAdminSourcesRouteHandler({
        buildSources: buildAdminSourcesDto,
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
