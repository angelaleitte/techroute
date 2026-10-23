import { normalizeResourceIds } from "./normalizeResourceIds.js";

export function normalizeRegisterAppointmentInput(raw = {}) {
  return {
    clientName: String(raw.clientName ?? "").trim(),
    location: String(raw.location ?? "").trim(),
    phone: String(raw.phone ?? "").trim(),
    phoneSecondary: String(raw.phoneSecondary ?? "").trim(),
    email: String(raw.email ?? "").trim(),
    date: String(raw.date ?? "").trim(),
    time: String(raw.time ?? "").trim(),
    technicianId: String(raw.technicianId ?? "").trim(),
    serviceTypeId: String(raw.serviceTypeId ?? "").trim(),
    notes: String(raw.notes ?? "").trim(),
    resourceIds: normalizeResourceIds(raw.resourceIds),
  };
}
