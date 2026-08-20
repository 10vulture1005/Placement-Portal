import assert from "node:assert/strict";
import test from "node:test";
import {
  canUseGoogleAccount,
  isAdminEmail,
  isStudentEmail,
  resolveRole,
  studentEmailDomain,
} from "./auth-access";

test("institute accounts sign in as students", () => {
  assert.equal(canUseGoogleAccount("student@iiitl.ac.in", "external@gmail.com"), true);
  assert.equal(isStudentEmail("student@iiitl.ac.in"), true);
  assert.equal(isAdminEmail("student@iiitl.ac.in", "external@gmail.com"), false);
  assert.equal(resolveRole("student@iiitl.ac.in", "external@gmail.com"), "STUDENT");
});

test("configured external administrators are allowed and receive admin access", () => {
  assert.equal(canUseGoogleAccount("EXTERNAL@GMAIL.COM", "external@gmail.com"), true);
  assert.equal(isAdminEmail("  External@Gmail.com  ", "external@gmail.com"), true);
  assert.equal(resolveRole("external@gmail.com", "external@gmail.com"), "ADMIN");
});

test("unlisted external accounts are rejected", () => {
  assert.equal(canUseGoogleAccount("someone@gmail.com", "external@gmail.com"), false);
  assert.equal(resolveRole("someone@gmail.com", "external@gmail.com"), "STUDENT");
});

test("there is no built-in administrator when ADMIN_EMAILS is empty", () => {
  assert.equal(isAdminEmail("placements@iiitl.ac.in", ""), false);
  assert.equal(resolveRole("placements@iiitl.ac.in", ""), "STUDENT");
  // The institute domain still grants student access.
  assert.equal(canUseGoogleAccount("placements@iiitl.ac.in", ""), true);
});

test("an institute administrator keeps admin only while listed", () => {
  assert.equal(resolveRole("head@iiitl.ac.in", "head@iiitl.ac.in"), "ADMIN");
  assert.equal(resolveRole("head@iiitl.ac.in", ""), "STUDENT");
});

test("lookalike domains are not treated as institute accounts", () => {
  assert.equal(isStudentEmail("attacker@notiiitl.ac.in"), false);
  assert.equal(isStudentEmail("attacker@evil-iiitl.ac.in"), false);
  assert.equal(isStudentEmail("attacker@sub.iiitl.ac.in"), false);
  assert.equal(canUseGoogleAccount("attacker@notiiitl.ac.in", ""), false);
});

test("the student domain is configurable and tolerates a leading @", () => {
  assert.equal(studentEmailDomain("example.edu"), "example.edu");
  assert.equal(studentEmailDomain("@Example.EDU"), "example.edu");
  assert.equal(studentEmailDomain(undefined), "iiitl.ac.in");
  assert.equal(studentEmailDomain(""), "iiitl.ac.in");
  assert.equal(isStudentEmail("student@example.edu", "example.edu"), true);
  assert.equal(isStudentEmail("student@iiitl.ac.in", "example.edu"), false);
});

test("blank and malformed values never grant access", () => {
  assert.equal(canUseGoogleAccount(null, "external@gmail.com"), false);
  assert.equal(canUseGoogleAccount(undefined, "external@gmail.com"), false);
  assert.equal(canUseGoogleAccount("", "external@gmail.com"), false);
  assert.equal(canUseGoogleAccount("no-at-sign", "external@gmail.com"), false);
  // An empty ADMIN_EMAILS entry must not match an empty-ish address.
  assert.equal(isAdminEmail("", " , , "), false);
});
