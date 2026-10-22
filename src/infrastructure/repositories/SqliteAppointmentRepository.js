import { Appointment } from "../../core/entities/Appointment.js";
import { ClientLocation } from "../../core/value-objects/ClientLocation.js";
import { VisitSlot } from "../../core/value-objects/VisitSlot.js";
import { VISIT_STATUS } from "../../core/value-objects/VisitStatus.js";

const LEGACY_PHONE = "(11) 0000-0000";
const LEGACY_EMAIL = "sem-email@techroute.local";

function toRow(appointment) {
  return {
    id: appointment.id,
    client_name: appointment.clientName,
    location: appointment.location.value,
    phone: appointment.phone,
    phone_secondary: appointment.phoneSecondary,
    email: appointment.email,
    visit_date: appointment.slot.date,
    visit_time: appointment.slot.time,
    technician_id: appointment.technicianId,
    service_type_id: appointment.serviceTypeId,
    notes: appointment.notes,
    resource_ids: JSON.stringify(appointment.resourceIds),
    status: appointment.status.value,
    cancellation_reason: appointment.cancellationReason,
    cancelled_at: appointment.cancelledAt,
    created_at: appointment.createdAt,
    updated_at: appointment.updatedAt,
  };
}

function toEntity(row) {
  const locationResult = ClientLocation.create(row.location);
  const slotResult = VisitSlot.create(row.visit_date, row.visit_time);

  if (!locationResult.success || !slotResult.success) {
    throw new Error("Linha de visita incompatível com as regras do domínio.");
  }

  const result = Appointment.create({
    id: row.id,
    clientName: row.client_name,
    location: locationResult.value,
    phone: String(row.phone ?? "").trim() || LEGACY_PHONE,
    phoneSecondary: String(row.phone_secondary ?? "").trim(),
    email: String(row.email ?? "").trim() || LEGACY_EMAIL,
    slot: slotResult.value,
    technicianId: row.technician_id,
    serviceTypeId: row.service_type_id,
    notes: row.notes,
    resourceIds: JSON.parse(row.resource_ids || "[]"),
    status: row.status || VISIT_STATUS.OPEN,
    cancellationReason: row.cancellation_reason || "",
    cancelledAt: row.cancelled_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at || null,
  });

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.value;
}

export class SqliteAppointmentRepository {
  constructor(db) {
    this.db = db;
  }

  save(appointment) {
    this.db.prepare(`
      INSERT INTO appointments (
        id, client_name, location, phone, phone_secondary, email, visit_date, visit_time,
        technician_id, service_type_id, notes, resource_ids,
        status, cancellation_reason, cancelled_at, created_at, updated_at
      ) VALUES (
        @id, @client_name, @location, @phone, @phone_secondary, @email, @visit_date, @visit_time,
        @technician_id, @service_type_id, @notes, @resource_ids,
        @status, @cancellation_reason, @cancelled_at, @created_at, @updated_at
      )
    `).run(toRow(appointment));

    return appointment;
  }

  update(appointment) {
    const result = this.db.prepare(`
      UPDATE appointments SET
        client_name = @client_name,
        location = @location,
        phone = @phone,
        phone_secondary = @phone_secondary,
        email = @email,
        visit_date = @visit_date,
        visit_time = @visit_time,
        technician_id = @technician_id,
        service_type_id = @service_type_id,
        notes = @notes,
        resource_ids = @resource_ids,
        status = @status,
        cancellation_reason = @cancellation_reason,
        cancelled_at = @cancelled_at,
        updated_at = @updated_at
      WHERE id = @id
    `).run(toRow(appointment));

    if (result.changes === 0) {
      return null;
    }

    return appointment;
  }

  findById(id) {
    const row = this.db.prepare("SELECT * FROM appointments WHERE id = ?").get(id);
    return row ? toEntity(row) : null;
  }

  listRecent(limit = 20) {
    const rows = this.db.prepare(`
      SELECT * FROM appointments
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);

    return rows.map(toEntity);
  }
}
