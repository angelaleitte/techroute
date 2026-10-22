import { ok } from "../../core/common/Result.js";
import { toAppointmentViewModel } from "../view-models/mappers.js";

export class ListAppointmentsService {
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

  execute(limit = 20) {
    const technicians = new Map(
      this.technicianRepository.listActive().map((technician) => [technician.id, technician]),
    );
    const serviceTypes = new Map(
      this.serviceTypeRepository.listAll().map((serviceType) => [serviceType.id, serviceType]),
    );
    const now = this.now();

    const appointments = this.appointmentRepository.listRecent(limit).map((appointment) =>
      toAppointmentViewModel(appointment, {
        technician: technicians.get(appointment.technicianId),
        serviceType: serviceTypes.get(appointment.serviceTypeId),
        now,
      }),
    );

    return ok(appointments);
  }
}
