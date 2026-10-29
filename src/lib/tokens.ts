import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** O banco guarda apenas o hash SHA-256 do token do convite. */
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newInviteToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function sha256(buf: Uint8Array | string) {
  return createHash("sha256").update(buf).digest("hex");
}
