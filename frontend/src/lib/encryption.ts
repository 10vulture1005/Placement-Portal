import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(keyHex = process.env.ENCRYPTION_KEY): Buffer {
  if (!keyHex || !/^[a-fA-F0-9]{64}$/.test(keyHex)) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hexadecimal value");
  }
  return Buffer.from(keyHex, "hex");
}

export function encryptSensitiveValue(value: string, keyHex?: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(keyHex), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("hex"), cipher.getAuthTag().toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptSensitiveValue(payload: string, keyHex?: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Invalid encrypted payload");
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(keyHex), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}

export function encryptBuffer(data: Buffer, keyHex?: string): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(keyHex), iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Layout: [12 bytes IV][16 bytes Tag][Ciphertext]
  return Buffer.concat([iv, tag, encrypted]);
}

export function decryptBuffer(payload: Buffer, keyHex?: string): Buffer {
  if (payload.length < 28) {
    throw new Error("Invalid encrypted buffer payload — minimum length is 28 bytes");
  }
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const data = payload.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, getKey(keyHex), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

export function isEncryptedValue(value: string | null | undefined): boolean {
  if (!value) return false;
  const parts = value.split(":");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

