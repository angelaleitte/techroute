import assert from "node:assert/strict";
import { test } from "node:test";
import { AllocateResourcesService } from "../../../src/application/services/AllocateResourcesService.js";
import {
  buildAppointment,
  buildResource,
  InMemoryAppointmentRepository,
  InMemoryResourceRepository,
  InMemoryServiceTypeRepository,
  InMemoryTechnicianRepository,
} from "../../helpers/builders.js";

function createService(appointment = buildAppointment()) {
  return {
    appointment,
    service: new AllocateResourcesService({
      appointmentRepository: new InMemoryAppointmentRepository([appointment]),
      technicianRepository: new InMemoryTechnicianRepository(),
      serviceTypeRepository: new InMemoryServiceTypeRepository(),
      resourceRepository: new InMemoryResourceRepository([
        buildResource(),
        buildResource({
          id: "res-escada",
          name: "Escada telescópica",
          category: "equipamento",
        }),
      ]),
      now: () => new Date("2026-10-22T12:00:00.000Z"),
    }),
  };
}

test("aloca recursos em visita aberta", () => {
  const { service } = createService();
  const result = service.execute("apt-1", {
    resourceIds: ["res-multimetro", "res-escada"],
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.value.resourceIds, ["res-multimetro", "res-escada"]);
  assert.equal(result.value.resourceCount, 2);
  assert.equal(result.value.updatedAt, "2026-10-22T12:00:00.000Z");
});

test("permite limpar recursos da visita", () => {
  const appointment = buildAppointment({ resourceIds: ["res-multimetro"] });
  const { service } = createService(appointment);
  const result = service.execute(appointment.id, { resourceIds: [] });

  assert.equal(result.success, true);
  assert.deepEqual(result.value.resourceIds, []);
  assert.equal(result.value.resourceCount, 0);
});

test("falha quando a visita não existe", () => {
  const { service } = createService();
  const result = service.execute("missing", { resourceIds: ["res-multimetro"] });

  assert.equal(result.success, false);
  assert.equal(result.error.code, "APPOINTMENT_NOT_FOUND");
});
