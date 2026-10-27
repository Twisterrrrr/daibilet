import fs from 'fs';

const { CITY_INFO, resolveCityInfo } = await import('../apps/web/src/lib/cityInfo.ts');
const routing = JSON.parse(fs.readFileSync(new URL('../data/geo/city-routing.ru.json', import.meta.url), 'utf8'));

/** Русское имя → ключ CITY_INFO / prod slug */
const NAME_TO_SLUG = {
  Абакан: 'abakan',
  Архангельск: 'arhangelsk',
  Астрахань: 'astrahan',
  Барнаул: 'barnaul',
  Белгород: 'belgorod',
  'Благовещенск (Амурская область)': 'blagoveschensk-amurskaya-oblast',
  Брянск: 'bryansk',
  'Великий Новгород': 'veliky-novgorod',
  Владивосток: 'vladivostok',
  Владимир: 'vladimir',
  Волгоград: 'volgograd',
  Вологда: 'vologda',
  Воронеж: 'voronezh',
  Екатеринбург: 'ekaterinburg',
  Иваново: 'ivanovo',
  Ижевск: 'izhevsk',
  Иркутск: 'irkutsk',
  'Йошкар-Ола': 'yoshkar-ola',
  Казань: 'kazan',
  Калининград: 'kaliningrad',
  Калуга: 'kaluga',
  Кемерово: 'kemerovo',
  'Киров (Кировская область)': 'kirov-kirovskaya-oblast',
  Кострома: 'kostroma',
  Краснодар: 'krasnodar',
  Красноярск: 'krasnoyarsk',
  Курган: 'kurgan',
  Курск: 'kursk',
  Липецк: 'lipeck',
  Москва: 'moscow',
  Мурманск: 'murmansk',
  'Нижний Новгород': 'nizhny-novgorod',
  Новосибирск: 'novosibirsk',
  Омск: 'omsk',
  Оренбург: 'orenburg',
  Орёл: 'orel',
  Пенза: 'penza',
  Пермь: 'perm',
  Псков: 'pskov',
  'Ростов-на-Дону': 'rostov-na-donu',
  Рязань: 'ryazan',
  Самара: 'samara',
  'Санкт-Петербург': 'saint-petersburg',
  Саранск: 'saransk',
  Саратов: 'saratov',
  Севастополь: 'sevastopol',
  Симферополь: 'simferopol',
  Смоленск: 'smolensk',
  Сочи: 'sochi',
  Ставрополь: 'stavropol',
  Сыктывкар: 'syktyvkar',
  Тамбов: 'tambov',
  Тверь: 'tver',
  Томск: 'tomsk',
  Тула: 'tula',
  Тюмень: 'tyumen',
  'Улан-Удэ': 'ulan-ude',
  Ульяновск: 'ulyanovsk',
  Уфа: 'ufa',
  Хабаровск: 'habarovsk',
  Чебоксары: 'cheboksary',
  Челябинск: 'chelyabinsk',
  Чита: 'chita',
  'Южно-Сахалинск': 'yuzhno-sahalinsk',
  Ярославль: 'yaroslavl',
};

function markBrief(info) {
  return info?.brief?.trim() ? '✅' : '❌';
}
function markSights(info) {
  const n = info?.sights?.length || 0;
  const m = info?.mustSee?.length || 0;
  const count = Math.max(n, m);
  if (count >= 6) return '✅';
  if (count >= 1) return '⚠️';
  return '❌';
}
function markTravel(info) {
  return info?.travel?.trim() ? '✅' : '❌';
}
function markFaq(info) {
  return (info?.faq?.length || 0) > 0 ? '✅' : '❌';
}

const rows = [];
const missingMap = [];
for (const name of routing.standaloneCities) {
  const slug = NAME_TO_SLUG[name];
  if (!slug) missingMap.push(name);
  const info = slug ? resolveCityInfo(slug, slug) : null;
  rows.push({
    name,
    slug: slug || '—',
    brief: markBrief(info),
    sights: markSights(info),
    travel: markTravel(info),
    faq: markFaq(info),
  });
}

if (missingMap.length) {
  console.error('Missing NAME_TO_SLUG:', missingMap.join(', '));
  process.exit(1);
}

const header = '| Город | slug | brief | sights (топ-6) | travel | FAQ |';
const sep = '|---|---|:---:|:---:|:---:|:---:|';
const body = rows
  .map((r) => `| ${r.name} | \`${r.slug}\` | ${r.brief} | ${r.sights} | ${r.travel} | ${r.faq} |`)
  .join('\n');

const md = `# City hub content gaps

Статус редакционного контента для standalone city hubs (\`data/geo/city-routing.ru.json\` → \`standaloneCities\`).

Легенда: ✅ заполнено · ⚠️ sights 1–5 пунктов · ❌ нет

Источник: \`apps/web/src/lib/cityInfo.ts\` (\`brief\`, \`sights\` или legacy \`mustSee\`, \`travel\`, \`faq\`).

Обновлено: 2026-07-19

${header}
${sep}
${body}

## Сводка

- Всего hubs: **${rows.length}**
- brief ✅: **${rows.filter((r) => r.brief === '✅').length}**
- sights ✅ (≥6): **${rows.filter((r) => r.sights === '✅').length}** · ⚠️: **${rows.filter((r) => r.sights === '⚠️').length}** · ❌: **${rows.filter((r) => r.sights === '❌').length}**
- travel ✅: **${rows.filter((r) => r.travel === '✅').length}**
- FAQ ✅: **${rows.filter((r) => r.faq === '✅').length}**
`;

fs.writeFileSync(new URL('../docs/city-hub-content-gaps.md', import.meta.url), md);
console.log(md.split('\n').slice(-12).join('\n'));
console.log('rows', rows.length, 'travel', rows.filter((r) => r.travel === '✅').length, 'sights', rows.filter((r) => r.sights === '✅').length);
