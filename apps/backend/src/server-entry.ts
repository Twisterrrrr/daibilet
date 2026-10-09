import type { Server } from 'node:http';
import { buildAdminEventChangeRequestDetailDto, buildAdminEventChangeRequestsDto } from './admin-event-change-requests.dto';
import { createAdminEventChangeRequestsRouteHandler } from './admin-event-change-requests-handler';
import { createAdminEventsRouteHandler } from './admin-events-handler';
import { createAdminEventsReadRouteHandler } from './admin-events-read-handler';
import { buildAdminEventDetailDto, buildAdminEventsListDto } from './admin-events.dto';
import { applyApprovedEventChangeRequest } from './event-change-request-applier';
import { reviewEventChangeRequest } from './event-change-request-review';
import { createAdminLandingsRouteHandler } from './admin-landings-handler';
import { createAdminOrdersRouteHandler } from './admin-orders-handler';
import { createAdminOrdersReadRouteHandler } from './admin-orders-read-handler';
import { buildAdminOrdersListDto } from './admin-orders.dto';
import { createAdminAuthConfig } from './auth';
import { readBackendEnv } from './env';
import { updateAdminEventOverride, updateAdminLandingMatch, upsertAdminOrderTicket } from './dto';
import { buildPublicCatalogDto, clearPublicCatalogDtoCache, getPublicCatalogSessions } from './public-catalog.dto';
import { clearPublicArticlesDtoCache } from './public-articles.dto';
import { createPublicCatalogRouteHandler } from './public-catalog-handler';
import { buildPublicCityDto, buildPublicDestinationsDto, clearPublicCityDtoCache } from './public-city.dto';
import { createPublicCityRouteHandler } from './public-city-handler';
import { buildPublicEventDto, clearPublicEventDtoCache } from './public-event.dto';
import { createPublicEventRouteHandler } from './public-event-handler';
import { buildPublicVenueDto, buildPublicVenuesDto, buildPublicVenueEventCountsDto, clearPublicVenueDtoCache } from './public-venue.dto';
import { createPublicVenueRouteHandler } from './public-venue-handler';
import { createPublicReadStackWarmer } from './public-warmup';
import {
  db,
  handleRequest,
  invalidatePublicCaches,
  registerPublicCacheInvalidator,
  registerPublicCacheWarmer,
  startServer,
} from './server';
import { createAdminReviewsRouteHandler, createPublicReviewsRouteHandler } from './reviews-handler';
import { createValidatedHandler } from './validated-handler';

const env = readBackendEnv();
const host = '127.0.0.1';
const adminAuth = createAdminAuthConfig(env);
const publicFlags = {
  catalog: env.DAIBILET_TS_PUBLIC_CATALOG === '1',
  city: env.DAIBILET_TS_PUBLIC_CITY === '1',
  event: env.DAIBILET_TS_PUBLIC_EVENT === '1',
  venue: env.DAIBILET_TS_PUBLIC_VENUE === '1',
};
const adminFlags = {
  events: env.DAIBILET_TS_ADMIN_EVENTS === '1',
  orders: env.DAIBILET_TS_ADMIN_ORDERS === '1',
};
registerPublicCacheInvalidator(() => {
  clearPublicCatalogDtoCache();
  clearPublicCityDtoCache();
  clearPublicEventDtoCache();
  clearPublicVenueDtoCache();
  clearPublicArticlesDtoCache();
});
registerPublicCacheWarmer(createPublicReadStackWarmer({
  flags: publicFlags,
  getCatalogSessions: getPublicCatalogSessions,
  buildDestinations: buildPublicDestinationsDto,
  buildVenues: () => buildPublicVenuesDto(new URLSearchParams({ family: 'institution', limit: '500' })),
}));
const server = startServer({
  host,
  port: env.PORT,
  prewarmBeforeListen: env.DAIBILET_PUBLIC_PREWARM_BEFORE_LISTEN === '1',
  handler: createValidatedHandler(handleRequest, {
    adminAuth,
    routeHandlers: [
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
        buildVenueEventCounts: buildPublicVenueEventCountsDto,
      }),
      createAdminOrdersReadRouteHandler({
        enabled: adminFlags.orders,
        buildOrdersList: buildAdminOrdersListDto,
      }),
      createAdminEventsReadRouteHandler({
        enabled: adminFlags.events,
        buildEventsList: buildAdminEventsListDto,
        buildEventDetail: buildAdminEventDetailDto,
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
      createAdminEventChangeRequestsRouteHandler({
        buildEventChangeRequests: buildAdminEventChangeRequestsDto,
        buildEventChangeRequestDetail: buildAdminEventChangeRequestDetailDto,
        reviewEventChangeRequest,
        applyEventChangeRequest: applyApprovedEventChangeRequest,
        invalidatePublicCaches,
      }),
      createPublicReviewsRouteHandler(),
      createAdminReviewsRouteHandler(),
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
