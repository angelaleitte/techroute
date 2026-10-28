import { request } from "./http.js";

export async function login(username, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: { username, password },
  });
}

export async function logout() {
  return request("/api/auth/logout", { method: "POST" });
}

export async function fetchCurrentUser() {
  return request("/api/auth/me");
}

export async function updateProfile(displayName) {
  return request("/api/auth/profile", {
    method: "PUT",
    body: { displayName },
  });
}

export async function changePassword(currentPassword, newPassword) {
  return request("/api/auth/password", {
    method: "PUT",
    body: { currentPassword, newPassword },
  });
}
