const CLIENT_ERROR_CODES = new Set([
  "VALIDATION_ERROR",
  "INVALID_SLOT",
  "INVALID_LOCATION",
  "INVALID_PHONE",
  "INVALID_EMAIL",
  "INVALID_STATUS",
  "APPOINTMENT_INVARIANT",
  "APPOINTMENT_INVALID_STATE",
  "APPOINTMENT_NOT_FOUND",
  "TECHNICIAN_NOT_FOUND",
  "SERVICE_TYPE_NOT_FOUND",
  "RESOURCE_NOT_FOUND",
  "FORBIDDEN",
]);

function toHttp(result) {
  if (result.success) {
    return { status: 200, body: result.value };
  }

  const status =
    result.error.code === "APPOINTMENT_NOT_FOUND"
      ? 404
      : result.error.code === "FORBIDDEN"
        ? 403
        : CLIENT_ERROR_CODES.has(result.error.code)
          ? 400
          : 500;

  return { status, body: { error: result.error } };
}

export class AppointmentController {
  constructor({
    registerAppointmentService,
    updateAppointmentService,
    allocateResourcesService,
    cancelAppointmentService,
    closeAppointmentService,
    rescheduleAppointmentService,
    reopenAppointmentService,
    startAttendanceService,
    listAppointmentsService,
    updateVisitNotesService,
  }) {
    this.registerAppointmentService = registerAppointmentService;
    this.updateAppointmentService = updateAppointmentService;
    this.allocateResourcesService = allocateResourcesService;
    this.cancelAppointmentService = cancelAppointmentService;
    this.closeAppointmentService = closeAppointmentService;
    this.rescheduleAppointmentService = rescheduleAppointmentService;
    this.reopenAppointmentService = reopenAppointmentService;
    this.startAttendanceService = startAttendanceService;
    this.listAppointmentsService = listAppointmentsService;
    this.updateVisitNotesService = updateVisitNotesService;
  }

  create = (request, response) => {
    const result = this.registerAppointmentService.execute(request.body, request.user);
    const { status, body } = toHttp(result);
    response.status(status).json(status === 200 ? { appointment: body } : body);
  };

  update = (request, response) => {
    const result = this.updateAppointmentService.execute(request.params.id, request.body);
    const { status, body } = toHttp(result);
    response.status(status).json(status === 200 ? { appointment: body } : body);
  };

  allocateResources = (request, response) => {
    const result = this.allocateResourcesService.execute(request.params.id, request.body);
    const { status, body } = toHttp(result);
    response.status(status).json(status === 200 ? { appointment: body } : body);
  };

  cancel = (request, response) => {
    const result = this.cancelAppointmentService.execute(
      request.params.id,
      request.body,
      request.user,
    );
    const { status, body } = toHttp(result);
    response.status(status).json(status === 200 ? { appointment: body } : body);
  };

  close = (request, response) => {
    const result = this.closeAppointmentService.execute(
      request.params.id,
      request.body,
      request.user,
    );
    const { status, body } = toHttp(result);
    response.status(status).json(status === 200 ? { appointment: body } : body);
  };

  reschedule = (request, response) => {
    const result = this.rescheduleAppointmentService.execute(
      request.params.id,
      request.body,
      request.user,
    );
    const { status, body } = toHttp(result);
    response.status(status).json(status === 200 ? { appointment: body } : body);
  };

  reopen = (request, response) => {
    const result = this.reopenAppointmentService.execute(
      request.params.id,
      request.body,
      request.user,
    );
    const { status, body } = toHttp(result);
    response.status(status).json(status === 200 ? { appointment: body } : body);
  };

  startAttendance = (request, response) => {
    const result = this.startAttendanceService.execute(request.params.id, request.user);
    const { status, body } = toHttp(result);
    response.status(status).json(status === 200 ? { appointment: body } : body);
  };

  updateNotes = (request, response) => {
    const result = this.updateVisitNotesService.execute(
      request.params.id,
      request.body,
      request.user,
    );
    const { status, body } = toHttp(result);
    response.status(status).json(status === 200 ? { appointment: body } : body);
  };

  list = (request, response) => {
    const filter =
      request.user?.role === "technician" && request.user.technicianId
        ? { technicianId: request.user.technicianId }
        : {};
    const result = this.listAppointmentsService.execute(50, filter);
    const { status, body } = toHttp(result);
    response.status(status).json(status === 200 ? { appointments: body } : body);
  };
}
