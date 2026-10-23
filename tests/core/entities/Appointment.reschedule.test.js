import assert from "node:assert/strict";
import { test } from "node:test";
import { Appointment } from "../../../src/core/entities/Appointment.js";
import { ClientLocation } from "../../../src/core/value-objects/ClientLocation.js";
import { VisitSlot } from "../../../src/core/value-objects/VisitSlot.js";
import { VISIT_STATUS } from "../../../src/core/value-objects/VisitStatus.js";

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

test("reagenda visita aberta com novo slot e motivo", () => {
  const appointment = Appointment.create(validProps()).value;
  const result = appointment.reschedule(
    { date: "2026-11-10", time: "11:00", reason: "Cliente viajou" },
    "2026-10-22T12:00:00.000Z",
  );

  assert.equal(result.success, true);
  assert.equal(result.value.status.value, VISIT_STATUS.OPEN);
  assert.equal(result.value.slot.date, "2026-11-10");
  assert.equal(result.value.slot.time, "11:00");
  assert.equal(result.value.rescheduleReason, "Cliente viajou");
  assert.equal(result.value.rescheduledAt, "2026-10-22T12:00:00.000Z");
});

test("rejeita reagendar visita cancelada", () => {
  const appointment = Appointment.create(
    validProps({
      status: VISIT_STATUS.CANCELLED,
      cancellationReason: "Cliente desistiu",
      cancelledAt: "2026-10-21T18:00:00.000Z",
    }),
  ).value;

  const result = appointment.reschedule(
    { date: "2026-11-10", time: "11:00", reason: "Tentativa inválida" },
    "2026-10-22T12:00:00.000Z",
  );

  assert.equal(result.success, false);
  assert.equal(result.error.code, "APPOINTMENT_INVALID_STATE");
});

test("rejeita reagendar visita fechada", () => {
  const appointment = Appointment.create(validProps()).value.close(
    "2026-10-21T18:00:00.000Z",
  ).value;

  const result = appointment.reschedule(
    { date: "2026-11-10", time: "11:00", reason: "Tentativa inválida" },
    "2026-10-22T12:00:00.000Z",
  );

  assert.equal(result.success, false);
  assert.equal(result.error.code, "APPOINTMENT_INVALID_STATE");
});
