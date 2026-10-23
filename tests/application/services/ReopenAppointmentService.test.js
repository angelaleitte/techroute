import assert from "node:assert/strict";
import { test } from "node:test";
import { ReopenAppointmentService } from "../../../src/application/services/ReopenAppointmentService.js";
import { APPOINTMENT_EVENT_TYPE } from "../../../src/core/entities/AppointmentEvent.js";
import { VISIT_STATUS } from "../../../src/core/value-objects/VisitStatus.js";
import {
  buildAppointment,
  InMemoryAppointmentRepository,
  InMemoryResourceRepository,
  InMemoryServiceTypeRepository,
  InMemoryTechnicianRepository,
} from "../../helpers/builders.js";

function createService(appointment) {
  const appointmentRepository = new InMemoryAppointmentRepository([appointment]);
  return {
    appointmentRepository,
    service: new ReopenAppointmentService({
      appointmentRepository,
      technicianRepository: new InMemoryTechnicianRepository(),
      serviceTypeRepository: new InMemoryServiceTypeRepository(),
      resourceRepository: new InMemoryResourceRepository(),
      now: () => new Date("2026-10-23T12:00:00.000Z"),
      createId: () => "evt-reopen-1",
    }),
  };
}

test("reabre visita cancelada como remarcada e registra evento", () => {
  const appointment = buildAppointment({
    status: VISIT_STATUS.CANCELLED,
    cancellationReason: "Cliente pediu cancelamento",
    cancelledAt: "2026-10-21T18:00:00.000Z",
  });
  const { service } = createService(appointment);

  const result = service.execute(appointment.id, {
    reason: "Cliente voltou a confirmar a visita",
  });

  assert.equal(result.success, true);
  assert.equal(result.value.status, VISIT_STATUS.REBOOKED);
  assert.equal(result.value.statusLabel, "Remarcada");
  assert.equal(result.value.canEdit, true);
  assert.equal(result.value.canReschedule, true);
  assert.equal(result.value.canReopen, false);
  assert.equal(result.value.cancellationReason, "");
  assert.equal(result.value.events[0].eventType, APPOINTMENT_EVENT_TYPE.REBOOKED);
  assert.equal(result.value.events[0].eventTypeLabel, "Remarcada");
});

test("reabre visita fechada como reaberta e registra evento", () => {
  const appointment = buildAppointment().close("2026-10-21T18:00:00.000Z").value;
  const { service } = createService(appointment);

  const result = service.execute(appointment.id, {
    reason: "Faltou concluir um item pendente",
  });

  assert.equal(result.success, true);
  assert.equal(result.value.status, VISIT_STATUS.REOPENED);
  assert.equal(result.value.statusLabel, "Reaberta");
  assert.equal(result.value.canEdit, true);
  assert.equal(result.value.canReopen, false);
  assert.equal(result.value.events[0].eventType, APPOINTMENT_EVENT_TYPE.REOPENED);
});

test("falha ao reabrir visita que ainda está aberta", () => {
  const appointment = buildAppointment();
  const { service } = createService(appointment);

  const result = service.execute(appointment.id, {
    reason: "Tentativa inválida de reabrir",
  });

  assert.equal(result.success, false);
  assert.equal(result.error.code, "APPOINTMENT_INVALID_STATE");
});
