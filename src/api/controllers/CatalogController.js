export class CatalogController {
  constructor({ listCatalogService }) {
    this.listCatalogService = listCatalogService;
  }

  technicians = (_request, response) => {
    const result = this.listCatalogService.listTechnicians();
    response.status(200).json({ technicians: result.value });
  };

  serviceTypes = (_request, response) => {
    const result = this.listCatalogService.listServiceTypes();
    response.status(200).json({ serviceTypes: result.value });
  };

  resources = (_request, response) => {
    const result = this.listCatalogService.listResources();
    response.status(200).json({ resources: result.value });
  };
}
