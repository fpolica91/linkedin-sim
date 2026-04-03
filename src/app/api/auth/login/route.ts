export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { getDB } from "@/lib/db";

export async function POST(req: NextRequest) {
  const DB = await getDB();
  if (!DB) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const { email, password } = await req.json() as any;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await DB.prepare("SELECT id, name, email, password_hash, plan FROM users WHERE email = ?")
    .bind(email)
    .first() as any;

  if (!user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = await createSession(user.id);
  const res = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, plan: user.plan } });
  res.cookies.set("session", token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 86400 * 7, path: "/" });
  return res;
}
