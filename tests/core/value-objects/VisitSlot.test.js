import assert from "node:assert/strict";
import { test } from "node:test";
import { VisitSlot } from "../../../src/core/value-objects/VisitSlot.js";

test("aceita data e horário válidos", () => {
  const result = VisitSlot.create("2026-11-02", "09:30");
  assert.equal(result.success, true);
  assert.equal(result.value.toLabel(), "02/11/2026 às 09:30");
});

test("rejeita data inexistente", () => {
  const result = VisitSlot.create("2026-02-31", "09:30");
  assert.equal(result.success, false);
  assert.equal(result.error.code, "INVALID_SLOT");
});

test("rejeita horário fora do relógio", () => {
  const result = VisitSlot.create("2026-11-02", "24:15");
  assert.equal(result.success, false);
});

test("compara slots por valor", () => {
  const a = VisitSlot.create("2026-11-02", "09:30").value;
  const b = VisitSlot.create("2026-11-02", "09:30").value;
  assert.equal(a.equals(b), true);
});
