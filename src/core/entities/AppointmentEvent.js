export const APPOINTMENT_EVENT_TYPE = Object.freeze({
  CREATED: "created",
  RESCHEDULED: "rescheduled",
  CANCELLED: "cancelled",
  CLOSED: "closed",
  REOPENED: "reopened",
  REBOOKED: "rebooked",
});

const LABELS = Object.freeze({
  created: "Criada",
  rescheduled: "Reagendada",
  cancelled: "Cancelada",
  closed: "Concluída",
  reopened: "Reaberta",
  rebooked: "Remarcada",
});

const BADGES = Object.freeze({
  created: "ds-badge--info",
  rescheduled: "ds-badge--info",
  cancelled: "ds-badge--danger",
  closed: "ds-badge--closed",
  reopened: "ds-badge--info",
  rebooked: "ds-badge--info",
});

export class AppointmentEvent {
  static labelFor(type) {
    return LABELS[type] ?? type;
  }

  static badgeClassFor(type) {
    return BADGES[type] ?? "ds-badge--subtle";
  }

  constructor({
    id,
    appointmentId,
    eventType,
    reason = "",
    fromDate = null,
    fromTime = null,
    toDate = null,
    toTime = null,
    createdAt,
  }) {
    this.id = id;
    this.appointmentId = appointmentId;
    this.eventType = eventType;
    this.reason = reason;
    this.fromDate = fromDate;
    this.fromTime = fromTime;
    this.toDate = toDate;
    this.toTime = toTime;
    this.createdAt = createdAt;
    Object.freeze(this);
  }
}
