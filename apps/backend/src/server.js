import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createDb } from './db.js';
import {
  buildAdminDashboard,
  buildAdminBuyersList,
  buildAdminCitiesList,
  buildAdminEventDetail,
  buildAdminEventsList,
  buildAdminLandingDetail,
  buildAdminLandingEventCandidates,
  buildAdminOrderEventCandidates,
  buildAdminOrderDetail,
  buildAdminOrdersList,
  buildAdminLandingsList,
  buildAdminSources,
  buildAdminTaxonomy,
  buildAdminVenueDetail,
  buildAdminVenuesList,
  buildCatalogSessions,
  sessionHasCoverImage,
  spreadCatalogSessionsByCoverImage,
  buildPublicBuyerOrders,
  buildAccountPurchases,
  buildAccountOrderDetail,
  buildPublicCityPage,
  buildPublicEventPage,
  buildPublicLandingPage,
  buildPublicLandingPageManaged,
  buildPublicVenuePage,
  buildPublicVenuesCatalog,
  buildPublicHome,
  buildPublicHomePreview,
  buildPublicDestinations,
  buildPublicStats,
  buildPublicSearch,
  buildPublicPromoBlocks,
  buildPublicLandingsCatalog,
  buildPublicArticlesList,
  buildPublicArticlePage,
  buildAdminArticlesList,
  buildAdminArticleDetail,
  upsertAdminArticle,
  publicVenueSlug,
  publicVenuePageTemplate,
  clearPublicDataCaches,
  warmPublicCatalogCache,
  runLandingAudit,
  updateAdminEventOverride,
  updateAdminEventTaxonomy,
  upsertAdminOrderTicket,
  updateAdminLanding,
  updateAdminLandingMatch,
  updateAdminVenue,
} from './dto.js';
import {
  buildSocialPreviewForPath,
  isSocialPreviewAgent,
  renderSocialPreviewHtml,
} from './social-preview.js';
import {
  assertAuthRateLimit,
  authenticateAccessToken,
  buildClearRefreshCookie,
  buildRefreshCookie,
  loginSiteUser,
  logoutSiteUser,
  parseBearerToken,
  parseCookies,
  refreshSiteUserSession,
  registerSiteUser,
  requireSiteUserFromRequest,
} from './user-auth.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(dirname, '..', '..', '..');
loadRootEnv(rootDir);
const port = Number(process.env.PORT || 4000);
export const db = createDb(rootDir);
const adminAuth = {
  email: process.env.ADMIN_EMAIL || process.env.ADMIN_USER || '',
  password: process.env.ADMIN_PASSWORD || '',
  passwordHash: process.env.ADMIN_PASSWORD_SHA256 || process.env.ADMIN_PASSWORD_HASH || '',
  realm: process.env.ADMIN_AUTH_REALM || 'Daibilet admin',
};

const TEP_AUTO_SYNC_INTERVAL_MS = Number(process.env.TEP_AUTO_SYNC_INTERVAL_MS || 6 * 60 * 60 * 1000);
let tepAutoSyncInFlight = false;

const jsonCache = new Map();
const PUBLIC_RESPONSE_CACHE_MS = 5 * 60 * 1000;
const PUBLIC_HTTP_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';
const MAX_PUBLIC_RESPONSE_CACHE_ENTRIES = 80;
const publicResponseCache = new Map();
const publicCacheInvalidators = new Set();
const publicCacheWarmers = new Set();
let activeCorsRequest = null;

function getAllowedOrigins() {
  const raw =
    process.env.PUBLIC_CORS_ORIGINS ||
    'https://daibilet.ru,https://www.daibilet.ru,http://localhost:5173,http://127.0.0.1:5173';
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function routeNeedsCredentials(request) {
  if (!request?.url) return false;
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
  return pathname.startsWith('/api/auth/') || pathname.startsWith('/api/account/');
}

function buildCorsHeaders(request, { credentials = false } = {}) {
  const origin = String(request?.headers?.origin || '').trim();
  const allowed = getAllowedOrigins();
  const base = {
    'access-control-allow-methods': 'GET, PATCH, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
  };

  if (credentials && origin && allowed.includes(origin)) {
    return {
      ...base,
      'access-control-allow-origin': origin,
      'access-control-allow-credentials': 'true',
      vary: 'Origin',
    };
  }

  if (origin && allowed.includes(origin)) {
    return {
      ...base,
      'access-control-allow-origin': origin,
      vary: 'Origin',
    };
  }

  return {
    ...base,
    'access-control-allow-origin': '*',
  };
}

function loadRootEnv(projectRoot) {
  try {
    const source = readFileSync(path.join(projectRoot, '.env'), 'utf8');
    for (const line of source.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex <= 0) continue;
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && process.env[key] == null) process.env[key] = value;
    }
  } catch {
    // Local development can also pass env vars through the process.
  }
}

