import {
  cityInPhrase,
  firstSentence,
  isOperationalShort,
  normalizeCity,
  truncate,
  typeLabel,
} from './venue-content-sources.mjs';

function activityByType(type) {
  switch (type) {
    case 'theater':
      return 'спектакли и театральные проекты';
    case 'museum_art_space':
      return 'выставки, лекции и культурные программы';
    case 'concert_hall':
      return 'концерты и шоу-программы';
    case 'club_bar_restaurant':
      return 'концерты, stand-up и вечерние программы';
    default:
      return 'мероприятия';
  }
}

function pluralEvents(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'событие';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'события';
  return 'событий';
}

function isPierLike(venue) {
  return venue.type === 'pier' || /причал|сектор|набереж|речной вокзал|пристань/i.test(`${venue.name} ${venue.address || ''}`);
}

export function buildVenueContent(venue, wiki) {
  const city = normalizeCity(venue);
  const cityPhrase = cityInPhrase(city);
  const name = venue.name.trim();
  const address = venue.address?.trim() || null;
  const events = venue.events || 0;
  const template = venue.template || (isPierLike(venue) ? 'location' : 'institution');
  const kind = typeLabel(venue.type);

  if (template === 'location' || isPierLike(venue)) {
    return buildLocationContent({ name, city, cityPhrase, address, events, kind, venue, wiki });
  }
  return buildInstitutionContent({ name, city, cityPhrase, address, events, kind, venue, wiki, activity: activityByType(venue.type) });
}

function buildLocationContent({ name, city, cityPhrase, address, events, kind, venue, wiki }) {
  const shortFromWiki = wiki?.extract ? firstSentence(wiki.extract, 200) : null;

  const shortDescription =
    (isOperationalShort(venue.shortDescription) ? venue.shortDescription : null) ||
    shortFromWiki ||
    (address
      ? `${name} — ${kind} ${cityPhrase}. Отсюда отправляются речные прогулки и экскурсии; актуальное расписание и билеты — в афише ниже.`
      : `${name} — точка посадки на рейс ${cityPhrase}. Выберите дату и время отправления в расписании.`);

  const aboutParts = [];
  if (wiki?.extract) {
    aboutParts.push(truncate(wiki.extract, 650));
  } else {
    aboutParts.push(
      `${name} — ${kind} ${cityPhrase}${address ? ` по адресу ${address}` : ''}. На странице собраны события и рейсы, связанные с этой точкой: сравните время отправления, маршрут и цену в таблице расписания.`,
    );
    if (events > 0) {
      aboutParts.push(
        `Сейчас в афише — ${events} ${pluralEvents(events)}. Расписание обновляется по данным организаторов; перед покупкой проверьте точный причал и время посадки в карточке события.`,
      );
    }
    aboutParts.push(
      'Приходите заранее — на популярных маршрутах посадка начинается за 10–15 минут до отправления. Билеты оформляются онлайн через виджет билетной системы.',
    );
  }

  const description = aboutParts.join('\n\n');
  const seoDescription = truncate(
    `${name}: расписание рейсов и билеты${address ? `, ${address}` : ''}, ${city}. ${events ? `${events} ${pluralEvents(events)} в афише.` : ''}`,
    160,
  );

  return {
    shortDescription: truncate(shortDescription, 240),
    description: truncate(description, 1200),
    seoDescription,
    contentSource: wiki ? 'wikipedia+template' : 'template',
    wikiUrl: wiki?.url || null,
    wikiTitle: wiki?.wikiTitle || wiki?.title || null,
  };
}

function buildInstitutionContent({ name, city, cityPhrase, address, events, kind, venue, wiki, activity }) {
  const shortFromWiki = wiki?.extract ? firstSentence(wiki.extract, 210) : null;

  const shortDescription =
    shortFromWiki ||
    (address
      ? `${name} — ${kind} ${cityPhrase}. Афиша, ближайшие сеансы и билеты онлайн.`
      : `${name} — ${kind} ${cityPhrase}. Смотрите расписание событий и покупайте билеты на Дайбилет.`);

  const aboutParts = [];
  if (wiki?.extract) {
    aboutParts.push(truncate(wiki.extract, 750));
    aboutParts.push(
      events > 0
        ? `На Дайбилет — ${events} ${pluralEvents(events)} в афише: выберите дату и оформите билет в несколько кликов.`
        : 'Актуальные события и сеансы — в расписании на этой странице.',
    );
  } else {
    aboutParts.push(
      `${name} — ${kind} ${cityPhrase}${address ? ` (${address})` : ''}. В афише — ${activity}; полный список смотрите в блоке «Афиша и билеты».`,
    );
    if (events > 0) {
      aboutParts.push(`В каталоге сейчас ${events} ${pluralEvents(events)}. Цены и свободные места — в карточках расписания.`);
    }
    aboutParts.push(
      'Перед визитом уточняйте режим работы и правила посещения на официальном сайте площадки, особенно в праздничные дни.',
    );
  }

  const description = aboutParts.join('\n\n');

  const seoTitle = `${name} — афиша и билеты, ${city} | Дайбилет`;
  const seoDescription = truncate(
    `${name}: ${events ? `${events} ${pluralEvents(events)}, ` : ''}расписание и билеты онлайн. ${kind} в ${city}${address ? `, ${address}` : ''}.`,
    160,
  );

  return {
    shortDescription: truncate(shortDescription, 240),
    description: truncate(description, 1200),
    seoDescription,
    seoTitle,
    contentSource: wiki ? 'wikipedia+template' : 'template',
    wikiUrl: wiki?.url || null,
    wikiTitle: wiki?.wikiTitle || wiki?.title || null,
  };
}
