const data = window.ADMIN_DATA || {};

const state = {
  view: "events",
  query: "",
  source: "all",
  category: "all",
  readiness: "all",
  queue: "all",
  venueKind: "all",
};

const titles = {
  events: "Events Workbench",
  dashboard: "Dashboard",
  sources: "Sources & Sync",
  taxonomy: "Mapping Inbox",
  venues: "Venues",
  landings: "Landing Rules",
  destinations: "Destinations",
};

const els = {
  pageTitle: document.querySelector("#pageTitle"),
  searchInput: document.querySelector("#searchInput"),
  sourceStatus: document.querySelector("#sourceStatus"),
  sourceMeta: document.querySelector("#sourceMeta"),
  eventsMetric: document.querySelector("#eventsMetric"),
  reviewMetric: document.querySelector("#reviewMetric"),
  venueMetric: document.querySelector("#venueMetric"),
  landingMetric: document.querySelector("#landingMetric"),
  sourceFilter: document.querySelector("#sourceFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  readinessFilter: document.querySelector("#readinessFilter"),
  venueKindFilter: document.querySelector("#venueKindFilter"),
  eventRows: document.querySelector("#eventRows"),
  eventFooter: document.querySelector("#eventFooter"),
  importGrid: document.querySelector("#importGrid"),
  queueList: document.querySelector("#queueList"),
  sourceGrid: document.querySelector("#sourceGrid"),
  mappingRows: document.querySelector("#mappingRows"),
  venueGrid: document.querySelector("#venueGrid"),
  duplicateList: document.querySelector("#duplicateList"),
  landingGrid: document.querySelector("#landingGrid"),
  destinationGrid: document.querySelector("#destinationGrid"),
};

init();

function init() {
  fillFilters();
  bindEvents();
  render();
}

function fillFilters() {
  const eventRows = data.eventRows || data.moderationEvents || [];
  const categories = [...new Set(eventRows.map((event) => event.sourceCategory).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
  els.categoryFilter.innerHTML += categories.map((category) => `<option value="${escapeAttr(category)}">${escapeHtml(category)}</option>`).join("");

  const kinds = [...new Set((data.venueRows || []).map((venue) => venue.proposedKind).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
  els.venueKindFilter.innerHTML += kinds.map((kind) => `<option value="${escapeAttr(kind)}">${escapeHtml(kind)}</option>`).join("");
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item === button));
      renderSections();
    });
  });

  document.querySelectorAll(".quick-filter").forEach((button) => {
    button.addEventListener("click", () => {
      state.queue = button.dataset.queue;
      document.querySelectorAll(".quick-filter").forEach((item) => item.classList.toggle("is-active", item === button));
      renderEvents();
    });
  });

  els.searchInput.addEventListener("input", () => {
    state.query = els.searchInput.value.trim().toLowerCase();
    renderCurrentView();
  });

  els.sourceFilter.addEventListener("change", () => {
    state.source = els.sourceFilter.value;
    renderEvents();
  });

  els.categoryFilter.addEventListener("change", () => {
    state.category = els.categoryFilter.value;
    renderEvents();
  });

  els.readinessFilter.addEventListener("change", () => {
    state.readiness = els.readinessFilter.value;
    renderEvents();
  });

  els.venueKindFilter.addEventListener("change", () => {
    state.venueKind = els.venueKindFilter.value;
    renderVenues();
  });
}

function render() {
  renderMetrics();
  renderQuickFilters();
  renderEvents();
  renderImport();
  renderQueues();
  renderSources();
  renderMapping();
  renderVenues();
  renderDuplicates();
  renderLandings();
  renderDestinations();
  renderSections();
}

function renderQuickFilters() {
  const rows = data.eventRows || [];
  const counts = {
    all: rows.length,
    attention: rows.filter((event) => event.status === "needs_review").length,
    "no-image": rows.filter((event) => !event.hasImage).length,
    venue: rows.filter((event) => passesReason(event, "площад") || passesReason(event, "точка")).length,
    purchase: rows.filter((event) => event.offerStatus !== "TC widget").length,
    landing: rows.filter((event) => (event.landingHits || []).length > 0).length,
  };
  document.querySelectorAll(".quick-filter").forEach((button) => {
    const label = button.dataset.label || button.textContent.trim();
    const count = counts[button.dataset.queue] || 0;
    button.innerHTML = `<span>${escapeHtml(label)}</span><b>${formatNumber(count)}</b>`;
  });
}

