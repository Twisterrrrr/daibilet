import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '@daibilet/db';
import {
  acceptSupplierInvite,
  buildSupplierInviteUrl,
  hashSupplierInviteToken,
  inviteSupplierUser,
} from './supplier-invite.js';

test('supplier invite helper hashes tokens and builds the portal URL', () => {
  const token = 'a'.repeat(43);
  assert.equal(hashSupplierInviteToken(token).length, 64);
  assert.notEqual(hashSupplierInviteToken(token), token);
  assert.equal(buildSupplierInviteUrl(token), `https://supplier.daibilet.ru/?invite=${token}`);
});

test('admin invite lets a new supplier user set a password once', async (t) => {
  if (!await canReachDatabase()) {
    t.skip('database is not available');
    return;
  }

  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const supplierId = `sup_invite_${suffix}`;
  const slug = `supplier-invite-${suffix}`;
  const email = `supplier-invite-${suffix}@example.test`;

  try {
    await prisma.supplier.create({
      data: {
        id: supplierId,
        slug,
        title: 'Supplier Invite Test',
        status: 'ACTIVE',
        integrationMode: 'INTERNAL_SALES',
        defaultCatalogMode: 'INTERNAL_CHECKOUT',
      },
    });

    const result = await inviteSupplierUser(slug, {
      email,
      name: 'Pilot Owner',
      role: 'OWNER',
    });

    assert.equal(result.access.existingAccount, false);
    assert.ok(result.access.inviteUrl);
    const token = new URL(result.access.inviteUrl as string).searchParams.get('invite');
    assert.ok(token);

    const pending = await prisma.supplierUser.findFirstOrThrow({
      where: { supplierId },
      select: { inviteTokenHash: true, inviteExpiresAt: true, acceptedAt: true, siteUserId: true },
    });
    assert.equal(pending.inviteTokenHash, hashSupplierInviteToken(token as string));
    assert.notEqual(pending.inviteTokenHash, token);
    assert.ok(pending.inviteExpiresAt);
    assert.equal(pending.acceptedAt, null);

    const attempts = await Promise.allSettled([
      acceptSupplierInvite({ token: token as string, password: 'strong-pilot-password' }),
      acceptSupplierInvite({ token: token as string, password: 'strong-pilot-password' }),
    ]);
    const fulfilled = attempts.filter((attempt) => attempt.status === 'fulfilled');
    const rejected = attempts.filter((attempt) => attempt.status === 'rejected');
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    const accepted = (fulfilled[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof acceptSupplierInvite>>>).value;
    assert.equal(accepted.supplierId, supplierId);
    assert.equal(accepted.siteUserId, pending.siteUserId);

    const membership = await prisma.supplierUser.findUniqueOrThrow({
      where: { supplierId_siteUserId: { supplierId, siteUserId: pending.siteUserId } },
      select: { acceptedAt: true, inviteTokenHash: true, inviteExpiresAt: true, siteUser: { select: { passwordHash: true } } },
    });
    assert.ok(membership.acceptedAt);
    assert.equal(membership.inviteTokenHash, null);
    assert.equal(membership.inviteExpiresAt, null);
    assert.match(membership.siteUser.passwordHash, /^scrypt:/);

    await assert.rejects(acceptSupplierInvite({ token: token as string, password: 'another-password' }));
  } finally {
    const user = await prisma.siteUser.findUnique({ where: { email }, select: { id: true } });
    await prisma.supplier.deleteMany({ where: { id: supplierId } });
    if (user) await prisma.siteUser.deleteMany({ where: { id: user.id } });
  }
});

async function canReachDatabase(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    await prisma.$queryRaw`select 1`;
    return true;
  } catch {
    return false;
  }
}
