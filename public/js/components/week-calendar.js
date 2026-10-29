import { escapeHtml } from "./field.js";

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const STATUS_TONE = {
  open: "info",
  in_progress: "warning",
  reopened: "info",
  rebooked: "info",
  late: "warning",
  closed: "success",
  cancelled: "danger",
};

function startOfWeek(date = new Date()) {
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  value.setHours(12, 0, 0, 0);
  return value;
}

function addDays(date, days) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function parseIsoDate(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  if (!y || !m || !d) {
    return null;
  }
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDayMonth(iso) {
  const [, m, d] = String(iso).split("-");
  if (!m || !d) {
    return iso;
  }
  return `${d}/${m}`;
}

function formatRangeLabel(fromIso, toIso) {
  return `${formatDayMonth(fromIso)} – ${formatDayMonth(toIso)}`;
}

function todayIso() {
  return toIsoDate(new Date());
}

function sortVisits(a, b) {
  const byTime = String(a.time || "").localeCompare(String(b.time || ""));
  if (byTime !== 0) {
    return byTime;
  }
  return String(a.clientName || "").localeCompare(String(b.clientName || ""), "pt-BR", {
    sensitivity: "base",
  });
}

function groupByDate(appointments) {
  const map = new Map();
  for (const item of appointments) {
    const key = item.date;
    if (!key) {
      continue;
    }
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(item);
  }
  for (const list of map.values()) {
    list.sort(sortVisits);
  }
  return map;
}

/**
 * Resolve o intervalo a exibir a partir do filtro e/ou das visitas.
 * Sem filtro: semana atual + próxima (ou min/max das visitas, o que for mais amplo).
 */
export function resolveCalendarRange({
  dateFrom = "",
  dateTo = "",
  appointments = [],
  anchor = new Date(),
} = {}) {
  let from = dateFrom || "";
  let to = dateTo || "";

  if (!from && !to) {
    const dates = appointments.map((item) => item.date).filter(Boolean).sort();
    if (dates.length > 0) {
      from = dates[0];
      to = dates[dates.length - 1];
    }
  }

  if (!from && !to) {
    const weekStart = startOfWeek(anchor);
    from = toIsoDate(weekStart);
    to = toIsoDate(addDays(weekStart, 13));
    return { from, to };
  }

  if (!from) {
    from = to;
  }
  if (!to) {
    to = from;
  }
  if (from > to) {
    const swap = from;
    from = to;
    to = swap;
  }

  return { from, to };
}

function weekTitleFor(weekStartIso, currentWeekStartIso) {
  if (weekStartIso === currentWeekStartIso) {
    return "Semana atual";
  }
  const current = parseIsoDate(currentWeekStartIso);
  const week = parseIsoDate(weekStartIso);
  if (current && week) {
    const diffDays = Math.round((week - current) / 86400000);
    if (diffDays === 7) {
      return "Próxima semana";
    }
    if (diffDays === -7) {
      return "Semana anterior";
    }
  }
  return `Semana de ${formatDayMonth(weekStartIso)}`;
}

/**
 * Monta uma linha de semana (seg–dom) a partir do início da semana.
 */
function buildWeekRow(weekStart, currentWeekStartIso, today) {
  const days = WEEKDAY_LABELS.map((weekday, index) => {
    const date = addDays(weekStart, index);
    const iso = toIsoDate(date);
    return {
      iso,
      weekday,
      dayNumber: String(date.getDate()).padStart(2, "0"),
      isToday: iso === today,
      inMonth: true,
      inRange: true,
    };
  });
  const startIso = days[0].iso;
  return {
    title: weekTitleFor(startIso, currentWeekStartIso),
    rangeLabel: formatRangeLabel(days[0].iso, days[6].iso),
    startIso,
    days,
  };
}

/**
 * Todas as semanas que cobrem o intervalo [from, to] (cada uma em uma linha).
 */
export function buildWeeksInRange(fromIso, toIso, anchor = new Date()) {
  const fromDate = parseIsoDate(fromIso) || startOfWeek(anchor);
  const toDate = parseIsoDate(toIso) || addDays(fromDate, 6);
  const firstWeek = startOfWeek(fromDate);
  const lastWeek = startOfWeek(toDate);
  const currentWeekStartIso = toIsoDate(startOfWeek(anchor));
  const today = todayIso();
  const weeks = [];

  for (let cursor = new Date(firstWeek); cursor <= lastWeek; cursor = addDays(cursor, 7)) {
    weeks.push(buildWeekRow(cursor, currentWeekStartIso, today));
  }

  return {
    weeks,
    from: weeks[0]?.days[0]?.iso || fromIso,
    to: weeks[weeks.length - 1]?.days[6]?.iso || toIso,
  };
}

/** Compat: semana atual + próxima. */
export function buildTwoWeekCalendar(anchor = new Date()) {
  const weekStart = startOfWeek(anchor);
  return buildWeeksInRange(toIsoDate(weekStart), toIsoDate(addDays(weekStart, 13)), anchor);
}

/**
 * Meses completos cobertos pelo intervalo (grade clássica seg–dom).
 */
export function buildMonthsInRange(fromIso, toIso, anchor = new Date()) {
  const fromDate = parseIsoDate(fromIso) || startOfWeek(anchor);
  const toDate = parseIsoDate(toIso) || fromDate;
  const today = todayIso();
  const months = [];

  let cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1, 12, 0, 0, 0);
  const last = new Date(toDate.getFullYear(), toDate.getMonth(), 1, 12, 0, 0, 0);

  while (cursor <= last) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const monthStart = new Date(year, month, 1, 12, 0, 0, 0);
    const monthEnd = new Date(year, month + 1, 0, 12, 0, 0, 0);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = addDays(startOfWeek(monthEnd), 6);
    const days = [];

    for (let day = new Date(gridStart); day <= gridEnd; day = addDays(day, 1)) {
      const iso = toIsoDate(day);
      const inMonth = day.getMonth() === month;
      const inRange = iso >= fromIso && iso <= toIso;
      days.push({
        iso,
        weekday: WEEKDAY_LABELS[day.getDay() === 0 ? 6 : day.getDay() - 1],
        dayNumber: String(day.getDate()),
        isToday: iso === today,
        inMonth,
        inRange,
      });
    }

    months.push({
      title: `${MONTH_LABELS[month]} ${year}`,
      year,
      month,
      rangeLabel: formatRangeLabel(toIsoDate(monthStart), toIsoDate(monthEnd)),
      days,
    });

    cursor = new Date(year, month + 1, 1, 12, 0, 0, 0);
  }

  return { months, from: fromIso, to: toIso };
}

