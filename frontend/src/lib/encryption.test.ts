import assert from "node:assert/strict";
import test from "node:test";
import {
  decryptBuffer,
  decryptSensitiveValue,
  encryptBuffer,
  encryptSensitiveValue,
} from "./encryption";

const key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

test("sensitive values round-trip through AES-256-GCM", () => {
  const encrypted = encryptSensitiveValue("123456789012", key);
  assert.notEqual(encrypted, "123456789012");
  assert.equal(decryptSensitiveValue(encrypted, key), "123456789012");
});

test("invalid encryption keys are rejected", () =>
  assert.throws(() => encryptSensitiveValue("value", "bad-key"), /ENCRYPTION_KEY/));

test("binary buffers round-trip through AES-256-GCM encryptBuffer and decryptBuffer", () => {
  const samplePdf = Buffer.from("%PDF-1.4 sample encrypted binary payload %%EOF");
  const encrypted = encryptBuffer(samplePdf, key);
  assert.notEqual(encrypted.toString("utf8"), samplePdf.toString("utf8"));
  assert.ok(encrypted.length >= 28 + samplePdf.length);

  const decrypted = decryptBuffer(encrypted, key);
  assert.equal(decrypted.toString("utf8"), samplePdf.toString("utf8"));
});

test("decryptBuffer rejects corrupted or truncated payloads", () => {
  assert.throws(() => decryptBuffer(Buffer.from("short"), key), /Invalid encrypted buffer payload/);
});

