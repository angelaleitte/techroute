import { ok } from "../../core/common/Result.js";
import { toAppointmentViewModel } from "../view-models/mappers.js";

export class ListAppointmentsService {
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

  execute(limit = 20, { technicianId } = {}) {
    const technicians = new Map(
      this.technicianRepository.listActive().map((technician) => [technician.id, technician]),
    );
    const serviceTypes = new Map(
      this.serviceTypeRepository.listAll().map((serviceType) => [serviceType.id, serviceType]),
    );
    const resourcesById = new Map(
      this.resourceRepository.listAll().map((resource) => [resource.id, resource]),
    );
    const now = this.now();

    const appointments = this.appointmentRepository
      .listRecent(limit, { technicianId })
      .map((appointment) =>
        toAppointmentViewModel(appointment, {
          technician: technicians.get(appointment.technicianId),
          serviceType: serviceTypes.get(appointment.serviceTypeId),
          resources: appointment.resourceIds
            .map((id) => resourcesById.get(id))
            .filter(Boolean),
          events: this.appointmentRepository.listEventsByAppointmentId(appointment.id),
          now,
        }),
      );

    return ok(appointments);
  }
}
