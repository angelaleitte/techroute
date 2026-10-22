export function ok(value) {
  return Object.freeze({
    success: true,
    value,
    error: null,
  });
}

export function fail(code, message) {
  return Object.freeze({
    success: false,
    value: null,
    error: Object.freeze({ code, message }),
  });
}
