import assert from "node:assert/strict";
import { test } from "node:test";
import { CancelAppointmentService } from "../../../src/application/services/CancelAppointmentService.js";
import {
  buildAppointment,
  InMemoryAppointmentRepository,
  InMemoryResourceRepository,
  InMemoryServiceTypeRepository,
  InMemoryTechnicianRepository,
} from "../../helpers/builders.js";

test("cancela visita e devolve view model com motivo", () => {
  const appointment = buildAppointment();
  const appointmentRepository = new InMemoryAppointmentRepository([appointment]);
  const service = new CancelAppointmentService({
    appointmentRepository,
    technicianRepository: new InMemoryTechnicianRepository(),
    serviceTypeRepository: new InMemoryServiceTypeRepository(),
    resourceRepository: new InMemoryResourceRepository(),
    now: () => new Date("2026-10-21T18:00:00.000Z"),
    createId: () => "evt-cancel-1",
  });

  const result = service.execute(appointment.id, {
    reason: "Cliente pediu reagendamento",
  });

  assert.equal(result.success, true);
  assert.equal(result.value.displayStatus, "cancelled");
  assert.equal(result.value.cancellationReason, "Cliente pediu reagendamento");
  assert.equal(result.value.canEdit, false);
  assert.equal(result.value.events.length, 1);
  assert.equal(result.value.events[0].eventType, "cancelled");
  assert.equal(appointmentRepository.events.length, 1);
});

test("falha quando visita não existe", () => {
  const service = new CancelAppointmentService({
    appointmentRepository: new InMemoryAppointmentRepository([]),
    technicianRepository: new InMemoryTechnicianRepository(),
    serviceTypeRepository: new InMemoryServiceTypeRepository(),
    resourceRepository: new InMemoryResourceRepository(),
  });

  const result = service.execute("missing", { reason: "Motivo qualquer válido" });
  assert.equal(result.success, false);
  assert.equal(result.error.code, "APPOINTMENT_NOT_FOUND");
});
