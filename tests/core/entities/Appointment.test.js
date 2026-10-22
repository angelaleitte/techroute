import assert from "node:assert/strict";
import { test } from "node:test";
import { Appointment } from "../../../src/core/entities/Appointment.js";
import { ClientLocation } from "../../../src/core/value-objects/ClientLocation.js";
import { VisitSlot } from "../../../src/core/value-objects/VisitSlot.js";

function validProps(overrides = {}) {
  return {
    id: "apt-1",
    clientName: "Maria Oliveira",
    location: ClientLocation.create("Rua das Palmeiras, 120").value,
    phone: "(11) 98765-4321",
    phoneSecondary: "",
    email: "maria.oliveira@email.com",
    slot: VisitSlot.create("2026-11-02", "09:30").value,
    technicianId: "tech-ana",
    serviceTypeId: "svc-instalacao",
    notes: "",
    resourceIds: [],
    createdAt: "2026-10-21T16:00:00.000Z",
    ...overrides,
  };
}

test("cria visita quando todos os invariantes são satisfeitos", () => {
  const result = Appointment.create(validProps());
  assert.equal(result.success, true);
  assert.equal(result.value.clientName, "Maria Oliveira");
});

test("rejeita visita sem técnico", () => {
  const result = Appointment.create(validProps({ technicianId: "" }));
  assert.equal(result.success, false);
  assert.equal(result.error.code, "APPOINTMENT_INVARIANT");
});

test("rejeita visita sem tipo de serviço", () => {
  const result = Appointment.create(validProps({ serviceTypeId: "" }));
  assert.equal(result.success, false);
  assert.equal(result.error.code, "APPOINTMENT_INVARIANT");
});
