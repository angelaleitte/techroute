import { ok } from "../../core/common/Result.js";
import { toServiceTypeViewModel, toTechnicianViewModel } from "../view-models/mappers.js";

export class ListCatalogService {
  constructor({ technicianRepository, serviceTypeRepository }) {
    this.technicianRepository = technicianRepository;
    this.serviceTypeRepository = serviceTypeRepository;
  }

  listTechnicians() {
    return ok(this.technicianRepository.listActive().map(toTechnicianViewModel));
  }

  listServiceTypes() {
    return ok(this.serviceTypeRepository.listAll().map(toServiceTypeViewModel));
  }
}
