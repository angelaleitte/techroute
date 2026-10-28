import { randomUUID } from "node:crypto";
import { fail, ok } from "../../core/common/Result.js";
import {
  APPOINTMENT_EVENT_TYPE,
  AppointmentEvent,
} from "../../core/entities/AppointmentEvent.js";
import { actorFromUser } from "../common/actor.js";
import { toAppointmentViewModel } from "../view-models/mappers.js";

export class StartAttendanceService {
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

  execute(id, actor = null) {
    const appointmentId = String(id ?? "").trim();
    if (!appointmentId) {
      return fail("VALIDATION_ERROR", "Informe a visita a atender.");
    }

    const existing = this.appointmentRepository.findById(appointmentId);
    if (!existing) {
      return fail("APPOINTMENT_NOT_FOUND", "Visita não encontrada.");
    }

    if (actor?.role === "technician" && actor.technicianId !== existing.technicianId) {
      return fail("FORBIDDEN", "Você só pode atender visitas atribuídas a você.");
    }

    const at = this.now().toISOString();
    const startedResult = existing.startAttendance(at);
    if (!startedResult.success) {
      return startedResult;
    }

    const { userId, actorName } = actorFromUser(actor);
    const event = new AppointmentEvent({
      id: this.createId(),
      appointmentId: startedResult.value.id,
      eventType: APPOINTMENT_EVENT_TYPE.ATTENDED,
      reason: "Início do atendimento",
      fromDate: null,
      fromTime: null,
      toDate: startedResult.value.slot.date,
      toTime: startedResult.value.slot.time,
      userId,
      actorName,
      createdAt: at,
    });

    const saved = this.appointmentRepository.update(startedResult.value, event);
    if (!saved) {
      return fail("APPOINTMENT_NOT_FOUND", "Visita não encontrada.");
    }

    return ok(
      toAppointmentViewModel(saved, {
        technician: this.technicianRepository.findById(saved.technicianId),
        serviceType: this.serviceTypeRepository.findById(saved.serviceTypeId),
        resources: this.resourceRepository.findByIds(saved.resourceIds),
        events: this.appointmentRepository.listEventsByAppointmentId(saved.id),
        now: this.now(),
      }),
    );
  }
}