function renderCurrentView() {
  if (state.view === "events") renderEvents();
  if (state.view === "venues") renderVenues();
  if (state.view === "landings") renderLandings();
  if (state.view === "destinations") renderDestinations();
}

function renderSections() {
  els.pageTitle.textContent = titles[state.view];
  document.querySelectorAll("[data-section]").forEach((section) => {
    section.hidden = section.dataset.section !== state.view;
  });
}

function renderMetrics() {
  els.eventsMetric.textContent = formatNumber(data.metrics?.events);
  els.reviewMetric.textContent = formatNumber(data.metrics?.reviewEvents);
  els.venueMetric.textContent = formatNumber(data.metrics?.venues);
  els.landingMetric.textContent = formatNumber(data.metrics?.landingRules);
  els.sourceStatus.textContent = data.importJob?.source || "Ticketscloud";
  els.sourceMeta.textContent = `${data.importJob?.status || "unknown"} · ${data.importJob?.mode || "sync"}`;
}

function renderEvents() {
  const rows = filteredEvents();
  const visibleRows = rows.slice(0, 120);

  els.eventRows.innerHTML = visibleRows.map((event) => `
    <tr>
      <td>
        <div class="event-title">
          <strong>${escapeHtml(event.title)}</strong>
          <span>${escapeHtml(event.id)}</span>
          ${renderTagLine(event)}
        </div>
      </td>
      <td>
        <span class="source-badge">${escapeHtml(event.source || "Ticketscloud")}</span>
        <span class="muted block">${escapeHtml(event.sourceCategory)}</span>
      </td>
      <td>
        <strong>${escapeHtml(event.proposedCategory)}</strong>
        ${renderLandingHits(event)}
      </td>
      <td>
        <strong>${escapeHtml(event.destination || event.city)}</strong>
        <span class="muted block">${escapeHtml(event.city)}</span>
      </td>
      <td>
        ${escapeHtml(event.venue)}
        <span class="muted block">${escapeHtml(labelVenueKind(event.venueKind))}</span>
      </td>
      <td>${formatDate(event.startsAt)}<span class="muted block">${labelEventType(event.eventType)}</span></td>
      <td>${formatPrice(event.priceFrom)}</td>
      <td><span class="pill ${event.offerStatus === "TC widget" ? "ok" : "warn"}">${escapeHtml(event.offerStatus || "проверить")}</span></td>
      <td>${renderReasons(event)}</td>
      <td><span class="status-badge ${event.readiness || "review"}">${labelReadiness(event.readiness)}</span></td>
    </tr>
  `).join("");

  els.eventFooter.textContent = `Показано ${formatNumber(visibleRows.length)} из ${formatNumber(rows.length)} событий. Всего в локальном срезе ${formatNumber((data.eventRows || []).length)}.`;
}

function filteredEvents() {
  return (data.eventRows || data.moderationEvents || []).filter((event) => {
    if (state.source !== "all" && event.source !== state.source) return false;
    if (state.category !== "all" && event.sourceCategory !== state.category) return false;
    if (state.readiness !== "all" && event.readiness !== state.readiness) return false;
    if (!passesQueue(event)) return false;
    if (state.query && !matchesText([event.title, event.city, event.destination, event.venue, event.sourceCategory, event.proposedCategory, event.offerStatus, ...(event.tags || []), ...(event.landingHits || [])])) return false;
    return true;
  });
}

function passesQueue(event) {
  if (state.queue === "all") return true;
  if (state.queue === "attention") return event.status === "needs_review";
  if (state.queue === "no-image") return !event.hasImage;
  if (state.queue === "venue") return (event.reasons || []).some((reason) => reason.includes("площад") || reason.includes("точка"));
  if (state.queue === "purchase") return event.offerStatus !== "TC widget";
  if (state.queue === "landing") return (event.landingHits || []).length > 0;
  return true;
}

function renderImport() {
  const items = [
    ["События", data.importJob?.events],
    ["Категории", data.importJob?.categories],
    ["Площадки", data.importJob?.venues],
    ["Города", data.importJob?.cities],
    ["Теги", data.importJob?.tags],
    ["Meta-группы", data.importJob?.metaEvents],
  ];
  els.importGrid.innerHTML = items.map(([label, value]) => `<article class="stat-card"><span>${label}</span><strong>${formatNumber(value)}</strong></article>`).join("");
}

