import {
  allocateAppointmentResources,
  cancelAppointment,
  closeAppointment,
  createAppointment,
  fetchAppointments,
  reopenAppointment,
  rescheduleAppointment,
  startAttendance,
  updateAppointment,
  updateVisitNotes,
} from "../api/appointments.js";
import { fetchCurrentUser, login as loginRequest, logout as logoutRequest } from "../api/auth.js";
import { fetchResources, fetchServiceTypes, fetchTechnicians } from "../api/catalog.js";
import { mountAppShell, refreshAppShellUser } from "../components/app-shell.js";
import { renderBanner } from "../components/banner.js";
import {
  bindSelectFields,
  escapeHtml,
  renderChecklistGroup,
  renderField,
  renderOptionGroup,
  renderSelectField,
} from "../components/field.js";
import { serviceTypeIcon } from "../components/service-icons.js";
import {
  clearVisitDetailPortal,
  paintVisitDetailPortal,
} from "../components/visit-detail-modal.js";
import {
  expandRangeToAppointmentMonths,
  renderMonthCalendar,
  renderWeekCalendar,
} from "../components/week-calendar.js";
import { mountProfile } from "./profile.js";
import { mountUsersAdmin } from "./users-admin.js";
import { mountWeeklyDashboard } from "./weekly-dashboard.js";

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
  postVisitNotes: "",
  resourceIds: [],
};

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

const state = {
  values: { ...emptyValues, resourceIds: [] },
  errors: {},
  banner: null,
  loading: false,
  technicians: [],
  serviceTypes: [],
  resources: [],
  appointments: [],
  editingId: null,
  cancelTarget: null,
  cancelReason: "",
  cancelError: "",
  cancelLoading: false,
  rescheduleTarget: null,
  rescheduleDate: "",
  rescheduleTime: "",
  rescheduleReason: "",
  rescheduleError: "",
  rescheduleLoading: false,
  reopenTarget: null,
  reopenReason: "",
  reopenError: "",
  reopenLoading: false,
  closeTarget: null,
  closeNotes: "",
  closeError: "",
  closeLoading: false,
  statusFilter: [],
  clientFilter: "",
  clientFilterQuery: "",
  clientFilterOpen: false,
  technicianFilter: "",
  technicianFilterOpen: false,
  dateFrom: "",
  dateTo: "",
  filtersOpen: true,
  sortDir: "az",
  viewMode: "card",
  calendarMonthIndex: 0,
  detailAppointment: null,
  statusMenuOpen: false,
  formOpen: false,
  formMode: "create",
  viewingCanEdit: false,
  viewingCanReschedule: false,
  viewingCanReopen: false,
  allocateTargetId: "",
  allocateSelectedIds: [],
  allocateLoading: false,
  allocateBanner: null,
  allocateQuery: "",
  allocateStatusFilter: "all",
  allocateServiceTypeFilter: "all",
  user: null,
  authChecked: false,
  loginUsername: "",
  loginPassword: "",
  loginError: "",
  loginLoading: false,
  notesSaving: false,
  notesError: "",
  historyOpen: false,
};

function isSupervisor() {
  return state.user?.role === "supervisor";
}

function isTechnician() {
  return state.user?.role === "technician";
}

function roleLabel(role) {
  return role === "technician" ? "Técnico" : "Supervisor";
}

function canShowAttend(appointment) {
  if (!appointment?.canAttend) {
    return false;
  }
  if (isSupervisor()) {
    return true;
  }
  return isTechnician() && appointment.technicianId === state.user?.technicianId;
}

function canShowClose(appointment) {
  if (!appointment?.canClose) {
    return false;
  }
  if (isSupervisor()) {
    return true;
  }
  return (
    isTechnician() &&
    appointment.technicianId === state.user?.technicianId &&
    appointment.displayStatus === "in_progress"
  );
}

function getAllocateCandidates() {
  const query = state.allocateQuery.trim().toLowerCase();

  return state.appointments
    .filter((item) => {
      if (state.allocateStatusFilter !== "all" && item.displayStatus !== state.allocateStatusFilter) {
        return false;
      }
      if (
        state.allocateServiceTypeFilter !== "all" &&
        item.serviceTypeId !== state.allocateServiceTypeFilter
      ) {
        return false;
      }
      if (!query) {
        return true;
      }
      const clientName = String(item.clientName || "").toLowerCase();
      const appointmentId = String(item.id || "").toLowerCase();
      return clientName.includes(query) || appointmentId.includes(query);
    })
    .sort((a, b) => a.clientName.localeCompare(b.clientName, "pt-BR", { sensitivity: "base" }));
}

function toggleResourceId(list, id) {
  const next = new Set(list);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return [...next];
}

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
    resourceIds: [...state.values.resourceIds],
  };
}

function fillFormFromAppointment(appointment) {
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
    postVisitNotes: appointment.postVisitNotes || "",
    resourceIds: [...(appointment.resourceIds || [])],
  };
  const supervisor = isSupervisor();
  state.viewingCanEdit = supervisor && Boolean(appointment.canEdit);
  state.viewingCanReschedule = supervisor && Boolean(appointment.canReschedule);
  state.viewingCanReopen = supervisor && Boolean(appointment.canReopen);
  state.notesError = "";
}

function openNewVisit() {
  state.editingId = null;
  state.values = { ...emptyValues, resourceIds: [] };
  state.errors = {};
  state.banner = null;
  state.cancelTarget = null;
  state.rescheduleTarget = null;
  state.reopenTarget = null;
  state.closeTarget = null;
  state.formMode = "create";
  state.viewingCanEdit = false;
  state.viewingCanReschedule = false;
  state.viewingCanReopen = false;
  state.formOpen = true;
  state.statusMenuOpen = false;
}

function openView(appointment) {
  fillFormFromAppointment(appointment);
  state.errors = {};
  state.banner = null;
  state.cancelTarget = null;
  state.rescheduleTarget = null;
  state.reopenTarget = null;
  state.closeTarget = null;
  state.historyOpen = false;
  state.formMode = "view";
  state.formOpen = true;
  state.statusMenuOpen = false;
}

function startEditFromView() {
  if (!state.viewingCanEdit || !state.editingId) {
    return;
  }
  state.formMode = "edit";
  state.errors = {};
  state.banner = null;
}

function discardEditToView() {
  const appointment = state.appointments.find((item) => item.id === state.editingId);
  if (!appointment) {
    closeFormModal();
    return;
  }
  fillFormFromAppointment(appointment);
  state.formMode = "view";
  state.errors = {};
  state.banner = null;
  state.loading = false;
}

function closeFormModal() {
  state.formOpen = false;
  state.formMode = "create";
  state.editingId = null;
  state.viewingCanEdit = false;
  state.viewingCanReschedule = false;
  state.viewingCanReopen = false;
  state.historyOpen = false;
  state.values = { ...emptyValues, resourceIds: [] };
  state.errors = {};
  state.loading = false;
}

function getEditingAppointment() {
  if (!state.editingId) {
    return null;
  }
  return state.appointments.find((item) => item.id === state.editingId) ?? null;
}

function cancelEdit() {
  closeFormModal();
}

const actionIcons = {
  plus: `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>`,
  close: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12"></path></svg>`,
  view: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
  edit: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>`,
  check: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>`,
  cancel: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m15 9-6 6M9 9l6 6"></path></svg>`,
  reschedule: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4M12 14v3M10.5 15.5h3"></path></svg>`,
  reopen: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v5h5"></path></svg>`,
  discard: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="m19 6-.8 12.2A2 2 0 0 1 16.2 20H7.8a2 2 0 0 1-2-1.8L5 6"></path></svg>`,
  save: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"></path><path d="M17 21v-8H7v8"></path><path d="M7 3v5h8"></path></svg>`,
  filter: `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z"></path></svg>`,
  sortAz: `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h10M3 12h7M3 17h4"></path><path d="m15 7 3-3 3 3M18 4v16"></path></svg>`,
  sortZa: `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h4M3 12h7M3 17h10"></path><path d="m15 17 3 3 3-3M18 4v16"></path></svg>`,
  cards: `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></svg>`,
  list: `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path></svg>`,
  calendar: `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path></svg>`,
  month: `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2"></rect><path d="M3 9h18M8 2v4M16 2v4M8 13h3M13 13h3M8 17h3M13 17h3"></path></svg>`,
  statusAll: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M8 12h8"></path></svg>`,
  statusOpen: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle></svg>`,
  statusLate: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>`,
  statusClosed: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m8.5 12.5 2.5 2.5 5-5"></path></svg>`,
  statusCancelled: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m15 9-6 6M9 9l6 6"></path></svg>`,
  statusReopened: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v5h5"></path></svg>`,
  statusRebooked: `<svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path></svg>`,
};

const statusFilterIcons = {
  all: actionIcons.statusAll,
  open: actionIcons.statusOpen,
  reopened: actionIcons.statusReopened,
  rebooked: actionIcons.statusRebooked,
  late: actionIcons.statusLate,
  in_progress: actionIcons.statusLate,
  closed: actionIcons.statusClosed,
  cancelled: actionIcons.statusCancelled,
};

