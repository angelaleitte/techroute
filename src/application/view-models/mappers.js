import { AppointmentEvent } from "../../core/entities/AppointmentEvent.js";
import { Resource } from "../../core/entities/Resource.js";
import { VisitStatus } from "../../core/value-objects/VisitStatus.js";

function formatSlotLabel(date, time) {
  if (!date || !time) {
    return "";
  }
  const [year, month, day] = String(date).split("-");
  if (!year || !month || !day) {
    return `${date} às ${time}`;
  }
  return `${day}/${month}/${year} às ${time}`;
}

function formatDateTimeLabel(iso) {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return String(iso);
  }
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function toAppointmentEventViewModel(event) {
  const fromSlotLabel = formatSlotLabel(event.fromDate, event.fromTime);
  const toSlotLabel = formatSlotLabel(event.toDate, event.toTime);

  return {
    id: event.id,
    eventType: event.eventType,
    eventTypeLabel: AppointmentEvent.labelFor(event.eventType),
    eventTypeBadgeClass: AppointmentEvent.badgeClassFor(event.eventType),
    reason: event.reason || "",
    fromDate: event.fromDate,
    fromTime: event.fromTime,
    toDate: event.toDate,
    toTime: event.toTime,
    fromSlotLabel,
    toSlotLabel,
    userId: event.userId || null,
    actorName: event.actorName || "",
    createdAt: event.createdAt,
    createdAtLabel: formatDateTimeLabel(event.createdAt),
  };
}

export function toResourceViewModel(resource) {
  return {
    id: resource.id,
    name: resource.name,
    category: resource.category,
    categoryLabel: Resource.categoryLabel(resource.category),
    description: resource.description,
  };
}

export function toAppointmentViewModel(
  appointment,
  { technician, serviceType, resources = [], events = [], now } = {},
) {
  const displayStatus = appointment.resolveDisplayStatus(now);
  const resolvedResources = resources.map(toResourceViewModel);
  const canChange = appointment.status.allowsChanges();
  const canReopen = appointment.status.canReopen();
  const canAttend = appointment.status.canStartAttendance();
  const isInProgress = appointment.status.isInProgress();
  const resolvedEvents = events.map(toAppointmentEventViewModel);

  return {
    id: appointment.id,
    clientName: appointment.clientName,
    location: appointment.location.value,
    phone: appointment.phone,
    phoneSecondary: appointment.phoneSecondary,
    email: appointment.email,
    date: appointment.slot.date,
    time: appointment.slot.time,
    slotLabel: appointment.slot.toLabel(),
    technicianId: appointment.technicianId,
    technicianName: technician?.name ?? "",
    serviceTypeId: appointment.serviceTypeId,
    serviceTypeName: serviceType?.name ?? "",
    notes: appointment.notes,
    postVisitNotes: appointment.postVisitNotes || "",
    attendedAt: appointment.attendedAt,
    attendedAtLabel: formatDateTimeLabel(appointment.attendedAt),
    resourceIds: [...appointment.resourceIds],
    resources: resolvedResources,
    resourceCount: resolvedResources.length,
    status: appointment.status.value,
    displayStatus,
    statusLabel: VisitStatus.labelFor(displayStatus),
    statusBadgeClass: VisitStatus.badgeClassFor(displayStatus),
    canEdit: canChange && !isInProgress,
    canCancel: canChange,
    canClose: canChange,
    canReschedule: canChange && !isInProgress,
    canAttend,
    canEditPostVisitNotes: isInProgress,
    canReopen,
    canAllocateResources: canChange && !isInProgress,
    cancellationReason: appointment.cancellationReason,
    cancelledAt: appointment.cancelledAt,
    rescheduleReason: appointment.rescheduleReason,
    rescheduledAt: appointment.rescheduledAt,
    events: resolvedEvents,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  };
}

export function toTechnicianViewModel(technician) {
  return {
    id: technician.id,
    name: technician.name,
    specialty: technician.specialty,
  };
}

export function toServiceTypeViewModel(serviceType) {
  return {
    id: serviceType.id,
    name: serviceType.name,
    description: serviceType.description,
  };
}
