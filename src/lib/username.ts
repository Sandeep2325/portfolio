export const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,20}$/;
export const USERNAME_RULES = "3–20 characters: letters, numbers, dot, underscore or hyphen.";

/** Names that would impersonate the owner or collide with built-in labels. */
const RESERVED = new Set([
  "admin",
  "administrator",
  "root",
  "owner",
  "support",
  "moderator",
  "system",
  "sandeep",
  "sandeepgowda",
  "guest",
  "ghost",
  "me",
  "null",
  "undefined",
]);

export type UsernameCheck = { ok: true; value: string } | { ok: false; error: string };

export function validateUsername(raw: string | null | undefined): UsernameCheck {
  const value = (raw || "").trim();
  if (!value) return { ok: false, error: "Choose a username." };
  if (!USERNAME_PATTERN.test(value)) return { ok: false, error: USERNAME_RULES };
  if (RESERVED.has(value.toLowerCase())) return { ok: false, error: "That username is reserved." };
  return { ok: true, value };
}
