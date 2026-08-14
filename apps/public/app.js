const state = {
  view: "catalog",
  destination: "all",
  landing: "all",
  time: "all",
  price: 5000,
  query: "",
  period: "all",
};

const data = window.PUBLIC_DATA;

const els = {
  destinationFilter: document.querySelector("#destinationFilter"),
  landingFilter: document.querySelector("#landingFilter"),
  timeFilter: document.querySelector("#timeFilter"),
  priceFilter: document.querySelector("#priceFilter"),
  priceLabel: document.querySelector("#priceLabel"),
  searchInput: document.querySelector("#searchInput"),
  destinationGrid: document.querySelector("#destinationGrid"),
  landingGrid: document.querySelector("#landingGrid"),
  sessionRows: document.querySelector("#sessionRows"),
  venueList: document.querySelector("#venueList"),
  eventsMetric: document.querySelector("#eventsMetric"),
  destinationsMetric: document.querySelector("#destinationsMetric"),
  venuesMetric: document.querySelector("#venuesMetric"),
  visibleMetric: document.querySelector("#visibleMetric"),
};

init();

function init() {
  fillSelects();
  bindEvents();
  render();
}

function fillSelects() {
  els.destinationFilter.innerHTML = [
    `<option value="all">Все направления</option>`,
    ...data.destinations.map((item) => `<option value="${escapeAttr(item.name)}">${escapeHtml(item.name)}</option>`),
  ].join("");

  els.landingFilter.innerHTML = [
    `<option value="all">Все темы</option>`,
    ...data.landings.map((item) => `<option value="${escapeAttr(item.slug)}">${escapeHtml(item.title)}</option>`),
  ].join("");
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item === button));
      renderSections();
    });
  });

  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      state.period = button.dataset.period;
      document.querySelectorAll(".segment").forEach((item) => item.classList.toggle("is-active", item === button));
      renderSessions();
    });
  });

  els.destinationFilter.addEventListener("change", () => {
    state.destination = els.destinationFilter.value;
    render();
  });
  els.landingFilter.addEventListener("change", () => {
    state.landing = els.landingFilter.value;
    render();
  });
  els.timeFilter.addEventListener("change", () => {
    state.time = els.timeFilter.value;
    renderSessions();
  });
  els.priceFilter.addEventListener("input", () => {
    state.price = Number(els.priceFilter.value);
    els.priceLabel.textContent = `${state.price} ₽`;
    renderSessions();
  });
  els.searchInput.addEventListener("input", () => {
    state.query = els.searchInput.value.trim().toLowerCase();
    render();
  });
}

function render() {
  renderMetrics();
  renderDestinations();
  renderLandings();
  renderSessions();
  renderVenues();
  renderSections();
}

function renderMetrics() {
  const visible = filteredSessions().length;
  els.eventsMetric.textContent = formatNumber(data.stats.events);
  els.destinationsMetric.textContent = formatNumber(data.stats.destinations);
  els.venuesMetric.textContent = formatNumber(data.stats.venues);
  els.visibleMetric.textContent = formatNumber(visible);
}

function renderSections() {
  document.querySelectorAll("[data-section]").forEach((section) => {
    section.hidden = state.view !== "catalog" && section.dataset.section !== state.view;
  });
}

function renderDestinations() {
  const destinations = data.destinations.filter((item) => {
    if (state.query && !item.name.toLowerCase().includes(state.query)) return false;
    return true;
  });

  els.destinationGrid.innerHTML = destinations
    .slice(0, 16)
    .map(
      (item) => `
        <button class="destination-card" data-type="${item.type}" type="button" data-destination="${escapeAttr(item.name)}">
          <strong>${escapeHtml(item.name)}</strong>
          <div class="card-meta">
            <span>${formatNumber(item.events)} событий</span>
            <span>${formatNumber(item.venues)} площадок</span>
          </div>
          <div class="card-meta">
            ${item.categories.map((category) => `<span class="pill">${escapeHtml(category.name)}</span>`).join("")}
          </div>
        </button>
      `
    )
    .join("");

  els.destinationGrid.querySelectorAll(".destination-card").forEach((card) => {
    card.addEventListener("click", () => {
      state.destination = card.dataset.destination;
      els.destinationFilter.value = state.destination;
      state.view = "sessions";
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.view === "sessions"));
      render();
    });
  });
}

