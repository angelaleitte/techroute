import {
  cancelAppointment,
  closeAppointment,
  createAppointment,
  fetchAppointments,
  updateAppointment,
} from "../api/appointments.js";
import { fetchServiceTypes, fetchTechnicians } from "../api/catalog.js";
import { mountAppShell } from "../components/app-shell.js";
import { renderBanner } from "../components/banner.js";
import {
  bindSelectFields,
  escapeHtml,
  renderField,
  renderOptionGroup,
  renderSelectField,
} from "../components/field.js";
import { serviceTypeIcon } from "../components/service-icons.js";

const emptyValues = {
  clientName: "",
  location: "",
  phone: "",
  phoneSecondary: "",
  email: "",
  date: "",
  time: "",
  technicianId: "",
  serviceTypeId: "",
  notes: "",
};

const STATUS_FILTERS = [
  { id: "all", label: "Todos os status" },
  { id: "open", label: "Abertas" },
  { id: "late", label: "Atrasadas" },
  { id: "closed", label: "Fechadas" },
  { id: "cancelled", label: "Canceladas" },
];

const state = {
  values: { ...emptyValues },
  errors: {},
  banner: null,
  loading: false,
  technicians: [],
  serviceTypes: [],
  appointments: [],
  editingId: null,
  cancelTarget: null,
  cancelReason: "",
  cancelError: "",
  cancelLoading: false,
  statusFilter: "all",
  sortDir: "az",
  viewMode: "card",
  statusMenuOpen: false,
};

function validate(values) {
  const errors = {};

  if (values.clientName.trim().length < 3) {
    errors.clientName = "Informe o nome do cliente.";
  }
  if (values.location.trim().length < 5) {
    errors.location = "Informe a localização do cliente.";
  }
  const phoneDigits = values.phone.replace(/\D/g, "");
  if (phoneDigits.length < 10 || phoneDigits.length > 11) {
    errors.phone = "Informe um telefone válido com DDD.";
  }
  const secondaryDigits = values.phoneSecondary.replace(/\D/g, "");
  if (values.phoneSecondary.trim() && (secondaryDigits.length < 10 || secondaryDigits.length > 11)) {
    errors.phoneSecondary = "Informe um telefone secundário válido com DDD.";
  }
  const email = values.email.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Informe um e-mail válido.";
  }
  if (!values.date) {
    errors.date = "Informe a data da visita.";
  }
  if (!values.time) {
    errors.time = "Informe o horário da visita.";
  }
  if (!values.technicianId) {
    errors.technicianId = "Selecione o técnico responsável.";
  }
  if (!values.serviceTypeId) {
    errors.serviceTypeId = "Selecione o tipo de serviço.";
  }

  return errors;
}

function readForm(form) {
  const data = new FormData(form);
  return {
    clientName: String(data.get("clientName") ?? ""),
    location: String(data.get("location") ?? ""),
    phone: String(data.get("phone") ?? ""),
    phoneSecondary: String(data.get("phoneSecondary") ?? ""),
    email: String(data.get("email") ?? ""),
    date: String(data.get("date") ?? ""),
    time: String(data.get("time") ?? ""),
    technicianId: String(data.get("technicianId") ?? ""),
    serviceTypeId: state.values.serviceTypeId,
    notes: String(data.get("notes") ?? ""),
  };
}

function startEdit(appointment) {
  state.editingId = appointment.id;
  state.values = {
    clientName: appointment.clientName,
    location: appointment.location,
    phone: appointment.phone || "",
    phoneSecondary: appointment.phoneSecondary || "",
    email: appointment.email || "",
    date: appointment.date,
    time: appointment.time,
    technicianId: appointment.technicianId,
    serviceTypeId: appointment.serviceTypeId,
    notes: appointment.notes || "",
  };
  state.errors = {};
  state.banner = {
    tone: "info",
    message: `Editando visita de ${appointment.clientName}.`,
  };
  state.cancelTarget = null;
}

function cancelEdit() {
  state.editingId = null;
  state.values = { ...emptyValues };
  state.errors = {};
  state.banner = null;
}