function getClientNames() {
  const names = new Set();
  for (const item of state.appointments) {
    const name = String(item.clientName || "").trim();
    if (name) {
      names.add(name);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}

function getFilteredClientNames() {
  const query = state.clientFilterQuery.trim().toLowerCase();
  const names = getClientNames();
  if (!query) {
    return names;
  }
  return names.filter((name) => name.toLowerCase().includes(query));
}

function getVisibleAppointments() {
  let items = [...state.appointments];

  if (state.statusFilter.length > 0) {
    const selected = new Set(state.statusFilter);
    items = items.filter((item) => selected.has(item.displayStatus));
  }

  if (state.clientFilter) {
    items = items.filter((item) => item.clientName === state.clientFilter);
  }

  if (isSupervisor() && state.technicianFilter) {
    items = items.filter((item) => item.technicianId === state.technicianFilter);
  }

  if (state.dateFrom) {
    items = items.filter((item) => item.date >= state.dateFrom);
  }

  if (state.dateTo) {
    items = items.filter((item) => item.date <= state.dateTo);
  }

  items.sort((a, b) => {
    const cmp = a.clientName.localeCompare(b.clientName, "pt-BR", { sensitivity: "base" });
    return state.sortDir === "az" ? cmp : -cmp;
  });

  return items;
}

function hasStatusFilter() {
  return state.statusFilter.length > 0;
}

function isStatusSelected(statusId) {
  if (statusId === "all") {
    return !hasStatusFilter();
  }
  return state.statusFilter.includes(statusId);
}

function getStatusFilterLabel() {
  if (!hasStatusFilter()) {
    return "Todos os status";
  }
  if (state.statusFilter.length === 1) {
    return STATUS_FILTERS.find((item) => item.id === state.statusFilter[0])?.label || "1 status";
  }
  return `${state.statusFilter.length} status`;
}

function toggleStatusFilter(statusId) {
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
  state.statusFilter = STATUS_FILTERS.map((item) => item.id)
    .filter((id) => id !== "all" && selected.has(id));
}

function hasActiveListFilters() {
  return (
    hasStatusFilter() ||
    Boolean(state.clientFilter) ||
    (isSupervisor() && Boolean(state.technicianFilter)) ||
    Boolean(state.dateFrom) ||
    Boolean(state.dateTo)
  );
}

function countActiveFieldFilters() {
  let count = 0;
  if (state.clientFilter) count += 1;
  if (isSupervisor() && state.technicianFilter) count += 1;
  if (state.dateFrom || state.dateTo) count += 1;
  if (hasStatusFilter()) count += 1;
  return count;
}

function getFiltersSummary() {
  const parts = [];
  if (state.clientFilter) parts.push(state.clientFilter);
  if (isSupervisor() && state.technicianFilter) parts.push(getTechnicianFilterLabel());
  if (state.dateFrom || state.dateTo) {
    const from = state.dateFrom || "…";
    const to = state.dateTo || "…";
    parts.push(`${from} → ${to}`);
  }
  if (hasStatusFilter()) {
    parts.push(getStatusFilterLabel());
  }
  if (parts.length > 0) {
    return parts.join(" · ");
  }
  return isSupervisor()
    ? "Cliente, técnico, período e status"
    : "Cliente, período e status";
}

function getTechnicianFilterLabel() {
  if (!state.technicianFilter) {
    return "Todos os técnicos";
  }
  const technician = state.technicians.find((item) => item.id === state.technicianFilter);
  return technician?.name || "Todos os técnicos";
}

function renderVisitActions(appointment) {
  const supervisor = isSupervisor();
  return `
    <div class="app-visit-card__actions">
      <button class="ds-btn ds-btn--secondary ds-btn--sm" type="button" data-action="view-visit" data-id="${escapeHtml(appointment.id)}">${actionIcons.view}<span>Visualizar</span></button>
      ${
        canShowAttend(appointment)
          ? `<button class="ds-btn ds-btn--secondary ds-btn--sm" type="button" data-action="attend-visit" data-id="${escapeHtml(appointment.id)}">${actionIcons.check}<span>Atender</span></button>`
          : ""
      }
      ${
        supervisor && appointment.canReschedule
          ? `<button class="ds-btn ds-btn--secondary ds-btn--sm" type="button" data-action="open-reschedule" data-id="${escapeHtml(appointment.id)}">${actionIcons.reschedule}<span>Reagendar</span></button>`
          : ""
      }
      ${
        canShowClose(appointment)
          ? `<button class="ds-btn ds-btn--secondary ds-btn--sm" type="button" data-action="close-visit" data-id="${escapeHtml(appointment.id)}">${actionIcons.check}<span>Concluir</span></button>`
          : ""
      }
      ${
        supervisor && appointment.canCancel
          ? `<button class="ds-btn ds-btn--danger ds-btn--sm" type="button" data-action="open-cancel" data-id="${escapeHtml(appointment.id)}">${actionIcons.cancel}<span>Cancelar</span></button>`
          : ""
      }
      ${
        supervisor && appointment.canReopen
          ? `<button class="ds-btn ds-btn--secondary ds-btn--sm" type="button" data-action="open-reopen" data-id="${escapeHtml(appointment.id)}">${actionIcons.reopen}<span>Reabrir</span></button>`
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
        <div class="ds-row">
          <span class="ds-row__label">Recursos</span>
          <span class="ds-row__value">${
            appointment.resourceCount > 0
              ? escapeHtml(appointment.resources.map((item) => item.name).join(", "))
              : "Nenhum alocado"
          }</span>
        </div>
        ${
          appointment.displayStatus === "cancelled" && appointment.cancellationReason
            ? `<div class="ds-row">
                <span class="ds-row__label">Motivo</span>
                <span class="ds-row__value">${escapeHtml(appointment.cancellationReason)}</span>
              </div>`
            : ""
        }
        ${
          appointment.notes
            ? `<div class="ds-row app-visit-card__notes">
                <span class="ds-row__label">Observações</span>
                <span class="ds-row__value">${escapeHtml(appointment.notes)}</span>
              </div>`
            : ""
        }
        ${
          appointment.postVisitNotes
            ? `<div class="ds-row app-visit-card__notes">
                <span class="ds-row__label">Pós-visita</span>
                <span class="ds-row__value">${escapeHtml(appointment.postVisitNotes)}</span>
              </div>`
            : ""
        }
      </div>
      ${renderVisitActions(appointment)}
    </article>
  `;
}

function renderVisitTableActions(appointment) {
  const supervisor = isSupervisor();
  return `
    <div class="app-visit-table__actions">
      <button class="ds-icon-btn ds-tooltip ds-tooltip--bottom" type="button" data-action="view-visit" data-id="${escapeHtml(appointment.id)}" data-tooltip="Visualizar" aria-label="Visualizar">${actionIcons.view}</button>
      ${
        canShowAttend(appointment)
          ? `<button class="ds-icon-btn ds-tooltip ds-tooltip--bottom ds-tooltip--success" type="button" data-action="attend-visit" data-id="${escapeHtml(appointment.id)}" data-tooltip="Atender" aria-label="Atender">${actionIcons.check}</button>`
          : ""
      }
      ${
        supervisor && appointment.canReschedule
          ? `<button class="ds-icon-btn ds-tooltip ds-tooltip--bottom" type="button" data-action="open-reschedule" data-id="${escapeHtml(appointment.id)}" data-tooltip="Reagendar" aria-label="Reagendar">${actionIcons.reschedule}</button>`
          : ""
      }
      ${
        canShowClose(appointment)
          ? `<button class="ds-icon-btn ds-tooltip ds-tooltip--bottom ds-tooltip--success" type="button" data-action="close-visit" data-id="${escapeHtml(appointment.id)}" data-tooltip="Concluir" aria-label="Concluir">${actionIcons.check}</button>`
          : ""
      }
      ${
        supervisor && appointment.canCancel
          ? `<button class="ds-icon-btn ds-tooltip ds-tooltip--bottom ds-tooltip--danger app-visit-table__cancel" type="button" data-action="open-cancel" data-id="${escapeHtml(appointment.id)}" data-tooltip="Cancelar" aria-label="Cancelar">${actionIcons.cancel}</button>`
          : ""
      }
      ${
        supervisor && appointment.canReopen
          ? `<button class="ds-icon-btn ds-tooltip ds-tooltip--bottom" type="button" data-action="open-reopen" data-id="${escapeHtml(appointment.id)}" data-tooltip="Reabrir" aria-label="Reabrir">${actionIcons.reopen}</button>`
          : ""
      }
    </div>
  `;
}

function renderVisitTableRow(appointment) {
  const resourcesLabel =
    appointment.resourceCount > 0
      ? `${appointment.resourceCount} ${appointment.resourceCount === 1 ? "recurso" : "recursos"}`
      : "—";

  return `
    <tr data-visit-id="${escapeHtml(appointment.id)}">
      <td data-label="Status">
        <span class="ds-badge ${escapeHtml(appointment.statusBadgeClass)}">${escapeHtml(appointment.statusLabel)}</span>
      </td>
      <td data-label="Cliente">
        <strong class="app-visit-table__client">${escapeHtml(appointment.clientName)}</strong>
        <span class="ds-small app-visit-table__sub">${escapeHtml(appointment.phone)}</span>
      </td>
      <td data-label="Serviço">${escapeHtml(appointment.serviceTypeName)}</td>
      <td data-label="Data">${escapeHtml(appointment.slotLabel)}</td>
      <td data-label="Local">
        <span class="app-visit-table__place">${escapeHtml(appointment.location)}</span>
      </td>
      <td data-label="Técnico">${escapeHtml(appointment.technicianName)}</td>
      <td data-label="Recursos">${escapeHtml(resourcesLabel)}</td>
      <td data-label="Ações">${renderVisitTableActions(appointment)}</td>
    </tr>
  `;
}

function renderVisitTable(appointments) {
  return `
    <div class="app-visit-table-wrap">
      <table class="app-visit-table">
        <thead>
          <tr>
            <th scope="col">Status</th>
            <th scope="col">Cliente</th>
            <th scope="col">Serviço</th>
            <th scope="col">Data</th>
            <th scope="col">Local</th>
            <th scope="col">Técnico</th>
            <th scope="col">Recursos</th>
            <th scope="col">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${appointments.map(renderVisitTableRow).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderClientFilter() {
  const names = getFilteredClientNames();
  const selectedLabel = state.clientFilter || "Todos os clientes";
  const isActive = Boolean(state.clientFilter);

  return `
    <div class="app-select-filter app-client-filter${state.clientFilterOpen ? " is-open" : ""}${isActive ? " is-active" : ""}">
      <button
        class="app-select-filter__trigger"
        type="button"
        data-action="toggle-client-filter"
        aria-haspopup="listbox"
        aria-expanded="${state.clientFilterOpen ? "true" : "false"}"
        aria-controls="client-filter-list"
      >
        <span class="app-select-filter__value${state.clientFilter ? "" : " is-placeholder"}">${escapeHtml(selectedLabel)}</span>
        <svg class="ds-icon ds-icon--sm app-select-filter__chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6"></path>
        </svg>
      </button>
      ${
        state.clientFilterOpen
          ? `<div class="app-select-filter__panel" role="presentation">
              <input
                class="ds-input app-select-filter__search"
                id="clientFilterQuery"
                type="search"
                autocomplete="off"
                placeholder="Digite o nome do cliente"
                value="${escapeHtml(state.clientFilterQuery)}"
                aria-label="Buscar cliente por nome"
              >
              <ul class="app-select-filter__list" id="client-filter-list" role="listbox" aria-label="Clientes">
                <li>
                  <button
                    class="app-select-filter__option${!state.clientFilter ? " is-selected" : ""}"
                    type="button"
                    role="option"
                    aria-selected="${!state.clientFilter ? "true" : "false"}"
                    data-action="set-client-filter"
                    data-client=""
                  >
                    Todos os clientes
                  </button>
                </li>
                ${
                  names.length === 0
                    ? `<li class="app-select-filter__empty">Nenhum cliente encontrado</li>`
                    : names
                        .map(
                          (name) => `
                            <li>
                              <button
                                class="app-select-filter__option${state.clientFilter === name ? " is-selected" : ""}"
                                type="button"
                                role="option"
                                aria-selected="${state.clientFilter === name ? "true" : "false"}"
                                data-action="set-client-filter"
                                data-client="${escapeHtml(name)}"
                              >
                                ${escapeHtml(name)}
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

function renderTechnicianFilter() {
  if (!isSupervisor()) {
    return "";
  }

  const technicians = [...state.technicians].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), "pt-BR", { sensitivity: "base" }),
  );
  const selectedLabel = getTechnicianFilterLabel();
  const isActive = Boolean(state.technicianFilter);

  return `
    <div class="app-select-filter app-tech-filter${state.technicianFilterOpen ? " is-open" : ""}${isActive ? " is-active" : ""}">
      <button
        class="app-select-filter__trigger"
        type="button"
        data-action="toggle-technician-filter"
        aria-haspopup="listbox"
        aria-expanded="${state.technicianFilterOpen ? "true" : "false"}"
        aria-controls="technician-filter-list"
      >
        <span class="app-select-filter__value${state.technicianFilter ? "" : " is-placeholder"}">${escapeHtml(selectedLabel)}</span>
        <svg class="ds-icon ds-icon--sm app-select-filter__chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6"></path>
        </svg>
      </button>
      ${
        state.technicianFilterOpen
          ? `<div class="app-select-filter__panel" role="presentation">
              <ul class="app-select-filter__list" id="technician-filter-list" role="listbox" aria-label="Técnicos">
                <li>
                  <button
                    class="app-select-filter__option${!state.technicianFilter ? " is-selected" : ""}"
                    type="button"
                    role="option"
                    aria-selected="${!state.technicianFilter ? "true" : "false"}"
                    data-action="set-technician-filter"
                    data-technician=""
                  >
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
                                class="app-select-filter__option${state.technicianFilter === technician.id ? " is-selected" : ""}"
                                type="button"
                                role="option"
                                aria-selected="${state.technicianFilter === technician.id ? "true" : "false"}"
                                data-action="set-technician-filter"
                                data-technician="${escapeHtml(technician.id)}"
                              >
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
          id="dateFromFilter"
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
          id="dateToFilter"
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

function renderVisitsToolbar() {
  const statusLabel = getStatusFilterLabel();
  const sortLabel = state.sortDir === "az" ? "Ordenar A–Z" : "Ordenar Z–A";
  const sortIcon = state.sortDir === "az" ? actionIcons.sortAz : actionIcons.sortZa;
  const open = Boolean(state.filtersOpen);
  const activeCount = countActiveFieldFilters();
  const hasFilters = activeCount > 0;
  const summary = getFiltersSummary();

  return `
    <section class="app-filters${open ? " is-open" : ""}${hasFilters ? " is-active" : ""}" aria-labelledby="visits-filters-title">
      <button
        class="app-filters__toggle"
        type="button"
        data-action="toggle-filters-panel"
        aria-expanded="${open ? "true" : "false"}"
        aria-controls="visits-filters-panel"
        id="visits-filters-title"
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
      <div class="app-filters__panel" id="visits-filters-panel" ${open ? "" : "hidden"}>
        <div class="app-filters__fields" role="group" aria-label="Campos de filtro">
          <div class="app-filters__field">
            <span class="app-filters__field-label">Cliente</span>
            ${renderClientFilter()}
          </div>
          ${
            isSupervisor()
              ? `<div class="app-filters__field">
                  <span class="app-filters__field-label">Técnico</span>
                  ${renderTechnicianFilter()}
                </div>`
              : ""
          }
          <div class="app-filters__field app-filters__field--dates">
            <span class="app-filters__field-label">Período</span>
            ${renderDateRangeFilter()}
          </div>
        </div>
        <div class="app-visits__toolbar-tools" role="toolbar" aria-label="Status, ordenação e visualização">
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
              ${actionIcons.filter}
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
          <button
            class="app-visits__tool-btn ds-tooltip${state.viewMode === "calendar" ? " is-active" : ""}"
            type="button"
            data-action="set-view-mode"
            data-mode="calendar"
            data-tooltip="Modo semanas"
            aria-label="Modo semanas"
            aria-pressed="${state.viewMode === "calendar" ? "true" : "false"}"
          >
            ${actionIcons.calendar}
          </button>
          <button
            class="app-visits__tool-btn ds-tooltip${state.viewMode === "month" ? " is-active" : ""}"
            type="button"
            data-action="set-view-mode"
            data-mode="month"
            data-tooltip="Modo mês"
            aria-label="Modo mês"
            aria-pressed="${state.viewMode === "month" ? "true" : "false"}"
          >
            ${actionIcons.month}
          </button>
        </div>
      </div>
    </section>
  `;
}

function renderVisitsSection() {
  const visible = getVisibleAppointments();
  const total = state.appointments.length;
  const countLabel = hasActiveListFilters()
    ? `${visible.length} de ${total}`
    : `${total} ${total <= 1 ? "visita" : "visitas"}`;

  let body = "";
  if (total === 0) {
    body = `<p class="app-empty">Sem visita agendada</p>`;
  } else if (visible.length === 0) {
    body = `<p class="app-empty">Nenhuma visita encontrada com estes filtros.</p>`;
  } else if (state.viewMode === "list") {
    body = renderVisitTable(visible);
  } else if (state.viewMode === "calendar") {
    body = renderWeekCalendar({
      appointments: visible,
      interactive: true,
      showTechnician: isSupervisor(),
      dateFrom: state.dateFrom,
      dateTo: state.dateTo,
    });
  } else if (state.viewMode === "month") {
    body = renderMonthCalendar({
      appointments: visible,
      interactive: true,
      showTechnician: isSupervisor(),
      dateFrom: state.dateFrom,
      dateTo: state.dateTo,
      activeMonthIndex: state.calendarMonthIndex,
    });
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
        <div class="app-visits__heading">
          <h1 class="ds-title app-visits__title">Visitas</h1>
          ${
            isSupervisor()
              ? `<button
                  class="ds-icon-btn ds-tooltip ds-tooltip--bottom app-visits__add"
                  type="button"
                  data-action="open-new-visit"
                  data-tooltip="Nova visita"
                  aria-label="Nova visita"
                >
                  ${actionIcons.plus}
                </button>`
              : ""
          }
        </div>
      </div>
      ${renderVisitsToolbar()}
      ${state.formOpen ? "" : renderBanner(state.banner)}
      ${body}
    </section>
  `;
}

function renderCloseModal() {
  if (!state.closeTarget) {
    return "";
  }

  const target = state.closeTarget;

  return `
    <div class="app-modal" role="presentation">
      <div class="app-modal__backdrop" data-action="dismiss-close"></div>
      <div
        class="app-modal__panel ds-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="close-visit-title"
      >
        <h2 class="ds-heading" id="close-visit-title">Concluir visita</h2>
        <p class="ds-small">
          Confirme a conclusão da visita de
          <strong>${escapeHtml(target.clientName)}</strong>
          (${escapeHtml(target.slotLabel)}). As observações pós-visita serão gravadas no fechamento.
        </p>
        ${renderField({
          id: "closeNotes",
          label: "Observações pós-visita",
          error: state.closeError,
          hint: "Registre o que ocorreu no atendimento.",
          controlHtml: `
            <textarea
              class="ds-input app-textarea"
              id="closeNotes"
              name="closeNotes"
              maxlength="500"
              rows="4"
              {{described}}
              ${state.closeError ? 'aria-invalid="true"' : ""}
            >${escapeHtml(state.closeNotes)}</textarea>
          `,
        })}
        <div class="app-modal__actions">
          <button class="ds-btn ds-btn--ghost" type="button" data-action="dismiss-close">Voltar</button>
          <button
            class="ds-btn ds-btn--primary${state.closeLoading ? " is-loading" : ""}"
            type="button"
            data-action="confirm-close"
            ${state.closeLoading ? "disabled" : ""}
          >
            Confirmar conclusão
          </button>
        </div>
      </div>
    </div>
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

function renderRescheduleModal() {
  if (!state.rescheduleTarget) {
    return "";
  }

  const target = state.rescheduleTarget;

  return `
    <div class="app-modal" role="presentation">
      <div class="app-modal__backdrop" data-action="dismiss-reschedule"></div>
      <div
        class="app-modal__panel ds-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reschedule-visit-title"
      >
        <h2 class="ds-heading" id="reschedule-visit-title">Reagendar visita</h2>
        <p class="ds-small">
          Escolha nova data e horário para a visita de
          <strong>${escapeHtml(target.clientName)}</strong>
          (atual: ${escapeHtml(target.slotLabel)}). O status permanece aberto.
        </p>
        <div class="app-form__slot">
          ${renderField({
            id: "rescheduleDate",
            label: "Nova data",
            error: state.rescheduleError && !state.rescheduleDate ? state.rescheduleError : "",
            controlHtml: `
              <input
                class="ds-input"
                id="rescheduleDate"
                name="rescheduleDate"
                type="date"
                value="${escapeHtml(state.rescheduleDate)}"
                {{described}}
              >
            `,
          })}
          ${renderField({
            id: "rescheduleTime",
            label: "Novo horário",
            controlHtml: `
              <input
                class="ds-input"
                id="rescheduleTime"
                name="rescheduleTime"
                type="time"
                value="${escapeHtml(state.rescheduleTime)}"
                {{described}}
              >
            `,
          })}
        </div>
        ${renderField({
          id: "rescheduleReason",
          label: "Motivo do reagendamento",
          error: state.rescheduleError,
          controlHtml: `
            <textarea
              class="ds-input app-textarea"
              id="rescheduleReason"
              name="rescheduleReason"
              maxlength="500"
              rows="4"
              {{described}}
              ${state.rescheduleError ? 'aria-invalid="true"' : ""}
            >${escapeHtml(state.rescheduleReason)}</textarea>
          `,
        })}
        <div class="app-modal__actions">
          <button class="ds-btn ds-btn--ghost" type="button" data-action="dismiss-reschedule">Voltar</button>
          <button
            class="ds-btn ds-btn--primary${state.rescheduleLoading ? " is-loading" : ""}"
            type="button"
            data-action="confirm-reschedule"
            ${state.rescheduleLoading ? "disabled" : ""}
          >
            Confirmar reagendamento
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderReopenModal() {
  if (!state.reopenTarget) {
    return "";
  }

  const target = state.reopenTarget;

  return `
    <div class="app-modal" role="presentation">
      <div class="app-modal__backdrop" data-action="dismiss-reopen"></div>
      <div
        class="app-modal__panel ds-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reopen-visit-title"
      >
        <h2 class="ds-heading" id="reopen-visit-title">Reabrir visita</h2>
        <p class="ds-small">
          A visita de <strong>${escapeHtml(target.clientName)}</strong>
          (${escapeHtml(target.slotLabel)})
          ${
            target.status === "cancelled"
              ? "passará para o status <strong>Remarcada</strong>."
              : "passará para o status <strong>Reaberta</strong>."
          }
          O evento anterior permanece no histórico. Depois você pode editar ou reagendar.
        </p>
        ${renderField({
          id: "reopenReason",
          label: "Motivo da reabertura",
          error: state.reopenError,
          controlHtml: `
            <textarea
              class="ds-input app-textarea"
              id="reopenReason"
              name="reopenReason"
              maxlength="500"
              rows="4"
              {{described}}
              ${state.reopenError ? 'aria-invalid="true"' : ""}
            >${escapeHtml(state.reopenReason)}</textarea>
          `,
        })}
        <div class="app-modal__actions">
          <button class="ds-btn ds-btn--ghost" type="button" data-action="dismiss-reopen">Voltar</button>
          <button
            class="ds-btn ds-btn--primary${state.reopenLoading ? " is-loading" : ""}"
            type="button"
            data-action="confirm-reopen"
            ${state.reopenLoading ? "disabled" : ""}
          >
            Confirmar reabertura
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderEventHistory() {
  if (state.formMode !== "view") {
    return "";
  }

  const appointment = getEditingAppointment();
  const events = appointment?.events ?? [];
  const open = Boolean(state.historyOpen);
  const countLabel = events.length === 1 ? "1 evento" : `${events.length} eventos`;

  const body =
    events.length === 0
      ? `<p class="ds-small app-history__empty">Nenhum evento registrado para esta visita.</p>`
      : `<ol class="app-history__list">
          ${events
            .map((event) => {
              const slotChange =
                event.eventType === "rescheduled" && event.fromSlotLabel && event.toSlotLabel
                  ? `<span class="app-history__slot">${escapeHtml(event.fromSlotLabel)} → ${escapeHtml(event.toSlotLabel)}</span>`
                  : "";
              const reason = event.reason
                ? `<span class="app-history__reason">${escapeHtml(event.reason)}</span>`
                : "";
              const actor = event.actorName
                ? `<span class="app-history__actor">por ${escapeHtml(event.actorName)}</span>`
                : "";
              return `
                <li class="app-history__item" data-event-type="${escapeHtml(event.eventType)}">
                  <div class="app-history__head">
                    <span class="ds-badge ${escapeHtml(event.eventTypeBadgeClass || "ds-badge--subtle")}">${escapeHtml(event.eventTypeLabel)}</span>
                    <time class="ds-small" datetime="${escapeHtml(event.createdAt)}">${escapeHtml(event.createdAtLabel)}</time>
                  </div>
                  ${actor}
                  ${slotChange}
                  ${reason}
                </li>
              `;
            })
            .join("")}
        </ol>`;

  return `
    <section class="app-history${open ? " is-open" : ""}" aria-labelledby="visit-history-title">
      <button
        class="app-history__toggle"
        type="button"
        data-action="toggle-history"
        aria-expanded="${open ? "true" : "false"}"
        aria-controls="visit-history-panel"
        id="visit-history-title"
      >
        <span class="app-history__toggle-label">Histórico de Agendamentos</span>
        <span class="app-history__toggle-meta">${escapeHtml(countLabel)}</span>
        <svg class="ds-icon ds-icon--sm app-history__chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6"></path>
        </svg>
      </button>
      <div class="app-history__panel" id="visit-history-panel" ${open ? "" : "hidden"}>
        ${body}
      </div>
    </section>
  `;
}

function renderFormActions() {
  const { formMode, loading, viewingCanEdit, viewingCanReschedule, viewingCanReopen } = state;

  if (formMode === "view") {
    return `
      <div class="app-form__actions app-form__actions--edit">
        <button class="ds-btn ds-btn--secondary" type="button" data-action="close-form">
          <span>Fechar</span>
        </button>
        ${
          viewingCanReopen
            ? `<button class="ds-btn ds-btn--secondary" type="button" data-action="open-reopen" data-id="${escapeHtml(state.editingId || "")}">
                ${actionIcons.reopen}<span>Reabrir</span>
              </button>`
            : ""
        }
        ${
          viewingCanReschedule
            ? `<button class="ds-btn ds-btn--secondary" type="button" data-action="open-reschedule" data-id="${escapeHtml(state.editingId || "")}">
                ${actionIcons.reschedule}<span>Reagendar</span>
              </button>`
            : ""
        }
        ${
          viewingCanEdit
            ? `<button class="ds-btn ds-btn--primary" type="button" data-action="enable-edit">
                ${actionIcons.edit}<span>Editar</span>
              </button>`
            : ""
        }
      </div>
    `;
  }

  if (formMode === "edit") {
    return `
      <div class="app-form__actions app-form__actions--edit">
        <button class="ds-btn ds-btn--secondary" type="button" data-action="discard-edit">
          ${actionIcons.discard}<span>Descartar alteração</span>
        </button>
        <button
          class="ds-btn ds-btn--primary${loading ? " is-loading" : ""}"
          type="submit"
          ${loading ? "disabled" : ""}
        >
          ${actionIcons.save}<span>Salvar alteração</span>
        </button>
      </div>
    `;
  }

  return `
    <div class="app-form__actions app-form__actions--edit">
      <button class="ds-btn ds-btn--secondary" type="button" data-action="close-form">
        <span>Cancelar</span>
      </button>
      <button
        class="ds-btn ds-btn--primary${loading ? " is-loading" : ""}"
        type="submit"
        ${loading ? "disabled" : ""}
      >
        Registrar visita
      </button>
    </div>
  `;
}

function renderForm() {
  const { values, errors, formMode } = state;
  const isReadonly = formMode === "view";
  const readonlyAttr = isReadonly ? "readonly" : "";

  return `
    <form class="app-form${isReadonly ? " app-form--readonly" : ""}" id="appointment-form" novalidate>
      <div class="app-form__pair">
        ${renderField({
          id: "clientName",
          label: "Cliente",
          error: isReadonly ? "" : errors.clientName,
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
              ${readonlyAttr}
              ${!isReadonly && errors.clientName ? 'aria-invalid="true"' : ""}
            >
          `,
        })}
        ${renderField({
          id: "location",
          label: "Localização do cliente",
          error: isReadonly ? "" : errors.location,
          hint: isReadonly ? "" : "Endereço completo da visita.",
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
              ${readonlyAttr}
              ${!isReadonly && errors.location ? 'aria-invalid="true"' : ""}
            >
          `,
        })}
      </div>

      <div class="app-form__pair">
        ${renderField({
          id: "phone",
          label: "Telefone principal",
          error: isReadonly ? "" : errors.phone,
          hint: isReadonly ? "" : "Com DDD. Ex.: (11) 98765-4321",
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
              ${readonlyAttr}
              ${!isReadonly && errors.phone ? 'aria-invalid="true"' : ""}
            >
          `,
        })}
        ${renderField({
          id: "phoneSecondary",
          label: "Telefone secundário",
          error: isReadonly ? "" : errors.phoneSecondary,
          hint: isReadonly ? "" : "Opcional.",
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
              ${readonlyAttr}
              ${!isReadonly && errors.phoneSecondary ? 'aria-invalid="true"' : ""}
            >
          `,
        })}
      </div>

      ${renderField({
        id: "email",
        label: "E-mail",
        error: isReadonly ? "" : errors.email,
        hint: isReadonly ? "" : "Contato do cliente para confirmações.",
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
            ${readonlyAttr}
            ${!isReadonly && errors.email ? 'aria-invalid="true"' : ""}
          >
        `,
      })}

      <div class="app-form__slot">
        ${renderField({
          id: "date",
          label: "Data",
          error: isReadonly ? "" : errors.date,
          controlHtml: `
            <input
              class="ds-input"
              id="date"
              name="date"
              type="date"
              value="${escapeHtml(values.date)}"
              {{described}}
              ${readonlyAttr}
              ${!isReadonly && errors.date ? 'aria-invalid="true"' : ""}
            >
          `,
        })}
        ${renderField({
          id: "time",
          label: "Horário",
          error: isReadonly ? "" : errors.time,
          controlHtml: `
            <input
              class="ds-input"
              id="time"
              name="time"
              type="time"
              value="${escapeHtml(values.time)}"
              {{described}}
              ${readonlyAttr}
              ${!isReadonly && errors.time ? 'aria-invalid="true"' : ""}
            >
          `,
        })}
      </div>

      ${renderSelectField({
        id: "technicianId",
        label: "Técnico designado",
        options: state.technicians,
        value: values.technicianId,
        error: isReadonly ? "" : errors.technicianId,
        placeholder: "Selecione o técnico",
        required: !isReadonly,
        disabled: isReadonly,
      })}

      <div class="app-form__span">
        ${renderOptionGroup({
          name: "serviceTypeId",
          legend: "Tipo de serviço",
          options: state.serviceTypes,
          value: values.serviceTypeId,
          error: isReadonly ? "" : errors.serviceTypeId,
          disabled: isReadonly,
        })}
      </div>

      <div class="app-form__span app-form__checklist">
        <h3 class="app-form__checklist-title">Checklist de recursos</h3>
        ${renderChecklistGroup({
          name: "resourceIds",
          legend: "Recursos da visita",
          hint: isReadonly
            ? ""
            : "Opcional. Marque materiais, ferramentas e equipamentos que o técnico deve levar.",
          options: state.resources,
          selectedIds: values.resourceIds,
          disabled: isReadonly,
        })}
      </div>

      ${renderField({
        id: "notes",
        label: "Observações",
        hint: isReadonly ? "" : "Opcional. Notas do agendamento (não confundir com pós-visita).",
        controlHtml: `
          <textarea
            class="ds-input app-textarea"
            id="notes"
            name="notes"
            maxlength="500"
            {{described}}
            ${isReadonly ? "readonly" : ""}
          >${escapeHtml(values.notes)}</textarea>
        `,
      })}

      ${renderPostVisitNotesField()}

      ${renderEventHistory()}
      ${renderFormActions()}
    </form>
  `;
}

function canEditPostVisitNotes() {
  if (!state.editingId || state.formMode !== "view") {
    return false;
  }
  const appointment = state.appointments.find((item) => item.id === state.editingId);
  if (!appointment?.canEditPostVisitNotes) {
    return false;
  }
  if (isSupervisor()) {
    return true;
  }
  return isTechnician() && appointment.technicianId === state.user?.technicianId;
}

function renderPostVisitNotesField() {
  const appointment = getEditingAppointment();
  const editable = canEditPostVisitNotes();
  const hasNotes = Boolean(state.values.postVisitNotes);
  const showPanel = editable || hasNotes || appointment?.displayStatus === "in_progress";

  if (!showPanel) {
    return "";
  }

  const hint = editable
    ? "Disponível após clicar em Atender. Ao concluir, estas notas são gravadas com o fechamento."
    : "Registro do atendimento feito pelo técnico.";
  const hintId = "post-visit-notes-hint";
  const errorId = "post-visit-notes-error";

  return `
    <div class="app-form__span app-form__checklist app-post-visit" data-field="postVisitNotes">
      <h3 class="app-form__checklist-title">Observações pós-visita</h3>
      <fieldset class="ds-field app-resource-checklist" ${editable ? "" : "disabled"}>
        <legend class="ds-field__label">Notas do atendimento</legend>
        <p class="ds-field__hint" id="${hintId}">${escapeHtml(hint)}</p>
        ${
          appointment?.attendedAtLabel
            ? `<p class="ds-field__hint app-post-visit__started">Início do atendimento: ${escapeHtml(appointment.attendedAtLabel)}</p>`
            : ""
        }
        <div class="ds-input-wrap${state.notesError ? " is-error" : ""}">
          <textarea
            class="ds-input app-textarea"
            id="postVisitNotes"
            name="postVisitNotes"
            maxlength="500"
            rows="5"
            aria-describedby="${hintId}${state.notesError ? ` ${errorId}` : ""}"
            ${editable ? "" : "readonly"}
            ${state.notesError ? 'aria-invalid="true"' : ""}
          >${escapeHtml(state.values.postVisitNotes)}</textarea>
        </div>
        ${
          state.notesError
            ? `<p class="ds-field__error" id="${errorId}" role="alert">${escapeHtml(state.notesError)}</p>`
            : ""
        }
        ${
          editable
            ? `<div class="app-form__actions app-post-visit__actions">
                <button
                  class="ds-btn ds-btn--secondary${state.notesSaving ? " is-loading" : ""}"
                  type="button"
                  data-action="save-visit-notes"
                  ${state.notesSaving ? "disabled" : ""}
                >
                  Salvar rascunho
                </button>
                <button
                  class="ds-btn ds-btn--primary"
                  type="button"
                  data-action="close-visit"
                  data-id="${escapeHtml(appointment.id)}"
                >
                  Concluir atendimento
                </button>
              </div>`
            : ""
        }
      </fieldset>
    </div>
  `;
}

function renderLoginPage() {
  return `
    <section class="app-login ds-screen">
      <div class="app-login__card ds-card">
        <div class="app-brand app-login__brand">
          <span class="app-brand__mark" aria-hidden="true">TR</span>
          <span class="app-brand__name">TechRoute</span>
        </div>
        <h1 class="ds-title">Entrar</h1>
        <p class="ds-small">Use seu perfil de supervisor ou técnico para acessar a agenda.</p>
        ${state.loginError ? renderBanner({ tone: "danger", message: state.loginError }) : ""}
        <form class="app-login__form" data-action="submit-login">
          <label class="ds-field">
            <span class="ds-field__label">Usuário</span>
            <div class="ds-input-wrap">
              <input class="ds-input" id="loginUsername" name="username" autocomplete="username" value="${escapeHtml(state.loginUsername)}" required>
            </div>
          </label>
          <label class="ds-field">
            <span class="ds-field__label">Senha</span>
            <div class="ds-input-wrap">
              <input class="ds-input" id="loginPassword" name="password" type="password" autocomplete="current-password" value="${escapeHtml(state.loginPassword)}" required>
            </div>
          </label>
          <button class="ds-btn ds-btn--primary${state.loginLoading ? " is-loading" : ""}" type="submit" ${state.loginLoading ? "disabled" : ""}>
            Entrar
          </button>
        </form>
        <div class="app-login__hint ds-small">
          <strong>Demo:</strong> supervisor / 123456 · ana / 123456 · carlos / 123456 · juliana / 123456 · pedro / 123456
        </div>
      </div>
    </section>
  `;
}

function renderFormModal() {
  if (!state.formOpen) {
    return "";
  }

  const titles = {
    create: {
      title: "Nova visita",
      subtitle: "Preencha data, horário, local do cliente, técnico, tipo de serviço e recursos.",
    },
    view: {
      title: "Detalhes da visita",
      subtitle: "Consulte os dados da visita. Se estiver aberta, você pode editar o registro.",
    },
    edit: {
      title: "Alterar visita",
      subtitle: "Atualize data, horário, local, técnico, tipo de serviço ou recursos.",
    },
  };
  const { title, subtitle } = titles[state.formMode] || titles.create;

  return `
    <div class="app-modal app-modal--form" role="presentation">
      <div class="app-modal__backdrop" data-action="close-form"></div>
      <div
        class="app-modal__panel app-modal__panel--form ds-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="visit-form-title"
      >
        <div class="app-modal__header">
          <div class="app-modal__heading">
            <span class="ds-eyebrow">Visitas técnicas</span>
            <h2 class="ds-heading" id="visit-form-title">${title}</h2>
            <p class="ds-small">${subtitle}</p>
          </div>
          <button
            class="ds-icon-btn ds-tooltip ds-tooltip--left"
            type="button"
            data-action="close-form"
            data-tooltip="Fechar"
            aria-label="Fechar"
          >
            ${actionIcons.close}
          </button>
        </div>
        ${renderBanner(state.banner)}
        <div class="app-modal__body">
          ${renderForm()}
        </div>
      </div>
    </div>
  `;
}

function renderAllocateFilters() {
  const statusOptions = STATUS_FILTERS.filter((item) => item.id !== "all").map((item) => ({
    id: item.id,
    name: item.label,
  }));

  const serviceOptions = state.serviceTypes.map((item) => ({
    id: item.id,
    name: item.name,
  }));

  return `
    <div class="app-resources__filters">
      ${renderField({
        id: "allocateQuery",
        label: "Buscar visita",
        hint: "Nome do cliente ou ID da visita.",
        controlHtml: `
          <input
            class="ds-input"
            id="allocateQuery"
            name="allocateQuery"
            type="search"
            autocomplete="off"
            placeholder="Ex.: Maria ou uuid da visita"
            value="${escapeHtml(state.allocateQuery)}"
            {{described}}
          >
        `,
      })}
      ${renderSelectField({
        id: "allocateStatusFilter",
        label: "Status",
        options: statusOptions,
        value: state.allocateStatusFilter === "all" ? "" : state.allocateStatusFilter,
        placeholder: "Todos os status",
      })}
      ${renderSelectField({
        id: "allocateServiceTypeFilter",
        label: "Tipo de visita",
        options: serviceOptions,
        value: state.allocateServiceTypeFilter === "all" ? "" : state.allocateServiceTypeFilter,
        placeholder: "Todos os tipos",
      })}
    </div>
  `;
}

function renderAllocateVisitList(candidates) {
  if (candidates.length === 0) {
    return `<p class="app-empty">Nenhuma visita encontrada com estes filtros.</p>`;
  }

  return `
    <div class="app-resources__results" role="list" aria-label="Visitas encontradas">
      ${candidates
        .map((item) => {
          const selected = item.id === state.allocateTargetId;
          return `
            <button
              class="app-resources__result${selected ? " is-selected" : ""}"
              type="button"
              role="listitem"
              data-action="select-allocate-visit"
              data-id="${escapeHtml(item.id)}"
              aria-pressed="${selected ? "true" : "false"}"
            >
              <div class="app-resources__result-top">
                <strong>${escapeHtml(item.clientName)}</strong>
                <span class="ds-badge ${escapeHtml(item.statusBadgeClass)}">${escapeHtml(item.statusLabel)}</span>
              </div>
              <span class="ds-small">${escapeHtml(item.serviceTypeName)} · ${escapeHtml(item.slotLabel)}</span>
              <span class="ds-small app-resources__result-id">ID: ${escapeHtml(item.id)}</span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderResourcesPage() {
  const candidates = getAllocateCandidates();
  const selected =
    candidates.find((item) => item.id === state.allocateTargetId) ||
    state.appointments.find((item) => item.id === state.allocateTargetId) ||
    null;
  const canEditSelected = Boolean(selected?.canAllocateResources);

  return `
    <div class="app-layout app-layout--resources">
      <section class="ds-screen app-resources" id="recursos">
        <span class="ds-eyebrow">Logística técnica</span>
        <div>
          <h1 class="ds-title">Checklist de recursos</h1>
          <p class="ds-small">
            Encontre a visita e marque o checklist do que o técnico leva:
            materiais, ferramentas e equipamentos.
          </p>
        </div>
        ${renderBanner(state.allocateBanner)}
        ${renderAllocateFilters()}

        ${
          state.appointments.length === 0
            ? `<p class="app-empty">Sem visita agendada. Crie uma visita em Visitas.</p>`
            : `
              <div class="app-resources__panel">
                <div class="app-resources__finder">
                  <div class="ds-section__head">
                    <h2 class="ds-heading">Visitas</h2>
                    <span class="ds-badge">${candidates.length}</span>
                  </div>
                  ${renderAllocateVisitList(candidates)}
                </div>

                <div class="app-resources__detail">
                  ${
                    selected
                      ? `
                        <div class="app-resources__summary ds-card">
                          <div class="ds-section__head">
                            <span class="ds-eyebrow">${escapeHtml(selected.serviceTypeName)}</span>
                            <span class="ds-badge ${escapeHtml(selected.statusBadgeClass)}">${escapeHtml(selected.statusLabel)}</span>
                          </div>
                          <p class="ds-small">
                            <strong>${escapeHtml(selected.clientName)}</strong>
                            · ${escapeHtml(selected.location)}
                            · Técnico: ${escapeHtml(selected.technicianName)}
                          </p>
                          <p class="ds-small app-resources__result-id">ID: ${escapeHtml(selected.id)}</p>
                        </div>

                        ${
                          canEditSelected
                            ? ""
                            : `<p class="ds-small app-resources__locked">Esta visita não pode receber alterações de recursos no status atual.</p>`
                        }

                        ${renderChecklistGroup({
                          name: "allocateResourceIds",
                          legend: "Checklist de recursos",
                          hint: canEditSelected
                            ? "Marque tudo que deve ir nesta visita. Pode salvar vazio para limpar a alocação."
                            : "Somente leitura para esta visita.",
                          options: state.resources,
                          selectedIds: state.allocateSelectedIds,
                          disabled: !canEditSelected,
                        })}

                        ${
                          canEditSelected
                            ? `<div class="app-form__actions">
                                <button
                                  class="ds-btn ds-btn--primary${state.allocateLoading ? " is-loading" : ""}"
                                  type="button"
                                  data-action="save-resources"
                                  ${state.allocateLoading ? "disabled" : ""}
                                >
                                  Salvar alocação
                                </button>
                              </div>`
                            : ""
                        }
                      `
                      : `<p class="app-empty">Selecione uma visita na lista para montar o checklist.</p>`
                  }
                </div>
              </div>
            `
        }
      </section>
    </div>
  `;
}

function currentAppRoute() {
  const hash = window.location.hash || "#visitas";
  if (hash === "#usuarios") {
    return "users";
  }
  if (hash === "#perfil") {
    return "profile";
  }
  if (hash === "#painel") {
    return "dashboard";
  }
  return "visits";
}

function renderPage(root) {
  if (!state.user) {
    document.body.classList.remove("is-modal-open");
    document.body.classList.add("is-login");
    root.innerHTML = renderLoginPage();
    const form = root.querySelector("[data-action='submit-login']");
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      void handleLogin(root);
    });
    return;
  }

  document.body.classList.remove("is-login");
  const route = currentAppRoute();

  if (route === "users") {
    if (!isSupervisor()) {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}#visitas`);
      renderPage(root);
      return;
    }
    state.detailAppointment = null;
    clearVisitDetailPortal();
    document.body.classList.remove("is-modal-open");
    void mountUsersAdmin(root, { currentUserId: state.user.id });
    return;
  }

  if (route === "profile") {
    state.detailAppointment = null;
    clearVisitDetailPortal();
    document.body.classList.remove("is-modal-open");
    void mountProfile(root, {
      user: state.user,
      onUserUpdated: (user) => {
        state.user = user;
        refreshAppShellUser(user);
      },
    });
    return;
  }

  if (route === "dashboard") {
    if (!isSupervisor()) {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}#visitas`);
      renderPage(root);
      return;
    }
    state.detailAppointment = null;
    clearVisitDetailPortal();
    document.body.classList.remove("is-modal-open");
    void mountWeeklyDashboard(root, { user: state.user });
    return;
  }

  const modalOpen =
    state.formOpen ||
    Boolean(state.detailAppointment) ||
    Boolean(state.cancelTarget) ||
    Boolean(state.rescheduleTarget) ||
    Boolean(state.reopenTarget) ||
    Boolean(state.closeTarget);
  document.body.classList.toggle("is-modal-open", modalOpen);

  root.innerHTML = `
    <div class="app-layout app-layout--visits">
      ${renderVisitsSection()}
    </div>
    ${renderFormModal()}
    ${renderCancelModal()}
    ${renderRescheduleModal()}
    ${renderReopenModal()}
    ${renderCloseModal()}
  `;
  paintVisitDetailPortal(state.detailAppointment);

  bindPage(root);
}

function bindResourcesPage(root) {
  bindSelectFields(root);

  const queryInput = root.querySelector("#allocateQuery");
  queryInput?.addEventListener("input", (event) => {
    const caretStart = event.target.selectionStart;
    const caretEnd = event.target.selectionEnd;
    state.allocateQuery = event.target.value;
    state.allocateBanner = null;
    renderPage(root);
    const nextInput = document.getElementById("allocateQuery");
    if (nextInput) {
      nextInput.focus();
      nextInput.setSelectionRange(caretStart ?? nextInput.value.length, caretEnd ?? nextInput.value.length);
    }
  });

  root.querySelector('select[name="allocateStatusFilter"]')?.addEventListener("change", (event) => {
    state.allocateStatusFilter = event.target.value || "all";
    state.allocateBanner = null;
    if (
      state.allocateTargetId &&
      !getAllocateCandidates().some((item) => item.id === state.allocateTargetId)
    ) {
      state.allocateTargetId = "";
      state.allocateSelectedIds = [];
    }
    renderPage(root);
  });

  root
    .querySelector('select[name="allocateServiceTypeFilter"]')
    ?.addEventListener("change", (event) => {
      state.allocateServiceTypeFilter = event.target.value || "all";
      state.allocateBanner = null;
      if (
        state.allocateTargetId &&
        !getAllocateCandidates().some((item) => item.id === state.allocateTargetId)
      ) {
        state.allocateTargetId = "";
        state.allocateSelectedIds = [];
      }
      renderPage(root);
    });
}

function bindForm(root) {
  const form = root.querySelector("#appointment-form");
  if (!form) {
    return;
  }

  if (state.formMode !== "view") {
    bindSelectFields(root);
  }

  form.addEventListener("input", (event) => {
    if (state.formMode === "view") {
      return;
    }
    const field = event.target.name;
    if (field && field in state.values && field !== "serviceTypeId") {
      state.values[field] = event.target.value;
    }
  });

  form.addEventListener("click", (event) => {
    if (state.formMode === "view") {
      return;
    }

    const checklistItem = event.target.closest('[data-checklist="resourceIds"]');
    if (checklistItem) {
      const resourceId = checklistItem.dataset.value;
      state.values.resourceIds = toggleResourceId(state.values.resourceIds, resourceId);
      renderPage(root);
      root.querySelector(`[data-checklist="resourceIds"][data-value="${resourceId}"]`)?.focus();
      return;
    }

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
    if (state.formMode === "view") {
      return;
    }

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

    const wasEditing = state.formMode === "edit";
    const result = wasEditing
      ? await updateAppointment(state.editingId, state.values)
      : await createAppointment(state.values);

    state.loading = false;

    if (!result.success) {
      state.banner = { tone: "danger", message: result.error.message };
      renderPage(root);
      return;
    }

    await loadAppointments();

    if (wasEditing) {
      const refreshed = state.appointments.find((item) => item.id === result.value.id);
      if (refreshed) {
        fillFormFromAppointment(refreshed);
        state.formMode = "view";
        state.errors = {};
        state.banner = {
          tone: "success",
          message: `Visita de ${result.value.clientName} atualizada.`,
        };
        renderPage(root);
        return;
      }
    }

    state.formOpen = false;
    state.formMode = "create";
    state.editingId = null;
    state.viewingCanEdit = false;
    state.values = { ...emptyValues, resourceIds: [] };
    state.errors = {};
    state.banner = {
      tone: "success",
      message: `Visita de ${result.value.clientName} registrada para ${result.value.slotLabel}.`,
    };
    renderPage(root);
  });
}

function bindPage(root) {
  bindForm(root);

  root.querySelector("#rescheduleDate")?.addEventListener("input", (event) => {
    state.rescheduleDate = event.target.value;
  });

  root.querySelector("#rescheduleTime")?.addEventListener("input", (event) => {
    state.rescheduleTime = event.target.value;
  });

  root.querySelector("#rescheduleReason")?.addEventListener("input", (event) => {
    state.rescheduleReason = event.target.value;
  });

  root.querySelector("#reopenReason")?.addEventListener("input", (event) => {
    state.reopenReason = event.target.value;
  });

  root.querySelector("#closeNotes")?.addEventListener("input", (event) => {
    state.closeNotes = event.target.value;
  });

  root.querySelector("#cancelReason")?.addEventListener("input", (event) => {
    state.cancelReason = event.target.value;
  });

  const clientSearch = root.querySelector("#clientFilterQuery");
  clientSearch?.addEventListener("input", (event) => {
    const caretStart = event.target.selectionStart;
    const caretEnd = event.target.selectionEnd;
    state.clientFilterQuery = event.target.value;
    renderPage(root);
    const nextInput = document.getElementById("clientFilterQuery");
    if (nextInput) {
      nextInput.focus();
      nextInput.setSelectionRange(
        caretStart ?? nextInput.value.length,
        caretEnd ?? nextInput.value.length,
      );
    }
  });

  clientSearch?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      state.clientFilterOpen = false;
      state.clientFilterQuery = "";
      renderPage(root);
    }
  });

  root.querySelector("#dateFromFilter")?.addEventListener("change", (event) => {
    state.dateFrom = event.target.value || "";
    state.calendarMonthIndex = 0;
    state.clientFilterOpen = false;
    state.technicianFilterOpen = false;
    state.statusMenuOpen = false;
    renderPage(root);
  });

  root.querySelector("#dateToFilter")?.addEventListener("change", (event) => {
    state.dateTo = event.target.value || "";
    state.calendarMonthIndex = 0;
    state.clientFilterOpen = false;
    state.technicianFilterOpen = false;
    state.statusMenuOpen = false;
    renderPage(root);
  });
}

