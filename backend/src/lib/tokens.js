import crypto from "node:crypto";

export function createOpaqueToken(bytes = 32) {
  // Random string intended for refresh tokens.
  return crypto.randomBytes(bytes).toString("hex");
}

export function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

