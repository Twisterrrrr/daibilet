import type { Server } from 'node:http';
import { createAdminEventsRouteHandler } from './admin-events-handler.js';
import { createAdminLandingsRouteHandler } from './admin-landings-handler.js';
import { createAdminAuthConfig } from './auth.js';
import { readBackendEnv } from './env.js';
import { updateAdminEventOverride, updateAdminLandingMatch } from './dto.js';
import { db, handleRequest, invalidatePublicCaches, startServer } from './server.js';
import { createValidatedHandler } from './validated-handler.js';

const env = readBackendEnv();
const host = '127.0.0.1';
const adminAuth = createAdminAuthConfig(env);
const server = startServer({
  host,
  port: env.PORT,
  handler: createValidatedHandler(handleRequest, {
    adminAuth,
    routeHandlers: [
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