const actionIcons = {
  edit: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>`,
  check: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>`,
  cancel: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m15 9-6 6M9 9l6 6"></path></svg>`,
  discard: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="m19 6-.8 12.2A2 2 0 0 1 16.2 20H7.8a2 2 0 0 1-2-1.8L5 6"></path></svg>`,
  save: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"></path><path d="M17 21v-8H7v8"></path><path d="M7 3v5h8"></path></svg>`,
  filter: `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z"></path></svg>`,
  sortAz: `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h10M3 12h7M3 17h4"></path><path d="m15 7 3-3 3 3M18 4v16"></path></svg>`,
  sortZa: `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h4M3 12h7M3 17h10"></path><path d="m15 17 3 3 3-3M18 4v16"></path></svg>`,
  cards: `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></svg>`,
  list: `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path></svg>`,
  statusAll: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M8 12h8"></path></svg>`,
  statusOpen: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle></svg>`,
  statusLate: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>`,
  statusClosed: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m8.5 12.5 2.5 2.5 5-5"></path></svg>`,
  statusCancelled: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m15 9-6 6M9 9l6 6"></path></svg>`,
};

const statusFilterIcons = {
  all: actionIcons.statusAll,
  open: actionIcons.statusOpen,
  late: actionIcons.statusLate,
  closed: actionIcons.statusClosed,
  cancelled: actionIcons.statusCancelled,
};

function getVisibleAppointments() {
  let items = [...state.appointments];

  if (state.statusFilter !== "all") {
    items = items.filter((item) => item.displayStatus === state.statusFilter);
  }

  items.sort((a, b) => {
    const cmp = a.clientName.localeCompare(b.clientName, "pt-BR", { sensitivity: "base" });
    return state.sortDir === "az" ? cmp : -cmp;
  });

  return items;
}

function renderVisitActions(appointment) {
  if (!appointment.canEdit && !appointment.canCancel && !appointment.canClose) {
    return "";
  }

  return `
    <div class="app-visit-card__actions">
      ${
        appointment.canEdit
          ? `<button class="ds-btn ds-btn--secondary ds-btn--sm" type="button" data-action="edit-visit" data-id="${escapeHtml(appointment.id)}">${actionIcons.edit}<span>Alterar</span></button>`
          : ""
      }
      ${
        appointment.canClose
          ? `<button class="ds-btn ds-btn--secondary ds-btn--sm" type="button" data-action="close-visit" data-id="${escapeHtml(appointment.id)}">${actionIcons.check}<span>Concluir</span></button>`
          : ""
      }
      ${
        appointment.canCancel
          ? `<button class="ds-btn ds-btn--danger ds-btn--sm" type="button" data-action="open-cancel" data-id="${escapeHtml(appointment.id)}">${actionIcons.cancel}<span>Cancelar</span></button>`
          : ""
      }
    </div>
  `;
}

function renderVisitCard(appointment) {
  return `
    <article class="ds-card app-visit-card" data-visit-id="${escapeHtml(appointment.id)}">
      <div class="ds-section__head">
        <span class="ds-eyebrow app-visit-card__type">
          ${serviceTypeIcon({ id: appointment.serviceTypeId, name: appointment.serviceTypeName })}
          ${escapeHtml(appointment.serviceTypeName)}
        </span>
        <div class="app-visit-card__meta">
          <span class="ds-badge ${escapeHtml(appointment.statusBadgeClass)}">${escapeHtml(appointment.statusLabel)}</span>
          <span class="ds-badge ds-badge--subtle">${escapeHtml(appointment.slotLabel)}</span>
        </div>
      </div>
      <div class="ds-list app-visit-card__rows">
        <div class="ds-row">
          <span class="ds-row__label">Cliente</span>
          <span class="ds-row__value">${escapeHtml(appointment.clientName)}</span>
        </div>
        <div class="ds-row">
          <span class="ds-row__label">Local</span>
          <span class="ds-row__value">${escapeHtml(appointment.location)}</span>
        </div>
        <div class="ds-row">
          <span class="ds-row__label">Telefone</span>
          <span class="ds-row__value">${escapeHtml(appointment.phone)}</span>
        </div>
        ${
          appointment.phoneSecondary
            ? `<div class="ds-row">
                <span class="ds-row__label">Telefone 2</span>
                <span class="ds-row__value">${escapeHtml(appointment.phoneSecondary)}</span>
              </div>`
            : ""
        }
        <div class="ds-row">
          <span class="ds-row__label">E-mail</span>
          <span class="ds-row__value">${escapeHtml(appointment.email)}</span>
        </div>
        <div class="ds-row">
          <span class="ds-row__label">Técnico</span>
          <span class="ds-row__value">${escapeHtml(appointment.technicianName)}</span>
        </div>
        ${
          appointment.displayStatus === "cancelled" && appointment.cancellationReason
            ? `<div class="ds-row">
                <span class="ds-row__label">Motivo</span>
                <span class="ds-row__value">${escapeHtml(appointment.cancellationReason)}</span>
              </div>`
            : ""
        }
      </div>
      ${renderVisitActions(appointment)}
    </article>
  `;
}

