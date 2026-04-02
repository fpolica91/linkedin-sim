export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSessionUser } from "@/lib/session";

const FREE_DAILY_LIMIT = 5;
const limits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  let entry = limits.get(userId);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + 86400000 };
    limits.set(userId, entry);
  }
  if (entry.count >= FREE_DAILY_LIMIT) return { allowed: false, remaining: 0 };
  entry.count++;
  return { allowed: true, remaining: FREE_DAILY_LIMIT - entry.count };
}

const SYSTEM_PROMPT = `You are a LinkedIn network simulator. Given a LinkedIn post, you simulate how different people in a typical professional network would react.

You MUST respond with valid JSON matching this exact schema (no markdown, no code fences, just raw JSON):

{
  "reactions": [
    {
      "persona": "Name",
      "role": "Job title",
      "reaction": "What they think when they see this post",
      "sentiment": "positive" | "neutral" | "negative",
      "would_engage": true | false
    }
  ],
  "metrics": {
    "predicted_likes": number,
    "predicted_comments": number,
    "predicted_shares": number,
    "engagement_rate": number (0-100)
  },
  "analysis": {
    "overall_score": number (0-100),
    "tone": "one of: inspirational, educational, controversial, humble-brag, salesy, authentic, cringe",
    "cringe_factor": number (1-5, where 5 is maximum cringe),
    "strengths": ["string"],
    "weaknesses": ["string"],
    "improved_version": "a rewritten version of the post that would perform better"
  }
}

Generate 6-8 reactions from diverse personas:
- A cynical senior engineer
- An enthusiastic junior dev
- A recruiter
- A startup founder
- A corporate VP
- A LinkedIn influencer / thought leader
- A former colleague
- An industry skeptic

Be brutally honest. If the post is cringe, say so. Predict realistic engagement numbers for a typical 500-connection LinkedIn network. The improved version should keep the core message but fix tone, structure, and engagement issues.`;

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUser();
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  // Check plan for rate limiting
  const env = process.env as any;
  const DB = env.DB as D1Database;
  const user = DB ? await DB.prepare("SELECT plan FROM users WHERE id = ?").bind(userId).first() : null;
  const plan = (user as any)?.plan || "free";

  if (plan === "free") {
    const { allowed, remaining } = checkRateLimit(userId);
    if (!allowed) return NextResponse.json({ error: "Daily limit reached (5/day). Upgrade to Pro for unlimited.", limit: FREE_DAILY_LIMIT }, { status: 429 });
  }

  let body;
  try { body = await req.json() as any; } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const post = body.post;
  if (!post || typeof post !== "string" || post.trim().length === 0) {
    return NextResponse.json({ error: "Post content is required" }, { status: 400 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const client = new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });

  try {
    const completion = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Simulate reactions for this LinkedIn post:\n\n${post}` },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return NextResponse.json({ error: "No AI response" }, { status: 500 });

    const result = JSON.parse(content);

    // Save to DB
    if (DB) {
      await DB.prepare("INSERT INTO simulations (id, user_id, post_text, result, score) VALUES (?, ?, ?, ?, ?)")
        .bind(crypto.randomUUID(), userId, post, JSON.stringify(result), result.analysis?.overall_score ?? 0)
        .run();
    }

    const rateLimit = plan === "free" ? checkRateLimit(userId) : { remaining: -1 };
    return NextResponse.json({ ...result, usage: { plan, remaining: rateLimit.remaining } });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Simulation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
