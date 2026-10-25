import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '@daibilet/db';
import { updateSupplierUserAccess } from './supplier-user-access.js';

test('supplier team changes are audited and the last owner stays active', async (t) => {
  if (!process.env.DATABASE_URL) return t.skip('database is not configured');
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const supplier = await prisma.supplier.create({ data: { slug: `access-${suffix}`, title: 'Access test', status: 'ACTIVE' } });
  const users = [];
  try {
    for (let i = 0; i < 2; i += 1) {
      const user = await prisma.siteUser.create({ data: { email: `access-${suffix}-${i}@example.test`, passwordHash: 'test' } });
      users.push(user);
      await prisma.supplierUser.create({ data: { supplierId: supplier.id, siteUserId: user.id, role: 'OWNER', acceptedAt: new Date() } });
    }
    const first = await prisma.supplierUser.findUniqueOrThrow({ where: { supplierId_siteUserId: { supplierId: supplier.id, siteUserId: users[0]!.id } } });
    const second = await prisma.supplierUser.findUniqueOrThrow({ where: { supplierId_siteUserId: { supplierId: supplier.id, siteUserId: users[1]!.id } } });

    await updateSupplierUserAccess(supplier.id, first.id, { role: 'VIEWER', isActive: true }, 'admin@example.test');
    await assert.rejects(
      updateSupplierUserAccess(supplier.id, second.id, { role: 'OWNER', isActive: false }, 'admin@example.test'),
      /последнего владельца/,
    );
    await updateSupplierUserAccess(supplier.id, first.id, { role: 'VIEWER', isActive: false }, 'admin@example.test');

    const inactive = await prisma.supplierUser.findUniqueOrThrow({ where: { id: first.id } });
    assert.equal(inactive.isActive, false);
    const logs = await prisma.supplierUserAccessLog.findMany({ where: { supplierId: supplier.id }, orderBy: { createdAt: 'asc' } });
    assert.deepEqual(logs.map((row) => row.action), ['ROLE_CHANGE', 'DEACTIVATE']);
    assert.equal(logs[0]!.actor, 'admin@example.test');
  } finally {
    await prisma.supplierUserAccessLog.deleteMany({ where: { supplierId: supplier.id } });
    await prisma.supplier.delete({ where: { id: supplier.id } });
    await prisma.siteUser.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
  }
});