function renderLandings() {
  els.landingGrid.innerHTML = data.landings
    .map(
      (item) => `
        <button class="landing-card" type="button" data-landing="${escapeAttr(item.slug)}">
          ${item.imageUrl ? `<img src="${escapeAttr(item.imageUrl)}" alt="" loading="lazy" />` : ""}
          <div class="landing-info">
            <div class="card-meta">
              <span class="pill">${statusLabel(item.strength)}</span>
              <span>${formatNumber(item.events)} событий</span>
              <span>${formatNumber(item.venues)} мест</span>
            </div>
            <div>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.subtitle)}</p>
            </div>
            <div class="landing-actions">
              ${item.chips.map((chip) => `<span class="pill">${escapeHtml(chip)}</span>`).join("")}
              ${item.priceFrom ? `<span class="pill">от ${item.priceFrom} ₽</span>` : `<span class="pill">ожидает событий</span>`}
            </div>
          </div>
        </button>
      `
    )
    .join("");

  els.landingGrid.querySelectorAll(".landing-card").forEach((card) => {
    card.addEventListener("click", () => {
      state.landing = card.dataset.landing;
      els.landingFilter.value = state.landing;
      state.view = "sessions";
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.view === "sessions"));
      render();
    });
  });
}

function renderSessions() {
  const sessions = filteredSessions();
  els.visibleMetric.textContent = formatNumber(sessions.length);

  if (!sessions.length) {
    els.sessionRows.innerHTML = `<tr><td colspan="8"><div class="empty">Нет сеансов под выбранные фильтры</div></td></tr>`;
    return;
  }

  els.sessionRows.innerHTML = sessions
    .slice(0, 70)
    .map(
      (event) => `
        <tr>
          <td>${escapeHtml(event.dateLabel)}</td>
          <td>${escapeHtml(event.timeLabel)}</td>
          <td>
            <div class="event-cell">
              ${event.imageUrl ? `<img src="${escapeAttr(event.imageUrl)}" alt="" loading="lazy" />` : `<img alt="" />`}
              <div>
                <strong>${escapeHtml(event.title)}</strong>
                <span>${escapeHtml(event.category)} · ${escapeHtml(event.tags[0] || "событие")}</span>
              </div>
            </div>
          </td>
          <td>${escapeHtml(event.city)}</td>
          <td>${escapeHtml(event.venue)}</td>
          <td>${event.priceFrom ? `от ${event.priceFrom} ₽` : "по данным источника"}</td>
          <td>${event.vacant ?? "—"}</td>
          <td><button class="buy-button" type="button">Купить</button></td>
        </tr>
      `
    )
    .join("");
}

function renderVenues() {
  els.venueList.innerHTML = data.venues
    .map(
      (venue) => `
        <article class="venue-card">
          <div class="venue-top">
            <h3>${escapeHtml(venue.name)}</h3>
            <span class="type-badge">${escapeHtml(typeLabel(venue.type))}</span>
          </div>
          <p>${escapeHtml(venue.city)}${venue.address ? ` · ${escapeHtml(venue.address)}` : ""}</p>
          <div class="card-meta">
            <span>${formatNumber(venue.events)} событий</span>
            ${Object.keys(venue.categories).slice(0, 3).map((name) => `<span class="pill">${escapeHtml(name)}</span>`).join("")}
          </div>
        </article>
      `
    )
    .join("");
}

function filteredSessions() {
  const query = state.query;
  const now = new Date();
  const today = now.toDateString();

  return data.sessions.filter((event) => {
    if (state.destination !== "all" && event.destination !== state.destination) return false;
    if (state.landing !== "all" && !event.landingSlugs.includes(state.landing)) return false;
    if (state.time !== "all" && event.timeBucket !== state.time) return false;
    if (event.priceFrom && event.priceFrom > state.price) return false;
    if (query) {
      const haystack = [event.title, event.city, event.venue, event.category, ...event.tags].join(" ").toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (state.period === "today" && new Date(event.startsAt).toDateString() !== today) return false;
    if (state.period === "weekend" && ![0, 6].includes(new Date(event.startsAt).getDay())) return false;
    return true;
  });
}

function statusLabel(value) {
  if (value === "ready") return "готово";
  if (value === "seed") return "есть база";
  return "под спрос";
}

function typeLabel(value) {
  const labels = {
    generic_location: "точка",
    pier_water: "причал",
    museum_art: "музей",
    concert_hall: "зал",
    club_restaurant: "клуб",
    theater: "театр",
    sport_outdoor: "активность",
  };
  return labels[value] || "место";
}

function formatNumber(value) {
  return new Intl.NumberFormat("ru-RU").format(value || 0);
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
