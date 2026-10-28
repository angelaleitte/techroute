export function actorFromUser(user) {
  if (!user) {
    return { userId: null, actorName: "" };
  }

  return {
    userId: user.id || null,
    actorName: String(user.displayName || user.username || "").trim(),
  };
}