function renderQueues() {
  const rows = data.eventRows || [];
  const queues = [
    ["Требуют внимания", rows.filter((event) => event.status === "needs_review").length, "warn"],
    ["Блокеры", rows.filter((event) => event.readiness === "blocked").length, "danger"],
    ["Без изображения", rows.filter((event) => !event.hasImage).length, "warn"],
    ["Проблемы площадок", rows.filter((event) => passesReason(event, "площад") || passesReason(event, "точка")).length, "warn"],
    ["Нет offer/widget", rows.filter((event) => event.offerStatus !== "TC widget").length, "danger"],
    ["Попали в лендинги", rows.filter((event) => (event.landingHits || []).length).length, "ok"],
  ];
  els.queueList.innerHTML = queues.map(([label, value, tone]) => `
    <div class="queue-row">
      <span>${label}</span>
      <strong class="${tone}">${formatNumber(value)}</strong>
    </div>
  `).join("");
}

function renderSources() {
  const sources = [
    {
      name: "Ticketscloud",
      status: data.importJob?.status || "success",
      mode: data.importJob?.mode || "PUBLIC full sync",
      events: data.importJob?.events,
      note: "gRPC импорт событий работает. Покупка остается через TC widget.",
    },
    {
      name: "Teplohod.info",
      status: "blocked",
      mode: "ожидаем доступ по IP/TLS",
      events: 0,
      note: "TCP доступ есть, но HTTPS API пока не отвечает на прикладном уровне.",
    },
  ];
  els.sourceGrid.innerHTML = sources.map((source) => `
    <article class="source-panel">
      <div>
        <span class="source-badge">${escapeHtml(source.name)}</span>
        <h3>${escapeHtml(source.mode)}</h3>
      </div>
      <span class="status-badge ${source.status === "success" ? "ready" : "blocked"}">${escapeHtml(source.status)}</span>
      <p>${escapeHtml(source.note)}</p>
      <strong>${formatNumber(source.events)} событий</strong>
    </article>
  `).join("");
}

function renderMapping() {
  els.mappingRows.innerHTML = (data.mappingRows || []).map((row) => `
    <tr>
      <td><strong>${escapeHtml(row.source)}</strong></td>
      <td>${formatNumber(row.events)}</td>
      <td>${escapeHtml(row.target)}</td>
      <td>${escapeHtml(row.subcategory)}</td>
      <td><span class="pill ${row.mode === "auto" ? "ok" : "warn"}">${row.mode === "auto" ? "авто" : "проверка"}</span></td>
    </tr>
  `).join("");
}

function renderVenues() {
  const venues = (data.venueRows || []).filter((venue) => {
    if (state.venueKind !== "all" && venue.proposedKind !== state.venueKind) return false;
    if (state.query && !matchesText([venue.name, venue.city, venue.address, venue.proposedKind, venue.reason])) return false;
    return true;
  });
  els.venueGrid.innerHTML = venues.slice(0, 80).map((venue) => `
    <article class="venue-card">
      <div class="venue-head">
        <h3>${escapeHtml(venue.name)}</h3>
        <span class="pill ${venue.pageStatus === "candidate" ? "warn" : "ok"}">${escapeHtml(venue.pageStatus)}</span>
      </div>
      <p class="muted">${escapeHtml(venue.city)}${venue.address ? ` · ${escapeHtml(venue.address)}` : ""}</p>
      <div class="pills">
        <span class="pill">${escapeHtml(labelVenueKind(venue.proposedKind))}</span>
        <span class="pill">${formatNumber(venue.events)} событий</span>
      </div>
      <p>${escapeHtml(venue.reason)}</p>
    </article>
  `).join("");
}

function renderDuplicates() {
  const groups = data.duplicateCandidates || [];
  if (!groups.length) {
    els.duplicateList.innerHTML = `<div class="duplicate-card"><p class="muted">Явных дублей в топе не найдено.</p></div>`;
    return;
  }
  els.duplicateList.innerHTML = groups.map((group) => `
    <article class="duplicate-card">
      <strong>${formatNumber(group.events)} событий · ключ: ${escapeHtml(group.key)}</strong>
      <ul>
        ${group.venues.map((venue) => `<li>${escapeHtml(venue.name)} · ${escapeHtml(venue.city)} · ${formatNumber(venue.events)} событий</li>`).join("")}
      </ul>
    </article>
  `).join("");
}

