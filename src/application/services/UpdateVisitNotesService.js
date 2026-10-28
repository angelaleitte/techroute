import { fail, ok } from "../../core/common/Result.js";
import { toAppointmentViewModel } from "../view-models/mappers.js";

export class UpdateVisitNotesService {
  constructor({
    appointmentRepository,
    technicianRepository,
    serviceTypeRepository,
    resourceRepository,
    now = () => new Date(),
  }) {
    this.appointmentRepository = appointmentRepository;
    this.technicianRepository = technicianRepository;
    this.serviceTypeRepository = serviceTypeRepository;
    this.resourceRepository = resourceRepository;
    this.now = now;
  }

  execute(appointmentId, { postVisitNotes, notes } = {}, actor = null) {
    const existing = this.appointmentRepository.findById(appointmentId);
    if (!existing) {
      return fail("APPOINTMENT_NOT_FOUND", "Visita não encontrada.");
    }

    if (actor?.role === "technician" && actor.technicianId !== existing.technicianId) {
      return fail("FORBIDDEN", "Você só pode anotar visitas atribuídas a você.");
    }

    const value =
      postVisitNotes !== undefined ? postVisitNotes : notes !== undefined ? notes : "";

    const updatedResult = existing.updatePostVisitNotes(value, this.now().toISOString());
    if (!updatedResult.success) {
      return updatedResult;
    }

    this.appointmentRepository.update(updatedResult.value);

    return ok(
      toAppointmentViewModel(updatedResult.value, {
        technician: this.technicianRepository.findById(updatedResult.value.technicianId),
        serviceType: this.serviceTypeRepository.findById(updatedResult.value.serviceTypeId),
        resources: this.resourceRepository.findByIds(updatedResult.value.resourceIds),
        events: this.appointmentRepository.listEventsByAppointmentId(updatedResult.value.id),
        now: this.now(),
      }),
    );
  }
}
