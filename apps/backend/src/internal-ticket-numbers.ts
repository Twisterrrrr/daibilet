export function buildInternalTicketNumbers(input: {
  publicCode: string | null;
  orderId: string;
  quantity: number;
}): string[] {
  const base = (input.publicCode?.trim() || input.orderId.slice(-8)).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const quantity = Math.max(1, Math.min(50, Math.trunc(input.quantity || 1)));
  return Array.from({ length: quantity }, (_, index) => `TKT-${base}-${String(index + 1).padStart(2, '0')}`);
}
