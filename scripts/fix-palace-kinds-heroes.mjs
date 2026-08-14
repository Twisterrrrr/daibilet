import { createRequire } from 'node:module';
const require = createRequire('/opt/daibilet/apps/backend/package.json');
const { Client } = require('pg');

const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

const upd = await c.query(`
  UPDATE "Venue" AS v
  SET
    kind = CASE v.slug
      WHEN 'saint-petersburg-ekaterininskiy-dvorets' THEN 'ATTRACTION'::"VenueKind"
      WHEN 'bolshoi-petergofskii-dvorec-68c6ae79d5b98d58ded70411' THEN 'ATTRACTION'::"VenueKind"
      ELSE v.kind
    END,
    "heroImageUrl" = CASE v.slug
      WHEN 'saint-petersburg-ekaterininskiy-dvorets'
        THEN '/images/venues/saint-petersburg/ekaterininskiy-dvorets.jpg'
      WHEN 'bolshoi-petergofskii-dvorec-68c6ae79d5b98d58ded70411'
        THEN '/images/venues/saint-petersburg/petergof.jpg'
      ELSE v."heroImageUrl"
    END,
    "updatedAt" = NOW()
  WHERE v.slug IN (
    'saint-petersburg-ekaterininskiy-dvorets',
    'bolshoi-petergofskii-dvorec-68c6ae79d5b98d58ded70411'
  )
  RETURNING slug, kind::text, left("heroImageUrl", 90) AS hero
`);

for (const r of upd.rows) console.log(JSON.stringify(r));
await c.end();
