export const RESOURCE_CATEGORIES = Object.freeze({
  MATERIAL: "material",
  FERRAMENTA: "ferramenta",
  EQUIPAMENTO: "equipamento",
});

const CATEGORY_LABELS = Object.freeze({
  [RESOURCE_CATEGORIES.MATERIAL]: "Materiais",
  [RESOURCE_CATEGORIES.FERRAMENTA]: "Ferramentas",
  [RESOURCE_CATEGORIES.EQUIPAMENTO]: "Equipamentos",
});

const VALID_CATEGORIES = new Set(Object.values(RESOURCE_CATEGORIES));

export class Resource {
  static isValidCategory(category) {
    return VALID_CATEGORIES.has(category);
  }

  static categoryLabel(category) {
    return CATEGORY_LABELS[category] ?? category;
  }

  constructor({ id, name, category, description = "" }) {
    if (!id) {
      throw new Error("Resource precisa de id.");
    }
    if (!name) {
      throw new Error("Resource precisa de name.");
    }
    if (!Resource.isValidCategory(category)) {
      throw new Error("Resource precisa de categoria válida.");
    }

    this.id = id;
    this.name = name;
    this.category = category;
    this.description = description;
    Object.freeze(this);
  }
}
