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

test("visita nasce aberta", () => {
  const result = Appointment.create(validProps());
  assert.equal(result.success, true);
  assert.equal(result.value.status.value, VISIT_STATUS.OPEN);
});

test("exibe atrasada quando slot já passou e status é aberto", () => {
  const appointment = Appointment.create(
    validProps({
      slot: VisitSlot.create("2020-01-01", "08:00").value,
    }),
  ).value;

  assert.equal(appointment.resolveDisplayStatus(new Date("2026-10-21T12:00:00")), "late");
});

test("mantém status remarcada mesmo com slot no passado", () => {
  const appointment = Appointment.create(
    validProps({
      status: VISIT_STATUS.REBOOKED,
      slot: VisitSlot.create("2020-01-01", "08:00").value,
    }),
  ).value;

  assert.equal(appointment.resolveDisplayStatus(new Date("2026-10-21T12:00:00")), "rebooked");
});

test("mantém status reaberta mesmo com slot no passado", () => {
  const appointment = Appointment.create(
    validProps({
      status: VISIT_STATUS.REOPENED,
      slot: VisitSlot.create("2020-01-01", "08:00").value,
    }),
  ).value;

  assert.equal(appointment.resolveDisplayStatus(new Date("2026-10-21T12:00:00")), "reopened");
});

test("cancela visita com motivo válido", () => {
  const appointment = Appointment.create(validProps()).value;
  const cancelled = appointment.cancel("Cliente remarcou a visita", "2026-10-21T18:00:00.000Z");

  assert.equal(cancelled.success, true);
  assert.equal(cancelled.value.status.value, VISIT_STATUS.CANCELLED);
  assert.equal(cancelled.value.cancellationReason, "Cliente remarcou a visita");
});

test("rejeita cancelamento sem motivo", () => {
  const appointment = Appointment.create(validProps()).value;
  const cancelled = appointment.cancel("abc", "2026-10-21T18:00:00.000Z");

  assert.equal(cancelled.success, false);
  assert.equal(cancelled.error.code, "VALIDATION_ERROR");
});

test("não permite alterar visita cancelada", () => {
  const appointment = Appointment.create(validProps()).value;
  const cancelled = appointment.cancel("Cliente remarcou a visita", "2026-10-21T18:00:00.000Z").value;
  const updated = cancelled.updateDetails({
    clientName: "Outro Cliente",
    updatedAt: "2026-10-21T19:00:00.000Z",
  });

  assert.equal(updated.success, false);
  assert.equal(updated.error.code, "APPOINTMENT_INVALID_STATE");
});

test("fecha visita aberta", () => {
  const appointment = Appointment.create(validProps()).value;
  const closed = appointment.close("2026-10-21T18:00:00.000Z");

  assert.equal(closed.success, true);
  assert.equal(closed.value.status.value, VISIT_STATUS.CLOSED);
  assert.equal(closed.value.resolveDisplayStatus(), "closed");
});
