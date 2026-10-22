import { fail, ok } from "../../core/common/Result.js";
import { ClientLocation } from "../../core/value-objects/ClientLocation.js";
import { EmailAddress } from "../../core/value-objects/EmailAddress.js";
import { PhoneNumber } from "../../core/value-objects/PhoneNumber.js";
import { VisitSlot } from "../../core/value-objects/VisitSlot.js";
import { normalizeRegisterAppointmentInput } from "../input-models/RegisterAppointmentInput.js";
import { toAppointmentViewModel } from "../view-models/mappers.js";

export class UpdateAppointmentService {
  constructor({
    appointmentRepository,
    technicianRepository,
    serviceTypeRepository,
    now = () => new Date(),
  }) {
    this.appointmentRepository = appointmentRepository;
    this.technicianRepository = technicianRepository;
    this.serviceTypeRepository = serviceTypeRepository;
    this.now = now;
  }

  execute(id, rawInput) {
    const appointmentId = String(id ?? "").trim();
    if (!appointmentId) {
      return fail("VALIDATION_ERROR", "Informe a visita a alterar.");
    }

    const existing = this.appointmentRepository.findById(appointmentId);
    if (!existing) {
      return fail("APPOINTMENT_NOT_FOUND", "Visita não encontrada.");
    }

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

    const updatedResult = existing.updateDetails({
      clientName: input.clientName,
      location: locationResult.value,
      phone: phoneResult.value,
      phoneSecondary: phoneSecondaryResult.value ?? "",
      email: emailResult.value,
      slot: slotResult.value,
      technicianId: technician.id,
      serviceTypeId: serviceType.id,
      notes: input.notes,
      updatedAt: this.now().toISOString(),
    });

    if (!updatedResult.success) {
      return updatedResult;
    }

    const saved = this.appointmentRepository.update(updatedResult.value);
    if (!saved) {
      return fail("APPOINTMENT_NOT_FOUND", "Visita não encontrada.");
    }

    return ok(toAppointmentViewModel(saved, { technician, serviceType, now: this.now() }));
  }
}
