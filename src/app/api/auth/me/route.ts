export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const env = process.env as any;
  const DB = env.DB as D1Database;
  if (!DB) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const userId = await getSessionUser();
  if (!userId) return NextResponse.json({ user: null });

  const user = await DB.prepare("SELECT id, name, email, plan FROM users WHERE id = ?")
    .bind(userId)
    .first();

  return NextResponse.json({ user });
}
