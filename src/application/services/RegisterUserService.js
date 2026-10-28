import { randomUUID } from "node:crypto";
import { fail, ok } from "../../core/common/Result.js";
import { Technician } from "../../core/entities/Technician.js";
import { hashPassword } from "../../infrastructure/security/password.js";
import { DEFAULT_USER_PASSWORD } from "../common/defaultPassword.js";
import { toPublicUser } from "./LoginService.js";

const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/i;

export class RegisterUserService {
  constructor({
    userRepository,
    technicianRepository,
    createId = () => randomUUID(),
    defaultPassword = DEFAULT_USER_PASSWORD,
  }) {
    this.userRepository = userRepository;
    this.technicianRepository = technicianRepository;
    this.createId = createId;
    this.defaultPassword = defaultPassword;
  }

  execute({ username, displayName, role, technicianId = null, specialty = "" } = {}) {
    const normalizedUsername = String(username ?? "")
      .trim()
      .toLowerCase();
    const normalizedDisplayName = String(displayName ?? "").trim();
    const normalizedRole = String(role ?? "").trim();
    const normalizedSpecialty = String(specialty ?? "").trim();

    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      return fail(
        "VALIDATION_ERROR",
        "Usuário deve ter 3 a 32 caracteres (letras, números, ponto, hífen ou underline).",
      );
    }

    if (!normalizedDisplayName) {
      return fail("VALIDATION_ERROR", "Informe o nome de exibição.");
    }

    if (normalizedRole !== "supervisor" && normalizedRole !== "technician") {
      return fail("VALIDATION_ERROR", "Tipo de acesso inválido.");
    }

    if (this.userRepository.findByUsername(normalizedUsername)) {
      return fail("CONFLICT", "Já existe um usuário com este login.");
    }

    let resolvedTechnicianId = null;
    let createdTechnician = null;

    if (normalizedRole === "technician") {
      const existingTechnicianId = String(technicianId ?? "").trim();
      if (existingTechnicianId) {
        const technician = this.technicianRepository.findById(existingTechnicianId);
        if (!technician || !technician.active) {
          return fail("VALIDATION_ERROR", "Técnico selecionado inválido ou inativo.");
        }
        if (this.userRepository.findByTechnicianId(existingTechnicianId)) {
          return fail("CONFLICT", "Este técnico já possui um usuário vinculado.");
        }
        resolvedTechnicianId = existingTechnicianId;
      } else {
        const technician = new Technician({
          id: this.createId(),
          name: normalizedDisplayName,
          specialty: normalizedSpecialty,
          active: true,
        });
        this.technicianRepository.create(technician);
        createdTechnician = technician;
        resolvedTechnicianId = technician.id;
      }
    }

    const user = {
      id: this.createId(),
      username: normalizedUsername,
      passwordHash: hashPassword(this.defaultPassword),
      displayName: normalizedDisplayName,
      role: normalizedRole,
      technicianId: resolvedTechnicianId,
      active: true,
    };

    this.userRepository.create(user);

    return ok({
      user: {
        ...toPublicUser(user),
        active: true,
        technicianName: createdTechnician?.name || "",
        technicianSpecialty: createdTechnician?.specialty || normalizedSpecialty,
      },
      defaultPassword: this.defaultPassword,
    });
  }
}
