import { request } from "./http.js";

export async function fetchUsers() {
  const result = await request("api/users");
  if (!result.success) {
    return result;
  }
  return { success: true, value: result.value.users };
}

export async function fetchAvailableTechnicians() {
  const result = await request("api/users/available-technicians");
  if (!result.success) {
    return result;
  }
  return { success: true, value: result.value.technicians };
}

export async function createUser(payload) {
  return request("api/users", {
    method: "POST",
    body: payload,
  });
}

export async function updateUser(id, payload) {
  return request(`api/users/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: payload,
  });
}

export async function resetUserPassword(id) {
  return request(`api/users/${encodeURIComponent(id)}/reset-password`, {
    method: "POST",
  });
}
