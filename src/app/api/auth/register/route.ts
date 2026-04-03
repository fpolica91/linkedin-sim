export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { getDB } from "@/lib/db";

export async function POST(req: NextRequest) {
  const DB = await getDB();
  if (!DB) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const { name, email, password } = await req.json() as any;
  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  // Check existing user
  const existing = await DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  await DB.prepare("INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)")
    .bind(id, name, email, passwordHash)
    .run();

  const token = await createSession(id);
  const res = NextResponse.json({ ok: true, user: { id, name, email, plan: "free" } });
  res.cookies.set("session", token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 86400 * 7, path: "/" });
  return res;
}
