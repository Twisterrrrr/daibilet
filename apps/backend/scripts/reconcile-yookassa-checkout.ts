import { prisma } from '@daibilet/db';
import { reconcileExpiredYooKassaCheckouts } from '../src/checkout-yookassa.js';

function readNumericFlag(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readStringFlag(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length).trim() || null;
}

async function main() {
  const dryRun = !process.argv.includes('--apply');
  const limit = readNumericFlag('limit', 50);
  const graceMinutes = readNumericFlag('grace-minutes', 5);
  const orderId = readStringFlag('order-id');
  const result = await reconcileExpiredYooKassaCheckouts({
    dryRun,
    limit,
    graceMinutes,
    orderId,
  });
  if (dryRun) {
    console.error('DRY RUN: counters describe planned reconcile actions. Use --apply to mutate checkout state.');
  }
  console.log(JSON.stringify(result, null, 2));
  if (result.failed > 0) process.exitCode = 2;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
