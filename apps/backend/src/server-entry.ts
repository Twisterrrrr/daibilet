import type { Server } from 'node:http';
import { readBackendEnv } from './env.js';
import { handleRequest, startServer } from './server.js';
import { createValidatedHandler } from './validated-handler.js';

const env = readBackendEnv();
const host = '127.0.0.1';
const server = startServer({ host, port: env.PORT, handler: createValidatedHandler(handleRequest) }) as Server;

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close(() => {
      process.exit(0);
    });
  });
}

export { server };
