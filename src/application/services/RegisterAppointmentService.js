import { randomUUID } from "node:crypto";
import { fail, ok } from "../../core/common/Result.js";
import { Appointment } from "../../core/entities/Appointment.js";
import {
  APPOINTMENT_EVENT_TYPE,
  AppointmentEvent,
} from "../../core/entities/AppointmentEvent.js";
import { ClientLocation } from "../../core/value-objects/ClientLocation.js";
import { EmailAddress } from "../../core/value-objects/EmailAddress.js";
import { PhoneNumber } from "../../core/value-objects/PhoneNumber.js";
import { VisitSlot } from "../../core/value-objects/VisitSlot.js";
import { normalizeRegisterAppointmentInput } from "../input-models/RegisterAppointmentInput.js";
import { toAppointmentViewModel } from "../view-models/mappers.js";
import { resolveResources } from "./resolveResources.js";

export class RegisterAppointmentService {
  constructor({
    appointmentRepository,
    technicianRepository,
    serviceTypeRepository,
    resourceRepository,
    now = () => new Date(),
    createId = () => randomUUID(),
  }) {
    this.appointmentRepository = appointmentRepository;
    this.technicianRepository = technicianRepository;
    this.serviceTypeRepository = serviceTypeRepository;
    this.resourceRepository = resourceRepository;
    this.now = now;
    this.createId = createId;
  }

  execute(rawInput) {
    const input = normalizeRegisterAppointmentInput(rawInput);

    if (input.clientName.length < 3) {
      return fail("VALIDATION_ERROR", "Informe o nome do cliente (mínimo 3 caracteres).");
    }

    const locationResult = ClientLocation.create(input.location);
    if (!locationResult.success) {
      return locationResult;
    }

    const phoneResult = PhoneNumber.create(input.phone, {
      required: true,
      fieldLabel: "telefone principal",
    });
    if (!phoneResult.success) {
      return phoneResult;
    }

    const phoneSecondaryResult = PhoneNumber.create(input.phoneSecondary, {
      required: false,
      fieldLabel: "telefone secundário",
    });
    if (!phoneSecondaryResult.success) {
      return phoneSecondaryResult;
    }

    const emailResult = EmailAddress.create(input.email, { required: true });
    if (!emailResult.success) {
      return emailResult;
    }

    const slotResult = VisitSlot.create(input.date, input.time);
    if (!slotResult.success) {
      return slotResult;
    }

    if (!input.technicianId) {
      return fail("VALIDATION_ERROR", "Selecione o técnico responsável.");
    }

    if (!input.serviceTypeId) {
      return fail("VALIDATION_ERROR", "Selecione o tipo de serviço.");
    }

    if (input.notes.length > 500) {
      return fail("VALIDATION_ERROR", "As observações devem ter no máximo 500 caracteres.");
    }

    const technician = this.technicianRepository.findById(input.technicianId);
    if (!technician || !technician.active) {
      return fail("TECHNICIAN_NOT_FOUND", "Técnico não encontrado.");
    }

    const serviceType = this.serviceTypeRepository.findById(input.serviceTypeId);
    if (!serviceType) {
      return fail("SERVICE_TYPE_NOT_FOUND", "Tipo de serviço não encontrado.");
    }

    const resourcesResult = resolveResources(this.resourceRepository, input.resourceIds);
    if (!resourcesResult.success) {
      return resourcesResult;
    }

    const resources = resourcesResult.value;

    const appointmentResult = Appointment.create({
      id: this.createId(),
      clientName: input.clientName,
      location: locationResult.value,
      phone: phoneResult.value,
      phoneSecondary: phoneSecondaryResult.value ?? "",
      email: emailResult.value,
      slot: slotResult.value,
      technicianId: technician.id,
      serviceTypeId: serviceType.id,
      notes: input.notes,
      resourceIds: resources.map((resource) => resource.id),
      createdAt: this.now().toISOString(),
    });

    if (!appointmentResult.success) {
      return appointmentResult;
    }

    const appointment = appointmentResult.value;
    const createdEvent = new AppointmentEvent({
      id: this.createId(),
      appointmentId: appointment.id,
      eventType: APPOINTMENT_EVENT_TYPE.CREATED,
      reason: "",
      fromDate: null,
      fromTime: null,
      toDate: appointment.slot.date,
      toTime: appointment.slot.time,
      createdAt: appointment.createdAt,
    });

    const saved = this.appointmentRepository.save(appointment, createdEvent);
    const events = this.appointmentRepository.listEventsByAppointmentId(saved.id);

    return ok(
      toAppointmentViewModel(saved, {
        technician,
        serviceType,
        resources,
        events,
        now: this.now(),
      }),
    );
  }
}