async function handlePageAction(root, event) {
  const checklistItem = event.target.closest('[data-checklist="allocateResourceIds"]');
  if (checklistItem && root.contains(checklistItem)) {
    const resourceId = checklistItem.dataset.value;
    state.allocateSelectedIds = toggleResourceId(state.allocateSelectedIds, resourceId);
    renderPage(root);
    root
      .querySelector(`[data-checklist="allocateResourceIds"][data-value="${resourceId}"]`)
      ?.focus();
    return;
  }

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

  if (
    state.clientFilterOpen &&
    !event.target.closest(".app-client-filter") &&
    actionEl?.dataset.action !== "set-client-filter" &&
    actionEl?.dataset.action !== "toggle-client-filter"
  ) {
    state.clientFilterOpen = false;
    state.clientFilterQuery = "";
    if (!actionEl || !root.contains(actionEl)) {
      renderPage(root);
      return;
    }
  }

  if (
    state.technicianFilterOpen &&
    !event.target.closest(".app-tech-filter") &&
    actionEl?.dataset.action !== "set-technician-filter" &&
    actionEl?.dataset.action !== "toggle-technician-filter"
  ) {
    state.technicianFilterOpen = false;
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

  if (action === "toggle-client-filter") {
    state.clientFilterOpen = !state.clientFilterOpen;
    state.technicianFilterOpen = false;
    state.statusMenuOpen = false;
    if (!state.clientFilterOpen) {
      state.clientFilterQuery = "";
    }
    renderPage(root);
    if (state.clientFilterOpen) {
      root.querySelector("#clientFilterQuery")?.focus();
    }
    return;
  }

  if (action === "set-client-filter") {
    state.clientFilter = actionEl.dataset.client || "";
    state.clientFilterQuery = "";
    state.clientFilterOpen = false;
    renderPage(root);
    return;
  }

  if (action === "toggle-technician-filter") {
    if (!isSupervisor()) {
      return;
    }
    state.technicianFilterOpen = !state.technicianFilterOpen;
    state.clientFilterOpen = false;
    state.clientFilterQuery = "";
    state.statusMenuOpen = false;
    renderPage(root);
    return;
  }

  if (action === "set-technician-filter") {
    if (!isSupervisor()) {
      return;
    }
    state.technicianFilter = actionEl.dataset.technician || "";
    state.technicianFilterOpen = false;
    renderPage(root);
    return;
  }

  if (action === "clear-date-range") {
    state.dateFrom = "";
    state.dateTo = "";
    state.calendarMonthIndex = 0;
    state.clientFilterOpen = false;
    state.technicianFilterOpen = false;
    state.statusMenuOpen = false;
    renderPage(root);
    return;
  }

  if (action === "toggle-filters-panel") {
    state.filtersOpen = !state.filtersOpen;
    state.clientFilterOpen = false;
    state.clientFilterQuery = "";
    state.technicianFilterOpen = false;
    state.statusMenuOpen = false;
    renderPage(root);
    return;
  }

  if (action === "select-allocate-visit") {
    const appointment = state.appointments.find((item) => item.id === id);
    if (!appointment) {
      return;
    }
    state.allocateTargetId = appointment.id;
    state.allocateSelectedIds = [...(appointment.resourceIds || [])];
    state.allocateBanner = null;
    renderPage(root);
    return;
  }

  if (action === "save-resources") {
    if (!state.allocateTargetId) {
      state.allocateBanner = {
        tone: "danger",
        message: "Selecione a visita para salvar a alocação.",
      };
      renderPage(root);
      return;
    }

    const target = state.appointments.find((item) => item.id === state.allocateTargetId);
    if (!target?.canAllocateResources) {
      state.allocateBanner = {
        tone: "danger",
        message: "Esta visita não pode receber alterações de recursos.",
      };
      renderPage(root);
      return;
    }

    state.allocateLoading = true;
    state.allocateBanner = null;
    renderPage(root);

    const result = await allocateAppointmentResources(
      state.allocateTargetId,
      state.allocateSelectedIds,
    );
    state.allocateLoading = false;

    if (!result.success) {
      state.allocateBanner = { tone: "danger", message: result.error.message };
      renderPage(root);
      return;
    }

    state.allocateBanner = {
      tone: "success",
      message:
        result.value.resourceCount > 0
          ? `Recursos da visita de ${result.value.clientName} atualizados (${result.value.resourceCount}).`
          : `Alocação da visita de ${result.value.clientName} limpa.`,
    };
    await loadAppointments();
    const refreshed = state.appointments.find((item) => item.id === state.allocateTargetId);
    state.allocateSelectedIds = [...(refreshed?.resourceIds || [])];
    renderPage(root);
    return;
  }

  if (action === "toggle-status-menu") {
    state.statusMenuOpen = !state.statusMenuOpen;
    state.clientFilterOpen = false;
    state.clientFilterQuery = "";
    state.technicianFilterOpen = false;
    renderPage(root);
    return;
  }

  if (action === "set-status-filter") {
    toggleStatusFilter(actionEl.dataset.status || "all");
    state.statusMenuOpen = true;
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
    const mode = actionEl.dataset.mode;
    state.viewMode =
      mode === "list" || mode === "calendar" || mode === "month" ? mode : "card";
    if (state.viewMode === "month") {
      const expanded = expandRangeToAppointmentMonths({
        dateFrom: state.dateFrom,
        dateTo: state.dateTo,
        appointments: state.appointments,
      });
      state.dateFrom = expanded.from;
      state.dateTo = expanded.to;
      state.calendarMonthIndex = 0;
    }
    if (state.viewMode !== "calendar" && state.viewMode !== "month") {
      state.detailAppointment = null;
    }
    state.statusMenuOpen = false;
    renderPage(root);
    return;
  }

  if (action === "calendar-month-prev") {
    state.calendarMonthIndex = Math.max(0, state.calendarMonthIndex - 1);
    renderPage(root);
    return;
  }

  if (action === "calendar-month-next") {
    state.calendarMonthIndex += 1;
    renderPage(root);
    return;
  }

  if (action === "calendar-month-goto") {
    const nextIndex = Number(actionEl.dataset.monthIndex);
    if (Number.isFinite(nextIndex)) {
      state.calendarMonthIndex = nextIndex;
      renderPage(root);
    }
    return;
  }

  if (action === "open-new-visit") {
    if (!isSupervisor()) {
      return;
    }
    openNewVisit();
    renderPage(root);
    root.querySelector("#clientName")?.focus();
    return;
  }

  if (action === "toggle-history") {
    state.historyOpen = !state.historyOpen;
    const section = root.querySelector(".app-history");
    const toggle = root.querySelector("#visit-history-title");
    const panel = root.querySelector("#visit-history-panel");
    if (section && toggle && panel) {
      section.classList.toggle("is-open", state.historyOpen);
      toggle.setAttribute("aria-expanded", state.historyOpen ? "true" : "false");
      panel.hidden = !state.historyOpen;
      return;
    }
    renderPage(root);
    return;
  }

  if (action === "attend-visit") {
    const appointment = state.appointments.find((item) => item.id === id);
    if (!canShowAttend(appointment)) {
      return;
    }
    const result = await startAttendance(id);
    if (!result.success) {
      state.banner = {
        tone: "danger",
        message: result.error?.message || "Não foi possível iniciar o atendimento.",
      };
      renderPage(root);
      return;
    }
    const index = state.appointments.findIndex((item) => item.id === result.value.id);
    if (index >= 0) {
      state.appointments[index] = result.value;
    }
    fillFormFromAppointment(result.value);
    state.formOpen = true;
    state.formMode = "view";
    state.banner = {
      tone: "success",
      message: `Atendimento iniciado em ${result.value.attendedAtLabel || "agora"}.`,
    };
    renderPage(root);
    root.querySelector("#postVisitNotes")?.focus();
    return;
  }

  if (action === "save-visit-notes") {
    if (!canEditPostVisitNotes() || !state.editingId) {
      return;
    }
    const notes = String(root.querySelector("#postVisitNotes")?.value ?? "").trim();
    if (notes.length > 500) {
      state.notesError = "As observações pós-visita devem ter no máximo 500 caracteres.";
      renderPage(root);
      return;
    }
    state.notesError = "";
    state.notesSaving = true;
    state.values.postVisitNotes = notes;
    renderPage(root);

    const result = await updateVisitNotes(state.editingId, notes);
    state.notesSaving = false;
    if (!result.success) {
      state.notesError = result.error?.message || "Não foi possível salvar as observações.";
      renderPage(root);
      return;
    }

    const index = state.appointments.findIndex((item) => item.id === result.value.id);
    if (index >= 0) {
      state.appointments[index] = result.value;
    }
    fillFormFromAppointment(result.value);
    state.formMode = "view";
    state.banner = { tone: "success", message: "Observações pós-visita salvas." };
    renderPage(root);
    return;
  }

  if (action === "close-form" || action === "cancel-edit") {
    closeFormModal();
    state.banner = null;
    renderPage(root);
    return;
  }

  if (action === "view-visit") {
    const appointmentId = id || actionEl.dataset.visitOpen;
    const appointment = state.appointments.find((item) => item.id === appointmentId);
    if (!appointment) {
      return;
    }
    if (state.viewMode === "calendar" || state.viewMode === "month") {
      state.detailAppointment = appointment;
      state.statusMenuOpen = false;
      state.clientFilterOpen = false;
      state.technicianFilterOpen = false;
    } else {
      state.detailAppointment = null;
      openView(appointment);
    }
    renderPage(root);
    return;
  }

  if (action === "close-visit-detail") {
    state.detailAppointment = null;
    renderPage(root);
    return;
  }

  if (action === "enable-edit") {
    startEditFromView();
    renderPage(root);
    root.querySelector("#clientName")?.focus();
    return;
  }

  if (action === "discard-edit") {
    discardEditToView();
    renderPage(root);
    return;
  }

  if (action === "close-visit" || action === "open-close") {
    const appointment = state.appointments.find((item) => item.id === id);
    if (!canShowClose(appointment)) {
      return;
    }
    const draftNotes =
      String(root.querySelector("#postVisitNotes")?.value ?? "").trim() ||
      appointment.postVisitNotes ||
      "";
    state.closeTarget = appointment;
    state.closeNotes = draftNotes;
    state.closeError = "";
    state.closeLoading = false;
    renderPage(root);
    root.querySelector("#closeNotes")?.focus();
    return;
  }

  if (action === "dismiss-close") {
    state.closeTarget = null;
    state.closeNotes = "";
    state.closeError = "";
    state.closeLoading = false;
    renderPage(root);
    return;
  }

  if (action === "confirm-close") {
    if (!state.closeTarget) {
      return;
    }

    const notes = String(root.querySelector("#closeNotes")?.value ?? "").trim();
    state.closeNotes = notes;

    if (notes.length > 500) {
      state.closeError = "As observações devem ter no máximo 500 caracteres.";
      renderPage(root);
      root.querySelector("#closeNotes")?.focus();
      return;
    }

    state.closeError = "";
    state.closeLoading = true;
    renderPage(root);

    const targetId = state.closeTarget.id;
    const result = await closeAppointment(targetId, notes);
    state.closeLoading = false;

    if (!result.success) {
      state.closeError = result.error.message;
      renderPage(root);
      root.querySelector("#closeNotes")?.focus();
      return;
    }

    if (state.editingId === targetId) {
      cancelEdit();
    }

    state.closeTarget = null;
    state.closeNotes = "";
    state.banner = {
      tone: "success",
      message: `Visita de ${result.value.clientName} marcada como fechada.`,
    };
    await loadAppointments();
    renderPage(root);
    return;
  }

  if (action === "open-reopen") {
    const appointmentId = id || state.editingId;
    const appointment = state.appointments.find((item) => item.id === appointmentId);
    if (!appointment?.canReopen) {
      return;
    }
    state.reopenTarget = appointment;
    state.reopenReason = "";
    state.reopenError = "";
    state.reopenLoading = false;
    renderPage(root);
    root.querySelector("#reopenReason")?.focus();
    return;
  }

  if (action === "dismiss-reopen") {
    state.reopenTarget = null;
    state.reopenReason = "";
    state.reopenError = "";
    state.reopenLoading = false;
    renderPage(root);
    return;
  }

  if (action === "confirm-reopen") {
    if (!state.reopenTarget) {
      return;
    }

    const reason = String(root.querySelector("#reopenReason")?.value ?? "").trim();
    state.reopenReason = reason;

    if (reason.length < 5) {
      state.reopenError = "Informe o motivo da reabertura (mínimo 5 caracteres).";
      renderPage(root);
      root.querySelector("#reopenReason")?.focus();
      return;
    }

    state.reopenError = "";
    state.reopenLoading = true;
    renderPage(root);

    const targetId = state.reopenTarget.id;
    const result = await reopenAppointment(targetId, reason);
    state.reopenLoading = false;

    if (!result.success) {
      state.reopenError = result.error.message;
      renderPage(root);
      root.querySelector("#reopenReason")?.focus();
      return;
    }

    state.reopenTarget = null;
    state.reopenReason = "";
    const outcomeLabel = result.value.status === "rebooked" ? "remarcada" : "reaberta";
    state.banner = {
      tone: "success",
      message: `Visita de ${result.value.clientName} marcada como ${outcomeLabel}. Agora você pode editar ou reagendar.`,
    };
    await loadAppointments();

    if (state.formOpen && state.editingId === targetId) {
      const updated = state.appointments.find((item) => item.id === targetId);
      if (updated) {
        openView(updated);
      }
    }

    renderPage(root);
    return;
  }

  if (action === "open-reschedule") {
    const appointmentId = id || state.editingId;
    const appointment = state.appointments.find((item) => item.id === appointmentId);
    if (!appointment?.canReschedule) {
      return;
    }
    state.rescheduleTarget = appointment;
    state.rescheduleDate = appointment.date || "";
    state.rescheduleTime = appointment.time || "";
    state.rescheduleReason = "";
    state.rescheduleError = "";
    state.rescheduleLoading = false;
    renderPage(root);
    root.querySelector("#rescheduleDate")?.focus();
    return;
  }

  if (action === "dismiss-reschedule") {
    state.rescheduleTarget = null;
    state.rescheduleDate = "";
    state.rescheduleTime = "";
    state.rescheduleReason = "";
    state.rescheduleError = "";
    state.rescheduleLoading = false;
    renderPage(root);
    return;
  }

  if (action === "confirm-reschedule") {
    if (!state.rescheduleTarget) {
      return;
    }

    const date = String(root.querySelector("#rescheduleDate")?.value ?? "").trim();
    const time = String(root.querySelector("#rescheduleTime")?.value ?? "").trim();
    const reason = String(root.querySelector("#rescheduleReason")?.value ?? "").trim();
    state.rescheduleDate = date;
    state.rescheduleTime = time;
    state.rescheduleReason = reason;

    if (!date || !time) {
      state.rescheduleError = "Informe a nova data e o horário.";
      renderPage(root);
      root.querySelector("#rescheduleDate")?.focus();
      return;
    }

    if (reason.length < 5) {
      state.rescheduleError = "Informe o motivo do reagendamento (mínimo 5 caracteres).";
      renderPage(root);
      root.querySelector("#rescheduleReason")?.focus();
      return;
    }

    state.rescheduleError = "";
    state.rescheduleLoading = true;
    renderPage(root);

    const targetId = state.rescheduleTarget.id;
    const result = await rescheduleAppointment(targetId, { date, time, reason });
    state.rescheduleLoading = false;

    if (!result.success) {
      state.rescheduleError = result.error.message;
      renderPage(root);
      root.querySelector("#rescheduleReason")?.focus();
      return;
    }

    state.rescheduleTarget = null;
    state.rescheduleDate = "";
    state.rescheduleTime = "";
    state.rescheduleReason = "";
    state.banner = {
      tone: "success",
      message: `Visita de ${result.value.clientName} reagendada para ${result.value.slotLabel}.`,
    };
    await loadAppointments();

    if (state.formOpen && state.editingId === targetId) {
      const updated = state.appointments.find((item) => item.id === targetId);
      if (updated) {
        openView(updated);
      }
    }

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
  const [technicians, serviceTypes, resources] = await Promise.all([
    fetchTechnicians(),
    fetchServiceTypes(),
    fetchResources(),
  ]);

  if (!technicians.success || !serviceTypes.success || !resources.success) {
    state.banner = {
      tone: "danger",
      message: "Não foi possível carregar o catálogo (técnicos, serviços ou recursos).",
    };
    return;
  }

  state.technicians = technicians.value;
  state.serviceTypes = serviceTypes.value;
  state.resources = resources.value;
}

async function loadAppointments() {
  const result = await fetchAppointments();
  if (result.success) {
    state.appointments = result.value;
    return;
  }
  if (result.status === 401) {
    state.user = null;
  }
}

async function handleLogin(root) {
  const username = String(root.querySelector("#loginUsername")?.value ?? "").trim();
  const password = String(root.querySelector("#loginPassword")?.value ?? "");
  state.loginUsername = username;
  state.loginPassword = password;
  state.loginError = "";
  state.loginLoading = true;
  renderPage(root);

  const result = await loginRequest(username, password);
  state.loginLoading = false;

  if (!result.success) {
    state.loginError = result.error?.message || "Não foi possível entrar.";
    state.loginPassword = "";
    renderPage(root);
    root.querySelector("#loginPassword")?.focus();
    return;
  }

  state.user = result.value.user;
  state.loginPassword = "";
  state.statusFilter = [];
  state.clientFilter = "";
  state.clientFilterQuery = "";
  state.clientFilterOpen = false;
  state.technicianFilter = "";
  state.technicianFilterOpen = false;
  state.dateFrom = "";
  state.dateTo = "";
  state.banner = {
    tone: "success",
    message: `Olá, ${state.user.displayName} (${roleLabel(state.user.role)}).`,
  };
  await startAuthenticatedApp();
}

async function handleLogout() {
  await logoutRequest();
  state.user = null;
  state.appointments = [];
  state.formOpen = false;
  state.statusFilter = [];
  state.clientFilter = "";
  state.clientFilterQuery = "";
  state.clientFilterOpen = false;
  state.technicianFilter = "";
  state.technicianFilterOpen = false;
  state.dateFrom = "";
  state.dateTo = "";
  state.banner = null;
  document.getElementById("app-shell").innerHTML = "";
  renderPage(document.getElementById("app-page"));
}

async function startAuthenticatedApp() {
  const shell = document.getElementById("app-shell");
  const page = document.getElementById("app-page");
  mountAppShell(shell, {
    user: state.user,
    onLogout: () => {
      void handleLogout();
    },
  });
  await loadCatalog();
  await loadAppointments();
  renderPage(page);
}

function boot() {
  const shell = document.getElementById("app-shell");
  const page = document.getElementById("app-page");

  if (
    !window.location.hash ||
    window.location.hash === "#agendar" ||
    window.location.hash === "#recursos"
  ) {
    const openForm = window.location.hash === "#agendar";
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}#visitas`);
    if (openForm && isSupervisor()) {
      openNewVisit();
    }
  }

  page.addEventListener("click", (event) => {
    void handlePageAction(page, event);
  });
  document.addEventListener("click", (event) => {
    const closeEl = event.target.closest("[data-action='close-visit-detail']");
    if (!(closeEl instanceof HTMLElement) || !state.detailAppointment) {
      return;
    }
    // Portal fica fora de #app-page; fecha a modal de detalhe do calendário.
    if (window.location.hash === "#painel") {
      return;
    }
    state.detailAppointment = null;
    renderPage(page);
  });
  window.addEventListener("hashchange", () => {
    if (!state.user) {
      renderPage(page);
      return;
    }
    if (window.location.hash === "#agendar") {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}#visitas`);
      if (isSupervisor()) {
        openNewVisit();
      }
    }
    if (window.location.hash === "#recursos") {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}#visitas`);
    }
    if (window.location.hash === "#usuarios" && !isSupervisor()) {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}#visitas`);
    }
    renderPage(page);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    if (state.detailAppointment) {
      state.detailAppointment = null;
      renderPage(page);
      return;
    }
    if (state.cancelTarget) {
      state.cancelTarget = null;
      state.cancelReason = "";
      state.cancelError = "";
      state.cancelLoading = false;
      renderPage(page);
      return;
    }
    if (state.formOpen) {
      closeFormModal();
      state.banner = null;
      renderPage(page);
    }
  });

  void (async () => {
    const me = await fetchCurrentUser();
    state.authChecked = true;
    if (me.success) {
      state.user = me.value.user;
      await startAuthenticatedApp();
      return;
    }
    shell.innerHTML = "";
    renderPage(page);
  })();
}

boot();
