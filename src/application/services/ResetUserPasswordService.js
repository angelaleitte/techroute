import { fail, ok } from "../../core/common/Result.js";
import { hashPassword } from "../../infrastructure/security/password.js";
import { DEFAULT_USER_PASSWORD } from "../common/defaultPassword.js";

export class ResetUserPasswordService {
  constructor({ userRepository, defaultPassword = DEFAULT_USER_PASSWORD }) {
    this.userRepository = userRepository;
    this.defaultPassword = defaultPassword;
  }

  execute(userId) {
    const existing = this.userRepository.findById(userId);
    if (!existing) {
      return fail("NOT_FOUND", "Usuário não encontrado.");
    }

    this.userRepository.updatePassword(userId, hashPassword(this.defaultPassword));

    return ok({
      userId,
      defaultPassword: this.defaultPassword,
    });
  }
}
