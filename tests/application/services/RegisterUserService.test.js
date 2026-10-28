import test from "node:test";
import assert from "node:assert/strict";
import { RegisterUserService } from "../../../src/application/services/RegisterUserService.js";
import { ChangePasswordService } from "../../../src/application/services/ChangePasswordService.js";
import { hashPassword, verifyPassword } from "../../../src/infrastructure/security/password.js";
import { Technician } from "../../../src/core/entities/Technician.js";

function createUserRepo(seed = []) {
  const users = [...seed];
  return {
    findByUsername(username) {
      return users.find((user) => user.username.toLowerCase() === String(username).toLowerCase()) || null;
    },
    findById(id) {
      return users.find((user) => user.id === id) || null;
    },
    findByTechnicianId(technicianId) {
      return users.find((user) => user.technicianId === technicianId) || null;
    },
    create(user) {
      users.push(user);
      return user;
    },
    updatePassword(id, passwordHash) {
      const user = users.find((item) => item.id === id);
      if (!user) {
        return false;
      }
      user.passwordHash = passwordHash;
      return true;
    },
  };
}

function createTechnicianRepo(seed = []) {
  const technicians = [...seed];
  return {
    findById(id) {
      return technicians.find((item) => item.id === id) || null;
    },
    create(technician) {
      technicians.push(technician);
      return technician;
    },
  };
}

test("RegisterUserService cria técnico com senha padrão", () => {
  const userRepository = createUserRepo();
  const technicianRepository = createTechnicianRepo();
  const service = new RegisterUserService({
    userRepository,
    technicianRepository,
    createId: () => "id-1",
    defaultPassword: "TechRoute@123",
  });

  const result = service.execute({
    username: "maria",
    displayName: "Maria Silva",
    role: "technician",
    specialty: "Instalação",
  });

  assert.equal(result.success, true);
  assert.equal(result.value.defaultPassword, "TechRoute@123");
  assert.equal(result.value.user.role, "technician");
  assert.ok(result.value.user.technicianId);
  assert.equal(technicianRepository.findById("id-1").name, "Maria Silva");
});

test("ChangePasswordService troca senha com senha atual válida", () => {
  const userRepository = createUserRepo([
    {
      id: "u1",
      username: "ana",
      passwordHash: hashPassword("antiga"),
      displayName: "Ana",
      role: "technician",
      technicianId: "t1",
      active: true,
    },
  ]);
  const service = new ChangePasswordService({ userRepository });
  const result = service.execute("u1", {
    currentPassword: "antiga",
    newPassword: "nova123",
  });

  assert.equal(result.success, true);
  assert.equal(verifyPassword("nova123", userRepository.findById("u1").passwordHash), true);
});

test("RegisterUserService rejeita username duplicado", () => {
  const userRepository = createUserRepo([
    {
      id: "u1",
      username: "supervisor",
      passwordHash: "x",
      displayName: "Supervisor",
      role: "supervisor",
      technicianId: null,
      active: true,
    },
  ]);
  const service = new RegisterUserService({
    userRepository,
    technicianRepository: createTechnicianRepo(),
  });

  const result = service.execute({
    username: "supervisor",
    displayName: "Outro",
    role: "supervisor",
  });

  assert.equal(result.success, false);
  assert.equal(result.error.code, "CONFLICT");
});

test("RegisterUserService vincula técnico existente sem usuário", () => {
  const technician = new Technician({
    id: "tech-livre",
    name: "Técnico Livre",
    specialty: "Campo",
    active: true,
  });
  const service = new RegisterUserService({
    userRepository: createUserRepo(),
    technicianRepository: createTechnicianRepo([technician]),
    createId: () => "user-novo",
  });

  const result = service.execute({
    username: "livre",
    displayName: "Técnico Livre",
    role: "technician",
    technicianId: "tech-livre",
  });

  assert.equal(result.success, true);
  assert.equal(result.value.user.technicianId, "tech-livre");
});
