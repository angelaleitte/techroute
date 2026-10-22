import { fail, ok } from "../../core/common/Result.js";
import { toAppointmentViewModel } from "../view-models/mappers.js";

export class CloseAppointmentService {
  constructor({
    appointmentRepository,
    technicianRepository,
    serviceTypeRepository,
    now = () => new Date(),
  }) {
    this.appointmentRepository = appointmentRepository;
    this.technicianRepository = technicianRepository;
    this.serviceTypeRepository = serviceTypeRepository;
    this.now = now;
  }

  execute(id) {
    const appointmentId = String(id ?? "").trim();
    if (!appointmentId) {
      return fail("VALIDATION_ERROR", "Informe a visita a concluir.");
    }

    const existing = this.appointmentRepository.findById(appointmentId);
    if (!existing) {
      return fail("APPOINTMENT_NOT_FOUND", "Visita não encontrada.");
    }

    const closedResult = existing.close(this.now().toISOString());
    if (!closedResult.success) {
      return closedResult;
    }

    const saved = this.appointmentRepository.update(closedResult.value);
    if (!saved) {
      return fail("APPOINTMENT_NOT_FOUND", "Visita não encontrada.");
    }

    const technician = this.technicianRepository.findById(saved.technicianId);
    const serviceType = this.serviceTypeRepository.findById(saved.serviceTypeId);

    return ok(toAppointmentViewModel(saved, { technician, serviceType, now: this.now() }));
  }
}
