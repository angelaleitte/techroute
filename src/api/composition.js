import { AllocateResourcesService } from "../application/services/AllocateResourcesService.js";
import { CancelAppointmentService } from "../application/services/CancelAppointmentService.js";
import { CloseAppointmentService } from "../application/services/CloseAppointmentService.js";
import { ListAppointmentsService } from "../application/services/ListAppointmentsService.js";
import { ListCatalogService } from "../application/services/ListCatalogService.js";
import { RegisterAppointmentService } from "../application/services/RegisterAppointmentService.js";
import { ReopenAppointmentService } from "../application/services/ReopenAppointmentService.js";
import { RescheduleAppointmentService } from "../application/services/RescheduleAppointmentService.js";
import { UpdateAppointmentService } from "../application/services/UpdateAppointmentService.js";
import { createConnection } from "../infrastructure/data/connection.js";
import { SqliteAppointmentRepository } from "../infrastructure/repositories/SqliteAppointmentRepository.js";
import { SqliteResourceRepository } from "../infrastructure/repositories/SqliteResourceRepository.js";
import { SqliteServiceTypeRepository } from "../infrastructure/repositories/SqliteServiceTypeRepository.js";
import { SqliteTechnicianRepository } from "../infrastructure/repositories/SqliteTechnicianRepository.js";

export function composeApp(rootDir) {
  const db = createConnection(rootDir);
  const appointmentRepository = new SqliteAppointmentRepository(db);
  const technicianRepository = new SqliteTechnicianRepository(db);
  const serviceTypeRepository = new SqliteServiceTypeRepository(db);
  const resourceRepository = new SqliteResourceRepository(db);

  const shared = {
    appointmentRepository,
    technicianRepository,
    serviceTypeRepository,
    resourceRepository,
  };

  return {
    db,
    registerAppointmentService: new RegisterAppointmentService(shared),
    updateAppointmentService: new UpdateAppointmentService(shared),
    allocateResourcesService: new AllocateResourcesService(shared),
    cancelAppointmentService: new CancelAppointmentService(shared),
    closeAppointmentService: new CloseAppointmentService(shared),
    rescheduleAppointmentService: new RescheduleAppointmentService(shared),
    reopenAppointmentService: new ReopenAppointmentService(shared),
    listCatalogService: new ListCatalogService({
      technicianRepository,
      serviceTypeRepository,
      resourceRepository,
    }),
    listAppointmentsService: new ListAppointmentsService(shared),
  };
}
