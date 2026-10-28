import { Appointment } from "../../core/entities/Appointment.js";
import { AppointmentEvent } from "../../core/entities/AppointmentEvent.js";
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
    post_visit_notes: appointment.postVisitNotes || "",
    status: appointment.status.value,
    cancellation_reason: appointment.cancellationReason,
    cancelled_at: appointment.cancelledAt,
    reschedule_reason: appointment.rescheduleReason,
    rescheduled_at: appointment.rescheduledAt,
    attended_at: appointment.attendedAt,
    created_at: appointment.createdAt,
    updated_at: appointment.updatedAt,
  };
}

function toEntity(row, resourceIds = []) {
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
    postVisitNotes: row.post_visit_notes || "",
    resourceIds,
    status: row.status || VISIT_STATUS.OPEN,
    cancellationReason: row.cancellation_reason || "",
    cancelledAt: row.cancelled_at || null,
    rescheduleReason: row.reschedule_reason || "",
    rescheduledAt: row.rescheduled_at || null,
    attendedAt: row.attended_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at || null,
  });

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.value;
}

function toEventEntity(row) {
  return new AppointmentEvent({
    id: row.id,
    appointmentId: row.appointment_id,
    eventType: row.event_type,
    reason: row.reason || "",
    fromDate: row.from_date || null,
    fromTime: row.from_time || null,
    toDate: row.to_date || null,
    toTime: row.to_time || null,
    userId: row.user_id || null,
    actorName: row.actor_name || "",
    createdAt: row.created_at,
  });
}

function toEventRow(event) {
  return {
    id: event.id,
    appointment_id: event.appointmentId,
    event_type: event.eventType,
    reason: event.reason || "",
    from_date: event.fromDate,
    from_time: event.fromTime,
    to_date: event.toDate,
    to_time: event.toTime,
    user_id: event.userId || null,
    actor_name: event.actorName || "",
    created_at: event.createdAt,
  };
}

export class SqliteAppointmentRepository {
  constructor(db) {
    this.db = db;
    this.insertResourceLink = db.prepare(`
      INSERT INTO appointment_resources (appointment_id, resource_id)
      VALUES (?, ?)
    `);
    this.deleteResourceLinks = db.prepare(`
      DELETE FROM appointment_resources WHERE appointment_id = ?
    `);
    this.selectResourceIds = db.prepare(`
      SELECT resource_id
      FROM appointment_resources
      WHERE appointment_id = ?
      ORDER BY resource_id
    `);
    this.insertEventStmt = db.prepare(`
      INSERT INTO appointment_events (
        id, appointment_id, event_type, reason,
        from_date, from_time, to_date, to_time,
        user_id, actor_name, created_at
      ) VALUES (
        @id, @appointment_id, @event_type, @reason,
        @from_date, @from_time, @to_date, @to_time,
        @user_id, @actor_name, @created_at
      )
    `);
    this.selectEventsByAppointment = db.prepare(`
      SELECT *
      FROM appointment_events
      WHERE appointment_id = ?
      ORDER BY created_at ASC, id ASC
    `);
  }

  #loadResourceIds(appointmentId) {
    return this.selectResourceIds.all(appointmentId).map((row) => row.resource_id);
  }

  #replaceResourceLinks(appointmentId, resourceIds) {
    this.deleteResourceLinks.run(appointmentId);
    for (const resourceId of resourceIds) {
      this.insertResourceLink.run(appointmentId, resourceId);
    }
  }

  #insertEvent(event) {
    this.insertEventStmt.run(toEventRow(event));
  }

  save(appointment, event = null) {
    const persist = this.db.transaction(() => {
      this.db
        .prepare(
          `
        INSERT INTO appointments (
          id, client_name, location, phone, phone_secondary, email, visit_date, visit_time,
          technician_id, service_type_id, notes, post_visit_notes,
          status, cancellation_reason, cancelled_at,
          reschedule_reason, rescheduled_at, attended_at, created_at, updated_at
        ) VALUES (
          @id, @client_name, @location, @phone, @phone_secondary, @email, @visit_date, @visit_time,
          @technician_id, @service_type_id, @notes, @post_visit_notes,
          @status, @cancellation_reason, @cancelled_at,
          @reschedule_reason, @rescheduled_at, @attended_at, @created_at, @updated_at
        )
      `,
        )
        .run(toRow(appointment));

      this.#replaceResourceLinks(appointment.id, appointment.resourceIds);
      if (event) {
        this.#insertEvent(event);
      }
      return appointment;
    });

    return persist();
  }

  update(appointment, event = null) {
    const persist = this.db.transaction(() => {
      const result = this.db
        .prepare(
          `
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
          post_visit_notes = @post_visit_notes,
          status = @status,
          cancellation_reason = @cancellation_reason,
          cancelled_at = @cancelled_at,
          reschedule_reason = @reschedule_reason,
          rescheduled_at = @rescheduled_at,
          attended_at = @attended_at,
          updated_at = @updated_at
        WHERE id = @id
      `,
        )
        .run(toRow(appointment));

      if (result.changes === 0) {
        return null;
      }

      this.#replaceResourceLinks(appointment.id, appointment.resourceIds);
      if (event) {
        this.#insertEvent(event);
      }
      return appointment;
    });

    return persist();
  }

  insertEvent(event) {
    this.#insertEvent(event);
    return event;
  }

  findById(id) {
    const row = this.db.prepare(`SELECT * FROM appointments WHERE id = ?`).get(id);
    if (!row) {
      return null;
    }
    return toEntity(row, this.#loadResourceIds(row.id));
  }

  listEventsByAppointmentId(appointmentId) {
    return this.selectEventsByAppointment.all(appointmentId).map(toEventEntity);
  }

  listRecent(limit = 20, { technicianId } = {}) {
    const rows = technicianId
      ? this.db
          .prepare(
            `
          SELECT * FROM appointments
          WHERE technician_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        `,
          )
          .all(technicianId, limit)
      : this.db
          .prepare(
            `
          SELECT * FROM appointments
          ORDER BY created_at DESC
          LIMIT ?
        `,
          )
          .all(limit);

    return rows.map((row) => toEntity(row, this.#loadResourceIds(row.id)));
  }
}
