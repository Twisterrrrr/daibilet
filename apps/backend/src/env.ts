import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export const backendEnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1).optional(),
  DAIBILET_REQUIRE_ADMIN_AUTH: z.string().optional(),
  DAIBILET_TS_PUBLIC_CATALOG: z.string().optional(),
  DAIBILET_TS_PUBLIC_EVENT: z.string().optional(),
  DAIBILET_TS_PUBLIC_CITY: z.string().optional(),
  DAIBILET_TS_PUBLIC_VENUE: z.string().optional(),
  DAIBILET_PUBLIC_PREWARM_BEFORE_LISTEN: z.string().optional(),
  ADMIN_EMAIL: z.string().min(1).optional(),
  ADMIN_USER: z.string().min(1).optional(),
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_PASSWORD_SHA256: z.string().optional(),
  ADMIN_PASSWORD_HASH: z.string().optional(),
  ADMIN_AUTH_REALM: z.string().min(1).default('Daibilet admin'),
  TICKETSCLOUD_API_TOKEN: z.string().optional(),
  TC_API_TOKEN: z.string().optional(),
  TICKETSCLOUD_WIDGET_TOKEN: z.string().optional(),
  TC_WIDGET_TOKEN: z.string().optional(),
  TEP_API_URL: z.string().optional(),
  TEP_WIDGET_ID: z.string().optional(),
  TEP_WIDGET_BASE_URL: z.string().optional(),
});

export type BackendEnv = z.infer<typeof backendEnvSchema>;

export interface RootEnvLoadResult {
  loaded: boolean;
  path: string;
  keys: string[];
}

export function loadRootEnv(projectRoot: string, targetEnv: NodeJS.ProcessEnv = process.env): RootEnvLoadResult {
  const envPath = path.join(projectRoot, '.env');
  const keys: string[] = [];

  try {
    const source = readFileSync(envPath, 'utf8');
    for (const line of source.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex <= 0) continue;

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && targetEnv[key] == null) {
        targetEnv[key] = value;
        keys.push(key);
      }
    }

    return { loaded: true, path: envPath, keys };
  } catch {
    return { loaded: false, path: envPath, keys };
  }
}

export function readBackendEnv(sourceEnv: NodeJS.ProcessEnv = process.env): BackendEnv {
  return backendEnvSchema.parse(sourceEnv);
}

export function resolveAdminEmail(env: Pick<BackendEnv, 'ADMIN_EMAIL' | 'ADMIN_USER'>): string {
  return env.ADMIN_EMAIL || env.ADMIN_USER || '';
}

export function resolveAdminPasswordHash(
  env: Pick<BackendEnv, 'ADMIN_PASSWORD_SHA256' | 'ADMIN_PASSWORD_HASH'>,
): string {
  return env.ADMIN_PASSWORD_SHA256 || env.ADMIN_PASSWORD_HASH || '';
}
