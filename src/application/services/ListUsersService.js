import { ok } from "../../core/common/Result.js";
import { toPublicUser } from "./LoginService.js";

export class ListUsersService {
  constructor({ userRepository, technicianRepository }) {
    this.userRepository = userRepository;
    this.technicianRepository = technicianRepository;
  }

  execute() {
    const technicians = new Map(
      this.technicianRepository.listAll().map((technician) => [technician.id, technician]),
    );

    const users = this.userRepository.listAll().map((user) => {
      const technician = user.technicianId ? technicians.get(user.technicianId) : null;
      return {
        ...toPublicUser(user),
        active: user.active,
        technicianName: technician?.name || "",
        technicianSpecialty: technician?.specialty || "",
      };
    });

    return ok(users);
  }
}