function renderVisitListRow(appointment) {
  return `
    <article class="app-visit-row" data-visit-id="${escapeHtml(appointment.id)}">
      <div class="app-visit-row__main">
        <span class="ds-badge ${escapeHtml(appointment.statusBadgeClass)}">${escapeHtml(appointment.statusLabel)}</span>
        <strong class="app-visit-row__client">${escapeHtml(appointment.clientName)}</strong>
        <span class="ds-small app-visit-row__meta">${escapeHtml(appointment.serviceTypeName)} · ${escapeHtml(appointment.slotLabel)}</span>
        <span class="ds-small app-visit-row__place">${escapeHtml(appointment.location)} · ${escapeHtml(appointment.phone)} · ${escapeHtml(appointment.email)}</span>
      </div>
      <div class="app-visit-row__actions">
        ${
          appointment.canEdit
            ? `<button class="ds-icon-btn ds-tooltip ds-tooltip--bottom" type="button" data-action="edit-visit" data-id="${escapeHtml(appointment.id)}" data-tooltip="Alterar" aria-label="Alterar">${actionIcons.edit}</button>`
            : ""
        }
        ${
          appointment.canClose
            ? `<button class="ds-icon-btn ds-tooltip ds-tooltip--bottom ds-tooltip--success" type="button" data-action="close-visit" data-id="${escapeHtml(appointment.id)}" data-tooltip="Concluir" aria-label="Concluir">${actionIcons.check}</button>`
            : ""
        }
        ${
          appointment.canCancel
            ? `<button class="ds-icon-btn ds-tooltip ds-tooltip--bottom ds-tooltip--danger app-visit-row__cancel" type="button" data-action="open-cancel" data-id="${escapeHtml(appointment.id)}" data-tooltip="Cancelar" aria-label="Cancelar">${actionIcons.cancel}</button>`
            : ""
        }
      </div>
    </article>
  `;
}

