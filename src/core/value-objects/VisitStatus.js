import { fail, ok } from "../common/Result.js";

export const VISIT_STATUS = Object.freeze({
  OPEN: "open",
  CLOSED: "closed",
  CANCELLED: "cancelled",
});

const LABELS = Object.freeze({
  open: "Aberta",
  closed: "Fechada",
  cancelled: "Cancelada",
  late: "Atrasada",
});

const BADGES = Object.freeze({
  open: "ds-badge--info",
  closed: "ds-badge--success",
  cancelled: "ds-badge--danger",
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

  isClosed() {
    return this.value === VISIT_STATUS.CLOSED;
  }

  isCancelled() {
    return this.value === VISIT_STATUS.CANCELLED;
  }

  allowsChanges() {
    return this.isOpen();
  }
}
