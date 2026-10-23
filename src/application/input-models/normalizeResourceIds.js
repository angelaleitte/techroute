export function normalizeResourceIds(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  const seen = new Set();
  const ids = [];

  for (const item of raw) {
    const id = String(item ?? "").trim();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    ids.push(id);
  }

  return ids;
}
