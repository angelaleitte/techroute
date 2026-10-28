import { fail, ok } from "../common/Result.js";

export const VISIT_STATUS = Object.freeze({
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  CLOSED: "closed",
  CANCELLED: "cancelled",
  REOPENED: "reopened",
  REBOOKED: "rebooked",
});

const LABELS = Object.freeze({
  open: "Aberta",
  in_progress: "Em atendimento",
  closed: "Fechada",
  cancelled: "Cancelada",
  reopened: "Reaberta",
  rebooked: "Remarcada",
  late: "Atrasada",
});

const BADGES = Object.freeze({
  open: "ds-badge--info",
  in_progress: "ds-badge--warning",
  closed: "ds-badge--closed",
  cancelled: "ds-badge--danger",
  reopened: "ds-badge--info",
  rebooked: "ds-badge--info",
  late: "ds-badge--warning",
});

const ALLOWED = new Set(Object.values(VISIT_STATUS));

export class VisitStatus {
  static create(value = VISIT_STATUS.OPEN) {
    const normalized = String(value ?? "").trim().toLowerCase();

    if (!ALLOWED.has(normalized)) {
      return fail("INVALID_STATUS", "Status de visita inválido.");
    }

    return ok(new VisitStatus(normalized));
  }

  static labelFor(code) {
    return LABELS[code] ?? code;
  }

  static badgeClassFor(code) {
    return BADGES[code] ?? "ds-badge--subtle";
  }

  constructor(value) {
    this.value = value;
    Object.freeze(this);
  }

  get label() {
    return LABELS[this.value];
  }

  equals(other) {
    return other instanceof VisitStatus && other.value === this.value;
  }

  isOpen() {
    return this.value === VISIT_STATUS.OPEN;
  }

  isInProgress() {
    return this.value === VISIT_STATUS.IN_PROGRESS;
  }

  isClosed() {
    return this.value === VISIT_STATUS.CLOSED;
  }

  isCancelled() {
    return this.value === VISIT_STATUS.CANCELLED;
  }

  isReopened() {
    return this.value === VISIT_STATUS.REOPENED;
  }

  isRebooked() {
    return this.value === VISIT_STATUS.REBOOKED;
  }

  allowsChanges() {
    return this.isOpen() || this.isReopened() || this.isRebooked() || this.isInProgress();
  }

  canStartAttendance() {
    return this.isOpen() || this.isReopened() || this.isRebooked();
  }

  canReopen() {
    return this.isCancelled() || this.isClosed();
  }
}
