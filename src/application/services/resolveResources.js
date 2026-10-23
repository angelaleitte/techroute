import { fail, ok } from "../../core/common/Result.js";
import { normalizeResourceIds } from "../input-models/normalizeResourceIds.js";

export function resolveResources(resourceRepository, rawResourceIds) {
  const resourceIds = normalizeResourceIds(rawResourceIds);

  if (resourceIds.length === 0) {
    return ok([]);
  }

  const resources = resourceRepository.findByIds(resourceIds);
  if (resources.length !== resourceIds.length) {
    return fail("RESOURCE_NOT_FOUND", "Um ou mais recursos selecionados não existem.");
  }

  return ok(resources);
}
