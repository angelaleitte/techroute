import { fail, ok } from "../common/Result.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class EmailAddress {
  static create(raw, { required = true } = {}) {
    const normalized = String(raw ?? "").trim().toLowerCase();

    if (!normalized) {
      if (!required) {
        return ok(null);
      }
      return fail("INVALID_EMAIL", "Informe o e-mail do cliente.");
    }

    if (normalized.length > 120 || !EMAIL_PATTERN.test(normalized)) {
      return fail("INVALID_EMAIL", "Informe um e-mail válido.");
    }

    return ok(new EmailAddress(normalized));
  }

  constructor(value) {
    this.value = value;
    Object.freeze(this);
  }

  equals(other) {
    return other instanceof EmailAddress && other.value === this.value;
  }
}
