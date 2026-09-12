-- Perm /locations card copy from owner editor table 2026-08-14.
-- LocationCard reads Venue.shortDescription (DB). Do NOT apply to prod without owner request.
-- Match slug+title so Kungur/Belaya Gora/Gubakha cluster rows are updated only if they still display the POI title.

UPDATE "Venue" SET
  "shortDescription" = 'Величественный православный монастырь на вершине Белой горы, часто называемый «Уральским Афоном» за свою красоту и строгий устав.',
  address = 'Пермский край, Кунгурский округ, д. Белая Гора, Монастырская ул., 1',
  latitude = 57.392398,
  longitude = 56.229415,
  "updatedAt" = NOW()
WHERE slug = 'perm-belogorskiy-monastyr'
  AND title ILIKE '%Белогорский Свято-Николаевский монастырь%';

UPDATE "Venue" SET
  "shortDescription" = 'Живописный памятник церковной архитектуры XVIII века, расположенный на берегу реки Боровой в Соликамске.',
  address = 'Пермский край, Соликамск, Набережная ул., 91',
  latitude = 59.646944,
  longitude = 56.764167,
  "updatedAt" = NOW()
WHERE slug = 'perm-kungur'
  AND title ILIKE '%Богородицкая церковь%';

UPDATE "Venue" SET
  "shortDescription" = 'Уникальный природный памятник из причудливых скальных останцев, напоминающих улочки, дома и площади древнего заброшенного города.',
  address = 'Пермский край, Гремячинский городской округ, близ поселка Шумихинский',
  latitude = 58.723049,
  longitude = 57.633454,
  "updatedAt" = NOW()
WHERE slug = 'perm-kamennyy-gorod'
  AND title ILIKE '%Каменный город%';

UPDATE "Venue" SET
  "shortDescription" = 'Одна из крупнейших и красивейших карстовых пещер в мире с подземными озерами и многовековыми ледяными гротами.',
  address = 'Пермский край, Кунгур, с. Филипповка',
  latitude = 57.440263,
  longitude = 57.006206,
  "updatedAt" = NOW()
WHERE slug = 'perm-kungurskaya-ledyanaya-peshchera'
  AND title ILIKE '%Кунгурская ледяная пещера%';

UPDATE "Venue" SET
  "shortDescription" = 'Необычный малый архитектурный памятник на набережной Кунгура, установленный в точке пересечения важнейших исторических дорог.',
  address = 'Пермский край, Кунгур, ул. Карла Маркса (на набережной реки Сылвы)',
  latitude = 57.428588,
  longitude = 56.938883,
  "updatedAt" = NOW()
WHERE slug = 'perm-belaya-gora'
  AND title ILIKE '%Пуп Земли%';

UPDATE "Venue" SET
  "shortDescription" = 'Величественная многометровая каменная стена на берегу реки Усьвы, знаменитая отдельно стоящей скалой Чёртов Палец.',
  address = 'Пермский край, Гремячинский городской округ, близ поселка Усьва',
  latitude = 58.653457,
  longitude = 57.568472,
  "updatedAt" = NOW()
WHERE slug = 'perm-usvinskie-stolby'
  AND title ILIKE '%Усьвинские столбы%';

UPDATE "Venue" SET
  "shortDescription" = 'Огромный памятный крест в Белогорском монастыре, установленный в память о спасении цесаревича Николая Александровича после покушения в Японии.',
  address = 'Пермский край, Кунгурский округ, д. Белая Гора (у монастыря)',
  latitude = 57.391745,
  longitude = 56.22905,
  "updatedAt" = NOW()
WHERE slug = 'perm-gubakha-usva'
  AND title ILIKE '%Царский крест%';

UPDATE "Venue" SET
  "shortDescription" = 'Популярная пермская кофейня третьей волны, известная спешелти-кофе собственной обжарки и уютной атмосферой.',
  address = 'Пермь, Сибирская ул., 30',
  latitude = 58.009415,
  longitude = 56.249415,
  "updatedAt" = NOW()
WHERE slug = 'perm-cup-by-cup'
  AND title ILIKE '%Cup by Cup%';

UPDATE "Venue" SET
  "shortDescription" = 'Современный концептуальный ресторан в центре Перми с изысканной европейской кухней и богатой винной картой.',
  address = 'Пермь, Петропавловская ул., 59 (в отеле «Урал»)',
  latitude = 58.012115,
  longitude = 56.238415,
  "updatedAt" = NOW()
WHERE slug = 'perm-nolan-wine-kitchen'
  AND title ILIKE '%Nolan Wine & Kitchen%';

