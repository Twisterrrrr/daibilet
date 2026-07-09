/**
 * Сгенерировать batch9 описаний для площадок без текста.
 *   node scripts/build-venue-batch9-stubs.js
 */
const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, 'data/venues-without-description-prod.json');
const outPath = path.join(__dirname, 'data/venue-content-user-batch9.json');

const KIND_LABELS = {
  MUSEUM_ART_SPACE: 'музей и арт-пространство',
  THEATER: 'театр',
  CONCERT_HALL: 'концертная площадка',
  CLUB_BAR_RESTAURANT: 'клуб и ресторан',
  PIER: 'причал',
  MEETING_POINT: 'точка встречи',
  SPORT_ACTIVITY_SPACE: 'спортивная площадка',
  ATTRACTION: 'достопримечательность',
  OTHER: 'площадка',
};

function shortFromDescription(text, max = 220) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const last = slice.lastIndexOf('. ');
  return (last > max * 0.55 ? slice.slice(0, last + 1) : `${slice.trim()}…`).trim();
}

function cleanTitle(name) {
  return String(name || '')
    .replace(/\/\/\/.*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildDescription(venue) {
  const title = cleanTitle(venue.name);
  const city = venue.city || 'городе';
  const address = venue.address ? ` Адрес: ${venue.address}.` : '';
  const kind = KIND_LABELS[venue.type] || 'площадка';

  if (venue.type === 'PIER') {
    return `${title} — ${kind} в ${city}.${address} На Дайбилет доступны речные прогулки и экскурсии с отправлением с этого причала.`;
  }
  if (venue.type === 'MEETING_POINT') {
    return `${title} — ${kind} для экскурсий в ${city}.${address} Здесь начинаются пешие и автобусные маршруты; актуальное расписание — на Дайбилет.`;
  }
  if (venue.type === 'MUSEUM_ART_SPACE' || venue.type === 'ATTRACTION') {
    return `${title} — ${kind} в ${city}.${address} Экспозиции, события и билеты онлайн на Дайбилет.`;
  }
  return `${title} — ${kind} в ${city}.${address} Афиша мероприятий и покупка билетов через Дайбилет.`;
}

function main() {
  const payload = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const venues = payload.items.map((venue) => {
    const description = buildDescription(venue);
    return {
      id: venue.id,
      title: cleanTitle(venue.name),
      city: venue.city,
      address: venue.address,
      description,
      shortDescription: shortFromDescription(description),
      match: [cleanTitle(venue.name)],
    };
  });

  const out = {
    generatedAt: new Date().toISOString(),
    source: 'auto-batch9-venues-without-description',
    venues,
  };

  fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${venues.length} venues to ${outPath}`);
}

main();
