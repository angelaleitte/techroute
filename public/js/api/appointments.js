import { request } from "./http.js";

export async function createAppointment(payload) {
  const result = await request("api/appointments", {
    method: "POST",
    body: payload,
  });

  if (!result.success) {
    return result;
  }

  return { success: true, value: result.value.appointment };
}

export async function updateAppointment(id, payload) {
  const result = await request(`api/appointments/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: payload,
  });

  if (!result.success) {
    return result;
  }

  return { success: true, value: result.value.appointment };
}

export async function cancelAppointment(id, reason) {
  const result = await request(`api/appointments/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    body: { reason },
  });

  if (!result.success) {
    return result;
  }

  return { success: true, value: result.value.appointment };
}

export async function closeAppointment(id) {
  const result = await request(`api/appointments/${encodeURIComponent(id)}/close`, {
    method: "POST",
  });

  if (!result.success) {
    return result;
  }

  return { success: true, value: result.value.appointment };
}

export async function fetchAppointments() {
  const result = await request("api/appointments");
  if (!result.success) {
    return result;
  }
  return { success: true, value: result.value.appointments };
}
