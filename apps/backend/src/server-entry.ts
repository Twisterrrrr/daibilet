import type { Server } from 'node:http';
import { buildAdminEventChangeRequestDetailDto, buildAdminEventChangeRequestsDto } from './admin-event-change-requests.dto.js';
import { createAdminEventChangeRequestsRouteHandler } from './admin-event-change-requests-handler.js';
import { createAdminEventScheduleRouteHandler } from './admin-event-schedule-handler.js';
import { createAdminEventsRouteHandler } from './admin-events-handler.js';
import { createAdminEventsReadRouteHandler } from './admin-events-read-handler.js';
import { buildAdminEventDetailDto, buildAdminEventsListDto } from './admin-events.dto.js';
import { applyApprovedEventChangeRequest } from './event-change-request-applier.js';
import { reviewEventChangeRequest } from './event-change-request-review.js';
import { createAdminLandingsRouteHandler } from './admin-landings-handler.js';
import { createAdminOrdersRouteHandler } from './admin-orders-handler.js';
import { createAdminOrdersReadRouteHandler } from './admin-orders-read-handler.js';
import { buildAdminOrdersListDto } from './admin-orders.dto.js';
import { createAdminSuppliersRouteHandler } from './admin-suppliers-handler.js';
import { buildAdminSupplierDetailDto, buildAdminSuppliersListDto } from './admin-suppliers.dto.js';
import { createAdminAuthConfig } from './auth.js';
import { createStubCheckoutRouteHandler } from './checkout-stub-handler.js';
import { readBackendEnv } from './env.js';
import { updateAdminEventOverride, updateAdminLandingMatch, upsertAdminOrderTicket } from './dto.js';
import { buildPublicCatalogDto, clearPublicCatalogDtoCache, getPublicCatalogSessions } from './public-catalog.dto.js';
import { clearPublicArticlesDtoCache } from './public-articles.dto.js';
import { createPublicCatalogRouteHandler } from './public-catalog-handler.js';
import { buildPublicCityDto, buildPublicDestinationsDto, clearPublicCityDtoCache } from './public-city.dto.js';
import { createPublicCityRouteHandler } from './public-city-handler.js';
import { buildPublicEventDto, clearPublicEventDtoCache } from './public-event.dto.js';
import { createPublicEventRouteHandler } from './public-event-handler.js';
import { buildPublicVenueDto, buildPublicVenuesDto, clearPublicVenueDtoCache } from './public-venue.dto.js';
import { createPublicVenueRouteHandler } from './public-venue-handler.js';
import { createPublicReadStackWarmer } from './public-warmup.js';
import { createSupplierPortalRouteHandler } from './supplier-portal-handler.js';
import {
  buildSupplierPortalDashboardDto,
  buildSupplierPortalEventsListDto,
  buildSupplierPortalFinanceDto,
  buildSupplierPortalOrdersListDto,
  buildSupplierPortalProfileDto,
  buildSupplierPortalReviewsListDto,
} from './supplier-portal.dto.js';
import {
  db,
  handleRequest,
  invalidatePublicCaches,
  registerPublicCacheInvalidator,
  registerPublicCacheWarmer,
  startServer,
} from './server.js';
import { createAdminReviewsRouteHandler, createPublicReviewsRouteHandler } from './reviews-handler.js';
import { createValidatedHandler } from './validated-handler.js';

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
      createAdminSuppliersRouteHandler({
        buildSuppliersList: buildAdminSuppliersListDto,
        buildSupplierDetail: buildAdminSupplierDetailDto,
      }),
      createAdminEventScheduleRouteHandler({
        invalidatePublicCaches,
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
      createSupplierPortalRouteHandler({
        buildDashboard: buildSupplierPortalDashboardDto,
        buildProfile: buildSupplierPortalProfileDto,
        buildEventsList: buildSupplierPortalEventsListDto,
        buildOrdersList: buildSupplierPortalOrdersListDto,
        buildFinance: buildSupplierPortalFinanceDto,
        buildReviewsList: buildSupplierPortalReviewsListDto,
      }),
      createStubCheckoutRouteHandler(),
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
