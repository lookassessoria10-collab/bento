// Compartilhamento externo de painéis: tokens, senha opcional, modelos de público e configuração.
// Regras: token de 256 bits (CSPRNG), só o SHA-256 é guardado; senha com scrypt (memória alta, sal único);
// a configuração define seções e escopo — nunca a organização, que vem do próprio link no banco.
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import "server-only";
export * from "@/lib/share-config";

export function newShareToken() {
  const token = randomBytes(32).toString("base64url"); // 256 bits
  return { token, hash: hashShareToken(token) };
}
export function hashShareToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
/** Aceita só o formato gerado (43 caracteres base64url); qualquer outra coisa é recusada antes do banco. */
export function isWellFormedToken(t: unknown): t is string {
  return typeof t === "string" && /^[A-Za-z0-9_-]{43}$/.test(t);
}

const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export function hashSharePassword(password: string) {
  const salt = randomBytes(16);
  const key = scryptSync(password.normalize("NFKC"), salt, 32, SCRYPT);
  return `scrypt$${SCRYPT.N}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}
export function verifySharePassword(password: string, stored: string) {
  const [alg, n, salt, key] = stored.split("$");
  if (alg !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "base64url");
  const got = scryptSync(password.normalize("NFKC"), Buffer.from(salt, "base64url"), expected.length, { ...SCRYPT, N: Number(n) });
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export type ShareState = "ativo" | "expirado" | "revogado";
export function shareState(l: { status: string; expira_em: string }, now = new Date()): ShareState {
  if (l.status === "revogado") return "revogado";
  return new Date(l.expira_em) <= now ? "expirado" : "ativo";
}