function renderLegend() {
  return `
    <div class="app-calendar__legend" aria-label="Legenda de status">
      <span class="app-calendar__legend-item app-calendar__legend-item--info">Aberta / Remarcada</span>
      <span class="app-calendar__legend-item app-calendar__legend-item--warning">Atendimento / Atrasada</span>
      <span class="app-calendar__legend-item app-calendar__legend-item--success">Fechada</span>
      <span class="app-calendar__legend-item app-calendar__legend-item--danger">Cancelada</span>
    </div>
  `;
}

function renderEventChip(item, { interactive, showTechnician, compact = false }) {
  const tone = STATUS_TONE[item.displayStatus] || "neutral";
  const statusLabel = item.statusLabel || item.displayStatus || "Status";
  const technician = showTechnician ? item.technicianName || "" : "";
  const titleParts = [item.time || "", item.clientName || "Cliente", statusLabel, technician].filter(
    Boolean,
  );

  if (compact) {
    const body = `
      <span class="app-calendar__event-dot" aria-hidden="true"></span>
      <span class="app-calendar__event-time">${escapeHtml(item.time || "—")}</span>
      <span class="app-calendar__event-client">${escapeHtml(item.clientName || "Cliente")}</span>
    `;
    if (interactive) {
      return `
        <button
          class="app-calendar__event app-calendar__event--compact app-calendar__event--${tone}"
          type="button"
          data-action="view-visit"
          data-id="${escapeHtml(item.id)}"
          data-visit-open="${escapeHtml(item.id)}"
          title="${escapeHtml(titleParts.join(" · "))}"
          aria-label="Abrir detalhes: ${escapeHtml(item.clientName || "visita")}"
        >${body}</button>
      `;
    }
    return `
      <div
        class="app-calendar__event app-calendar__event--compact app-calendar__event--${tone}"
        title="${escapeHtml(titleParts.join(" · "))}"
      >${body}</div>
    `;
  }

  const body = `
    <span class="app-calendar__event-dot" aria-hidden="true"></span>
    <span class="app-calendar__event-time">${escapeHtml(item.time || "—")}</span>
    <span class="app-calendar__event-client">${escapeHtml(item.clientName || "Cliente")}</span>
    <span class="ds-badge ${escapeHtml(item.statusBadgeClass || "ds-badge--subtle")} app-calendar__event-badge">${escapeHtml(statusLabel)}</span>
    ${
      technician
        ? `<span class="app-calendar__event-tech">${escapeHtml(technician)}</span>`
        : ""
    }
  `;

  if (interactive) {
    return `
      <button
        class="app-calendar__event app-calendar__event--${tone}"
        type="button"
        data-action="view-visit"
        data-id="${escapeHtml(item.id)}"
        data-visit-open="${escapeHtml(item.id)}"
        title="${escapeHtml(titleParts.join(" · "))}"
        aria-label="Abrir detalhes: ${escapeHtml(item.clientName || "visita")}"
      >${body}</button>
    `;
  }

  return `
    <div
      class="app-calendar__event app-calendar__event--${tone}"
      title="${escapeHtml(titleParts.join(" · "))}"
    >${body}</div>
  `;
}

