import assert from "node:assert/strict";
import { test } from "node:test";
import { RegisterAppointmentService } from "../../../src/application/services/RegisterAppointmentService.js";
import {
  InMemoryAppointmentRepository,
  InMemoryResourceRepository,
  InMemoryServiceTypeRepository,
  InMemoryTechnicianRepository,
  buildResource,
  buildTechnician,
} from "../../helpers/builders.js";

function createService(overrides = {}) {
  return new RegisterAppointmentService({
    appointmentRepository: new InMemoryAppointmentRepository(),
    technicianRepository: new InMemoryTechnicianRepository(),
    serviceTypeRepository: new InMemoryServiceTypeRepository(),
    resourceRepository: new InMemoryResourceRepository(),
    now: () => new Date("2026-10-21T16:00:00.000Z"),
    createId: () => "apt-test-1",
    ...overrides,
  });
}

const validInput = {
  clientName: "Maria Oliveira",
  location: "Rua das Palmeiras, 120 — Centro",
  phone: "(11) 98765-4321",
  phoneSecondary: "(11) 3456-7890",
  email: "maria.oliveira@email.com",
  date: "2026-11-02",
  time: "09:30",
  technicianId: "tech-ana",
  serviceTypeId: "svc-instalacao",
  notes: "Levar escada",
};

test("registra visita e devolve view model", () => {
  const service = createService();
  const result = service.execute(validInput);

  assert.equal(result.success, true);
  assert.equal(result.value.id, "apt-test-1");
  assert.equal(result.value.technicianName, "Ana Souza");
  assert.equal(result.value.serviceTypeName, "Instalação");
  assert.equal(result.value.createdAt, "2026-10-21T16:00:00.000Z");
});

test("falha quando o técnico não existe", () => {
  const service = createService();
  const result = service.execute({ ...validInput, technicianId: "tech-inexistente" });

  assert.equal(result.success, false);
  assert.equal(result.error.code, "TECHNICIAN_NOT_FOUND");
});

test("falha quando o técnico está inativo", () => {
  const service = createService({
    technicianRepository: new InMemoryTechnicianRepository([
      buildTechnician({ active: false }),
    ]),
  });
  const result = service.execute(validInput);

  assert.equal(result.success, false);
  assert.equal(result.error.code, "TECHNICIAN_NOT_FOUND");
});

test("falha quando o endereço é curto demais", () => {
  const service = createService();
  const result = service.execute({ ...validInput, location: "Rua" });

  assert.equal(result.success, false);
  assert.equal(result.error.code, "INVALID_LOCATION");
});

test("registra visita com recursos alocados", () => {
  const escada = buildResource({
    id: "res-escada",
    name: "Escada telescópica",
    category: "equipamento",
  });
  const service = createService({
    resourceRepository: new InMemoryResourceRepository([buildResource(), escada]),
  });

  const result = service.execute({
    ...validInput,
    resourceIds: ["res-multimetro", "res-escada"],
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.value.resourceIds, ["res-multimetro", "res-escada"]);
  assert.equal(result.value.resourceCount, 2);
  assert.equal(result.value.resources[0].name, "Multímetro");
});

test("falha quando o recurso não existe", () => {
  const service = createService();
  const result = service.execute({
    ...validInput,
    resourceIds: ["res-inexistente"],
  });

  assert.equal(result.success, false);
  assert.equal(result.error.code, "RESOURCE_NOT_FOUND");
});
