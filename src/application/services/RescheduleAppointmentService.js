import { randomUUID } from "node:crypto";
import { fail, ok } from "../../core/common/Result.js";
import {
  APPOINTMENT_EVENT_TYPE,
  AppointmentEvent,
} from "../../core/entities/AppointmentEvent.js";
import { toAppointmentViewModel } from "../view-models/mappers.js";

export class RescheduleAppointmentService {
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
      return fail("VALIDATION_ERROR", "Informe a visita a reagendar.");
    }

    const date = String(rawInput.date ?? "").trim();
    const time = String(rawInput.time ?? "").trim();
    const reason = String(rawInput.reason ?? rawInput.rescheduleReason ?? "").trim();

    const existing = this.appointmentRepository.findById(appointmentId);
    if (!existing) {
      return fail("APPOINTMENT_NOT_FOUND", "Visita não encontrada.");
    }

    const previousSlot = existing.slot;
    const at = this.now().toISOString();
    const rescheduledResult = existing.reschedule({ date, time, reason }, at);
    if (!rescheduledResult.success) {
      return rescheduledResult;
    }

    const savedAppointment = rescheduledResult.value;
    const event = new AppointmentEvent({
      id: this.createId(),
      appointmentId: savedAppointment.id,
      eventType: APPOINTMENT_EVENT_TYPE.RESCHEDULED,
      reason,
      fromDate: previousSlot.date,
      fromTime: previousSlot.time,
      toDate: savedAppointment.slot.date,
      toTime: savedAppointment.slot.time,
      createdAt: at,
    });

    const saved = this.appointmentRepository.update(savedAppointment, event);
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