export async function handleRequest(request, response) {
  activeCorsRequest = request;
  try {
    if (request.method === 'OPTIONS') {
      sendEmpty(response, 204);
      return;
    }

    const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);
    const route = `${request.method} ${url.pathname}`;

    if (isProtectedPath(url.pathname) && !isAuthorizedAdminRequest(request)) {
      sendAuthRequired(response);
      return;
    }

    if (route === 'GET /api/health') {
      sendJson(response, {
        ok: true,
        service: 'daibilet-backend',
        brand: 'Дайбилет',
        db: 'configured',
        generatedAt: new Date().toISOString(),
      });
      return;
    }

    if (route === 'GET /api/db/stats') {
      sendJson(response, await db.stats());
      return;
    }

    if (route === 'GET /api/db/events') {
      sendJson(response, {
        items: await db.recentEvents(clampNumber(url.searchParams.get('limit'), 1, 100, 20)),
      });
      return;
    }

    if (route === 'GET /api/public/home') {
      if (url.searchParams.get('refresh') === '1') invalidatePublicCaches('public home refresh');
      sendJson(response, await withDataFallback(() => buildPublicHome(db), 'apps/public/data.js', 'PUBLIC_DATA'));
      return;
    }

    if (route === 'GET /api/public/stats') {
      if (url.searchParams.get('refresh') === '1') invalidatePublicCaches('public stats refresh');
      sendPublicJson(response, await withPublicResponseCache('stats', () => buildPublicStats(db)));
      return;
    }

    if (route === 'GET /api/public/social-preview') {
      const previewPath = String(url.searchParams.get('path') || '').trim();
      const meta = await buildSocialPreviewForPath(db, previewPath, {
        buildPublicVenuePage,
        buildPublicEventPage,
        buildPublicArticlePage,
        buildPublicCityPage,
        publicVenueSlug,
        publicVenuePageTemplate,
      });
      const html = renderSocialPreviewHtml(meta || undefined, {
        redirectPath: meta?.redirectPath || meta?.url || previewPath,
      });
      response.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300, stale-while-revalidate=600',
        ...buildCorsHeaders(request),
      });
      response.end(html);
      return;
    }

    if (route === 'GET /api/public/articles') {
      sendPublicJson(response, await withPublicResponseCache('articles:list', () => buildPublicArticlesList(db)));
      return;
    }

    const publicArticleMatch = request.method === 'GET' ? url.pathname.match(/^\/api\/public\/articles\/([^/]+)$/) : null;
    if (publicArticleMatch) {
      const articleSlug = decodeURIComponent(publicArticleMatch[1]);
      const payload = await withPublicResponseCache(`articles:${articleSlug}`, () => buildPublicArticlePage(db, articleSlug));
      sendPublicJson(response, payload || { error: 'article_not_found' }, payload ? 200 : 404);
      return;
    }

    if (route === 'GET /api/public/destinations') {
      if (url.searchParams.get('refresh') === '1') invalidatePublicCaches('public destinations refresh');
      sendPublicJson(response, await withPublicResponseCache('destinations', () => buildPublicDestinations(db)));
      return;
    }

    if (route === 'GET /api/public/venues') {
      if (url.searchParams.get('refresh') === '1') invalidatePublicCaches('public venues refresh');
      sendPublicJson(
        response,
        await withPublicResponseCache(`venues:${canonicalSearchParams(url.searchParams)}`, () => buildPublicVenuesCatalog(db, url.searchParams)),
      );
      return;
    }

    if (route === 'GET /api/public/home/preview') {
      if (url.searchParams.get('refresh') === '1') invalidatePublicCaches('public home preview refresh');
      sendPublicJson(response, await withPublicResponseCache('home:preview', () => buildPublicHomePreview(db)));
      return;
    }

    if (route === 'GET /api/public/events') {
      if (url.searchParams.get('refresh') === '1') {
        publicResponseCache.clear();
        clearPublicDataCaches();
      }
      const catalogCacheKey = `events:${canonicalSearchParams(url.searchParams, ['refresh'])}`;
      const catalogPayload =
        url.searchParams.get('refresh') === '1'
          ? await withDataFallback(() => buildCatalogSessions(db, url.searchParams), 'apps/public/data.js', 'PUBLIC_DATA', (payload) => filterSessions(payload.sessions || [], url.searchParams))
          : await withPublicResponseCache(catalogCacheKey, () =>
              withDataFallback(() => buildCatalogSessions(db, url.searchParams), 'apps/public/data.js', 'PUBLIC_DATA', (payload) => filterSessions(payload.sessions || [], url.searchParams)),
            );
      if (url.searchParams.get('refresh') === '1') sendJson(response, catalogPayload);
      else sendPublicJson(response, catalogPayload);
      return;
    }

    if (route === 'GET /api/public/search') {
      sendPublicJson(response, await withPublicResponseCache(`search:${canonicalSearchParams(url.searchParams)}`, () => buildPublicSearch(db, url.searchParams)));
      return;
    }

    if (route === 'GET /api/public/promo-blocks') {
      sendPublicJson(response, await withPublicResponseCache(`promo-blocks:${canonicalSearchParams(url.searchParams)}`, () => buildPublicPromoBlocks(db, url.searchParams)));
      return;
    }

    if (route === 'GET /api/public/landings-catalog') {
      sendPublicJson(response, await withPublicResponseCache(`landings-catalog:${canonicalSearchParams(url.searchParams)}`, () => buildPublicLandingsCatalog(db, url.searchParams)));
      return;
    }

    if (route === 'GET /api/public/orders') {
      sendJson(response, await buildPublicBuyerOrders(db, url.searchParams));
      return;
    }

    if (route === 'POST /api/user/auth/register') {
      try {
        const clientIp = String(request.headers['x-real-ip'] || request.socket.remoteAddress || 'unknown');
        assertAuthRateLimit(`register:${clientIp}`, 10);
        const body = await readJsonBody(request);
        const tokens = await registerSiteUser(db, body);
        sendJson(response, { accessToken: tokens.accessToken }, 201, {
          'Set-Cookie': buildRefreshCookie(tokens.refreshToken),
        });
      } catch (error) {
        sendJson(response, { error: error.message || 'register_failed' }, error.statusCode || 400);
      }
      return;
    }

    if (route === 'POST /api/user/auth/login') {
      try {
        const clientIp = String(request.headers['x-real-ip'] || request.socket.remoteAddress || 'unknown');
        assertAuthRateLimit(`login:${clientIp}`, 20);
        const body = await readJsonBody(request);
        const tokens = await loginSiteUser(db, body?.email, body?.password);
        sendJson(response, { accessToken: tokens.accessToken }, 200, {
          'Set-Cookie': buildRefreshCookie(tokens.refreshToken),
        });
      } catch (error) {
        sendJson(response, { error: error.message || 'login_failed' }, error.statusCode || 401);
      }
      return;
    }

    if (route === 'POST /api/user/auth/refresh') {
      try {
        const cookies = parseCookies(request);
        const refreshToken = cookies.user_refresh_token || (await readJsonBody(request))?.refreshToken;
        if (!refreshToken) {
          sendJson(response, { accessToken: null }, 200);
          return;
        }
        const tokens = await refreshSiteUserSession(db, refreshToken);
        sendJson(response, { accessToken: tokens.accessToken }, 200, {
          'Set-Cookie': buildRefreshCookie(tokens.refreshToken),
        });
      } catch (error) {
        sendJson(response, { error: error.message || 'refresh_failed', accessToken: null }, error.statusCode || 401, {
          'Set-Cookie': buildClearRefreshCookie(),
        });
      }
      return;
    }

    if (route === 'POST /api/user/auth/logout') {
      try {
        const token = parseBearerToken(request);
        const payload = token ? authenticateAccessToken(token) : null;
        if (payload?.sub) await logoutSiteUser(db, payload.sub);
        sendJson(response, { ok: true }, 200, { 'Set-Cookie': buildClearRefreshCookie() });
      } catch {
        sendJson(response, { ok: true }, 200, { 'Set-Cookie': buildClearRefreshCookie() });
      }
      return;
    }

    if (route === 'GET /api/user/auth/me') {
      try {
        const user = await requireSiteUserFromRequest(db, request);
        sendJson(response, user);
      } catch (error) {
        sendJson(response, { error: error.message || 'unauthorized' }, error.statusCode || 401);
      }
      return;
    }

    if (route === 'GET /api/account/purchases') {
      try {
        const user = await requireSiteUserFromRequest(db, request);
        sendJson(response, await buildAccountPurchases(db, user.email, url.searchParams));
      } catch (error) {
        sendJson(response, { error: error.message || 'unauthorized' }, error.statusCode || 401);
      }
      return;
    }

    const accountOrderMatch = request.method === 'GET' ? url.pathname.match(/^\/api\/account\/orders\/([^/]+)$/) : null;
    if (accountOrderMatch) {
      try {
        const user = await requireSiteUserFromRequest(db, request);
        const detail = await buildAccountOrderDetail(db, user.email, decodeURIComponent(accountOrderMatch[1]));
        sendJson(response, detail || { error: 'order_not_found' }, detail ? 200 : 404);
      } catch (error) {
        sendJson(response, { error: error.message || 'unauthorized' }, error.statusCode || 401);
      }
      return;
    }

    const publicVenueMatch = request.method === 'GET' ? url.pathname.match(/^\/api\/public\/venues\/([^/]+)$/) : null;
    if (publicVenueMatch) {
      const venueSlug = decodeURIComponent(publicVenueMatch[1]);
      const payload = await withPublicResponseCache(`venue:${venueSlug}`, () => buildPublicVenuePage(db, venueSlug));
      sendPublicJson(response, payload || { error: 'venue_not_found' }, payload ? 200 : 404);
      return;
    }

    const publicCityMatch = request.method === 'GET' ? url.pathname.match(/^\/api\/public\/cities\/([^/]+)$/) : null;
    if (publicCityMatch) {
      const citySlug = decodeURIComponent(publicCityMatch[1]);
      sendPublicJson(response, await withPublicResponseCache(`city:${citySlug}`, () => buildPublicCityPage(db, citySlug)));
      return;
    }

    const publicLandingMatch = request.method === 'GET' ? url.pathname.match(/^\/api\/public\/landings\/([^/]+)$/) : null;
    if (publicLandingMatch) {
      const landingSlug = decodeURIComponent(publicLandingMatch[1]);
      sendPublicJson(response, await withPublicResponseCache(`landing:${landingSlug}`, () => buildPublicLandingPageWithFallback(db, landingSlug)));
      return;
    }

    const publicEventMatch = request.method === 'GET' ? url.pathname.match(/^\/api\/public\/events\/([^/]+)$/) : null;
    if (publicEventMatch) {
      const eventSlug = decodeURIComponent(publicEventMatch[1]);
      sendPublicJson(response, await withPublicResponseCache(`event:${eventSlug}`, () => buildPublicEventPage(db, eventSlug)));
      return;
    }

    if (route === 'GET /api/admin/dashboard') {
      sendJson(response, await withDataFallback(() => buildAdminDashboard(db), 'apps/admin/data.js', 'ADMIN_DATA'));
      return;
    }

    if (route === 'GET /api/admin/sources') {
      sendJson(response, await buildAdminSources(db));
      return;
    }

    if (route === 'POST /api/v1/tep/sync') {
      const result = await runTeplohodSync();
      invalidatePublicCaches('teplohod sync', { warm: true });
      const landingAudit = await runLandingAudit(db, rootDir);
      sendJson(response, { ...result, landingAudit });
      return;
    }

    if (route === 'POST /api/v1/tc/sync' || route === 'POST /api/admin/sources/ticketscloud/sync') {
      const result = await runTicketscloudCatalogSync();
      invalidatePublicCaches('ticketscloud catalog sync', { warm: true });
      sendJson(response, result);
      return;
    }

    if (route === 'POST /api/v1/tc/orders/sync' || route === 'POST /api/admin/orders/sync') {
      const result = await runTicketscloudOrdersSync(url.searchParams);
      sendJson(response, result);
      return;
    }

    if (route === 'GET /api/admin/events') {
      sendJson(response, await buildAdminEventsList(db, url.searchParams));
      return;
    }

    if (route === 'GET /api/admin/order-event-candidates') {
      sendJson(response, await buildAdminOrderEventCandidates(db, url.searchParams));
      return;
    }

    if (route === 'GET /api/admin/orders' || route === 'GET /api/admin/external-orders') {
      sendJson(response, await buildAdminOrdersList(db, url.searchParams));
      return;
    }

    if (route === 'GET /api/admin/buyers') {
      sendJson(response, await buildAdminBuyersList(db, url.searchParams));
      return;
    }

    const orderDetailMatch = request.method === 'GET' ? url.pathname.match(/^\/api\/admin\/orders\/([^/]+)$/) : null;
    if (orderDetailMatch) {
      const detail = await buildAdminOrderDetail(db, decodeURIComponent(orderDetailMatch[1]));
      sendJson(response, detail || { error: 'order_not_found' }, detail ? 200 : 404);
      return;
    }

    const orderTicketUpsertMatch = request.method === 'POST' ? url.pathname.match(/^\/api\/admin\/orders\/([^/]+)\/tickets$/) : null;
    if (orderTicketUpsertMatch) {
      sendJson(response, await upsertAdminOrderTicket(db, decodeURIComponent(orderTicketUpsertMatch[1]), await readJsonBody(request)));
      return;
    }

    if (route === 'GET /api/admin/landings') {
      sendJson(response, await buildAdminLandingsList(db));
      return;
    }

    if (route === 'GET /api/admin/cities') {
      sendJson(response, await buildAdminCitiesList(db));
      return;
    }

    const landingCandidatesMatch = request.method === 'GET' ? url.pathname.match(/^\/api\/admin\/landings\/([^/]+)\/candidates$/) : null;
    if (landingCandidatesMatch) {
      sendJson(response, await buildAdminLandingEventCandidates(db, decodeURIComponent(landingCandidatesMatch[1]), url.searchParams));
      return;
    }

    const landingDetailMatch = request.method === 'GET' ? url.pathname.match(/^\/api\/admin\/landings\/([^/]+)$/) : null;
    if (landingDetailMatch) {
      sendJson(response, await buildAdminLandingDetail(db, decodeURIComponent(landingDetailMatch[1])));
      return;
    }

    const landingUpdateMatch = request.method === 'PATCH' ? url.pathname.match(/^\/api\/admin\/landings\/([^/]+)$/) : null;
    if (landingUpdateMatch) {
      const result = await updateAdminLanding(db, decodeURIComponent(landingUpdateMatch[1]), await readJsonBody(request));
      invalidatePublicCaches('landing update');
      sendJson(response, result);
      return;
    }

    const landingMatchUpdateMatch = request.method === 'PATCH' ? url.pathname.match(/^\/api\/admin\/landings\/([^/]+)\/matches\/([^/]+)$/) : null;
    if (landingMatchUpdateMatch) {
      const result = await updateAdminLandingMatch(
        db,
        decodeURIComponent(landingMatchUpdateMatch[1]),
        decodeURIComponent(landingMatchUpdateMatch[2]),
        await readJsonBody(request),
      );
      invalidatePublicCaches('landing match update');
      sendJson(response, result);
      return;
    }

    if (route === 'GET /api/admin/venues') {
      sendJson(response, await buildAdminVenuesList(db, url.searchParams));
      return;
    }

    if (route === 'GET /api/admin/taxonomy') {
      sendJson(response, await buildAdminTaxonomy(db));
      return;
    }

    const venueDetailMatch = request.method === 'GET' ? url.pathname.match(/^\/api\/admin\/venues\/([^/]+)$/) : null;
    if (venueDetailMatch) {
      sendJson(response, await buildAdminVenueDetail(db, decodeURIComponent(venueDetailMatch[1])));
      return;
    }

    const venueUpdateMatch = request.method === 'PATCH' ? url.pathname.match(/^\/api\/admin\/venues\/([^/]+)$/) : null;
    if (venueUpdateMatch) {
      const result = await updateAdminVenue(db, decodeURIComponent(venueUpdateMatch[1]), await readJsonBody(request));
      invalidatePublicCaches('venue update');
      sendJson(response, result);
      return;
    }

    if (route === 'GET /api/admin/articles') {
      sendJson(response, await buildAdminArticlesList(db));
      return;
    }

    if (route === 'POST /api/admin/articles') {
      const result = await upsertAdminArticle(db, null, await readJsonBody(request));
      invalidatePublicCaches('article create');
      sendJson(response, result, 201);
      return;
    }

    const articleDetailMatch = request.method === 'GET' ? url.pathname.match(/^\/api\/admin\/articles\/([^/]+)$/) : null;
    if (articleDetailMatch) {
      const detail = await buildAdminArticleDetail(db, decodeURIComponent(articleDetailMatch[1]));
      sendJson(response, detail || { error: 'article_not_found' }, detail ? 200 : 404);
      return;
    }

    const articleUpdateMatch = request.method === 'PATCH' ? url.pathname.match(/^\/api\/admin\/articles\/([^/]+)$/) : null;
    if (articleUpdateMatch) {
      const result = await upsertAdminArticle(db, decodeURIComponent(articleUpdateMatch[1]), await readJsonBody(request));
      invalidatePublicCaches('article update');
      sendJson(response, result);
      return;
    }

    const eventDetailMatch = request.method === 'GET' ? url.pathname.match(/^\/api\/admin\/events\/([^/]+)$/) : null;
    if (eventDetailMatch) {
      sendJson(response, await buildAdminEventDetail(db, decodeURIComponent(eventDetailMatch[1])));
      return;
    }

    const eventOverrideMatch = request.method === 'PATCH' ? url.pathname.match(/^\/api\/admin\/events\/([^/]+)\/override$/) : null;
    if (eventOverrideMatch) {
      const result = await updateAdminEventOverride(db, decodeURIComponent(eventOverrideMatch[1]), await readJsonBody(request));
      invalidatePublicCaches('event override update');
      sendJson(response, result);
      return;
    }

    const eventModerationMatch = request.method === 'PATCH' ? url.pathname.match(/^\/api\/admin\/events\/([^/]+)\/moderation$/) : null;
    if (eventModerationMatch) {
      const body = await readJsonBody(request);
      const result = await updateAdminEventOverride(db, decodeURIComponent(eventModerationMatch[1]), { editorStatus: body.editorStatus });
      invalidatePublicCaches('event moderation update');
      sendJson(response, result);
      return;
    }

    const eventTaxonomyMatch = request.method === 'PATCH' ? url.pathname.match(/^\/api\/admin\/events\/([^/]+)\/taxonomy$/) : null;
    if (eventTaxonomyMatch) {
      const result = await updateAdminEventTaxonomy(db, decodeURIComponent(eventTaxonomyMatch[1]), await readJsonBody(request));
      invalidatePublicCaches('event taxonomy update');
      sendJson(response, result);
      return;
    }

    if (route === 'GET /api/catalog/sessions') {
      sendJson(response, await withDataFallback(() => buildCatalogSessions(db, url.searchParams), 'apps/public/data.js', 'PUBLIC_DATA', (payload) => filterSessions(payload.sessions || [], url.searchParams)));
      return;
    }

    if (route === 'GET /api/sources/ticketscloud/summary') {
      sendJson(response, await readJson('data/ticketscloud/summary.public.json'));
      return;
    }

    sendJson(response, { error: 'not_found', path: url.pathname }, 404);
  } catch (error) {
    sendJson(
      response,
      {
        error: 'internal_error',
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  } finally {
    activeCorsRequest = null;
  }
}

export function startServer(options = {}) {
  const host = options.host || '127.0.0.1';
  const serverPort = Number(options.port || port);
  const requestHandler = options.handler || handleRequest;
  const server = createServer(requestHandler);
  const listen = () => server.listen(serverPort, host, () => {
    console.log(`Daibilet backend listening on http://${host}:${serverPort}`);
    if (!options.prewarmBeforeListen) void warmPublicCaches('startup');
    scheduleTeplohodAutoSync();
  });
  if (options.prewarmBeforeListen) {
    console.log('Warming public caches before listen...');
    void warmPublicCaches('startup').finally(listen);
  } else {
    listen();
  }
  return server;
}

if (isMainModule()) {
  startServer();
}

function isMainModule() {
  const entry = process.argv[1];
  return Boolean(entry && import.meta.url === pathToFileURL(entry).href);
}

function scheduleTeplohodAutoSync() {
  if (!Number.isFinite(TEP_AUTO_SYNC_INTERVAL_MS) || TEP_AUTO_SYNC_INTERVAL_MS < 60_000) {
    return;
  }

  const run = async (reason) => {
    if (tepAutoSyncInFlight) {
      console.log(`Teplohod auto-sync skipped (${reason}): previous run still active`);
      return;
    }

    tepAutoSyncInFlight = true;
    const startedAt = Date.now();
    try {
      console.log(`Teplohod auto-sync started (${reason})`);
      const result = await runTeplohodSync();
      invalidatePublicCaches('teplohod auto-sync', { warm: true });
      const landingAudit = await runLandingAudit(db, rootDir);
      const elapsed = Date.now() - startedAt;
      console.log(
        `Teplohod auto-sync finished in ${elapsed}ms: imported=${result.stats?.importedEvents ?? '?'}, sessions=${result.stats?.sessions ?? '?'}, openDate=${result.stats?.openDateEvents ?? '?'}, audit=${landingAudit?.summary?.failed ?? 0} failed`,
      );
    } catch (error) {
      console.warn(
        `Teplohod auto-sync failed (${reason}): ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      tepAutoSyncInFlight = false;
    }
  };

  const firstDelayMs = Math.min(120_000, TEP_AUTO_SYNC_INTERVAL_MS);
  setTimeout(() => {
    void run('startup-delay');
  }, firstDelayMs);
  setInterval(() => {
    void run('interval');
  }, TEP_AUTO_SYNC_INTERVAL_MS);
  console.log(`Teplohod auto-sync enabled: every ${Math.round(TEP_AUTO_SYNC_INTERVAL_MS / 60000)} min, first run in ${Math.round(firstDelayMs / 1000)}s`);
}

async function buildPublicLandingPageWithFallback(db, landingSlug) {
  const managed = await buildPublicLandingPageManaged(db, landingSlug);
  if (managed) return managed;
  return buildPublicLandingPage(db, landingSlug);
}

export async function warmPublicCaches(reason) {
  const startedAt = Date.now();
  try {
    const [[destinations, preview, stats], typed] = await Promise.all([
      Promise.all([
        buildPublicDestinations(db),
        buildPublicHomePreview(db),
        buildPublicStats(db),
        warmPublicCatalogCache(db),
      ]),
      Promise.all([...publicCacheWarmers].map((warmer) => Promise.resolve().then(() => warmer(reason)))),
    ]);
    await Promise.all([
      withPublicResponseCache('venues:family=institution&limit=500', () =>
        buildPublicVenuesCatalog(db, new URLSearchParams({ family: 'institution', limit: '500' })),
      ),
      withPublicResponseCache('venues:family=location&limit=500', () =>
        buildPublicVenuesCatalog(db, new URLSearchParams({ family: 'location', limit: '500' })),
      ),
    ]);
    const elapsed = Date.now() - startedAt;
    const typedSummary = typed.filter(Boolean).map((item) =>
      `${item.events || 0} typed events in ${item.elapsedMs || elapsed}ms`).join(', ');
    console.log(
      `Public cache warmed after ${reason}: ${stats?.stats?.events || preview?.sessions?.length || 0} events, ${destinations?.destinations?.length || 0} destinations in ${elapsed}ms${typedSummary ? `; ${typedSummary}` : ''}`,
    );
    return { elapsedMs: elapsed, typed };
  } catch (error) {
    console.warn(`Public cache warm failed after ${reason}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

export function invalidatePublicCaches(reason, options = {}) {
  publicResponseCache.clear();
  clearPublicDataCaches();
  for (const invalidator of publicCacheInvalidators) {
    try {
      invalidator(reason, options);
    } catch (error) {
      console.warn(`Public cache invalidator failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (options.warm) void warmPublicCaches(reason);
}

export function registerPublicCacheInvalidator(invalidator) {
  publicCacheInvalidators.add(invalidator);
  return () => publicCacheInvalidators.delete(invalidator);
}

export function registerPublicCacheWarmer(warmer) {
  publicCacheWarmers.add(warmer);
  return () => publicCacheWarmers.delete(warmer);
}

async function readJson(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  const cached = jsonCache.get(absolutePath);
  if (cached) return cached;
  const payload = JSON.parse(await readFile(absolutePath, 'utf8'));
  jsonCache.set(absolutePath, payload);
  return payload;
}

async function readWindowData(relativePath, variableName) {
  const absolutePath = path.join(rootDir, relativePath);
  const cached = jsonCache.get(absolutePath);
  if (cached) return cached;

  const source = await readFile(absolutePath, 'utf8');
  const prefix = `window.${variableName} = `;
  if (!source.startsWith(prefix)) {
    throw new Error(`Unexpected data file format: ${relativePath}`);
  }

  const jsonText = source.slice(prefix.length).replace(/;\s*$/, '');
  const payload = JSON.parse(jsonText);
  jsonCache.set(absolutePath, payload);
  return payload;
}

async function withDataFallback(factory, relativePath, variableName, fallbackMapper = (payload) => payload) {
  try {
    return await factory();
  } catch (error) {
    console.warn(`Falling back to ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    return fallbackMapper(await readWindowData(relativePath, variableName));
  }
}

async function withPublicResponseCache(key, factory) {
  const now = Date.now();
  const cached = publicResponseCache.get(key);
  if (cached && cached.expiresAt > now) return cached.payload;

  const payload = await factory();
  publicResponseCache.set(key, {
    expiresAt: now + PUBLIC_RESPONSE_CACHE_MS,
    payload,
  });
  trimPublicResponseCache();
  return payload;
}

function trimPublicResponseCache() {
  if (publicResponseCache.size <= MAX_PUBLIC_RESPONSE_CACHE_ENTRIES) return;
  const overflow = publicResponseCache.size - MAX_PUBLIC_RESPONSE_CACHE_ENTRIES;
  for (const key of Array.from(publicResponseCache.keys()).slice(0, overflow)) {
    publicResponseCache.delete(key);
  }
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function filterSessions(sessions, searchParams) {
  const limit = clampNumber(searchParams.get('limit'), 1, 240, 120);
  const offset = clampNumber(searchParams.get('offset'), 0, 100000, 0);
  const query = String(searchParams.get('q') || '').trim().toLowerCase();
  const destination = searchParams.get('destination');
  const city = searchParams.get('city');
  const category = searchParams.get('category');
  const landing = searchParams.get('landing');
  const date = searchParams.get('date');
  const sort = searchParams.get('sort') || 'time';
  const maxPrice = Number(searchParams.get('maxPrice'));
  const minPrice = Number(searchParams.get('minPrice'));
  const dateFrom = String(searchParams.get('dateFrom') || '').trim();
  const dateTo = String(searchParams.get('dateTo') || '').trim();
  const ageMax = Number(searchParams.get('ageMax'));
  const facets = buildFallbackFacets(sessions);

  const rows = sessions.filter((session) => {
    if (!sessionHasCoverImage(session)) return false;
    if (destination && destination !== 'all' && session.destination !== destination) return false;
    if (city && city !== 'all' && session.city !== city && session.destination !== city) return false;
    if (category && category !== 'all' && session.category !== category && !(session.tags || []).includes(category)) return false;
    if (landing && landing !== 'all' && !(session.landingSlugs || []).includes(landing)) return false;
    if (dateFrom || dateTo) {
      if (!matchesFallbackCatalogDateRange(session, dateFrom, dateTo)) return false;
    } else if (date && date !== 'all' && !matchesSessionDate(session, date)) return false;
    if (!matchesFallbackCatalogPrice(session, minPrice, maxPrice)) return false;
    if (Number.isFinite(ageMax) && ageMax >= 0 && !matchesFallbackCatalogAgeLimit(session, ageMax)) return false;
    if (!query) return true;
    const haystack = [
      session.title,
      session.city,
      session.destination,
      session.venue,
      session.category,
      ...(session.tags || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });

  const sorted = sortPublicSessions(rows, sort);
  const arranged = sort === 'price' || sort === 'time' ? sorted : spreadCatalogSessionsByCoverImage(sorted);
  return {
    total: arranged.length,
    offset,
    limit,
    items: arranged.slice(offset, offset + limit),
    facets,
  };
}

function buildFallbackFacets(sessions) {
  return {
    cities: countSessionValues(sessions.map((session) => session.city || session.destination)).map(([name, events]) => ({ name, events })),
    categories: countSessionValues(sessions.map((session) => session.category)).map(([name, events]) => ({ name, events })),
    tags: countSessionValues(sessions.flatMap((session) => session.tags || []))
      .filter(([name]) => name.length <= 32)
      .slice(0, 24)
      .map(([name, events]) => ({ name, events })),
    landings: countSessionValues(sessions.flatMap((session) => session.landingSlugs || []))
      .map(([slug, events]) => ({ slug, title: humanizeSlug(slug), events })),
    priceSteps: buildFallbackPriceSteps(sessions),
  };
}

function sortPublicSessions(sessions, sort) {
  const sorted = [...sessions];
  if (sort === 'price') {
    return sorted.sort((a, b) => {
      const aPrice = Number.isFinite(a.priceFrom) ? a.priceFrom : Number.POSITIVE_INFINITY;
      const bPrice = Number.isFinite(b.priceFrom) ? b.priceFrom : Number.POSITIVE_INFINITY;
      return aPrice - bPrice || comparePublicSessionTime(a, b);
    });
  }
  if (sort === 'popular') {
    return sorted.sort((a, b) => (b.sessionCount || 1) - (a.sessionCount || 1) || comparePublicSessionTime(a, b));
  }
  return sorted.sort(comparePublicSessionTime);
}

function comparePublicSessionTime(a, b) {
  const aTime = a.startsAt ? new Date(a.startsAt).getTime() : Number.POSITIVE_INFINITY;
  const bTime = b.startsAt ? new Date(b.startsAt).getTime() : Number.POSITIVE_INFINITY;
  return aTime - bTime || String(a.title || '').localeCompare(String(b.title || ''), 'ru');
}

function countSessionValues(values) {
  const counts = new Map();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'ru'));
}

function buildFallbackPriceSteps(sessions) {
  const max = sessions
    .map((session) => session.priceFrom)
    .filter((price) => Number.isFinite(price) && price >= 100)
    .sort((a, b) => a - b)
    .at(-1);
  const candidates = [500, 1000, 1500, 2000, 3000, 5000].filter((price) => Number.isFinite(max) && price <= max);
  return candidates.length ? candidates : [1000, 2000, 3000];
}

function humanizeSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function matchesFallbackCatalogAgeLimit(session, ageMax) {
  const raw = session.ageLimit;
  if (raw == null || raw === '') return true;
  const match = String(raw).match(/\d+/);
  if (!match) return true;
  const limit = Number(match[0]);
  return Number.isFinite(limit) ? limit <= ageMax : true;
}

function matchesFallbackCatalogDateRange(session, dateFrom, dateTo) {
  const from = dateFrom ? startOfLocalDay(new Date(dateFrom)) : null;
  const to = dateTo ? startOfLocalDay(new Date(dateTo)) : null;
  if (!from && !to) return true;
  const startsAt = new Date(session.startsAt);
  if (!Number.isFinite(startsAt.getTime())) return true;
  const eventDay = startOfLocalDay(startsAt);
  if (from && eventDay < from) return false;
  if (to && eventDay > to) return false;
  return true;
}

function matchesFallbackCatalogPrice(session, minPrice, maxPrice) {
  const price = session.priceFrom;
  const min = Number(minPrice);
  const max = Number(maxPrice);
  const wantsFree = minPrice === 0 && maxPrice === 0;
  if (wantsFree) return !Number.isFinite(price) || price <= 0;
  if (Number.isFinite(min) && min > 0 && (!Number.isFinite(price) || price < min)) return false;
  if (Number.isFinite(max) && max > 0 && (!Number.isFinite(price) || price > max)) return false;
  return true;
}

function matchesSessionDate(session, dateFilter) {
  const startsAt = new Date(session.startsAt);
  if (!Number.isFinite(startsAt.getTime())) return dateFilter === 'all';

  const today = startOfLocalDay(new Date());
  const eventDay = startOfLocalDay(startsAt);
  const diffDays = Math.round((eventDay.getTime() - today.getTime()) / 86400000);

  if (dateFilter === 'today') return diffDays === 0;
  if (dateFilter === 'tomorrow') return diffDays === 1;
  if (dateFilter === 'weekend') {
    const day = startsAt.getDay();
    return day === 0 || day === 6;
  }
  if (dateFilter === 'evening') return session.timeBucket === 'evening' || session.timeBucket === 'night';

  return true;
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function canonicalSearchParams(searchParams, excludeKeys = []) {
  const excluded = new Set(excludeKeys);
  const pairs = [];
  for (const [key, value] of searchParams.entries()) {
    if (excluded.has(key)) continue;
    pairs.push([key, value]);
  }
  pairs.sort(([aKey, aValue], [bKey, bValue]) => aKey.localeCompare(bKey) || aValue.localeCompare(bValue));
  return new URLSearchParams(pairs).toString();
}

function runTeplohodSync() {
  return new Promise((resolve, reject) => {
    const startedAt = new Date().toISOString();
    const child = spawn(process.execPath, [path.join(rootDir, 'scripts', 'tep-import-fixtures.js')], {
      cwd: rootDir,
      env: process.env,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        const error = new Error(stderr || stdout || `Teplohod sync failed with exit code ${code}`);
        error.statusCode = 500;
        reject(error);
        return;
      }

      let stats = null;
      try {
        const match = stdout.match(/\{[\s\S]*\}\s*$/);
        stats = match ? JSON.parse(match[0]) : null;
      } catch {
        stats = null;
      }

      resolve({
        ok: true,
        source: 'TEPLOHOD',
        mode: process.env.TEP_API_URL ? (process.env.TEP_API_URL.includes('127.0.0.1') || process.env.TEP_API_URL.includes('localhost') ? 'fixtures-bridge' : 'api-ip') : 'fixtures',
        startedAt,
        finishedAt: new Date().toISOString(),
        stats,
        output: stdout.trim(),
      });
    });
  });
}

function runTicketscloudCatalogSync() {
  return new Promise((resolve, reject) => {
    const startedAt = new Date().toISOString();
    const child = spawn(process.execPath, [path.join(rootDir, 'scripts', 'tc-full-sync.js')], {
      cwd: rootDir,
      env: process.env,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', async (code) => {
      if (code !== 0) {
        const error = new Error(stderr || stdout || `Ticketscloud catalog sync failed with exit code ${code}`);
        error.statusCode = 500;
        reject(error);
        return;
      }

      const summary = await readJsonFileIfExists('data/ticketscloud/summary.public.json');
      resolve({
        ok: true,
        source: 'TICKETSCLOUD',
        mode: 'catalog',
        startedAt,
        finishedAt: new Date().toISOString(),
        stats: summary?.counts || parseLastJsonObject(stdout)?.counts || parseLastJsonObject(stdout),
        output: stdout.trim(),
      });
    });
  });
}

function runTicketscloudOrdersSync(searchParams = new URLSearchParams()) {
  return new Promise((resolve, reject) => {
    const startedAt = new Date().toISOString();
    const args = [path.join(rootDir, 'scripts', 'tc-sync-orders.js')];
    appendCliArg(args, 'from', searchParams.get('from'));
    appendCliArg(args, 'to', searchParams.get('to'));
    appendCliArg(args, 'status', searchParams.get('status'));
    appendCliArg(args, 'events', searchParams.get('events'));
    appendCliArg(args, 'page-size', searchParams.get('pageSize'));
    appendCliArg(args, 'max-pages', searchParams.get('maxPages'));
    appendCliArg(args, 'only-with-customer', searchParams.get('onlyWithCustomer'));

    const child = spawn(process.execPath, args, {
      cwd: rootDir,
      env: process.env,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        const error = new Error(stderr || stdout || `Ticketscloud orders sync failed with exit code ${code}`);
        error.statusCode = 500;
        reject(error);
        return;
      }

      let stats = null;
      try {
        const match = stdout.match(/\{[\s\S]*\}\s*$/);
        stats = match ? JSON.parse(match[0]) : null;
      } catch {
        stats = null;
      }

      resolve({
        ok: true,
        source: 'TICKETSCLOUD',
        mode: 'orders',
        startedAt,
        finishedAt: new Date().toISOString(),
        stats,
        output: stdout.trim(),
      });
    });
  });
}

function parseLastJsonObject(text) {
  const source = String(text || '').trim();
  if (!source) return null;
  for (let index = source.lastIndexOf('{'); index >= 0; index = source.lastIndexOf('{', index - 1)) {
    try {
      return JSON.parse(source.slice(index));
    } catch {
      // Keep scanning earlier braces in stdout; progress logs may contain text before JSON.
    }
  }
  return null;
}

async function readJsonFileIfExists(relativePath) {
  try {
    return JSON.parse(await readFile(path.join(rootDir, relativePath), 'utf8'));
  } catch {
    return null;
  }
}

function appendCliArg(args, key, value) {
  if (value == null || value === '') return;
  args.push(`--${key}=${value}`);
}

function isProtectedPath(pathname) {
  return (
    pathname === '/api/db/stats' ||
    pathname === '/api/db/events' ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/v1/tc') ||
    pathname.startsWith('/api/v1/tep')
  );
}

function isAdminAuthConfigured() {
  return Boolean(adminAuth.email && (adminAuth.password || adminAuth.passwordHash));
}

function isAdminAuthRequired() {
  return process.env.NODE_ENV === 'production' || process.env.DAIBILET_REQUIRE_ADMIN_AUTH === '1';
}

function isAuthorizedAdminRequest(request) {
  if (!isAdminAuthConfigured()) return !isAdminAuthRequired();

  const header = String(request.headers.authorization || '');
  if (!header.startsWith('Basic ')) return false;

  let decoded = '';
  try {
    decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
  } catch {
    return false;
  }

  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex <= 0) return false;

  const email = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);
  if (!safeEqualString(email, adminAuth.email)) return false;

  if (adminAuth.passwordHash) {
    const actualHash = createHash('sha256').update(password).digest('hex');
    return safeEqualString(actualHash, normalizeSha256Hash(adminAuth.passwordHash));
  }

  return safeEqualString(password, adminAuth.password);
}

function normalizeSha256Hash(value) {
  return String(value || '').trim().replace(/^sha256:/i, '').toLowerCase();
}

function safeEqualString(actual, expected) {
  const actualDigest = createHash('sha256').update(String(actual)).digest();
  const expectedDigest = createHash('sha256').update(String(expected)).digest();
  return timingSafeEqual(actualDigest, expectedDigest);
}

function sendAuthRequired(response) {
  const cors = buildCorsHeaders(activeCorsRequest, { credentials: routeNeedsCredentials(activeCorsRequest) });
  response.writeHead(401, {
    ...cors,
    'www-authenticate': `Basic realm="${adminAuth.realm}", charset="UTF-8"`,
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify({ error: 'admin_auth_required' }));
}

function sendJson(response, payload, statusCode = 200, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  const cors = buildCorsHeaders(activeCorsRequest, { credentials: routeNeedsCredentials(activeCorsRequest) });
  response.writeHead(statusCode, {
    ...cors,
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...extraHeaders,
  });
  response.end(body);
}

function sendPublicJson(response, payload, statusCode = 200, extraHeaders = {}) {
  sendJson(response, payload, statusCode, {
    'cache-control': PUBLIC_HTTP_CACHE_CONTROL,
    ...extraHeaders,
  });
}

function sendEmpty(response, statusCode) {
  const cors = buildCorsHeaders(activeCorsRequest, { credentials: routeNeedsCredentials(activeCorsRequest) });
  response.writeHead(statusCode, cors);
  response.end();
}
