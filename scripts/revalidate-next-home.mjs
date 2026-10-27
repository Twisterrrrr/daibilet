#!/usr/bin/env node
import { config } from 'dotenv';
import { revalidateNextHome } from '../apps/backend/src/revalidate-next-home.js';

config();

const reason = process.argv[2] || 'cli';

try {
  const result = await revalidateNextHome(reason);
  if (result.skipped) process.exit(0);
  process.exit(result.ok ? 0 : 1);
} catch (error) {
  console.error('[revalidate-next-home] failed:', error);
  process.exit(1);
}
