import test from "node:test";
import assert from "node:assert/strict";
import { StartAttendanceService } from "../../../src/application/services/StartAttendanceService.js";
import {
  buildAppointment,
  InMemoryAppointmentRepository,
  InMemoryResourceRepository,
  InMemoryServiceTypeRepository,
  InMemoryTechnicianRepository,
} from "../../helpers/builders.js";

function createService(appointment = buildAppointment()) {
  const appointmentRepository = new InMemoryAppointmentRepository([appointment]);
  return {
    appointmentRepository,
    service: new StartAttendanceService({
      appointmentRepository,
      technicianRepository: new InMemoryTechnicianRepository(),
      serviceTypeRepository: new InMemoryServiceTypeRepository(),
      resourceRepository: new InMemoryResourceRepository(),
      now: () => new Date("2026-10-27T12:00:00.000Z"),
      createId: () => "evt-attend-1",
    }),
  };
}

test("StartAttendanceService inicia atendimento e registra evento com autor", () => {
  const { service, appointmentRepository } = createService();
  const result = service.execute("apt-1", {
    id: "user-ana",
    displayName: "Ana Souza",
    role: "technician",
    technicianId: "tech-ana",
  });

  assert.equal(result.success, true);
  assert.equal(result.value.displayStatus, "in_progress");
  assert.equal(result.value.attendedAt, "2026-10-27T12:00:00.000Z");
  assert.equal(appointmentRepository.events[0].eventType, "attended");
  assert.equal(appointmentRepository.events[0].actorName, "Ana Souza");
});

test("StartAttendanceService bloqueia técnico de outra visita", () => {
  const { service } = createService();
  const result = service.execute("apt-1", {
    id: "user-pedro",
    displayName: "Pedro",
    role: "technician",
    technicianId: "tech-pedro",
  });
  assert.equal(result.success, false);
  assert.equal(result.error.code, "FORBIDDEN");
});
