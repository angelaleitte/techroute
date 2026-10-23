import { fail, ok } from "../../core/common/Result.js";
import { toAppointmentViewModel } from "../view-models/mappers.js";
import { resolveResources } from "./resolveResources.js";

export class AllocateResourcesService {
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

  execute(id, rawInput = {}) {
    const appointmentId = String(id ?? "").trim();
    if (!appointmentId) {
      return fail("VALIDATION_ERROR", "Informe a visita para alocar recursos.");
    }

    const existing = this.appointmentRepository.findById(appointmentId);
    if (!existing) {
      return fail("APPOINTMENT_NOT_FOUND", "Visita não encontrada.");
    }

    const resourcesResult = resolveResources(this.resourceRepository, rawInput.resourceIds);
    if (!resourcesResult.success) {
      return resourcesResult;
    }

    const resources = resourcesResult.value;
    const updatedResult = existing.allocateResources(
      resources.map((resource) => resource.id),
      this.now().toISOString(),
    );

    if (!updatedResult.success) {
      return updatedResult;
    }

    const saved = this.appointmentRepository.update(updatedResult.value);
    if (!saved) {
      return fail("APPOINTMENT_NOT_FOUND", "Visita não encontrada.");
    }

    const technician = this.technicianRepository.findById(saved.technicianId);
    const serviceType = this.serviceTypeRepository.findById(saved.serviceTypeId);

    return ok(
      toAppointmentViewModel(saved, {
        technician,
        serviceType,
        resources,
        now: this.now(),
      }),
    );
  }
}
