import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

// Simple JWT-based session using cookies
// We'll use a lightweight approach without importing jsonwebtoken (edge incompatible)
// Instead, use Web Crypto API for JWT

const ALG = "HS256";

function base64url(data: string): string {
  return btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): string {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  return atob(str);
}

async function getSigningKey(): Promise<CryptoKey> {
  const secret = process.env.JWT_SECRET || "change-me-in-production";
  const encoder = new TextEncoder();
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createSession(userId: string): Promise<string> {
  const key = await getSigningKey();
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ sub: userId, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 * 7 }));
  const data = `${header}.${payload}`;
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const signature = base64url(String.fromCharCode(...new Uint8Array(sig)));
  return `${data}.${signature}`;
}

export async function verifySession(token: string): Promise<{ sub: string } | null> {
  try {
    const [header, payload, signature] = token.split(".");
    const key = await getSigningKey();
    const sigData = new Uint8Array(Array.from(base64urlDecode(signature)).map((c) => c.charCodeAt(0)));
    const valid = await crypto.subtle.verify("HMAC", key, sigData, new TextEncoder().encode(`${header}.${payload}`));
    if (!valid) return null;
    const decoded = JSON.parse(base64urlDecode(payload));
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  return payload?.sub || null;
}
