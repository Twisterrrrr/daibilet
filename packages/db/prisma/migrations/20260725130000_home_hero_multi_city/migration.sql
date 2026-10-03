-- Home hero: multi-city landmark rotator (Moscow / SPB / Kazan / Ekb / Nizhny / Samara).
-- Replaces SPB-heavy seed frames (Isaac / friends-selfie) already live in HeroBanner.

UPDATE "HeroBanner"
SET
  "imageUrl" = '/images/cities/top/moscow.jpg',
  "title" = 'Москва - Красная площадь',
  "link" = '/cities/moscow',
  "sortOrder" = 10,
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'hero_banner_seed_01';

UPDATE "HeroBanner"
SET
  "imageUrl" = '/images/cities/top/saint-petersburg.jpg',
  "title" = 'Санкт-Петербург - Зимний дворец',
  "link" = '/cities/saint-petersburg',
  "sortOrder" = 20,
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'hero_banner_seed_02';

UPDATE "HeroBanner"
SET
  "imageUrl" = '/images/cities/top/kazan.jpg',
  "title" = 'Казань - мечеть Кул-Шариф',
  "link" = '/cities/kazan',
  "sortOrder" = 30,
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'hero_banner_seed_03';

UPDATE "HeroBanner"
SET
  "imageUrl" = '/images/cities/top/ekaterinburg.jpg',
  "title" = 'Екатеринбург - городской пруд',
  "link" = '/cities/ekaterinburg',
  "sortOrder" = 40,
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'hero_banner_seed_04';

INSERT INTO "HeroBanner" ("id", "imageUrl", "title", "link", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
  (
    'hero_banner_seed_05',
    '/images/cities/top/nizhny-novgorod.jpg',
    'Нижний Новгород - кремль',
    '/cities/nizhny-novgorod',
    true,
    50,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'hero_banner_seed_06',
    '/images/cities/top/samara.jpg',
    'Самара - набережная Волги',
    '/cities/samara',
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
