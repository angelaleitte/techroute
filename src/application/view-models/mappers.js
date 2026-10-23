import { Resource } from "../../core/entities/Resource.js";
import { VisitStatus } from "../../core/value-objects/VisitStatus.js";

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
  { technician, serviceType, resources = [], now } = {},
) {
  const displayStatus = appointment.resolveDisplayStatus(now);
  const resolvedResources = resources.map(toResourceViewModel);

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
    resourceIds: [...appointment.resourceIds],
    resources: resolvedResources,
    resourceCount: resolvedResources.length,
    status: appointment.status.value,
    displayStatus,
    statusLabel: VisitStatus.labelFor(displayStatus),
    statusBadgeClass: VisitStatus.badgeClassFor(displayStatus),
    canEdit: appointment.status.allowsChanges(),
    canCancel: appointment.status.allowsChanges(),
    canClose: appointment.status.allowsChanges(),
    canAllocateResources: appointment.status.allowsChanges(),
    cancellationReason: appointment.cancellationReason,
    cancelledAt: appointment.cancelledAt,
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
