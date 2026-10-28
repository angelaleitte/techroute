import { fail, ok } from "../../core/common/Result.js";
import { toPublicUser } from "./LoginService.js";

export class UpdateProfileService {
  constructor({ userRepository, technicianRepository }) {
    this.userRepository = userRepository;
    this.technicianRepository = technicianRepository;
  }

  execute(userId, { displayName } = {}) {
    const existing = this.userRepository.findById(userId);
    if (!existing || !existing.active) {
      return fail("NOT_FOUND", "Usuário não encontrado.");
    }

    const nextDisplayName = String(displayName ?? "").trim();
    if (!nextDisplayName) {
      return fail("VALIDATION_ERROR", "Informe o nome de exibição.");
    }

    const updated = this.userRepository.update(userId, {
      displayName: nextDisplayName,
      active: existing.active,
    });

    if (!updated) {
      return fail("NOT_FOUND", "Usuário não encontrado.");
    }

    if (updated.technicianId) {
      const technician = this.technicianRepository.findById(updated.technicianId);
      if (technician) {
        this.technicianRepository.update(technician.id, {
          name: nextDisplayName,
          specialty: technician.specialty,
          active: technician.active,
        });
      }
    }

    return ok(toPublicUser(updated));
  }
}
