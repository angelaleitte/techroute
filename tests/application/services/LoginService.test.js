import test from "node:test";
import assert from "node:assert/strict";
import { LoginService } from "../../../src/application/services/LoginService.js";
import { hashPassword } from "../../../src/infrastructure/security/password.js";

function createRepos() {
  const passwordHash = hashPassword("123456");
  const users = new Map([
    [
      "ana",
      {
        id: "user-ana",
        username: "ana",
        passwordHash,
        displayName: "Ana Souza",
        role: "technician",
        technicianId: "tech-ana",
        active: true,
      },
    ],
  ]);
  const sessions = [];

  return {
    userRepository: {
      findByUsername(username) {
        return users.get(String(username).toLowerCase()) || null;
      },
    },
    sessionRepository: {
      deleteExpired() {},
      create(session) {
        sessions.push(session);
      },
      sessions,
    },
  };
}

test("LoginService autentica técnico com senha válida", () => {
  const repos = createRepos();
  const service = new LoginService(repos);
  const result = service.execute({ username: "ana", password: "123456" });

  assert.equal(result.success, true);
  assert.equal(result.value.user.role, "technician");
  assert.equal(result.value.user.technicianId, "tech-ana");
  assert.ok(result.value.token);
  assert.equal(repos.sessionRepository.sessions.length, 1);
});

test("LoginService rejeita senha inválida", () => {
  const service = new LoginService(createRepos());
  const result = service.execute({ username: "ana", password: "errada" });
  assert.equal(result.success, false);
  assert.equal(result.error.code, "AUTH_INVALID");
});
