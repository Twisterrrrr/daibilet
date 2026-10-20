import { prisma } from '@daibilet/db';

async function main() {
  const publicCode = process.argv[2];
  if (!publicCode || !/^\d{7}$/.test(publicCode)) {
    throw new Error('Usage: tsx scripts/verify-internal-order.ts <seven-digit-public-code>');
  }

  const order = await prisma.checkoutOrder.findUnique({
    where: { publicCode },
    include: {
      items: { select: { id: true, quantity: true, supplierId: true } },
      payments: { select: { id: true, provider: true, status: true, amountKopecks: true } },
      fulfillmentItems: { select: { status: true } },
      issuedTickets: { select: { cancelledAt: true } },
    },
  });
  if (!order) throw new Error('Order not found');

  const ledger = await prisma.supplierLedgerEntry.findMany({
    where: { checkoutOrderId: order.id },
    select: { type: true, amountKopecks: true, supplierId: true },
  });
  const paidPayments = order.payments.filter((payment) => payment.status === 'SUCCEEDED');
  const saleKopecks = ledger.filter((entry) => entry.type === 'SALE').reduce((sum, entry) => sum + entry.amountKopecks, 0);
  const commissionKopecks = ledger.filter((entry) => entry.type === 'COMMISSION').reduce((sum, entry) => sum - entry.amountKopecks, 0);
  const validTickets = order.issuedTickets.filter((ticket) => !ticket.cancelledAt).length;
  const expectedTickets = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const checks = {
    orderConfirmed: order.status === 'CONFIRMED' || order.status === 'FULFILLED',
    oneSucceededPayment: paidPayments.length === 1 && paidPayments[0]?.amountKopecks === order.totalKopecks,
    fulfillmentConfirmed: order.fulfillmentItems.length > 0 && order.fulfillmentItems.every((item) => item.status === 'CONFIRMED'),
    issuedTicketCount: validTickets === expectedTickets,
    saleMatchesOrder: saleKopecks === order.totalKopecks,
    commissionMatchesOrder: commissionKopecks === order.commissionKopecks,
    supplierScopedLedger: ledger.length > 0 && ledger.every((entry) => order.items.some((item) => item.supplierId === entry.supplierId)),
  };
  console.log(JSON.stringify({
    publicCode,
    orderStatus: order.status,
    paymentProvider: paidPayments[0]?.provider ?? null,
    amountKopecks: order.totalKopecks,
    commissionKopecks: order.commissionKopecks,
    validTickets,
    checks,
  }, null, 2));
  if (Object.values(checks).some((passed) => !passed)) process.exitCode = 1;
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