function renderVisitsToolbar() {
  const currentStatus = STATUS_FILTERS.find((item) => item.id === state.statusFilter) ?? STATUS_FILTERS[0];
  const sortLabel = state.sortDir === "az" ? "Ordenar A–Z" : "Ordenar Z–A";
  const sortIcon = state.sortDir === "az" ? actionIcons.sortAz : actionIcons.sortZa;

  return `
    <div class="app-visits__toolbar" role="toolbar" aria-label="Filtros da agenda">
      <div class="app-visits__filter">
        <button
          class="app-visits__tool-btn ds-tooltip${state.statusFilter !== "all" ? " is-active" : ""}"
          type="button"
          data-action="toggle-status-menu"
          data-tooltip="Filtrar por status"
          aria-label="Filtrar por status"
          aria-expanded="${state.statusMenuOpen ? "true" : "false"}"
          aria-haspopup="menu"
        >
          ${actionIcons.filter}
        </button>
        ${
          state.statusMenuOpen
            ? `<div class="app-visits__menu" role="menu" aria-label="Status da visita">
                ${STATUS_FILTERS.map(
                  (item) => `
                    <button
                      class="app-visits__menu-item${state.statusFilter === item.id ? " is-selected" : ""}"
                      type="button"
                      role="menuitemradio"
                      aria-checked="${state.statusFilter === item.id ? "true" : "false"}"
                      data-action="set-status-filter"
                      data-status="${item.id}"
                    >
                      ${statusFilterIcons[item.id] || ""}
                      <span>${escapeHtml(item.label)}</span>
                    </button>
                  `,
                ).join("")}
              </div>`
            : ""
        }
      </div>
      <span class="app-visits__filter-label" aria-live="polite">${escapeHtml(currentStatus.label)}</span>
      <button
        class="app-visits__tool-btn ds-tooltip"
        type="button"
        data-action="toggle-sort"
        data-tooltip="${sortLabel}"
        aria-label="${sortLabel}"
      >
        ${sortIcon}
      </button>
      <button
        class="app-visits__tool-btn ds-tooltip${state.viewMode === "card" ? " is-active" : ""}"
        type="button"
        data-action="set-view-mode"
        data-mode="card"
        data-tooltip="Modo card"
        aria-label="Modo card"
        aria-pressed="${state.viewMode === "card" ? "true" : "false"}"
      >
        ${actionIcons.cards}
      </button>
      <button
        class="app-visits__tool-btn ds-tooltip${state.viewMode === "list" ? " is-active" : ""}"
        type="button"
        data-action="set-view-mode"
        data-mode="list"
        data-tooltip="Modo lista"
        aria-label="Modo lista"
        aria-pressed="${state.viewMode === "list" ? "true" : "false"}"
      >
        ${actionIcons.list}
      </button>
    </div>
  `;
}

function renderVisitsSection() {
  const visible = getVisibleAppointments();
  const total = state.appointments.length;
  const countLabel =
    state.statusFilter === "all"
      ? `${total} ${total <= 1 ? "visita" : "visitas"}`
      : `${visible.length} de ${total}`;

  let body = "";
  if (total === 0) {
    body = `<p class="app-empty">Nenhuma visita registrada ainda.</p>`;
  } else if (visible.length === 0) {
    body = `<p class="app-empty">Nenhuma visita com este status.</p>`;
  } else if (state.viewMode === "list") {
    body = `<div class="app-visit-list app-visit-list--rows">${visible.map(renderVisitListRow).join("")}</div>`;
  } else {
    body = `<div class="app-visit-list">${visible.map(renderVisitCard).join("")}</div>`;
  }

  return `
    <section class="ds-screen app-visits" id="visitas">
      <div class="ds-section__head">
        <span class="ds-eyebrow">Agenda</span>
        <span class="ds-badge">${escapeHtml(countLabel)}</span>
      </div>
      <div class="app-visits__title-row">
        <h2 class="ds-heading">Visitas registradas</h2>
        ${renderVisitsToolbar()}
      </div>
      ${body}
    </section>
  `;
}

