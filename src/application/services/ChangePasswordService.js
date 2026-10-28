import { fail, ok } from "../../core/common/Result.js";
import { hashPassword, verifyPassword } from "../../infrastructure/security/password.js";

export class ChangePasswordService {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  execute(userId, { currentPassword, newPassword } = {}) {
    const current = String(currentPassword ?? "");
    const next = String(newPassword ?? "");

    if (!current || !next) {
      return fail("VALIDATION_ERROR", "Informe a senha atual e a nova senha.");
    }

    if (next.length < 6) {
      return fail("VALIDATION_ERROR", "A nova senha deve ter pelo menos 6 caracteres.");
    }

    if (current === next) {
      return fail("VALIDATION_ERROR", "A nova senha deve ser diferente da senha atual.");
    }

    const user = this.userRepository.findById(userId);
    if (!user || !user.active) {
      return fail("NOT_FOUND", "Usuário não encontrado.");
    }

    if (!verifyPassword(current, user.passwordHash)) {
      return fail("AUTH_INVALID", "Senha atual incorreta.");
    }

    this.userRepository.updatePassword(userId, hashPassword(next));
    return ok({ changed: true });
  }
}
