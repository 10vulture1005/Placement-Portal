/**
 * ADMIN_EMAILS is the only source of administrator access. Keeping the parser
 * here lets the seed and the reconcile script agree without importing across
 * package boundaries.
 */
export function parseAdminEmails(value = process.env.ADMIN_EMAILS): string[] {
  return [
    ...new Set(
      (value ?? "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}
