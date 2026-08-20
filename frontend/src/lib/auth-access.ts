import type { Role } from "@prisma/client";

export const DEFAULT_STUDENT_EMAIL_DOMAIN = "iiitl.ac.in";

export function studentEmailDomain(value = process.env.STUDENT_EMAIL_DOMAIN) {
  return (value?.trim() || DEFAULT_STUDENT_EMAIL_DOMAIN).toLowerCase().replace(/^@/, "");
}

function domainOf(email: string) {
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : email.slice(at + 1);
}

function normalize(email: string | null | undefined) {
  const trimmed = email?.trim().toLowerCase();
  return trimmed || null;
}

/**
 * ADMIN_EMAILS is the only source of administrator access. There is no
 * built-in administrator: an address that is not listed here can never hold
 * the ADMIN role, and removing an address revokes it on the next sign-in.
 */
export function configuredAdminEmails(value = process.env.ADMIN_EMAILS) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined, configured?: string) {
  const normalized = normalize(email);
  return Boolean(normalized && configuredAdminEmails(configured).has(normalized));
}

export function isStudentEmail(email: string | null | undefined, domain?: string) {
  const normalized = normalize(email);
  return Boolean(normalized && domainOf(normalized) === studentEmailDomain(domain));
}

/**
 * Students must hold an institute address. Administrators listed in
 * ADMIN_EMAILS may sign in from an external provider account.
 */
export function canUseGoogleAccount(
  email: string | null | undefined,
  configured?: string,
  domain?: string,
) {
  return isStudentEmail(email, domain) || isAdminEmail(email, configured);
}

export function resolveRole(email: string | null | undefined, configured?: string): Role {
  return isAdminEmail(email, configured) ? "ADMIN" : "STUDENT";
}