function renderCancelModal() {
  if (!state.cancelTarget) {
    return "";
  }

  const target = state.cancelTarget;

  return `
    <div class="app-modal" role="presentation">
      <div class="app-modal__backdrop" data-action="dismiss-cancel"></div>
      <div
        class="app-modal__panel ds-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-visit-title"
      >
        <h2 class="ds-heading" id="cancel-visit-title">Cancelar visita</h2>
        <p class="ds-small">
          Informe o motivo do cancelamento da visita de
          <strong>${escapeHtml(target.clientName)}</strong>
          (${escapeHtml(target.slotLabel)}).
        </p>
        ${renderField({
          id: "cancelReason",
          label: "Motivo do cancelamento",
          error: state.cancelError,
          controlHtml: `
            <textarea
              class="ds-input app-textarea"
              id="cancelReason"
              name="cancelReason"
              maxlength="500"
              rows="4"
              {{described}}
              ${state.cancelError ? 'aria-invalid="true"' : ""}
            >${escapeHtml(state.cancelReason)}</textarea>
          `,
        })}
        <div class="app-modal__actions">
          <button class="ds-btn ds-btn--ghost" type="button" data-action="dismiss-cancel">Voltar</button>
          <button
            class="ds-btn ds-btn--danger${state.cancelLoading ? " is-loading" : ""}"
            type="button"
            data-action="confirm-cancel"
            ${state.cancelLoading ? "disabled" : ""}
          >
            Confirmar cancelamento
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderForm() {
  const { values, errors, editingId } = state;
  const isEditing = Boolean(editingId);

  return `
    <form class="app-form" id="appointment-form" novalidate>
      <div class="app-form__pair">
        ${renderField({
          id: "clientName",
          label: "Cliente",
          error: errors.clientName,
          controlHtml: `
            <input
              class="ds-input"
              id="clientName"
              name="clientName"
              type="text"
              autocomplete="name"
              maxlength="120"
              value="${escapeHtml(values.clientName)}"
              {{described}}
              ${errors.clientName ? 'aria-invalid="true"' : ""}
            >
          `,
        })}
        ${renderField({
          id: "location",
          label: "Localização do cliente",
          error: errors.location,
          hint: "Endereço completo da visita.",
          controlHtml: `
            <input
              class="ds-input"
              id="location"
              name="location"
              type="text"
              autocomplete="street-address"
              maxlength="200"
              value="${escapeHtml(values.location)}"
              {{described}}
              ${errors.location ? 'aria-invalid="true"' : ""}
            >
          `,
        })}
      </div>

      <div class="app-form__pair">
        ${renderField({
          id: "phone",
          label: "Telefone principal",
          error: errors.phone,
          hint: "Com DDD. Ex.: (11) 98765-4321",
          controlHtml: `
            <input
              class="ds-input"
              id="phone"
              name="phone"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              maxlength="20"
              placeholder="(00) 00000-0000"
              value="${escapeHtml(values.phone)}"
              {{described}}
              ${errors.phone ? 'aria-invalid="true"' : ""}
            >
          `,
        })}
        ${renderField({
          id: "phoneSecondary",
          label: "Telefone secundário",
          error: errors.phoneSecondary,
          hint: "Opcional.",
          controlHtml: `
            <input
              class="ds-input"
              id="phoneSecondary"
              name="phoneSecondary"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              maxlength="20"
              placeholder="(00) 00000-0000"
              value="${escapeHtml(values.phoneSecondary)}"
              {{described}}
              ${errors.phoneSecondary ? 'aria-invalid="true"' : ""}
            >
          `,
        })}
      </div>

      ${renderField({
        id: "email",
        label: "E-mail",
        error: errors.email,
        hint: "Contato do cliente para confirmações.",
        controlHtml: `
          <input
            class="ds-input"
            id="email"
            name="email"
            type="email"
            autocomplete="email"
            maxlength="120"
            placeholder="cliente@email.com"
            value="${escapeHtml(values.email)}"
            {{described}}
            ${errors.email ? 'aria-invalid="true"' : ""}
          >
        `,
      })}

      <div class="app-form__slot">
        ${renderField({
          id: "date",
          label: "Data",
          error: errors.date,
          controlHtml: `
            <input
              class="ds-input"
              id="date"
              name="date"
              type="date"
              value="${escapeHtml(values.date)}"
              {{described}}
              ${errors.date ? 'aria-invalid="true"' : ""}
            >
          `,
        })}
        ${renderField({
          id: "time",
          label: "Horário",
          error: errors.time,
          controlHtml: `
            <input
              class="ds-input"
              id="time"
              name="time"
              type="time"
              value="${escapeHtml(values.time)}"
              {{described}}
              ${errors.time ? 'aria-invalid="true"' : ""}
            >
          `,
        })}
      </div>

      ${renderSelectField({
        id: "technicianId",
        label: "Técnico designado",
        options: state.technicians,
        value: values.technicianId,
        error: errors.technicianId,
        placeholder: "Selecione o técnico",
        required: true,
      })}

      <div class="app-form__span">
        ${renderOptionGroup({
          name: "serviceTypeId",
          legend: "Tipo de serviço",
          options: state.serviceTypes,
          value: values.serviceTypeId,
          error: errors.serviceTypeId,
        })}
      </div>

      ${renderField({
        id: "notes",
        label: "Observações",
        hint: "Opcional.",
        controlHtml: `
          <textarea
            class="ds-input app-textarea"
            id="notes"
            name="notes"
            maxlength="500"
            {{described}}
          >${escapeHtml(values.notes)}</textarea>
        `,
      })}

      <div class="app-form__actions${isEditing ? " app-form__actions--edit" : ""}">
        ${
          isEditing
            ? `<button class="ds-btn ds-btn--secondary" type="button" data-action="cancel-edit">${actionIcons.discard}<span>Descartar alteração</span></button>`
            : ""
        }
        <button
          class="ds-btn ds-btn--primary${state.loading ? " is-loading" : ""}"
          type="submit"
          ${state.loading ? "disabled" : ""}
        >
          ${isEditing ? `${actionIcons.save}<span>Salvar alteração</span>` : "Registrar visita"}
        </button>
      </div>
    </form>
  `;
}

function renderPage(root) {
  const isEditing = Boolean(state.editingId);

  root.innerHTML = `
    <div class="app-layout">
      <section class="ds-screen" id="agendar">
        <span class="ds-eyebrow">Visitas técnicas · ${isEditing ? "Alterar" : "Agendar"}</span>
        <div>
          <h1 class="ds-title">${isEditing ? "Alterar visita" : "Nova visita"}</h1>
          <p class="ds-small">
            ${
              isEditing
                ? "Atualize data, horário, local, técnico ou tipo de serviço."
                : "Registre data, horário, local do cliente, técnico e tipo de serviço."
            }
          </p>
        </div>
        ${renderBanner(state.banner)}
        ${renderForm()}
      </section>
      ${renderVisitsSection()}
    </div>
    ${renderCancelModal()}
  `;

  bindPage(root);
}

function bindPage(root) {
  const form = root.querySelector("#appointment-form");
  bindSelectFields(root);

  form.addEventListener("input", (event) => {
    const field = event.target.name;
    if (field && field in state.values && field !== "serviceTypeId") {
      state.values[field] = event.target.value;
    }
  });

  form.addEventListener("click", (event) => {
    const option = event.target.closest('[role="radio"]');
    if (!option) {
      return;
    }
    state.values.serviceTypeId = option.dataset.value;
    state.errors.serviceTypeId = "";
    renderPage(root);
    root.querySelector(`[data-value="${option.dataset.value}"]`)?.focus();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    state.values = readForm(form);
    state.errors = validate(state.values);
    state.banner = null;

    if (Object.keys(state.errors).length > 0) {
      state.banner = { tone: "danger", message: "Revise os campos destacados para continuar." };
      renderPage(root);
      root.querySelector("[aria-invalid='true']")?.focus();
      return;
    }

    state.loading = true;
    renderPage(root);

    const result = state.editingId
      ? await updateAppointment(state.editingId, state.values)
      : await createAppointment(state.values);

    state.loading = false;

    if (!result.success) {
      state.banner = { tone: "danger", message: result.error.message };
      renderPage(root);
      return;
    }

    const wasEditing = Boolean(state.editingId);
    state.editingId = null;
    state.values = { ...emptyValues };
    state.errors = {};
    state.banner = {
      tone: "success",
      message: wasEditing
        ? `Visita de ${result.value.clientName} atualizada.`
        : `Visita de ${result.value.clientName} registrada para ${result.value.slotLabel}.`,
    };
    await loadAppointments();
    renderPage(root);
  });

  root.querySelector("#cancelReason")?.addEventListener("input", (event) => {
    state.cancelReason = event.target.value;
  });
}

async function handlePageAction(root, event) {
  const actionEl = event.target.closest("[data-action]");

  if (
    state.statusMenuOpen &&
    !event.target.closest(".app-visits__filter") &&
    actionEl?.dataset.action !== "set-status-filter"
  ) {
    state.statusMenuOpen = false;
    if (!actionEl || !root.contains(actionEl)) {
      renderPage(root);
      return;
    }
  }

  if (!actionEl || !root.contains(actionEl)) {
    return;
  }

  const action = actionEl.dataset.action;
  const id = actionEl.dataset.id;

  if (action === "toggle-status-menu") {
    state.statusMenuOpen = !state.statusMenuOpen;
    renderPage(root);
    return;
  }

  if (action === "set-status-filter") {
    state.statusFilter = actionEl.dataset.status || "all";
    state.statusMenuOpen = false;
    renderPage(root);
    return;
  }

  if (action === "toggle-sort") {
    state.sortDir = state.sortDir === "az" ? "za" : "az";
    state.statusMenuOpen = false;
    renderPage(root);
    return;
  }

  if (action === "set-view-mode") {
    state.viewMode = actionEl.dataset.mode === "list" ? "list" : "card";
    state.statusMenuOpen = false;
    renderPage(root);
    return;
  }

  if (action === "cancel-edit") {
    cancelEdit();
    renderPage(root);
    return;
  }

  if (action === "edit-visit") {
    const appointment = state.appointments.find((item) => item.id === id);
    if (!appointment?.canEdit) {
      return;
    }
    startEdit(appointment);
    renderPage(root);
    document.getElementById("agendar")?.scrollIntoView({ behavior: "smooth", block: "start" });
    root.querySelector("#clientName")?.focus();
    return;
  }

  if (action === "close-visit") {
    const appointment = state.appointments.find((item) => item.id === id);
    if (!appointment?.canClose) {
      return;
    }

    const confirmed = window.confirm(
      `Concluir a visita de ${appointment.clientName} (${appointment.slotLabel})?`,
    );
    if (!confirmed) {
      return;
    }

    const result = await closeAppointment(id);
    if (!result.success) {
      state.banner = { tone: "danger", message: result.error.message };
      renderPage(root);
      return;
    }

    if (state.editingId === id) {
      cancelEdit();
    }

    state.banner = {
      tone: "success",
      message: `Visita de ${result.value.clientName} marcada como fechada.`,
    };
    await loadAppointments();
    renderPage(root);
    return;
  }

  if (action === "open-cancel") {
    const appointment = state.appointments.find((item) => item.id === id);
    if (!appointment?.canCancel) {
      return;
    }
    state.cancelTarget = appointment;
    state.cancelReason = "";
    state.cancelError = "";
    state.cancelLoading = false;
    renderPage(root);
    root.querySelector("#cancelReason")?.focus();
    return;
  }

  if (action === "dismiss-cancel") {
    state.cancelTarget = null;
    state.cancelReason = "";
    state.cancelError = "";
    state.cancelLoading = false;
    renderPage(root);
    return;
  }

  if (action === "confirm-cancel") {
    if (!state.cancelTarget) {
      return;
    }

    const reason = String(root.querySelector("#cancelReason")?.value ?? "").trim();
    state.cancelReason = reason;

    if (reason.length < 5) {
      state.cancelError = "Informe o motivo do cancelamento (mínimo 5 caracteres).";
      renderPage(root);
      root.querySelector("#cancelReason")?.focus();
      return;
    }

    state.cancelError = "";
    state.cancelLoading = true;
    renderPage(root);

    const targetId = state.cancelTarget.id;
    const result = await cancelAppointment(targetId, reason);
    state.cancelLoading = false;

    if (!result.success) {
      state.cancelError = result.error.message;
      renderPage(root);
      root.querySelector("#cancelReason")?.focus();
      return;
    }

    if (state.editingId === targetId) {
      cancelEdit();
    }

    state.cancelTarget = null;
    state.cancelReason = "";
    state.banner = {
      tone: "success",
      message: `Visita de ${result.value.clientName} cancelada.`,
    };
    await loadAppointments();
    renderPage(root);
  }
}

async function loadCatalog() {
  const [technicians, serviceTypes] = await Promise.all([
    fetchTechnicians(),
    fetchServiceTypes(),
  ]);

  if (!technicians.success || !serviceTypes.success) {
    state.banner = {
      tone: "danger",
      message: "Não foi possível carregar técnicos e tipos de serviço.",
    };
    return;
  }

  state.technicians = technicians.value;
  state.serviceTypes = serviceTypes.value;
}

async function loadAppointments() {
  const result = await fetchAppointments();
  if (result.success) {
    state.appointments = result.value;
  }
}

function boot() {
  const shell = document.getElementById("app-shell");
  const page = document.getElementById("app-page");

  mountAppShell(shell);
  page.addEventListener("click", (event) => {
    void handlePageAction(page, event);
  });
  renderPage(page);

  loadCatalog()
    .then(loadAppointments)
    .then(() => renderPage(page));
}

boot();
