function initials(value) {
  const parts = String(value || '').trim().split(/\s+/u).filter(Boolean).slice(0, 3);
  if (!parts.length) return null;
  return parts.map((part) => `${Array.from(part)[0]}.`).join(' ');
}

function maskedEmail(value) {
  const email = String(value || '').trim();
  const separator = email.lastIndexOf('@');
  if (separator <= 0 || separator === email.length - 1) return null;
  const local = email.slice(0, separator);
  return `${Array.from(local).slice(0, 2).join('')}${'*'.repeat(Math.max(2, Array.from(local).length - 2))}@${email.slice(separator + 1)}`;
}

function maskedPhone(value) {
  const digits = String(value || '').replace(/\D+/gu, '');
  if (digits.length < 6) return null;
  return `+${digits[0]} ${'*'.repeat(Math.max(3, digits.length - 5))} ${digits.slice(-4)}`;
}

export function maskAdminOrderPii(order) {
  if (!order || typeof order !== 'object') return order;
  const projected = { ...order, buyerSnapshot: null, piiLevel: 'masked' };
  if (order.buyer && typeof order.buyer === 'object') {
    projected.buyer = {
      name: initials(order.buyer.name),
      email: maskedEmail(order.buyer.email),
      phone: maskedPhone(order.buyer.phone),
    };
  }
  for (const key of ['buyerName', 'buyer_name']) {
    if (key in projected) projected[key] = initials(projected[key]);
  }
  for (const key of ['buyerEmail', 'buyer_email']) {
    if (key in projected) projected[key] = maskedEmail(projected[key]);
  }
  for (const key of ['buyerPhone', 'buyer_phone']) {
    if (key in projected) projected[key] = maskedPhone(projected[key]);
  }
  if ('raw' in projected) projected.raw = null;
  for (const key of ['customer', 'customerData', 'buyerNotes', 'buyer_notes']) {
    if (key in projected) projected[key] = null;
  }
  return projected;
}

export function projectAdminOrdersPii(payload, canReadPii) {
  if (canReadPii || !payload || typeof payload !== 'object') return payload;
  const projected = { ...payload };
  if (payload.buyer || payload.buyerSnapshot || payload.buyerEmail || payload.buyerPhone || payload.buyerName) {
    return maskAdminOrderPii(payload);
  }
  for (const key of ['rows', 'items']) {
    if (Array.isArray(payload[key])) projected[key] = payload[key].map(maskAdminOrderPii);
  }
  return projected;
}
