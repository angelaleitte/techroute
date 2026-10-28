import { fetchAppointments } from "../api/appointments.js";
import { fetchTechnicians } from "../api/catalog.js";
import { renderBanner } from "../components/banner.js";
import { escapeHtml } from "../components/field.js";

const STATUS_FILTERS = [
  { id: "all", label: "Todos os status" },
  { id: "open", label: "Abertas" },
  { id: "in_progress", label: "Em atendimento" },
  { id: "reopened", label: "Reabertas" },
  { id: "rebooked", label: "Remarcadas" },
  { id: "late", label: "Atrasadas" },
  { id: "closed", label: "Fechadas" },
  { id: "cancelled", label: "Canceladas" },
];

const KPI_DEFS = [
  { id: "total", label: "Total", tone: "neutral" },
  { id: "open", label: "Abertas", tone: "info" },
  { id: "in_progress", label: "Em atendimento", tone: "warning" },
  { id: "late", label: "Atrasadas", tone: "danger" },
  { id: "rebooked", label: "Remarcadas", tone: "warning" },
  { id: "closed", label: "Fechadas", tone: "success" },
  { id: "cancelled", label: "Canceladas", tone: "danger" },
];

const STATUS_CHART = [
  { id: "open", label: "Abertas", tone: "info" },
  { id: "in_progress", label: "Em atendimento", tone: "warning" },
  { id: "reopened", label: "Reabertas", tone: "info" },
  { id: "rebooked", label: "Remarcadas", tone: "warning" },
  { id: "late", label: "Atrasadas", tone: "danger" },
  { id: "closed", label: "Fechadas", tone: "success" },
  { id: "cancelled", label: "Canceladas", tone: "danger" },
];

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const icons = {
  filter: `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z"></path></svg>`,
  statusAll: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M8 12h8"></path></svg>`,
  statusOpen: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle></svg>`,
  statusLate: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>`,
  statusClosed: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m8.5 12.5 2.5 2.5 5-5"></path></svg>`,
  statusCancelled: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m15 9-6 6M9 9l6 6"></path></svg>`,
  statusReopened: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v5h5"></path></svg>`,
  statusRebooked: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path></svg>`,
};

const statusFilterIcons = {
  all: icons.statusAll,
  open: icons.statusOpen,
  reopened: icons.statusReopened,
  rebooked: icons.statusRebooked,
  late: icons.statusLate,
  in_progress: icons.statusLate,
  closed: icons.statusClosed,
  cancelled: icons.statusCancelled,
};

function startOfWeek(date = new Date()) {
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  return value;
}

function addDays(date, days) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatShortDate(iso) {
  if (!iso) {
    return "—";
  }
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) {
    return iso;
  }
  return `${d}/${m}/${y}`;
}

function weekdayIndex(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y || !m || !d) {
    return 0;
  }
  const day = new Date(y, m - 1, d).getDay();
  return day === 0 ? 6 : day - 1;
}

function currentWeekRange() {
  const start = startOfWeek(new Date());
  return {
    from: toIsoDate(start),
    to: toIsoDate(addDays(start, 6)),
  };
}

export async function mountWeeklyDashboard(root, { user } = {}) {
  const host = document.createElement("div");
  host.className = "app-page-host";
  root.replaceChildren(host);

  if (user?.role !== "supervisor") {
    host.innerHTML = `
      <section class="app-dashboard" aria-labelledby="dashboard-title">
        <header class="app-dashboard__header">
          <div>
            <p class="ds-eyebrow">Painel semanal</p>
            <h1 class="ds-title" id="dashboard-title">Acesso restrito</h1>
            <p class="ds-small">O dashboard de indicadores é exclusivo do supervisor.</p>
          </div>
        </header>
        <p class="app-empty">
          <a class="ds-btn ds-btn--secondary" href="#visitas">Voltar para visitas</a>
        </p>
      </section>
    `;
    return;
  }

  const week = currentWeekRange();

  const state = {
    loading: true,
    banner: null,
    appointments: [],
    technicians: [],
    filtersOpen: true,
    technicianFilter: [],
    technicianFilterOpen: false,
    dateFrom: week.from,
    dateTo: week.to,
    statusFilter: [],
    statusMenuOpen: false,
  };

  function hasStatusFilter() {
    return state.statusFilter.length > 0;
  }

  function hasTechnicianFilter() {
    return state.technicianFilter.length > 0;
  }

  function isStatusSelected(statusId) {
    if (statusId === "all") {
      return state.statusFilter.length === 0;
    }
    return state.statusFilter.includes(statusId);
  }

  function isTechnicianSelected(technicianId) {
    if (!technicianId) {
      return state.technicianFilter.length === 0;
    }
    return state.technicianFilter.includes(technicianId);
  }

  function getStatusFilterLabel() {
    if (state.statusFilter.length === 0) {
      return "Todos os status";
    }
    if (state.statusFilter.length === 1) {
      return STATUS_FILTERS.find((item) => item.id === state.statusFilter[0])?.label || "1 status";
    }
    return `${state.statusFilter.length} status`;
  }

  function getTechnicianFilterLabel() {
    if (state.technicianFilter.length === 0) {
      return "Todos os técnicos";
    }
    if (state.technicianFilter.length === 1) {
      const technician = state.technicians.find((item) => item.id === state.technicianFilter[0]);
      return technician?.name || "1 técnico";
    }
    return `${state.technicianFilter.length} técnicos`;
  }

  function countActiveFieldFilters() {
    let count = 0;
    if (hasTechnicianFilter()) {
      count += 1;
    }
    if (state.dateFrom || state.dateTo) {
      count += 1;
    }
    if (hasStatusFilter()) {
      count += 1;
    }
    return count;
  }

  function getFiltersSummary() {
    const parts = [];
    if (hasTechnicianFilter()) {
      parts.push(getTechnicianFilterLabel());
    }
    if (state.dateFrom || state.dateTo) {
      const from = state.dateFrom ? formatShortDate(state.dateFrom) : "…";
      const to = state.dateTo ? formatShortDate(state.dateTo) : "…";
      parts.push(`${from} → ${to}`);
    }
    if (hasStatusFilter()) {
      parts.push(getStatusFilterLabel());
    }
    if (parts.length === 0) {
      return "Técnicos, período e status";
    }
    return parts.join(" · ");
  }

  function setStatusFilter(statusId) {
    if (statusId === "all") {
      state.statusFilter = [];
      return;
    }
    const selected = new Set(state.statusFilter);
    if (selected.has(statusId)) {
      selected.delete(statusId);
    } else {
      selected.add(statusId);
    }
    state.statusFilter = STATUS_FILTERS.map((item) => item.id).filter(
      (id) => id !== "all" && selected.has(id),
    );
  }

  function setTechnicianFilter(technicianId) {
    if (!technicianId) {
      state.technicianFilter = [];
      return;
    }
    const selected = new Set(state.technicianFilter);
    if (selected.has(technicianId)) {
      selected.delete(technicianId);
    } else {
      selected.add(technicianId);
    }
    state.technicianFilter = state.technicians
      .map((item) => item.id)
      .filter((id) => selected.has(id));
  }

  function filteredAppointments() {
    let items = [...state.appointments];

    if (hasTechnicianFilter()) {
      const selected = new Set(state.technicianFilter);
      items = items.filter((item) => selected.has(item.technicianId));
    }

    if (state.dateFrom) {
      items = items.filter((item) => item.date >= state.dateFrom);
    }

    if (state.dateTo) {
      items = items.filter((item) => item.date <= state.dateTo);
    }

    if (state.statusFilter.length > 0) {
      const selected = new Set(state.statusFilter);
      items = items.filter((item) => selected.has(item.displayStatus));
    }

    return items;
  }

  function buildAnalytics(items) {
    const byStatus = Object.fromEntries(STATUS_CHART.map((item) => [item.id, 0]));
    const byTechnician = new Map();
    const byWeekday = WEEKDAY_LABELS.map((label) => ({ label, count: 0 }));

    for (const appointment of items) {
      const status = appointment.displayStatus || "open";
      if (Object.prototype.hasOwnProperty.call(byStatus, status)) {
        byStatus[status] += 1;
      }

      const techId = appointment.technicianId || "unknown";
      const techName = appointment.technicianName || "Sem técnico";
      const current = byTechnician.get(techId) || { id: techId, name: techName, count: 0, byStatus: {} };
      current.count += 1;
      current.byStatus[status] = (current.byStatus[status] || 0) + 1;
      byTechnician.set(techId, current);

      if (appointment.date) {
        byWeekday[weekdayIndex(appointment.date)].count += 1;
      }
    }

    const technicians = [...byTechnician.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));

    return {
      total: items.length,
      byStatus,
      technicians,
      byWeekday,
    };
  }

  function renderTechnicianFilter() {
    const technicians = [...state.technicians].sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), "pt-BR", { sensitivity: "base" }),
    );
    const selectedLabel = getTechnicianFilterLabel();
    const isActive = hasTechnicianFilter();

    return `
      <div class="app-select-filter app-tech-filter${state.technicianFilterOpen ? " is-open" : ""}${isActive ? " is-active" : ""}">
        <button
          class="app-select-filter__trigger"
          type="button"
          data-action="toggle-technician-filter"
          aria-haspopup="listbox"
          aria-expanded="${state.technicianFilterOpen ? "true" : "false"}"
          aria-controls="dashboard-technician-filter-list"
        >
          <span class="app-select-filter__value${isActive ? "" : " is-placeholder"}">${escapeHtml(selectedLabel)}</span>
          <svg class="ds-icon ds-icon--sm app-select-filter__chevron" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 9 6 6 6-6"></path>
          </svg>
        </button>
        ${
          state.technicianFilterOpen
            ? `<div class="app-select-filter__panel" role="presentation">
                <p class="app-select-filter__hint">Selecione um ou mais técnicos</p>
                <ul class="app-select-filter__list" id="dashboard-technician-filter-list" role="listbox" aria-multiselectable="true" aria-label="Técnicos">
                  <li>
                    <button
                      class="app-select-filter__option app-select-filter__option--check${!hasTechnicianFilter() ? " is-selected" : ""}"
                      type="button"
                      role="option"
                      aria-selected="${!hasTechnicianFilter() ? "true" : "false"}"
                      data-action="set-technician-filter"
                      data-technician=""
                    >
                      <span class="app-select-filter__check" aria-hidden="true"></span>
                      Todos os técnicos
                    </button>
                  </li>
                  ${
                    technicians.length === 0
                      ? `<li class="app-select-filter__empty">Nenhum técnico disponível</li>`
                      : technicians
                          .map(
                            (technician) => `
                              <li>
                                <button
                                  class="app-select-filter__option app-select-filter__option--check${isTechnicianSelected(technician.id) ? " is-selected" : ""}"
                                  type="button"
                                  role="option"
                                  aria-selected="${isTechnicianSelected(technician.id) ? "true" : "false"}"
                                  data-action="set-technician-filter"
                                  data-technician="${escapeHtml(technician.id)}"
                                >
                                  <span class="app-select-filter__check" aria-hidden="true"></span>
                                  ${escapeHtml(technician.name)}
                                </button>
                              </li>
                            `,
                          )
                          .join("")
                  }
                </ul>
              </div>`
            : ""
        }
      </div>
    `;
  }

  function renderDateRangeFilter() {
    const isActive = Boolean(state.dateFrom || state.dateTo);

    return `
      <div class="app-date-range${isActive ? " is-active" : ""}" role="group" aria-label="Intervalo de data">
        <label class="app-date-range__field">
          <span class="app-date-range__label">De</span>
          <input
            class="ds-input app-date-range__input"
            id="dashboardDateFrom"
            type="date"
            value="${escapeHtml(state.dateFrom)}"
            aria-label="Data inicial"
            ${state.dateTo ? `max="${escapeHtml(state.dateTo)}"` : ""}
          >
        </label>
        <label class="app-date-range__field">
          <span class="app-date-range__label">Até</span>
          <input
            class="ds-input app-date-range__input"
            id="dashboardDateTo"
            type="date"
            value="${escapeHtml(state.dateTo)}"
            aria-label="Data final"
            ${state.dateFrom ? `min="${escapeHtml(state.dateFrom)}"` : ""}
          >
        </label>
        ${
          isActive
            ? `<button
                class="app-date-range__clear"
                type="button"
                data-action="clear-date-range"
                aria-label="Limpar intervalo de data"
                title="Limpar período"
              >
                <svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m18 6-12 12M6 6l12 12"></path>
                </svg>
              </button>`
            : ""
        }
      </div>
    `;
  }

  function renderFilters() {
    const statusLabel = getStatusFilterLabel();
    const open = Boolean(state.filtersOpen);
    const activeCount = countActiveFieldFilters();
    const hasFilters = activeCount > 0;
    const summary = getFiltersSummary();

    return `
      <section class="app-filters${open ? " is-open" : ""}${hasFilters ? " is-active" : ""}" aria-labelledby="dashboard-filters-title">
        <button
          class="app-filters__toggle"
          type="button"
          data-action="toggle-filters-panel"
          aria-expanded="${open ? "true" : "false"}"
          aria-controls="dashboard-filters-panel"
          id="dashboard-filters-title"
        >
          <span class="app-filters__toggle-main">
            <span class="app-filters__toggle-label">Filtros</span>
            ${
              hasFilters
                ? `<span class="ds-badge ds-badge--subtle app-filters__count">${activeCount}</span>`
                : ""
            }
          </span>
          <span class="app-filters__toggle-summary">${escapeHtml(summary)}</span>
          <svg class="ds-icon ds-icon--sm app-filters__chevron" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 9 6 6 6-6"></path>
          </svg>
        </button>
        <div class="app-filters__panel" id="dashboard-filters-panel" ${open ? "" : "hidden"}>
          <div class="app-filters__fields" role="group" aria-label="Campos de filtro">
            <div class="app-filters__field">
              <span class="app-filters__field-label">Técnicos</span>
              ${renderTechnicianFilter()}
            </div>
            <div class="app-filters__field app-filters__field--dates">
              <span class="app-filters__field-label">Período</span>
              ${renderDateRangeFilter()}
            </div>
          </div>
          <div class="app-visits__toolbar-tools" role="toolbar" aria-label="Status e atalhos de período">
            <div class="app-visits__filter">
              <button
                class="app-visits__tool-btn ds-tooltip${hasStatusFilter() ? " is-active" : ""}"
                type="button"
                data-action="toggle-status-menu"
                data-tooltip="Filtrar por status (múltipla escolha)"
                aria-label="Filtrar por status"
                aria-expanded="${state.statusMenuOpen ? "true" : "false"}"
                aria-haspopup="menu"
              >
                ${icons.filter}
              </button>
              ${
                state.statusMenuOpen
                  ? `<div class="app-visits__menu" role="menu" aria-label="Status da visita">
                      <p class="app-visits__menu-hint">Selecione um ou mais status</p>
                      ${STATUS_FILTERS.map(
                        (item) => `
                          <button
                            class="app-visits__menu-item${isStatusSelected(item.id) ? " is-selected" : ""}"
                            type="button"
                            role="menuitemcheckbox"
                            aria-checked="${isStatusSelected(item.id) ? "true" : "false"}"
                            data-action="set-status-filter"
                            data-status="${item.id}"
                          >
                            <span class="app-visits__menu-check" aria-hidden="true"></span>
                            ${statusFilterIcons[item.id] || ""}
                            <span>${escapeHtml(item.label)}</span>
                          </button>
                        `,
                      ).join("")}
                    </div>`
                  : ""
              }
            </div>
            <span class="app-visits__filter-label" aria-live="polite">${escapeHtml(statusLabel)}</span>
            <button class="ds-btn ds-btn--secondary ds-btn--sm" type="button" data-action="set-week-current">
              Semana atual
            </button>
            <button class="ds-btn ds-btn--secondary ds-btn--sm" type="button" data-action="set-week-next">
              Próxima semana
            </button>
          </div>
        </div>
      </section>
    `;
  }

  function renderKpis(analytics) {
    const values = {
      total: analytics.total,
      open: analytics.byStatus.open || 0,
      in_progress: analytics.byStatus.in_progress || 0,
      late: analytics.byStatus.late || 0,
      rebooked: analytics.byStatus.rebooked || 0,
      closed: analytics.byStatus.closed || 0,
      cancelled: analytics.byStatus.cancelled || 0,
    };

    return `
      <section class="app-dashboard__kpis" aria-label="Indicadores">
        ${KPI_DEFS.map(
          (kpi) => `
            <article class="app-dashboard__kpi app-dashboard__kpi--${kpi.tone}">
              <p class="app-dashboard__kpi-label">${escapeHtml(kpi.label)}</p>
              <p class="app-dashboard__kpi-value">${values[kpi.id] ?? 0}</p>
            </article>
          `,
        ).join("")}
      </section>
    `;
  }

  function renderBarChart({ title, items, emptyLabel }) {
    const max = Math.max(...items.map((item) => item.count), 0);
    const hasData = items.some((item) => item.count > 0);

    return `
      <article class="app-dashboard__chart">
        <header class="app-dashboard__chart-header">
          <h2 class="app-dashboard__chart-title">${escapeHtml(title)}</h2>
        </header>
        ${
          !hasData
            ? `<p class="app-empty app-empty--compact">${escapeHtml(emptyLabel)}</p>`
            : `<ul class="app-dashboard__bars" aria-label="${escapeHtml(title)}">
                ${items
                  .map((item) => {
                    const pct = max > 0 ? Math.round((item.count / max) * 100) : 0;
                    return `
                      <li class="app-dashboard__bar-row">
                        <span class="app-dashboard__bar-label">${escapeHtml(item.label)}</span>
                        <div class="app-dashboard__bar-track" aria-hidden="true">
                          <span class="app-dashboard__bar-fill app-dashboard__bar-fill--${item.tone || "neutral"}" style="--bar-pct: ${pct}%"></span>
                        </div>
                        <span class="app-dashboard__bar-value">${item.count}</span>
                      </li>
                    `;
                  })
                  .join("")}
              </ul>`
        }
      </article>
    `;
  }

  function renderColumnChart({ title, items, emptyLabel }) {
    const max = Math.max(...items.map((item) => item.count), 0);
    const hasData = items.some((item) => item.count > 0);

    return `
      <article class="app-dashboard__chart">
        <header class="app-dashboard__chart-header">
          <h2 class="app-dashboard__chart-title">${escapeHtml(title)}</h2>
        </header>
        ${
          !hasData
            ? `<p class="app-empty app-empty--compact">${escapeHtml(emptyLabel)}</p>`
            : `<div class="app-dashboard__columns" role="img" aria-label="${escapeHtml(title)}">
                ${items
                  .map((item) => {
                    const pct = max > 0 ? Math.round((item.count / max) * 100) : 0;
                    return `
                      <div class="app-dashboard__column">
                        <span class="app-dashboard__column-value">${item.count}</span>
                        <div class="app-dashboard__column-track" aria-hidden="true">
                          <span class="app-dashboard__column-fill" style="--bar-pct: ${pct}%"></span>
                        </div>
                        <span class="app-dashboard__column-label">${escapeHtml(item.label)}</span>
                      </div>
                    `;
                  })
                  .join("")}
              </div>`
        }
      </article>
    `;
  }

  function renderCharts(analytics) {
    const statusItems = STATUS_CHART.map((item) => ({
      label: item.label,
      count: analytics.byStatus[item.id] || 0,
      tone: item.tone,
    }));

    const technicianItems = analytics.technicians.map((item) => ({
      label: item.name,
      count: item.count,
      tone: "neutral",
    }));

    const weekdayItems = analytics.byWeekday.map((item) => ({
      label: item.label,
      count: item.count,
    }));

    return `
      <section class="app-dashboard__charts" aria-label="Gráficos">
        ${renderBarChart({
          title: "Visitas por status",
          items: statusItems,
          emptyLabel: "Sem visitas no período filtrado.",
        })}
        ${renderBarChart({
          title: "Carga por técnico",
          items: technicianItems,
          emptyLabel: "Nenhum técnico com visitas no recorte atual.",
        })}
        ${renderColumnChart({
          title: "Distribuição por dia da semana",
          items: weekdayItems,
          emptyLabel: "Sem visitas no período filtrado.",
        })}
      </section>
    `;
  }

  function paint() {
    const visible = filteredAppointments();
    const analytics = buildAnalytics(visible);

    host.innerHTML = `
      <section class="app-dashboard" aria-labelledby="dashboard-title">
        <header class="app-dashboard__header">
          <div>
            <p class="ds-eyebrow">Painel semanal</p>
            <h1 class="ds-title" id="dashboard-title">Indicadores e análises</h1>
            <p class="ds-small">Selecione um ou mais técnicos, defina o período e acompanhe KPIs e gráficos das visitas.</p>
          </div>
          <span class="ds-badge ds-badge--subtle">${analytics.total} visita${analytics.total === 1 ? "" : "s"}</span>
        </header>

        ${state.banner ? renderBanner(state.banner) : ""}
        ${renderFilters()}

        ${
          state.loading
            ? `<p class="app-empty">Carregando indicadores…</p>`
            : `${renderKpis(analytics)}${renderCharts(analytics)}`
        }
      </section>
    `;
  }

  function closeMenus() {
    let changed = false;
    if (state.technicianFilterOpen) {
      state.technicianFilterOpen = false;
      changed = true;
    }
    if (state.statusMenuOpen) {
      state.statusMenuOpen = false;
      changed = true;
    }
    return changed;
  }

  function setWeekRange(offsetWeeks) {
    const start = addDays(startOfWeek(new Date()), offsetWeeks * 7);
    state.dateFrom = toIsoDate(start);
    state.dateTo = toIsoDate(addDays(start, 6));
  }

  function bind() {
    host.addEventListener("click", (event) => {
      const target = event.target.closest("[data-action]");
      if (!(target instanceof HTMLElement)) {
        if (
          !event.target.closest(".app-select-filter") &&
          !event.target.closest(".app-visits__filter") &&
          closeMenus()
        ) {
          paint();
        }
        return;
      }

      const action = target.getAttribute("data-action");

      if (action === "toggle-filters-panel") {
        state.filtersOpen = !state.filtersOpen;
        closeMenus();
        paint();
        return;
      }

      if (action === "toggle-technician-filter") {
        state.technicianFilterOpen = !state.technicianFilterOpen;
        state.statusMenuOpen = false;
        paint();
        return;
      }

      if (action === "set-technician-filter") {
        setTechnicianFilter(target.getAttribute("data-technician") || "");
        paint();
        return;
      }

      if (action === "clear-date-range") {
        state.dateFrom = "";
        state.dateTo = "";
        paint();
        return;
      }

      if (action === "set-week-current") {
        setWeekRange(0);
        paint();
        return;
      }

      if (action === "set-week-next") {
        setWeekRange(1);
        paint();
        return;
      }

      if (action === "toggle-status-menu") {
        state.statusMenuOpen = !state.statusMenuOpen;
        state.technicianFilterOpen = false;
        paint();
        return;
      }

      if (action === "set-status-filter") {
        setStatusFilter(target.getAttribute("data-status") || "all");
        paint();
      }
    });

    host.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      if (target.id === "dashboardDateFrom") {
        state.dateFrom = target.value;
        if (state.dateTo && state.dateFrom && state.dateFrom > state.dateTo) {
          state.dateTo = state.dateFrom;
        }
        paint();
        return;
      }
      if (target.id === "dashboardDateTo") {
        state.dateTo = target.value;
        if (state.dateFrom && state.dateTo && state.dateTo < state.dateFrom) {
          state.dateFrom = state.dateTo;
        }
        paint();
      }
    });

    document.addEventListener(
      "click",
      (event) => {
        if (!host.isConnected) {
          return;
        }
        if (!(event.target instanceof Node) || host.contains(event.target)) {
          return;
        }
        if (closeMenus()) {
          paint();
        }
      },
      true,
    );
  }

  async function load() {
    state.loading = true;
    paint();

    const [appointmentsResult, techniciansResult] = await Promise.all([
      fetchAppointments(),
      fetchTechnicians(),
    ]);
    state.loading = false;

    if (!appointmentsResult.success) {
      state.banner = {
        tone: "danger",
        message: appointmentsResult.error?.message || "Não foi possível carregar as visitas do painel.",
      };
      paint();
      return;
    }

    state.appointments = appointmentsResult.value || [];
    if (techniciansResult?.success) {
      state.technicians = (techniciansResult.value || []).filter((item) => item.active !== false);
    }
    paint();
  }

  bind();
  await load();
}
