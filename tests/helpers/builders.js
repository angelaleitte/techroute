import { Appointment } from "../../src/core/entities/Appointment.js";
import { ServiceType } from "../../src/core/entities/ServiceType.js";
import { Technician } from "../../src/core/entities/Technician.js";
import { ClientLocation } from "../../src/core/value-objects/ClientLocation.js";
import { VisitSlot } from "../../src/core/value-objects/VisitSlot.js";

export function buildTechnician(overrides = {}) {
  return new Technician({
    id: "tech-ana",
    name: "Ana Souza",
    specialty: "Instalação residencial",
    active: true,
    ...overrides,
  });
}

export function buildServiceType(overrides = {}) {
  return new ServiceType({
    id: "svc-instalacao",
    name: "Instalação",
    description: "Instalação de equipamentos",
    ...overrides,
  });
}

export function buildAppointment(overrides = {}) {
  const location = ClientLocation.create("Rua das Palmeiras, 120").value;
  const slot = VisitSlot.create("2026-11-02", "09:30").value;

  return Appointment.create({
    id: "apt-1",
    clientName: "Maria Oliveira",
    location,
    phone: "(11) 98765-4321",
    phoneSecondary: "",
    email: "maria.oliveira@email.com",
    slot,
    technicianId: "tech-ana",
    serviceTypeId: "svc-instalacao",
    notes: "",
    resourceIds: [],
    createdAt: "2026-10-21T16:00:00.000Z",
    ...overrides,
  }).value;
}

export class InMemoryAppointmentRepository {
  constructor(items = []) {
    this.items = [...items];
  }

  save(appointment) {
    this.items.push(appointment);
    return appointment;
  }

  update(appointment) {
    const index = this.items.findIndex((item) => item.id === appointment.id);
    if (index < 0) {
      return null;
    }
    this.items[index] = appointment;
    return appointment;
  }

  findById(id) {
    return this.items.find((item) => item.id === id) ?? null;
  }

  listRecent() {
    return [...this.items];
  }
}

export class InMemoryTechnicianRepository {
  constructor(items = [buildTechnician()]) {
    this.items = [...items];
  }

  findById(id) {
    return this.items.find((item) => item.id === id) ?? null;
  }

  listActive() {
    return this.items.filter((item) => item.active);
  }
}

export class InMemoryServiceTypeRepository {
  constructor(items = [buildServiceType()]) {
    this.items = [...items];
  }

  findById(id) {
    return this.items.find((item) => item.id === id) ?? null;
  }

  listAll() {
    return [...this.items];
  }
}