function renderDayCell(day, dayVisits, { interactive, showTechnician, compact }) {
  const classes = [
    "app-calendar__day",
    day.isToday ? "is-today" : "",
    dayVisits.length ? "has-visits" : "",
    day.inMonth === false ? "is-outside-month" : "",
    day.inRange === false ? "is-outside-range" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <div
      class="${classes}"
      role="listitem"
      aria-label="${escapeHtml(day.weekday)} ${escapeHtml(formatDayMonth(day.iso))}"
    >
      <div class="app-calendar__day-head">
        <span class="app-calendar__weekday">${escapeHtml(day.weekday)}</span>
        <span class="app-calendar__day-num">${escapeHtml(day.dayNumber)}</span>
      </div>
      <div class="app-calendar__day-body">
        ${
          dayVisits.length === 0
            ? day.inMonth === false
              ? ""
              : `<p class="app-calendar__empty">—</p>`
            : dayVisits
                .map((item) =>
                  renderEventChip(item, { interactive, showTechnician, compact }),
                )
                .join("")
        }
      </div>
    </div>
  `;
}

/**
 * Calendário por semanas: uma linha por semana cobrindo o período do filtro.
 */
export function renderWeekCalendar({
  appointments = [],
  interactive = false,
  showTechnician = true,
  dateFrom = "",
  dateTo = "",
  anchor = new Date(),
} = {}) {
  const range = resolveCalendarRange({ dateFrom, dateTo, appointments, anchor });
  const { weeks } = buildWeeksInRange(range.from, range.to, anchor);
  const byDate = groupByDate(appointments);

  return `
    <section class="app-calendar" aria-label="Calendário por semanas">
      ${renderLegend()}
      <p class="ds-small app-calendar__summary">
        ${weeks.length} semana${weeks.length === 1 ? "" : "s"} · ${escapeHtml(formatRangeLabel(range.from, range.to))}
      </p>
      ${weeks
        .map(
          (week) => `
            <article class="app-calendar__week">
              <header class="app-calendar__week-head">
                <h2 class="app-calendar__week-title">${escapeHtml(week.title)}</h2>
                <span class="ds-badge ds-badge--subtle">${escapeHtml(week.rangeLabel)}</span>
              </header>
              <div class="app-calendar__grid" role="list">
                ${week.days
                  .map((day) => {
                    const dayVisits = byDate.get(day.iso) || [];
                    return renderDayCell(day, dayVisits, {
                      interactive,
                      showTechnician,
                      compact: false,
                    });
                  })
                  .join("")}
              </div>
            </article>
          `,
        )
        .join("")}
    </section>
  `;
}

function clampMonthIndex(index, length) {
  if (length <= 0) {
    return 0;
  }
  return Math.min(Math.max(0, Number(index) || 0), length - 1);
}

/**
 * Amplia o período para cobrir meses inteiros das visitas (melhor para o carrossel).
 */
export function expandRangeToAppointmentMonths({
  dateFrom = "",
  dateTo = "",
  appointments = [],
  anchor = new Date(),
} = {}) {
  const base = resolveCalendarRange({ dateFrom, dateTo, appointments, anchor });
  const dates = appointments.map((item) => item.date).filter(Boolean).sort();
  let from = base.from;
  let to = base.to;
  if (dates.length > 0) {
    if (!from || dates[0] < from) {
      from = dates[0];
    }
    if (!to || dates[dates.length - 1] > to) {
      to = dates[dates.length - 1];
    }
  }
  const fromDate = parseIsoDate(from) || startOfWeek(anchor);
  const toDate = parseIsoDate(to) || fromDate;
  const monthStart = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1, 12, 0, 0, 0);
  const monthEnd = new Date(toDate.getFullYear(), toDate.getMonth() + 1, 0, 12, 0, 0, 0);
  return {
    from: toIsoDate(monthStart),
    to: toIsoDate(monthEnd),
  };
}

function renderMonthSlide(month, byDate, { interactive, showTechnician }) {
  return `
    <article class="app-calendar__month" aria-label="${escapeHtml(month.title)}">
      <div class="app-calendar__month-weekdays" aria-hidden="true">
        ${WEEKDAY_LABELS.map((label) => `<span>${escapeHtml(label)}</span>`).join("")}
      </div>
      <div class="app-calendar__month-grid" role="list">
        ${month.days
          .map((day) => {
            const dayVisits = day.inMonth && day.inRange ? byDate.get(day.iso) || [] : [];
            return renderDayCell(day, dayVisits, {
              interactive,
              showTechnician,
              compact: true,
            });
          })
          .join("")}
      </div>
    </article>
  `;
}

/**
 * Calendário mensal em carrossel horizontal (um mês por slide).
 */
export function renderMonthCalendar({
  appointments = [],
  interactive = false,
  showTechnician = true,
  dateFrom = "",
  dateTo = "",
  anchor = new Date(),
  activeMonthIndex = 0,
} = {}) {
  const range = resolveCalendarRange({ dateFrom, dateTo, appointments, anchor });
  const { months } = buildMonthsInRange(range.from, range.to, anchor);
  const byDate = groupByDate(appointments);
  const index = clampMonthIndex(activeMonthIndex, months.length);
  const month = months[index];
  const count = months.length;

  if (!month) {
    return `
      <section class="app-calendar app-calendar--month" aria-label="Calendário mensal">
        ${renderLegend()}
        <p class="app-empty">Nenhum mês no período filtrado.</p>
      </section>
    `;
  }

  return `
    <section
      class="app-calendar app-calendar--month"
      aria-label="Calendário mensal"
      data-month-count="${count}"
      data-month-index="${index}"
    >
      ${renderLegend()}
      <p class="ds-small app-calendar__summary">
        Carrossel de meses · ${count} m${count === 1 ? "ês" : "eses"} · ${escapeHtml(formatRangeLabel(range.from, range.to))}
      </p>

      <div
        class="app-calendar__carousel"
        role="region"
        aria-roledescription="carrossel"
        aria-label="Meses do período"
      >
        <div class="app-calendar__carousel-toolbar">
          <button
            class="ds-btn ds-btn--secondary ds-btn--sm app-calendar__carousel-btn"
            type="button"
            data-action="calendar-month-prev"
            aria-label="Mês anterior"
            ${index === 0 ? "disabled" : ""}
          >
            <svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
            <span>Anterior</span>
          </button>
          <div class="app-calendar__carousel-heading" aria-live="polite">
            <h2 class="app-calendar__carousel-title">${escapeHtml(month.title)}</h2>
            <p class="ds-small app-calendar__carousel-counter">${index + 1} de ${count}</p>
          </div>
          <button
            class="ds-btn ds-btn--secondary ds-btn--sm app-calendar__carousel-btn"
            type="button"
            data-action="calendar-month-next"
            aria-label="Próximo mês"
            ${index >= count - 1 ? "disabled" : ""}
          >
            <span>Próximo</span>
            <svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
          </button>
        </div>

        <div class="app-calendar__carousel-viewport">
          <div
            class="app-calendar__carousel-track"
            style="--carousel-index: ${index}"
          >
            ${months
              .map(
                (item, monthIndex) => `
                  <div
                    class="app-calendar__carousel-slide${monthIndex === index ? " is-active" : ""}"
                    data-month-slide="${monthIndex}"
                    aria-hidden="${monthIndex === index ? "false" : "true"}"
                  >
                    ${renderMonthSlide(item, byDate, { interactive, showTechnician })}
                  </div>
                `,
              )
              .join("")}
          </div>
        </div>

        <div class="app-calendar__carousel-nav" aria-label="Selecionar mês">
          <div class="app-calendar__carousel-dots" role="tablist" aria-label="Meses">
            ${months
              .map(
                (item, monthIndex) => `
                  <button
                    class="app-calendar__carousel-dot${monthIndex === index ? " is-active" : ""}"
                    type="button"
                    role="tab"
                    aria-selected="${monthIndex === index ? "true" : "false"}"
                    aria-label="${escapeHtml(item.title)}"
                    data-action="calendar-month-goto"
                    data-month-index="${monthIndex}"
                  ></button>
                `,
              )
              .join("")}
          </div>
          <div class="app-calendar__carousel-labels" aria-hidden="true">
            ${months
              .map(
                (item, monthIndex) => `
                  <button
                    class="app-calendar__carousel-label${monthIndex === index ? " is-active" : ""}"
                    type="button"
                    data-action="calendar-month-goto"
                    data-month-index="${monthIndex}"
                  >${escapeHtml(item.title)}</button>
                `,
              )
              .join("")}
          </div>
        </div>
      </div>
    </section>
  `;
}
