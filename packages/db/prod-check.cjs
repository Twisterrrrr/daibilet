const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const m = await c.query(
    'select migration_name, finished_at is not null as done, rolled_back_at is not null as rolled from _prisma_migrations order by migration_name',
  );
  for (const r of m.rows) {
    console.log(`${r.done ? 'applied  ' : r.rolled ? 'ROLLED   ' : 'FAILED?  '} ${r.migration_name}`);
  }
  const t = await c.query(
    "select tablename from pg_tables where schemaname='public' and tablename in ('AdmissionProduct','SupplierIntegration','SupplierUserInvite','AdminUser','chat_sessions','chat_messages','supplier_legal_review_snapshot','issued_tickets') order by 1",
  );
  console.log('tables:', JSON.stringify(t.rows.map((r) => r.tablename)));
  const ty = await c.query(
    "select typname from pg_type where typname in ('AdmissionProductType','AdminUserState','AdminRole','ChatMessageSender','SupplierIntegrationMode') order by 1",
  );
  console.log('types:', JSON.stringify(ty.rows.map((r) => r.typname)));
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});