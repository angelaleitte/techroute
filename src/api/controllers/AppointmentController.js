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
]);

function toHttp(result) {
  if (result.success) {
    return { status: 200, body: result.value };
  }

  const status =
    result.error.code === "APPOINTMENT_NOT_FOUND"
      ? 404
      : CLIENT_ERROR_CODES.has(result.error.code)
        ? 400
        : 500;

  return { status, body: { error: result.error } };
}

export class AppointmentController {
  constructor({
    registerAppointmentService,
    updateAppointmentService,
    cancelAppointmentService,
    closeAppointmentService,
    listAppointmentsService,
  }) {
    this.registerAppointmentService = registerAppointmentService;
    this.updateAppointmentService = updateAppointmentService;
    this.cancelAppointmentService = cancelAppointmentService;
    this.closeAppointmentService = closeAppointmentService;
    this.listAppointmentsService = listAppointmentsService;
  }

  create = (request, response) => {
    const result = this.registerAppointmentService.execute(request.body);
    const { status, body } = toHttp(result);
    response.status(status).json(status === 200 ? { appointment: body } : body);
  };

  update = (request, response) => {
    const result = this.updateAppointmentService.execute(request.params.id, request.body);
    const { status, body } = toHttp(result);
    response.status(status).json(status === 200 ? { appointment: body } : body);
  };

  cancel = (request, response) => {
    const result = this.cancelAppointmentService.execute(request.params.id, request.body);
    const { status, body } = toHttp(result);
    response.status(status).json(status === 200 ? { appointment: body } : body);
  };

  close = (request, response) => {
    const result = this.closeAppointmentService.execute(request.params.id);
    const { status, body } = toHttp(result);
    response.status(status).json(status === 200 ? { appointment: body } : body);
  };

  list = (_request, response) => {
    const result = this.listAppointmentsService.execute();
    const { status, body } = toHttp(result);
    response.status(status).json(status === 200 ? { appointments: body } : body);
  };
}
