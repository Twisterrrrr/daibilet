CREATE TABLE "IssuedTicket" (
    "id" TEXT NOT NULL,
    "checkoutOrderId" TEXT NOT NULL,
    "checkoutItemId" TEXT NOT NULL,
    "fulfillmentItemId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    CONSTRAINT "IssuedTicket_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IssuedTicket_ticketNumber_key" ON "IssuedTicket"("ticketNumber");
CREATE UNIQUE INDEX "IssuedTicket_fulfillmentItemId_ordinal_key" ON "IssuedTicket"("fulfillmentItemId", "ordinal");
CREATE INDEX "IssuedTicket_checkoutOrderId_idx" ON "IssuedTicket"("checkoutOrderId");
ALTER TABLE "IssuedTicket" ADD CONSTRAINT "IssuedTicket_checkoutOrderId_fkey" FOREIGN KEY ("checkoutOrderId") REFERENCES "CheckoutOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IssuedTicket" ADD CONSTRAINT "IssuedTicket_checkoutItemId_fkey" FOREIGN KEY ("checkoutItemId") REFERENCES "CheckoutItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IssuedTicket" ADD CONSTRAINT "IssuedTicket_fulfillmentItemId_fkey" FOREIGN KEY ("fulfillmentItemId") REFERENCES "FulfillmentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
