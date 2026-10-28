import { fail, ok } from "../../core/common/Result.js";
import { toPublicUser } from "./LoginService.js";

export class GetCurrentUserService {
  constructor({ userRepository, sessionRepository, now = () => new Date() }) {
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.now = now;
  }

  execute(token) {
    if (!token) {
      return fail("AUTH_REQUIRED", "Faça login para continuar.");
    }

    const session = this.sessionRepository.findValid(token, this.now().toISOString());
    if (!session) {
      return fail("AUTH_REQUIRED", "Sessão expirada. Faça login novamente.");
    }

    const user = this.userRepository.findById(session.userId);
    if (!user || !user.active) {
      this.sessionRepository.delete(token);
      return fail("AUTH_REQUIRED", "Usuário indisponível. Faça login novamente.");
    }

    return ok(toPublicUser(user));
  }
}
