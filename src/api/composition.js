import { AllocateResourcesService } from "../application/services/AllocateResourcesService.js";
import { CancelAppointmentService } from "../application/services/CancelAppointmentService.js";
import { ChangePasswordService } from "../application/services/ChangePasswordService.js";
import { CloseAppointmentService } from "../application/services/CloseAppointmentService.js";
import { GetCurrentUserService } from "../application/services/GetCurrentUserService.js";
import { ListAppointmentsService } from "../application/services/ListAppointmentsService.js";
import { ListCatalogService } from "../application/services/ListCatalogService.js";
import { ListUsersService } from "../application/services/ListUsersService.js";
import { LoginService } from "../application/services/LoginService.js";
import { LogoutService } from "../application/services/LogoutService.js";
import { RegisterAppointmentService } from "../application/services/RegisterAppointmentService.js";
import { RegisterUserService } from "../application/services/RegisterUserService.js";
import { ReopenAppointmentService } from "../application/services/ReopenAppointmentService.js";
import { RescheduleAppointmentService } from "../application/services/RescheduleAppointmentService.js";
import { ResetUserPasswordService } from "../application/services/ResetUserPasswordService.js";
import { StartAttendanceService } from "../application/services/StartAttendanceService.js";
import { UpdateAppointmentService } from "../application/services/UpdateAppointmentService.js";
import { UpdateProfileService } from "../application/services/UpdateProfileService.js";
import { UpdateUserService } from "../application/services/UpdateUserService.js";
import { UpdateVisitNotesService } from "../application/services/UpdateVisitNotesService.js";
import { createConnection } from "../infrastructure/data/connection.js";
import { SqliteAppointmentRepository } from "../infrastructure/repositories/SqliteAppointmentRepository.js";
import { SqliteResourceRepository } from "../infrastructure/repositories/SqliteResourceRepository.js";
import { SqliteServiceTypeRepository } from "../infrastructure/repositories/SqliteServiceTypeRepository.js";
import { SqliteSessionRepository } from "../infrastructure/repositories/SqliteSessionRepository.js";
import { SqliteTechnicianRepository } from "../infrastructure/repositories/SqliteTechnicianRepository.js";
import { SqliteUserRepository } from "../infrastructure/repositories/SqliteUserRepository.js";

export function composeApp(rootDir) {
  const db = createConnection(rootDir);
  const appointmentRepository = new SqliteAppointmentRepository(db);
  const technicianRepository = new SqliteTechnicianRepository(db);
  const serviceTypeRepository = new SqliteServiceTypeRepository(db);
  const resourceRepository = new SqliteResourceRepository(db);
  const userRepository = new SqliteUserRepository(db);
  const sessionRepository = new SqliteSessionRepository(db);

  const shared = {
    appointmentRepository,
    technicianRepository,
    serviceTypeRepository,
    resourceRepository,
  };

  const listCatalogService = new ListCatalogService({
    technicianRepository,
    serviceTypeRepository,
    resourceRepository,
  });

  return {
    db,
    loginService: new LoginService({ userRepository, sessionRepository }),
    logoutService: new LogoutService({ sessionRepository }),
    getCurrentUserService: new GetCurrentUserService({ userRepository, sessionRepository }),
    changePasswordService: new ChangePasswordService({ userRepository }),
    updateProfileService: new UpdateProfileService({ userRepository, technicianRepository }),
    listUsersService: new ListUsersService({ userRepository, technicianRepository }),
    registerUserService: new RegisterUserService({ userRepository, technicianRepository }),
    updateUserService: new UpdateUserService({ userRepository, technicianRepository }),
    resetUserPasswordService: new ResetUserPasswordService({ userRepository }),
    registerAppointmentService: new RegisterAppointmentService(shared),
    updateAppointmentService: new UpdateAppointmentService(shared),
    allocateResourcesService: new AllocateResourcesService(shared),
    cancelAppointmentService: new CancelAppointmentService(shared),
    closeAppointmentService: new CloseAppointmentService(shared),
    rescheduleAppointmentService: new RescheduleAppointmentService(shared),
    reopenAppointmentService: new ReopenAppointmentService(shared),
    startAttendanceService: new StartAttendanceService(shared),
    updateVisitNotesService: new UpdateVisitNotesService(shared),
    listCatalogService,
    listAppointmentsService: new ListAppointmentsService(shared),
  };
}
