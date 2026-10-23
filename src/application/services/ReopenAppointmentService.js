import { randomUUID } from "node:crypto";
import { fail, ok } from "../../core/common/Result.js";
import {
  APPOINTMENT_EVENT_TYPE,
  AppointmentEvent,
} from "../../core/entities/AppointmentEvent.js";
import { toAppointmentViewModel } from "../view-models/mappers.js";

export class ReopenAppointmentService {
  constructor({
    appointmentRepository,
    technicianRepository,
    serviceTypeRepository,
    resourceRepository,
    now = () => new Date(),
    createId = () => randomUUID(),
  }) {
    this.appointmentRepository = appointmentRepository;
    this.technicianRepository = technicianRepository;
    this.serviceTypeRepository = serviceTypeRepository;
    this.resourceRepository = resourceRepository;
    this.now = now;
    this.createId = createId;
  }

  execute(id, rawInput = {}) {
    const appointmentId = String(id ?? "").trim();
    if (!appointmentId) {
      return fail("VALIDATION_ERROR", "Informe a visita a reabrir.");
    }

    const reason = String(rawInput.reason ?? rawInput.reopenReason ?? "").trim();
    const existing = this.appointmentRepository.findById(appointmentId);
    if (!existing) {
      return fail("APPOINTMENT_NOT_FOUND", "Visita não encontrada.");
    }

    const at = this.now().toISOString();
    const reopenedResult = existing.reopen(reason, at);
    if (!reopenedResult.success) {
      return reopenedResult;
    }

    const reopened = reopenedResult.value;
    const eventType = reopened.status.isRebooked()
      ? APPOINTMENT_EVENT_TYPE.REBOOKED
      : APPOINTMENT_EVENT_TYPE.REOPENED;
    const event = new AppointmentEvent({
      id: this.createId(),
      appointmentId: reopened.id,
      eventType,
      reason,
      fromDate: null,
      fromTime: null,
      toDate: reopened.slot.date,
      toTime: reopened.slot.time,
      createdAt: at,
    });

    const saved = this.appointmentRepository.update(reopened, event);
    if (!saved) {
      return fail("APPOINTMENT_NOT_FOUND", "Visita não encontrada.");
    }

    const technician = this.technicianRepository.findById(saved.technicianId);
    const serviceType = this.serviceTypeRepository.findById(saved.serviceTypeId);
    const resources = this.resourceRepository.findByIds(saved.resourceIds);
    const events = this.appointmentRepository.listEventsByAppointmentId(saved.id);

    return ok(
      toAppointmentViewModel(saved, {
        technician,
        serviceType,
        resources,
        events,
        now: this.now(),
      }),
    );
  }
}
