import { fail, ok } from "../../core/common/Result.js";
import { createSessionToken, verifyPassword } from "../../infrastructure/security/password.js";

const SESSION_DAYS = 7;

export class LoginService {
  constructor({ userRepository, sessionRepository, now = () => new Date() }) {
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.now = now;
  }

  execute({ username, password }) {
    const normalizedUsername = String(username ?? "").trim();
    const normalizedPassword = String(password ?? "");

    if (!normalizedUsername || !normalizedPassword) {
      return fail("VALIDATION_ERROR", "Informe usuário e senha.");
    }

    const user = this.userRepository.findByUsername(normalizedUsername);
    if (!user || !user.active || !verifyPassword(normalizedPassword, user.passwordHash)) {
      return fail("AUTH_INVALID", "Usuário ou senha inválidos.");
    }

    const now = this.now();
    const expiresAt = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    const token = createSessionToken();

    this.sessionRepository.deleteExpired(now.toISOString());
    this.sessionRepository.create({
      token,
      userId: user.id,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
    });

    return ok({
      token,
      expiresAt: expiresAt.toISOString(),
      user: toPublicUser(user),
    });
  }
}

export function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    technicianId: user.technicianId,
  };
}
