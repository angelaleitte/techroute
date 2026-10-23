/**
 * Contratos de repositório (Core).
 * A Application depende destes formatos; a Infrastructure os implementa.
 *
 * AppointmentRepository
 *   save(appointment: Appointment, event?: AppointmentEvent): Appointment
 *   update(appointment: Appointment, event?: AppointmentEvent): Appointment | null
 *   insertEvent(event: AppointmentEvent): AppointmentEvent
 *   listEventsByAppointmentId(id: string): AppointmentEvent[]
 *   findById(id: string): Appointment | null
 *   listRecent(limit?: number): Appointment[]
 *
 * TechnicianRepository
 *   findById(id: string): Technician | null
 *   listActive(): Technician[]
 *
 * ServiceTypeRepository
 *   findById(id: string): ServiceType | null
 *   listAll(): ServiceType[]
 *
 * ResourceRepository
 *   findById(id: string): Resource | null
 *   findByIds(ids: string[]): Resource[]
 *   listAll(): Resource[]
 */

export const RepositoryContracts = Object.freeze({
  Appointment: "AppointmentRepository",
  Technician: "TechnicianRepository",
  ServiceType: "ServiceTypeRepository",
  Resource: "ResourceRepository",
});
