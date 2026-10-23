import assert from "node:assert/strict";
import { test } from "node:test";
import { RescheduleAppointmentService } from "../../../src/application/services/RescheduleAppointmentService.js";
import { APPOINTMENT_EVENT_TYPE } from "../../../src/core/entities/AppointmentEvent.js";
import {
  buildAppointment,
  InMemoryAppointmentRepository,
  InMemoryResourceRepository,
  InMemoryServiceTypeRepository,
  InMemoryTechnicianRepository,
} from "../../helpers/builders.js";

function createService(appointment, { now = () => new Date("2026-10-22T15:00:00.000Z") } = {}) {
  const appointmentRepository = new InMemoryAppointmentRepository([appointment]);
  return {
    appointmentRepository,
    service: new RescheduleAppointmentService({
      appointmentRepository,
      technicianRepository: new InMemoryTechnicianRepository(),
      serviceTypeRepository: new InMemoryServiceTypeRepository(),
      resourceRepository: new InMemoryResourceRepository(),
      now,
      createId: () => `evt-${appointmentRepository.events.length + 1}`,
    }),
  };
}

test("reagenda visita mantendo status open e registrando evento", () => {
  const appointment = buildAppointment();
  const { service, appointmentRepository } = createService(appointment);

  const result = service.execute(appointment.id, {
    date: "2026-11-05",
    time: "14:00",
    reason: "Cliente pediu novo horário",
  });

  assert.equal(result.success, true);
  assert.equal(result.value.status, "open");
  assert.equal(result.value.date, "2026-11-05");
  assert.equal(result.value.time, "14:00");
  assert.equal(result.value.rescheduleReason, "Cliente pediu novo horário");
  assert.equal(result.value.canReschedule, true);
  assert.equal(result.value.events.length, 1);
  assert.equal(result.value.events[0].eventType, APPOINTMENT_EVENT_TYPE.RESCHEDULED);
  assert.equal(result.value.events[0].fromSlotLabel, "02/11/2026 às 09:30");
  assert.equal(result.value.events[0].toSlotLabel, "05/11/2026 às 14:00");
  assert.equal(appointmentRepository.events.length, 1);
});

test("dois reagendamentos geram dois eventos", () => {
  const appointment = buildAppointment();
  const { service, appointmentRepository } = createService(appointment, {
    now: () => new Date("2026-10-22T15:00:00.000Z"),
  });

  const first = service.execute(appointment.id, {
    date: "2026-11-05",
    time: "14:00",
    reason: "Primeiro reagendamento válido",
  });
  assert.equal(first.success, true);

  const second = service.execute(appointment.id, {
    date: "2026-11-08",
    time: "10:00",
    reason: "Segundo reagendamento válido",
  });

  assert.equal(second.success, true);
  assert.equal(appointmentRepository.events.length, 2);
  assert.equal(second.value.events.length, 2);
  assert.equal(second.value.date, "2026-11-08");
  assert.equal(second.value.rescheduleReason, "Segundo reagendamento válido");
});

test("falha sem motivo suficiente", () => {
  const appointment = buildAppointment();
  const { service } = createService(appointment);

  const result = service.execute(appointment.id, {
    date: "2026-11-05",
    time: "14:00",
    reason: "abc",
  });

  assert.equal(result.success, false);
  assert.equal(result.error.code, "VALIDATION_ERROR");
});

test("falha quando slot é o mesmo", () => {
  const appointment = buildAppointment();
  const { service } = createService(appointment);

  const result = service.execute(appointment.id, {
    date: "2026-11-02",
    time: "09:30",
    reason: "Mesmo horário de antes",
  });

  assert.equal(result.success, false);
  assert.equal(result.error.code, "VALIDATION_ERROR");
});

test("falha quando visita não existe", () => {
  const { service } = createService(buildAppointment());

  const result = service.execute("missing", {
    date: "2026-11-05",
    time: "14:00",
    reason: "Motivo qualquer válido",
  });

  assert.equal(result.success, false);
  assert.equal(result.error.code, "APPOINTMENT_NOT_FOUND");
});