function renderLandings() {
  const landings = (data.landingRows || []).filter((landing) => {
    if (state.query && !matchesText([landing.title, landing.slug, landing.status])) return false;
    return true;
  });
  els.landingGrid.innerHTML = landings.map((landing) => `
    <article class="landing-card">
      <span>${escapeHtml(landing.slug)}</span>
      <h3>${escapeHtml(landing.title)}</h3>
      <div class="pills">
        <span class="pill ${landing.status === "ready" ? "ok" : landing.status === "seed" ? "warn" : "danger"}">${escapeHtml(landing.status)}</span>
        <span class="pill">${formatNumber(landing.events)} событий</span>
        <span class="pill">${formatNumber(landing.venues)} мест</span>
        <span class="pill">${landing.priceFrom ? `от ${formatNumber(landing.priceFrom)} ₽` : "нет цены"}</span>
      </div>
    </article>
  `).join("");
}

function renderDestinations() {
  const destinations = (data.destinationRows || []).filter((destination) => {
    if (state.query && !matchesText([destination.name, destination.type, ...(destination.cities || []).map((city) => city.name)])) return false;
    return true;
  });
  els.destinationGrid.innerHTML = destinations.map((destination) => `
    <article class="destination-card">
      <span>${destination.type === "city" ? "город" : "регион"}</span>
      <h3>${escapeHtml(destination.name)}</h3>
      <div class="pills">
        <span class="pill">${formatNumber(destination.events)} событий</span>
        <span class="pill">${formatNumber(destination.venues)} площадок</span>
      </div>
      ${(destination.cities || []).length ? `<p class="muted">${destination.cities.map((city) => `${escapeHtml(city.name)} ${formatNumber(city.events)}`).join(", ")}</p>` : ""}
    </article>
  `).join("");
}

function renderReasons(event) {
  const reasons = event.reasons || [];
  if (!reasons.length) return `<span class="pill ok">нет</span>`;
  return `<div class="pills">${reasons.slice(0, 3).map((reason) => `<span class="pill ${event.severity === "high" ? "danger" : "warn"}">${escapeHtml(reason)}</span>`).join("")}</div>`;
}

function renderLandingHits(event) {
  const hits = event.landingHits || [];
  if (!hits.length) return `<span class="muted block">без landing match</span>`;
  return `<div class="pills slim">${hits.map((hit) => `<span class="pill ok">${escapeHtml(hit)}</span>`).join("")}</div>`;
}

function renderTagLine(event) {
  const tags = event.tags || [];
  if (!tags.length) return "";
  return `<span class="muted">${tags.map(escapeHtml).join(", ")}</span>`;
}

function matchesText(parts) {
  const haystack = parts.filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(state.query);
}

function passesReason(event, text) {
  return (event.reasons || []).some((reason) => reason.includes(text));
}

function formatNumber(value) {
  return new Intl.NumberFormat("ru-RU").format(value || 0);
}

function formatPrice(value) {
  return value ? `от ${formatNumber(Math.round(value))} ₽` : "нет";
}

function formatDate(value) {
  if (!value) return "открытая дата";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function labelEventType(value) {
  return {
    single: "разовое",
    recurring: "повторяющееся",
    open_date: "открытая дата",
  }[value] || "не определено";
}

function labelReadiness(value) {
  return {
    ready: "готово",
    review: "проверить",
    blocked: "блокер",
  }[value] || "проверить";
}

function labelVenueKind(value) {
  return {
    venue: "площадка",
    museum_art_space: "музей / арт",
    theater: "театр",
    concert_hall: "концертный зал",
    club_bar_restaurant: "клуб / бар / ресторан",
    pier: "причал",
    meeting_point: "точка встречи",
    outdoor_location: "открытая локация",
    sport_activity_space: "спорт / активность",
    attraction: "достопримечательность",
    online: "онлайн",
    generic_location: "общая локация",
    other: "другое",
  }[value] || value || "другое";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
