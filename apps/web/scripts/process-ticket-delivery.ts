import { prisma } from '@daibilet/db';
import { processDueBuyerTicketEmails, requestBuyerTicketEmailResend } from '../src/server/buyer-ticket-delivery.js';

async function main() {
  const code = process.argv.find((arg) => arg.startsWith('--resend='))?.slice('--resend='.length);
  const rawLimit = process.argv.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length);
  if (code) await requestBuyerTicketEmailResend(code);
  const limit = Number(rawLimit || (code ? 1 : 50));
  const result = await processDueBuyerTicketEmails(limit, { ...(code ? { code } : {}) });
  console.log(JSON.stringify({ processed: result.length, results: result }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
