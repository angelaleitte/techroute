import {
  clearSessionCookie,
  readSessionToken,
  setSessionCookie,
} from "../middleware/auth.js";

export class AuthController {
  constructor({
    loginService,
    logoutService,
    getCurrentUserService,
    changePasswordService,
    updateProfileService,
  }) {
    this.loginService = loginService;
    this.logoutService = logoutService;
    this.getCurrentUserService = getCurrentUserService;
    this.changePasswordService = changePasswordService;
    this.updateProfileService = updateProfileService;
  }

  login = (request, response) => {
    const result = this.loginService.execute(request.body || {});
    if (!result.success) {
      const status = result.error.code === "AUTH_INVALID" ? 401 : 400;
      response.status(status).json({ error: result.error });
      return;
    }

    setSessionCookie(response, result.value.token, result.value.expiresAt);
    response.json({ user: result.value.user });
  };

  logout = (request, response) => {
    const token = readSessionToken(request);
    this.logoutService.execute(token);
    clearSessionCookie(response);
    response.json({ loggedOut: true });
  };

  me = (request, response) => {
    const token = readSessionToken(request);
    const result = this.getCurrentUserService.execute(token);
    if (!result.success) {
      response.status(401).json({ error: result.error });
      return;
    }
    response.json({ user: result.value });
  };

  changePassword = (request, response) => {
    const result = this.changePasswordService.execute(request.user.id, request.body || {});
    if (!result.success) {
      const status = result.error.code === "AUTH_INVALID" ? 401 : 400;
      response.status(status).json({ error: result.error });
      return;
    }
    response.json(result.value);
  };

  updateProfile = (request, response) => {
    const result = this.updateProfileService.execute(request.user.id, request.body || {});
    if (!result.success) {
      const status = result.error.code === "NOT_FOUND" ? 404 : 400;
      response.status(status).json({ error: result.error });
      return;
    }
    response.json({ user: result.value });
  };
}
