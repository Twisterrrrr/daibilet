import { prisma } from '@daibilet/db';
import { buildInternalTicketNumbers } from '../src/checkout-yookassa.js';

const code = process.argv.find((arg) => arg.startsWith('--public-code='))?.slice('--public-code='.length);
const apply = process.argv.includes('--apply');

async function main() {
  if (!code) throw new Error('Pass --public-code=<code>; backfill is one order at a time.');
  const order = await prisma.checkoutOrder.findUnique({
    where: { publicCode: code },
    include: {
      items: { select: { id: true, quantity: true } },
      fulfillmentItems: { select: { id: true, checkoutItemId: true, provider: true, status: true, providerData: true } },
      payments: { select: { status: true } },
    },
  });
  if (!order || order.status !== 'CONFIRMED' || !order.payments.some((payment) => payment.status === 'SUCCEEDED')) {
    throw new Error('Order must exist and have a succeeded payment.');
  }
  for (const fulfillment of order.fulfillmentItems) {
    if (fulfillment.status !== 'CONFIRMED' || fulfillment.provider !== 'INTERNAL' || !fulfillment.checkoutItemId) continue;
    const item = order.items.find((candidate) => candidate.id === fulfillment.checkoutItemId);
    if (!item) throw new Error(`Checkout item missing for fulfillment ${fulfillment.id}`);
    const data = fulfillment.providerData;
    const payload = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    const storedNumbers = Array.isArray(payload.ticketNumbers)
      ? payload.ticketNumbers.filter((value): value is string => typeof value === 'string') : [];
    const numbers = storedNumbers.length ? storedNumbers : buildInternalTicketNumbers({
      publicCode: order.publicCode, orderId: order.id, quantity: item.quantity,
    });
    if (numbers.length !== item.quantity || new Set(numbers).size !== numbers.length) {
      throw new Error(`Ticket number count mismatch for fulfillment ${fulfillment.id}`);
    }
    const existing = await prisma.issuedTicket.findMany({
      where: { fulfillmentItemId: fulfillment.id }, orderBy: { ordinal: 'asc' },
      select: { ticketNumber: true },
    });
    if (existing.length && (existing.length !== numbers.length || existing.some((row, i) => row.ticketNumber !== numbers[i]))) {
      throw new Error(`Existing issued tickets disagree with providerData for fulfillment ${fulfillment.id}`);
    }
    console.log(JSON.stringify({ publicCode: code, fulfillmentId: fulfillment.id, numbers, action: existing.length ? 'already_backfilled' : apply ? 'insert' : 'would_insert' }));
    if (!apply || existing.length) continue;
    await prisma.issuedTicket.createMany({
      data: numbers.map((ticketNumber, i) => ({
        checkoutOrderId: order.id,
        checkoutItemId: item.id,
        fulfillmentItemId: fulfillment.id,
        ordinal: i + 1,
        ticketNumber,
      })),
      skipDuplicates: true,
    });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
