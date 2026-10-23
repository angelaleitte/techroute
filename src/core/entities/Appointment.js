import { fail, ok } from "../common/Result.js";
import { ClientLocation } from "../value-objects/ClientLocation.js";
import { EmailAddress } from "../value-objects/EmailAddress.js";
import { PhoneNumber } from "../value-objects/PhoneNumber.js";
import { VisitSlot } from "../value-objects/VisitSlot.js";
import { VISIT_STATUS, VisitStatus } from "../value-objects/VisitStatus.js";

function normalizePhoneValue(phone) {
  if (phone instanceof PhoneNumber) {
    return phone.value;
  }
  if (phone == null || phone === "") {
    return "";
  }
  return String(phone).trim();
}

function normalizeEmailValue(email) {
  if (email instanceof EmailAddress) {
    return email.value;
  }
  if (email == null || email === "") {
    return "";
  }
  return String(email).trim().toLowerCase();
}

export class Appointment {
  static create({
    id,
    clientName,
    location,
    phone,
    phoneSecondary = "",
    email,
    slot,
    technicianId,
    serviceTypeId,
    notes = "",
    resourceIds = [],
    status = VISIT_STATUS.OPEN,
    cancellationReason = "",
    cancelledAt = null,
    rescheduleReason = "",
    rescheduledAt = null,
    createdAt,
    updatedAt = null,
  }) {
    const normalizedName = String(clientName ?? "").trim().replace(/\s+/g, " ");
    const normalizedNotes = String(notes ?? "").trim();
    const normalizedResources = Array.isArray(resourceIds) ? [...resourceIds] : [];
    const normalizedReason = String(cancellationReason ?? "").trim();
    const normalizedRescheduleReason = String(rescheduleReason ?? "").trim();

    if (!id) {
      return fail("APPOINTMENT_INVARIANT", "Visita precisa de identificação.");
    }

    if (normalizedName.length < 3) {
      return fail("APPOINTMENT_INVARIANT", "Visita precisa do nome do cliente.");
    }

    if (!(location instanceof ClientLocation)) {
      return fail("APPOINTMENT_INVARIANT", "Visita precisa de localização válida.");
    }

    const primaryPhone = normalizePhoneValue(phone);
    if (!primaryPhone) {
      return fail("APPOINTMENT_INVARIANT", "Visita precisa de um telefone de contato.");
    }

    const secondaryPhone = normalizePhoneValue(phoneSecondary);
    const clientEmail = normalizeEmailValue(email);

    if (!clientEmail) {
      return fail("APPOINTMENT_INVARIANT", "Visita precisa do e-mail do cliente.");
    }

    if (!(slot instanceof VisitSlot)) {
      return fail("APPOINTMENT_INVARIANT", "Visita precisa de data e horário.");
    }

    if (!technicianId) {
      return fail("APPOINTMENT_INVARIANT", "Uma visita sem técnico não existe.");
    }

    if (!serviceTypeId) {
      return fail("APPOINTMENT_INVARIANT", "Uma visita sem tipo de serviço não existe.");
    }

    if (normalizedNotes.length > 500) {
      return fail("APPOINTMENT_INVARIANT", "As observações devem ter no máximo 500 caracteres.");
    }

    if (!createdAt) {
      return fail("APPOINTMENT_INVARIANT", "Visita precisa de data de criação.");
    }

    const statusResult = VisitStatus.create(status);
    if (!statusResult.success) {
      return statusResult;
    }

    const visitStatus = statusResult.value;

    if (visitStatus.isCancelled()) {
      if (normalizedReason.length < 5) {
        return fail(
          "APPOINTMENT_INVARIANT",
          "Visita cancelada precisa de motivo com no mínimo 5 caracteres.",
        );
      }
      if (!cancelledAt) {
        return fail("APPOINTMENT_INVARIANT", "Visita cancelada precisa da data do cancelamento.");
      }
    } else if (normalizedReason || cancelledAt) {
      return fail(
        "APPOINTMENT_INVARIANT",
        "Motivo de cancelamento só se aplica a visitas canceladas.",
      );
    }

    return ok(
      new Appointment({
        id,
        clientName: normalizedName,
        location,
        phone: primaryPhone,
        phoneSecondary: secondaryPhone,
        email: clientEmail,
        slot,
        technicianId,
        serviceTypeId,
        notes: normalizedNotes,
        resourceIds: normalizedResources,
        status: visitStatus,
        cancellationReason: visitStatus.isCancelled() ? normalizedReason : "",
        cancelledAt: visitStatus.isCancelled() ? cancelledAt : null,
        rescheduleReason: normalizedRescheduleReason,
        rescheduledAt: normalizedRescheduleReason ? rescheduledAt : null,
        createdAt,
        updatedAt,
      }),
    );
  }

