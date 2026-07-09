/** Ссылки блога: афиша города ведёт на блок расписания. */
function cityEventsHref(slug) {
  return `/cities/${slug}#city-schedule`;
}

module.exports = { cityEventsHref };
