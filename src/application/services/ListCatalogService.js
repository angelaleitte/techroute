import { ok } from "../../core/common/Result.js";
import {
  toResourceViewModel,
  toServiceTypeViewModel,
  toTechnicianViewModel,
} from "../view-models/mappers.js";

export class ListCatalogService {
  constructor({ technicianRepository, serviceTypeRepository, resourceRepository }) {
    this.technicianRepository = technicianRepository;
    this.serviceTypeRepository = serviceTypeRepository;
    this.resourceRepository = resourceRepository;
  }

  listTechnicians() {
    return ok(this.technicianRepository.listActive().map(toTechnicianViewModel));
  }

  listServiceTypes() {
    return ok(this.serviceTypeRepository.listAll().map(toServiceTypeViewModel));
  }

  listResources() {
    return ok(this.resourceRepository.listAll().map(toResourceViewModel));
  }
}
