import { randomUUID } from "node:crypto";
import { fail, ok } from "../../core/common/Result.js";
import {
  APPOINTMENT_EVENT_TYPE,
  AppointmentEvent,
} from "../../core/entities/AppointmentEvent.js";
import { actorFromUser } from "../common/actor.js";
import { toAppointmentViewModel } from "../view-models/mappers.js";

export class CloseAppointmentService {
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

  execute(id, rawInput = {}, actor = null) {
    const appointmentId = String(id ?? "").trim();
    if (!appointmentId) {
      return fail("VALIDATION_ERROR", "Informe a visita a concluir.");
    }

    const observation = String(
      rawInput.postVisitNotes ?? rawInput.notes ?? rawInput.observation ?? "",
    ).trim();
    const existing = this.appointmentRepository.findById(appointmentId);
    if (!existing) {
      return fail("APPOINTMENT_NOT_FOUND", "Visita não encontrada.");
    }

    if (actor?.role === "technician") {
      if (actor.technicianId !== existing.technicianId) {
        return fail("FORBIDDEN", "Você só pode concluir visitas atribuídas a você.");
      }
      if (!existing.status.isInProgress()) {
        return fail(
          "APPOINTMENT_INVALID_STATE",
          "Inicie o atendimento (Atender) antes de concluir a visita.",
        );
      }
    }

    const at = this.now().toISOString();
    const closedResult = existing.close(at, observation);
    if (!closedResult.success) {
      return closedResult;
    }

    const closed = closedResult.value;
    const { userId, actorName } = actorFromUser(actor);
    const event = new AppointmentEvent({
      id: this.createId(),
      appointmentId: closed.id,
      eventType: APPOINTMENT_EVENT_TYPE.CLOSED,
      reason: observation,
      fromDate: null,
      fromTime: null,
      toDate: closed.slot.date,
      toTime: closed.slot.time,
      userId,
      actorName,
      createdAt: at,
    });

    const saved = this.appointmentRepository.update(closed, event);
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
