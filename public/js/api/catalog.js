import { request } from "./http.js";

export async function fetchTechnicians() {
  const result = await request("/api/technicians");
  if (!result.success) {
    return result;
  }
  return { success: true, value: result.value.technicians };
}

export async function fetchServiceTypes() {
  const result = await request("/api/service-types");
  if (!result.success) {
    return result;
  }
  return { success: true, value: result.value.serviceTypes };
}
