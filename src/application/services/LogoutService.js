import { ok } from "../../core/common/Result.js";

export class LogoutService {
  constructor({ sessionRepository }) {
    this.sessionRepository = sessionRepository;
  }

  execute(token) {
    if (token) {
      this.sessionRepository.delete(token);
    }
    return ok({ loggedOut: true });
  }
}
