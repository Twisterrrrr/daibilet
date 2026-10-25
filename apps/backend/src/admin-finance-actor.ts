import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_FINANCE_ACTOR_ASSERTION_ISSUER = 'daibilet-web-admin';
export const ADMIN_FINANCE_ACTOR_ASSERTION_AUDIENCE = 'daibilet-finance-admin';
export const ADMIN_FINANCE_ACTOR_ASSERTION_MAX_TTL_SECONDS = 90;

const ADMIN_PERMISSIONS = Object.freeze([
  'orders.read', 'orders.pii.read', 'orders.export', 'orders.manage', 'orders.cancel',
  'refunds.request', 'refunds.execute', 'support.read', 'support.write', 'finance.summary.read',
  'finance.read', 'payouts.approve', 'documents.read', 'suppliers.read', 'suppliers.manage',
  'suppliers.bank.read', 'catalog.read', 'catalog.edit', 'catalog.publish', 'content.read',
  'content.edit', 'content.publish', 'seo.read', 'seo.edit', 'integrations.read',
  'integrations.retry', 'integrations.secrets.manage', 'audit.read', 'staff.manage',
]);
const ADMIN_ROLES = new Set([
  'SUPERADMIN', 'PRODUCT', 'SUPPORT', 'FINANCE', 'CATALOG_EDITOR', 'COPYWRITER', 'SEO', 'INTEGRATIONS', 'AUDITOR',
]);
const ADMIN_ROLE_PERMISSIONS: Record<string, readonly AdminPermission[]> = {
  SUPERADMIN: ADMIN_PERMISSIONS,
  PRODUCT: ['orders.read', 'finance.summary.read', 'suppliers.read', 'suppliers.manage', 'catalog.read', 'catalog.edit', 'catalog.publish', 'content.read', 'content.edit', 'content.publish', 'seo.read', 'seo.edit', 'integrations.read', 'audit.read'],
  SUPPORT: ['orders.read', 'orders.pii.read', 'refunds.request', 'support.read', 'support.write', 'catalog.read'],
  FINANCE: ['orders.read', 'orders.pii.read', 'orders.export', 'orders.cancel', 'refunds.request', 'refunds.execute', 'finance.summary.read', 'finance.read', 'payouts.approve', 'documents.read', 'suppliers.read', 'suppliers.bank.read', 'audit.read'],
  CATALOG_EDITOR: ['catalog.read', 'catalog.edit', 'catalog.publish', 'content.read', 'content.edit', 'content.publish', 'seo.read', 'suppliers.read'],
  COPYWRITER: ['catalog.read', 'content.read', 'content.edit', 'seo.read', 'seo.edit'],
  SEO: ['catalog.read', 'content.read', 'seo.read', 'seo.edit', 'integrations.read'],
  INTEGRATIONS: ['catalog.read', 'integrations.read', 'integrations.retry', 'audit.read'],
  AUDITOR: ['orders.read', 'finance.read', 'documents.read', 'suppliers.read', 'catalog.read', 'content.read', 'seo.read', 'integrations.read', 'audit.read'],
};
const FINANCE_ADMIN_PERMISSIONS = Object.freeze(['orders.read', 'orders.pii.read', 'orders.cancel', 'refunds.execute', 'finance.read', 'audit.read'] as const);

type AdminPermission = typeof ADMIN_PERMISSIONS[number];
export type FinanceAdminPermission = typeof FINANCE_ADMIN_PERMISSIONS[number];

export type FinanceAdminActor = {
  id: string;
  displayName: string;
  sessionId: string;
  roles: string[];
  permissions: FinanceAdminPermission[];
  issuedAt: number;
  expiresAt: number;
  assertionId: string;
};

type FinanceAdminActorClaims = {
  v: 1;
  iss: typeof ADMIN_FINANCE_ACTOR_ASSERTION_ISSUER;
  aud: typeof ADMIN_FINANCE_ACTOR_ASSERTION_AUDIENCE;
  sub: string;
  name: string;
  sid: string;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
  jti: string;
};

