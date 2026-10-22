import { fail, ok } from "../common/Result.js";

function formatBr(digits) {
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
}

export class PhoneNumber {
  static create(raw, { required = true, fieldLabel = "telefone" } = {}) {
    const trimmed = String(raw ?? "").trim();

    if (!trimmed) {
      if (!required) {
        return ok(null);
      }
      return fail("INVALID_PHONE", `Informe o ${fieldLabel}.`);
    }

    const digits = trimmed.replace(/\D/g, "");

    if (digits.length < 10 || digits.length > 11) {
      return fail("INVALID_PHONE", `Informe um ${fieldLabel} válido com DDD (10 ou 11 dígitos).`);
    }

    return ok(new PhoneNumber(formatBr(digits), digits));
  }

  constructor(value, digits) {
    this.value = value;
    this.digits = digits;
    Object.freeze(this);
  }

  equals(other) {
    return other instanceof PhoneNumber && other.digits === this.digits;
  }
}
