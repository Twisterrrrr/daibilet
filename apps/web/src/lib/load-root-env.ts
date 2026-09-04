import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export interface RootEnvLoadResult {
  loaded: boolean;
  path: string;
  keys: string[];
}

let loaded = false;

export function getMonorepoRoot(): string {
  return path.resolve(process.cwd(), '../..');
}

export function loadRootEnv(targetEnv: NodeJS.ProcessEnv = process.env): RootEnvLoadResult {
  const envPath = path.join(getMonorepoRoot(), '.env');
  const keys: string[] = [];

  if (loaded || !existsSync(envPath)) {
    return { loaded: false, path: envPath, keys };
  }

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

    loaded = true;
    return { loaded: true, path: envPath, keys };
  } catch {
    return { loaded: false, path: envPath, keys };
  }
}
