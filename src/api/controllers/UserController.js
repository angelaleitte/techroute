export class UserController {
  constructor({
    listUsersService,
    registerUserService,
    updateUserService,
    resetUserPasswordService,
    listCatalogService,
  }) {
    this.listUsersService = listUsersService;
    this.registerUserService = registerUserService;
    this.updateUserService = updateUserService;
    this.resetUserPasswordService = resetUserPasswordService;
    this.listCatalogService = listCatalogService;
  }

  list = (_request, response) => {
    const result = this.listUsersService.execute();
    response.json({ users: result.value });
  };

  availableTechnicians = (_request, response) => {
    const techniciansResult = this.listCatalogService.listTechnicians();
    const users = this.listUsersService.execute().value;
    const linked = new Set(users.map((user) => user.technicianId).filter(Boolean));
    const technicians = techniciansResult.value
      .filter((technician) => !linked.has(technician.id))
      .map((technician) => ({
        id: technician.id,
        name: technician.name,
        specialty: technician.specialty || "",
      }));

    response.json({ technicians });
  };

  create = (request, response) => {
    const result = this.registerUserService.execute(request.body || {});
    if (!result.success) {
      const status =
        result.error.code === "CONFLICT" ? 409 : result.error.code === "NOT_FOUND" ? 404 : 400;
      response.status(status).json({ error: result.error });
      return;
    }

    response.status(201).json(result.value);
  };

  update = (request, response) => {
    const result = this.updateUserService.execute(request.params.id, request.body || {});
    if (!result.success) {
      const status = result.error.code === "NOT_FOUND" ? 404 : 400;
      response.status(status).json({ error: result.error });
      return;
    }

    response.json({ user: result.value });
  };

  resetPassword = (request, response) => {
    const result = this.resetUserPasswordService.execute(request.params.id);
    if (!result.success) {
      response.status(404).json({ error: result.error });
      return;
    }

    response.json(result.value);
  };
}
