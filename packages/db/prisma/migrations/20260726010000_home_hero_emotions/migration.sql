-- Home hero: tourist-emotion rotator (people-first). Replaces cities/top landmarks.

UPDATE "HeroBanner"
SET
  "imageUrl" = '/images/home/hero-emotion-01.jpg',
  "title" = 'Друзья на набережной',
  "link" = '/events?date=weekend&sort=popular',
  "sortOrder" = 10,
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'hero_banner_seed_01';

UPDATE "HeroBanner"
SET
  "imageUrl" = '/images/home/hero-emotion-02.jpg',
  "title" = 'Пара в музее',
  "link" = '/events?category=%D0%9C%D1%83%D0%B7%D0%B5%D0%B8%20%D0%B8%20%D0%B0%D1%80%D1%82&sort=popular',
  "sortOrder" = 20,
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'hero_banner_seed_02';

UPDATE "HeroBanner"
SET
  "imageUrl" = '/images/home/hero-emotion-03.jpg',
  "title" = 'Семья на речной прогулке',
  "link" = '/events?category=%D0%A0%D0%B5%D1%87%D0%BD%D1%8B%D0%B5%20%D0%BF%D1%80%D0%BE%D0%B3%D1%83%D0%BB%D0%BA%D0%B8&sort=popular',
  "sortOrder" = 30,
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'hero_banner_seed_03';

UPDATE "HeroBanner"
SET
  "imageUrl" = '/images/home/hero-emotion-04.jpg',
  "title" = 'Вечерняя прогулка по городу',
  "link" = '/events?date=evening&sort=time',
  "sortOrder" = 40,
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'hero_banner_seed_04';

INSERT INTO "HeroBanner" ("id", "imageUrl", "title", "link", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
  (
    'hero_banner_seed_05',
    '/images/home/hero-emotion-05.jpg',
    'Подруги на площади',
    '/events?category=%D0%AD%D0%BA%D1%81%D0%BA%D1%83%D1%80%D1%81%D0%B8%D0%B8&sort=popular',
    true,
    50,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'hero_banner_seed_06',
    '/images/home/hero-emotion-06.jpg',
    'Закат на набережной',
    '/podborki',
    true,
    60,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("id") DO UPDATE SET
  "imageUrl" = EXCLUDED."imageUrl",
  "title" = EXCLUDED."title",
  "link" = EXCLUDED."link",
  "isActive" = EXCLUDED."isActive",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;
