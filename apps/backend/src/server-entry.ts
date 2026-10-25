import type { Server } from 'node:http';
import { createAccountPurchasesRouteHandler } from './account-purchases-handler.js';
import {
  buildAdminAdmissionProductsListDto,
  buildAdminVenueAdmissionProductsListDto,
  buildSupplierPortalAdmissionProductsListDto,
} from './admission-products.dto.js';
import { createAdminAdmissionProductsRouteHandler } from './admin-admission-products-handler.js';
import { buildAdminEventChangeRequestDetailDto, buildAdminEventChangeRequestsDto } from './admin-event-change-requests.dto.js';
import { createAdminEventChangeRequestsRouteHandler } from './admin-event-change-requests-handler.js';
import { createAdminEventScheduleRouteHandler } from './admin-event-schedule-handler.js';
import { createAdminEventsRouteHandler } from './admin-events-handler.js';
import { createAdminEventsReadRouteHandler } from './admin-events-read-handler.js';
import { buildAdminEventDetailDto, buildAdminEventsListDto } from './admin-events.dto.js';
import { buildAdminFinanceLedgerDto, closeAdminFinancePeriod } from './admin-finance.dto.js';
import { createAdminFinanceRouteHandler } from './admin-finance-handler.js';
import { applyApprovedEventChangeRequest } from './event-change-request-applier.js';
import { reviewEventChangeRequest } from './event-change-request-review.js';
import { createAdminLandingsRouteHandler } from './admin-landings-handler.js';
import { buildAdminListingHealthOverviewDto } from './admin-listing-health.dto.js';
import { createAdminListingHealthRouteHandler } from './admin-listing-health-handler.js';
import { createAdminOrdersRouteHandler } from './admin-orders-handler.js';
import { operateAdminInternalOrder } from './admin-order-operations.js';
import { createAdminOrdersReadRouteHandler } from './admin-orders-read-handler.js';
import { recordFinanceAdminAudit } from './admin-finance-audit.js';
import { createAdminFinanceAuditRouteHandler } from './admin-finance-audit-handler.js';
import { buildAdminOrderDetailDto, buildAdminOrdersListDto, createAdminOrderRefundRequestDto } from './admin-orders.dto.js';
import { createAdminSuppliersRouteHandler } from './admin-suppliers-handler.js';
import { createAdminSupplier } from './admin-supplier-create.js';
import { linkAdminSupplierVenue } from './admin-supplier-venue-link.js';
import { createAdminVenueRouteHandler } from './admin-venue-create-handler.js';
import { buildAdminSupplierDetailDto, buildAdminSuppliersListDto } from './admin-suppliers.dto.js';
import { createAdminAuthConfig } from './auth.js';
import { createStubCheckoutRouteHandler } from './checkout-stub-handler.js';
import { createYooKassaCheckoutRouteHandler } from './checkout-yookassa-handler.js';
import { readBackendEnv } from './env.js';
import { updateAdminEventOverride, updateAdminLandingMatch, upsertAdminOrderTicket } from './dto.js';
import { buildPublicCatalogDto, clearPublicCatalogDtoCache, getPublicCatalogSessions } from './public-catalog.dto.js';
import { clearPublicArticlesDtoCache } from './public-articles.dto.js';
import { createPublicCatalogRouteHandler } from './public-catalog-handler.js';
import { buildPublicCityDto, buildPublicDestinationsDto, clearPublicCityDtoCache } from './public-city.dto.js';
import { createPublicCityRouteHandler } from './public-city-handler.js';
import { createPublicCheckoutOrdersRouteHandler } from './public-checkout-orders-handler.js';
import { isOrderAccessSecretUsable } from './order-access.js';
import { buildPublicEventDto, clearPublicEventDtoCache } from './public-event.dto.js';
import { createPublicEventRouteHandler } from './public-event-handler.js';
import {
  buildPublicAdmissionProductDetailDto,
  buildPublicAdmissionProductsListDto,
  buildPublicSupplierProjectionDto,
  buildPublicVenueAdmissionProductsDto,
} from './public-finance-projection.dto.js';
import { createPublicFinanceProjectionRouteHandler } from './public-finance-projection-handler.js';
import { buildPublicVenueDto, buildPublicVenuesDto, buildPublicVenueEventCountsDto, clearPublicVenueDtoCache } from './public-venue.dto.js';
import { createPublicVenueRouteHandler } from './public-venue-handler.js';
import { createPublicReadStackWarmer } from './public-warmup.js';
import { buildPublicCheckoutOrderByCodeDto, buildPublicCheckoutPurchasesByEmailDto } from './purchase-projection.js';
import { createSupplierAdmissionYooKassaPurchaseRouteHandler } from './supplier-admission-yookassa-purchase-handler.js';
import { createSupplierAdmissionStubPurchaseRouteHandler } from './supplier-admission-stub-purchase-handler.js';
import { createSupplierAuthRouteHandler, resolveSupplierPortalSearchParams } from './supplier-auth-handler.js';
import { createSupplierChangeRequestsRouteHandler } from './supplier-change-requests-handler.js';
import { createSupplierPortalRouteHandler } from './supplier-portal-handler.js';
import { createSupplierProfileWriteRouteHandler } from './supplier-profile-write-handler.js';
import { inviteSupplierUser } from './supplier-invite.js';
import { updateSupplierUserAccess } from './supplier-user-access.js';
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
import { reviewSupplierLegalProfile } from './admin-supplier-legal-review.js';
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
const orderAccessSecret = env.DAIBILET_ORDER_ACCESS_SECRET || env.USER_JWT_SECRET || null;
const requireOrderAccess = env.DAIBILET_REQUIRE_ORDER_ACCESS === '1';
if (requireOrderAccess && !isOrderAccessSecretUsable(orderAccessSecret)) {
  throw new Error('DAIBILET_REQUIRE_ORDER_ACCESS requires a secret of at least 32 characters');
}
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
    adminRbacEnforce: env.DAIBILET_ADMIN_RBAC_ENFORCE === '1',
    adminSessionDb: db,
    routeHandlers: [
      createAdminVenueRouteHandler,
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
      createPublicFinanceProjectionRouteHandler({
        projectionToken: env.DAIBILET_FINANCE_PROJECTION_TOKEN || env.FINANCE_PROJECTION_TOKEN || null,
        buildAdmissionProductsList: buildPublicAdmissionProductsListDto,
        buildAdmissionProductDetail: buildPublicAdmissionProductDetailDto,
        buildVenueAdmissionProducts: buildPublicVenueAdmissionProductsDto,
        buildSupplierProjection: buildPublicSupplierProjectionDto,
      }),
      createPublicCheckoutOrdersRouteHandler({
        projectionToken: env.DAIBILET_FINANCE_PROJECTION_TOKEN || env.FINANCE_PROJECTION_TOKEN || null,
        orderAccessSecret,
        requireOrderAccess,
        buildOrderByCode: buildPublicCheckoutOrderByCodeDto,
        buildPurchasesByEmail: buildPublicCheckoutPurchasesByEmailDto,
      }),
      createAdminFinanceAuditRouteHandler({
        db,
        internalReadToken: env.DAIBILET_FINANCE_ADMIN_READ_TOKEN || null,
        actorAssertionSecret: env.DAIBILET_FINANCE_ACTOR_ASSERTION_SECRET || null,
        auditActorAccess: (entry) => recordFinanceAdminAudit(db, entry),
      }),
      createAdminOrdersReadRouteHandler({
        enabled: adminFlags.orders,
        buildOrdersList: buildAdminOrdersListDto,
        buildOrderDetail: buildAdminOrderDetailDto,
        internalReadToken: env.DAIBILET_FINANCE_ADMIN_READ_TOKEN || null,
        actorAssertionSecret: env.DAIBILET_FINANCE_ACTOR_ASSERTION_SECRET || null,
        auditActorAccess: (entry) => recordFinanceAdminAudit(db, entry),
      }),
      createAdminFinanceRouteHandler({
        enabled: adminFlags.orders,
        buildLedger: buildAdminFinanceLedgerDto,
        closePeriod: closeAdminFinancePeriod,
      }),
      createAdminEventsReadRouteHandler({
        enabled: adminFlags.events,
        buildEventsList: buildAdminEventsListDto,
        buildEventDetail: buildAdminEventDetailDto,
      }),
      createAdminSuppliersRouteHandler({
        buildSuppliersList: buildAdminSuppliersListDto,
        buildSupplierDetail: buildAdminSupplierDetailDto,
        reviewSupplierLegalProfile,
        inviteSupplierUser,
        updateSupplierUserAccess,
        createSupplier: createAdminSupplier,
        linkSupplierVenue: linkAdminSupplierVenue,
      }),
      createAdminAdmissionProductsRouteHandler({
        buildAdmissionProductsList: buildAdminAdmissionProductsListDto,
        buildVenueAdmissionProductsList: buildAdminVenueAdmissionProductsListDto,
      }),
      createAdminListingHealthRouteHandler({
        buildListingHealthOverview: buildAdminListingHealthOverviewDto,
      }),
      createAdminEventScheduleRouteHandler({
        invalidatePublicCaches,
      }),
      createAdminOrdersRouteHandler({
        db,
        upsertAdminOrderTicket,
        createRefundRequest: createAdminOrderRefundRequestDto,
        internalOperationToken: env.DAIBILET_FINANCE_ADMIN_OPERATION_TOKEN || null,
        actorAssertionSecret: env.DAIBILET_FINANCE_ACTOR_ASSERTION_SECRET || null,
        auditActorAccess: (entry) => recordFinanceAdminAudit(db, entry),
        operateInternalOrder: operateAdminInternalOrder,
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
      createSupplierAuthRouteHandler({ db }),
      createSupplierAdmissionStubPurchaseRouteHandler({
        resolveSearchParams: resolveSupplierPortalSearchParams,
      }),
      createSupplierAdmissionYooKassaPurchaseRouteHandler({
        resolveSearchParams: resolveSupplierPortalSearchParams,
      }),
      createSupplierProfileWriteRouteHandler({
        resolveSearchParams: resolveSupplierPortalSearchParams,
      }),
      createSupplierChangeRequestsRouteHandler({
        resolveSearchParams: resolveSupplierPortalSearchParams,
      }),
      createSupplierPortalRouteHandler({
        resolveSearchParams: resolveSupplierPortalSearchParams,
        buildDashboard: buildSupplierPortalDashboardDto,
        buildProfile: buildSupplierPortalProfileDto,
        buildEventsList: buildSupplierPortalEventsListDto,
        buildAdmissionsList: buildSupplierPortalAdmissionProductsListDto,
        buildOrdersList: buildSupplierPortalOrdersListDto,
        buildFinance: buildSupplierPortalFinanceDto,
        buildReviewsList: buildSupplierPortalReviewsListDto,
      }),
      createAccountPurchasesRouteHandler({ db }),
      createStubCheckoutRouteHandler({ orderAccessSecret }),
      createYooKassaCheckoutRouteHandler({ orderAccessSecret }),
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
