const COOKIE_NAME = "techroute_session";

export function parseCookies(header = "") {
  const cookies = {};
  for (const part of String(header).split(";")) {
    const index = part.indexOf("=");
    if (index === -1) {
      continue;
    }
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) {
      cookies[key] = decodeURIComponent(value);
    }
  }
  return cookies;
}

export function readSessionToken(request) {
  const cookies = parseCookies(request.headers.cookie);
  return cookies[COOKIE_NAME] || null;
}

export function setSessionCookie(response, token, expiresAt) {
  const maxAge = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  response.setHeader(
    "Set-Cookie",
    [
      `${COOKIE_NAME}=${encodeURIComponent(token)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Max-Age=${maxAge}`,
    ].join("; "),
  );
}

export function clearSessionCookie(response) {
  response.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
}

export function createAuthMiddleware(getCurrentUserService) {
  return function requireAuth(request, response, next) {
    const token = readSessionToken(request);
    const result = getCurrentUserService.execute(token);
    if (!result.success) {
      response.status(401).json({ error: result.error });
      return;
    }

    request.user = result.value;
    request.sessionToken = token;
    next();
  };
}

export function requireRole(...roles) {
  return function roleGuard(request, response, next) {
    if (!request.user || !roles.includes(request.user.role)) {
      response.status(403).json({
        error: { code: "FORBIDDEN", message: "Você não tem permissão para esta ação." },
      });
      return;
    }
    next();
  };
}

export { COOKIE_NAME };
