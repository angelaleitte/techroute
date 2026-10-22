import { fail, ok } from "../common/Result.js";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isRealCalendarDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export class VisitSlot {
  static create(date, time) {
    const normalizedDate = String(date ?? "").trim();
    const normalizedTime = String(time ?? "").trim();

    if (!normalizedDate) {
      return fail("INVALID_SLOT", "Informe a data da visita.");
    }

    if (!normalizedTime) {
      return fail("INVALID_SLOT", "Informe o horário da visita.");
    }

    const dateMatch = DATE_PATTERN.exec(normalizedDate);
    if (!dateMatch) {
      return fail("INVALID_SLOT", "Data da visita inválida.");
    }

    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);

    if (!isRealCalendarDate(year, month, day)) {
      return fail("INVALID_SLOT", "Data da visita inválida.");
    }

    if (!TIME_PATTERN.test(normalizedTime)) {
      return fail("INVALID_SLOT", "Horário da visita inválido.");
    }

    return ok(new VisitSlot(normalizedDate, normalizedTime));
  }

  constructor(date, time) {
    this.date = date;
    this.time = time;
    Object.freeze(this);
  }

  equals(other) {
    return other instanceof VisitSlot && other.date === this.date && other.time === this.time;
  }

  toLabel() {
    const [year, month, day] = this.date.split("-");
    return `${day}/${month}/${year} às ${this.time}`;
  }
}
