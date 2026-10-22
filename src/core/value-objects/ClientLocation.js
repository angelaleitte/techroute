import { fail, ok } from "../common/Result.js";

export class ClientLocation {
  static create(raw) {
    const value = String(raw ?? "").trim().replace(/\s+/g, " ");

    if (!value) {
      return fail("INVALID_LOCATION", "Informe a localização do cliente.");
    }

    if (value.length < 5) {
      return fail("INVALID_LOCATION", "Informe um endereço mais completo.");
    }

    return ok(new ClientLocation(value));
  }

  constructor(value) {
    this.value = value;
    Object.freeze(this);
  }

  equals(other) {
    return other instanceof ClientLocation && other.value === this.value;
  }
}
