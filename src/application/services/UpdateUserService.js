import { fail, ok } from "../../core/common/Result.js";
import { toPublicUser } from "./LoginService.js";

export class UpdateUserService {
  constructor({ userRepository, technicianRepository }) {
    this.userRepository = userRepository;
    this.technicianRepository = technicianRepository;
  }

  execute(userId, { displayName, active } = {}) {
    const existing = this.userRepository.findById(userId);
    if (!existing) {
      return fail("NOT_FOUND", "Usuário não encontrado.");
    }

    const nextDisplayName =
      displayName === undefined ? existing.displayName : String(displayName ?? "").trim();
    if (!nextDisplayName) {
      return fail("VALIDATION_ERROR", "Informe o nome de exibição.");
    }

    const nextActive = active === undefined ? existing.active : Boolean(active);

    const updated = this.userRepository.update(userId, {
      displayName: nextDisplayName,
      active: nextActive,
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
          active: existing.role === "technician" ? nextActive : technician.active,
        });
      }
    }

    const refreshedTechnician = updated.technicianId
      ? this.technicianRepository.findById(updated.technicianId)
      : null;

    return ok({
      ...toPublicUser(updated),
      active: updated.active,
      technicianName: refreshedTechnician?.name || "",
      technicianSpecialty: refreshedTechnician?.specialty || "",
    });
  }
}