export function verifyFinanceAdminActorAssertion(
  assertion: string,
  secret: string | null | undefined,
  now = Date.now(),
): FinanceAdminActor | null {
  const key = String(secret || '').trim();
  if (Buffer.byteLength(key, 'utf8') < 32) return null;
  const [encodedClaims, providedSignature, extra] = assertion.split('.');
  if (!encodedClaims || !providedSignature || extra) return null;

  const expectedSignature = createHmac('sha256', key).update(encodedClaims).digest();
  let actualSignature: Buffer;
  try {
    actualSignature = Buffer.from(providedSignature, 'base64url');
  } catch {
    return null;
  }
  if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) return null;

  let claims: Partial<FinanceAdminActorClaims>;
  try {
    claims = JSON.parse(Buffer.from(encodedClaims, 'base64url').toString('utf8')) as Partial<FinanceAdminActorClaims>;
  } catch {
    return null;
  }
  const nowSeconds = Math.floor(now / 1000);
  if (claims.v !== 1 || claims.iss !== ADMIN_FINANCE_ACTOR_ASSERTION_ISSUER || claims.aud !== ADMIN_FINANCE_ACTOR_ASSERTION_AUDIENCE) return null;
  if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128 || typeof claims.sid !== 'string' || !claims.sid || claims.sid.length > 128) return null;
  if (typeof claims.name !== 'string' || !claims.name.trim() || claims.name.length > 120) return null;
  if (typeof claims.jti !== 'string' || !claims.jti || claims.jti.length > 128) return null;
  if (!Array.isArray(claims.roles) || claims.roles.some((role) => typeof role !== 'string' || !ADMIN_ROLES.has(role))) return null;
  if (!Array.isArray(claims.permissions) || claims.permissions.some((permission) => typeof permission !== 'string' || !ADMIN_PERMISSIONS.includes(permission as AdminPermission))) return null;
  if (typeof claims.iat !== 'number' || typeof claims.exp !== 'number') return null;
  if (claims.iat > nowSeconds + 15 || claims.exp <= nowSeconds || claims.exp <= claims.iat || claims.exp - claims.iat > ADMIN_FINANCE_ACTOR_ASSERTION_MAX_TTL_SECONDS) return null;
  if (new Set(claims.permissions).size !== claims.permissions.length || new Set(claims.roles).size !== claims.roles.length) return null;
  const expectedPermissions = new Set(claims.roles.flatMap((role) => ADMIN_ROLE_PERMISSIONS[role] || []));
  if (expectedPermissions.size !== claims.permissions.length || claims.permissions.some((permission) => !expectedPermissions.has(permission as FinanceAdminPermission))) return null;

  return {
    id: claims.sub,
    displayName: claims.name.trim(),
    sessionId: claims.sid,
    roles: claims.roles,
    permissions: claims.permissions as FinanceAdminPermission[],
    issuedAt: claims.iat,
    expiresAt: claims.exp,
    assertionId: claims.jti,
  };
}

export function financeAdminActorHasPermission(actor: FinanceAdminActor, permission: FinanceAdminPermission): boolean {
  return actor.permissions.includes(permission);
}

function maskBuyerField(value: unknown, type: 'name' | 'email' | 'phone'): string | null {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;
  if (type === 'name') {
    const parts = raw.split(/\s+/u).filter(Boolean).slice(0, 3);
    return parts.length ? parts.map((part) => `${Array.from(part)[0]}.`).join(' ') : null;
  }
  if (type === 'email') {
    const at = raw.lastIndexOf('@');
    if (at < 1 || at === raw.length - 1) return null;
    const local = Array.from(raw.slice(0, at));
    return `${local.slice(0, 2).join('')}${'*'.repeat(Math.max(2, local.length - 2))}@${raw.slice(at + 1)}`;
  }
  const digits = raw.replace(/\D+/gu, '');
  if (digits.length < 6) return null;
  return `+${digits[0]} ${'*'.repeat(Math.max(3, digits.length - 5))} ${digits.slice(-4)}`;
}

function projectBuyer(value: unknown, actor: FinanceAdminActor): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value ?? null;
  const buyer = value as Record<string, unknown>;
  if (financeAdminActorHasPermission(actor, 'orders.pii.read')) return buyer;
  return {
    name: maskBuyerField(buyer.name, 'name'),
    email: maskBuyerField(buyer.email, 'email'),
    phone: maskBuyerField(buyer.phone, 'phone'),
    notes: null,
  };
}

function projectOrder(value: unknown, actor: FinanceAdminActor): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const order = value as Record<string, unknown>;
  const canReadFinance = financeAdminActorHasPermission(actor, 'finance.read');
  const canCancel = financeAdminActorHasPermission(actor, 'orders.cancel');
  const canExecuteRefund = financeAdminActorHasPermission(actor, 'refunds.execute');
  return {
    id: order.id,
    sourceKind: order.sourceKind,
    externalOrderId: order.externalOrderId,
    publicCode: order.publicCode,
    status: order.status,
    displayStatus: order.displayStatus,
    statusTone: order.statusTone,
    sourceCode: order.sourceCode,
    sourceName: order.sourceName,
    sourceLabel: order.sourceLabel,
    buyer: projectBuyer(order.buyer, actor),
    purchasedAt: order.purchasedAt,
    updatedAt: order.updatedAt,
    archivedAt: order.archivedAt,
    isArchived: order.isArchived,
    canArchive: order.canArchive,
    ticketCount: order.ticketCount,
    unlinkedTickets: order.unlinkedTickets,
    eventTitle: order.eventTitle,
    eventTitles: order.eventTitles,
    eventDateLabel: order.eventDateLabel,
    amountRub: canReadFinance ? order.amountRub : null,
    artifactStatus: order.artifactStatus,
    refundRequestsCount: order.refundRequestsCount,
    hasPendingRefundRequests: order.hasPendingRefundRequests,
    needsAttention: order.needsAttention,
    problems: order.problems,
    tickets: order.tickets,
    finance: canReadFinance ? order.finance ?? null : null,
    permissions: { canCancel, canExecuteRefund },
  };
}

export function projectInternalAdminOrdersList(value: unknown, actor: FinanceAdminActor): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const payload = value as Record<string, unknown>;
  return {
    ...payload,
    rows: Array.isArray(payload.rows) ? payload.rows.map((row) => projectOrder(row, actor)) : [],
  };
}

export function projectInternalAdminOrderDetail(value: unknown, actor: FinanceAdminActor): unknown {
  return projectOrder(value, actor);
}