  constructor(props) {
    this.id = props.id;
    this.clientName = props.clientName;
    this.location = props.location;
    this.phone = props.phone;
    this.phoneSecondary = props.phoneSecondary;
    this.email = props.email;
    this.slot = props.slot;
    this.technicianId = props.technicianId;
    this.serviceTypeId = props.serviceTypeId;
    this.notes = props.notes;
    this.resourceIds = Object.freeze([...props.resourceIds]);
    this.status = props.status;
    this.cancellationReason = props.cancellationReason;
    this.cancelledAt = props.cancelledAt;
    this.rescheduleReason = props.rescheduleReason;
    this.rescheduledAt = props.rescheduledAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    Object.freeze(this);
  }

  toProps() {
    return {
      id: this.id,
      clientName: this.clientName,
      location: this.location,
      phone: this.phone,
      phoneSecondary: this.phoneSecondary,
      email: this.email,
      slot: this.slot,
      technicianId: this.technicianId,
      serviceTypeId: this.serviceTypeId,
      notes: this.notes,
      resourceIds: [...this.resourceIds],
      status: this.status.value,
      cancellationReason: this.cancellationReason,
      cancelledAt: this.cancelledAt,
      rescheduleReason: this.rescheduleReason,
      rescheduledAt: this.rescheduledAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  resolveDisplayStatus(now = new Date()) {
    // Sempre prioriza o último status persistido (reaberta/remarcada/fechada/cancelada).
    if (this.status.isCancelled()) {
      return "cancelled";
    }
    if (this.status.isClosed()) {
      return "closed";
    }
    if (this.status.isReopened()) {
      return "reopened";
    }
    if (this.status.isRebooked()) {
      return "rebooked";
    }

    const slotDate = new Date(`${this.slot.date}T${this.slot.time}:00`);
    if (!Number.isNaN(slotDate.getTime()) && slotDate.getTime() < now.getTime()) {
      return "late";
    }

    return "open";
  }

  updateDetails({
    clientName,
    location,
    phone,
    phoneSecondary,
    email,
    slot,
    technicianId,
    serviceTypeId,
    notes,
    resourceIds,
    updatedAt,
  }) {
    if (!this.status.allowsChanges()) {
      return fail(
        "APPOINTMENT_INVALID_STATE",
        this.status.isCancelled()
          ? "Visita cancelada não pode ser alterada. Reabra a visita primeiro."
          : "Visita fechada não pode ser alterada. Reabra a visita primeiro.",
      );
    }

    return Appointment.create({
      ...this.toProps(),
      clientName: clientName ?? this.clientName,
      location: location ?? this.location,
      phone: phone ?? this.phone,
      phoneSecondary: phoneSecondary ?? this.phoneSecondary,
      email: email ?? this.email,
      slot: slot ?? this.slot,
      technicianId: technicianId ?? this.technicianId,
      serviceTypeId: serviceTypeId ?? this.serviceTypeId,
      notes: notes ?? this.notes,
      resourceIds: resourceIds ?? this.resourceIds,
      updatedAt: updatedAt ?? this.updatedAt,
    });
  }

  allocateResources(resourceIds, updatedAt) {
    if (!this.status.allowsChanges()) {
      return fail(
        "APPOINTMENT_INVALID_STATE",
        this.status.isCancelled()
          ? "Visita cancelada não pode receber recursos."
          : "Visita fechada não pode receber recursos.",
      );
    }

    const normalizedResources = Array.isArray(resourceIds) ? [...resourceIds] : [];

    return Appointment.create({
      ...this.toProps(),
      resourceIds: normalizedResources,
      updatedAt: updatedAt ?? this.updatedAt,
    });
  }

  close(closedAt, observation) {
    if (!this.status.allowsChanges()) {
      return fail(
        "APPOINTMENT_INVALID_STATE",
        this.status.isCancelled()
          ? "Visita cancelada não pode ser concluída."
          : "Visita já está fechada.",
      );
    }
    if (!closedAt) {
      return fail("APPOINTMENT_INVARIANT", "Informe a data da conclusão.");
    }

    let nextNotes = this.notes;
    if (observation !== undefined && observation !== null) {
      const normalizedObservation = String(observation).trim();
      if (normalizedObservation.length > 500) {
        return fail("VALIDATION_ERROR", "As observações devem ter no máximo 500 caracteres.");
      }
      if (normalizedObservation) {
        nextNotes = normalizedObservation;
      }
    }

    return Appointment.create({
      ...this.toProps(),
      notes: nextNotes,
      status: VISIT_STATUS.CLOSED,
      cancellationReason: "",
      cancelledAt: null,
      updatedAt: closedAt,
    });
  }

  cancel(reason, cancelledAt) {
    if (!this.status.allowsChanges()) {
      return fail(
        "APPOINTMENT_INVALID_STATE",
        this.status.isCancelled()
          ? "Visita já está cancelada."
          : "Visita fechada não pode ser cancelada.",
      );
    }

    const normalizedReason = String(reason ?? "").trim();
    if (normalizedReason.length < 5) {
      return fail(
        "VALIDATION_ERROR",
        "Informe o motivo do cancelamento (mínimo 5 caracteres).",
      );
    }
    if (normalizedReason.length > 500) {
      return fail("VALIDATION_ERROR", "O motivo deve ter no máximo 500 caracteres.");
    }
    if (!cancelledAt) {
      return fail("APPOINTMENT_INVARIANT", "Informe a data do cancelamento.");
    }

    return Appointment.create({
      ...this.toProps(),
      status: VISIT_STATUS.CANCELLED,
      cancellationReason: normalizedReason,
      cancelledAt,
      updatedAt: cancelledAt,
    });
  }

  reopen(reason, reopenedAt) {
    if (!this.status.canReopen()) {
      return fail(
        "APPOINTMENT_INVALID_STATE",
        "Somente visitas canceladas ou fechadas podem ser reabertas.",
      );
    }

    const normalizedReason = String(reason ?? "").trim();
    if (normalizedReason.length < 5) {
      return fail(
        "VALIDATION_ERROR",
        "Informe o motivo da reabertura (mínimo 5 caracteres).",
      );
    }
    if (normalizedReason.length > 500) {
      return fail("VALIDATION_ERROR", "O motivo deve ter no máximo 500 caracteres.");
    }
    if (!reopenedAt) {
      return fail("APPOINTMENT_INVARIANT", "Informe a data da reabertura.");
    }

    const nextStatus = this.status.isCancelled()
      ? VISIT_STATUS.REBOOKED
      : VISIT_STATUS.REOPENED;

    return Appointment.create({
      ...this.toProps(),
      status: nextStatus,
      cancellationReason: "",
      cancelledAt: null,
      updatedAt: reopenedAt,
    });
  }

  reschedule({ date, time, reason }, rescheduledAt) {
    if (!this.status.allowsChanges()) {
      return fail(
        "APPOINTMENT_INVALID_STATE",
        this.status.isCancelled()
          ? "Visita cancelada não pode ser reagendada. Reabra a visita primeiro."
          : "Visita fechada não pode ser reagendada.",
      );
    }

    const normalizedReason = String(reason ?? "").trim();
    if (normalizedReason.length < 5) {
      return fail(
        "VALIDATION_ERROR",
        "Informe o motivo do reagendamento (mínimo 5 caracteres).",
      );
    }
    if (normalizedReason.length > 500) {
      return fail("VALIDATION_ERROR", "O motivo deve ter no máximo 500 caracteres.");
    }
    if (!rescheduledAt) {
      return fail("APPOINTMENT_INVARIANT", "Informe a data do reagendamento.");
    }

    const slotResult = VisitSlot.create(date, time);
    if (!slotResult.success) {
      return slotResult;
    }

    const nextSlot = slotResult.value;
    if (nextSlot.equals(this.slot)) {
      return fail(
        "VALIDATION_ERROR",
        "Informe uma nova data ou horário diferente do atual.",
      );
    }

    return Appointment.create({
      ...this.toProps(),
      slot: nextSlot,
      rescheduleReason: normalizedReason,
      rescheduledAt,
      updatedAt: rescheduledAt,
    });
  }
}
