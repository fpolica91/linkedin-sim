export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getDB } from "@/lib/db";

export async function GET() {
  const DB = await getDB();
  if (!DB) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const userId = await getSessionUser();
  if (!userId) return NextResponse.json({ user: null });

  const user = await DB.prepare("SELECT id, name, email, plan FROM users WHERE id = ?")
    .bind(userId)
    .first();

  return NextResponse.json({ user });
}
