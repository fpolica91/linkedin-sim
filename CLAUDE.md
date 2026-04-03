# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Build & Deploy

```bash
npm run dev              # Next.js dev server (port 3000)
npm run build            # Next.js production build
npm run lint             # ESLint

# Cloudflare deployment (two-step — both required):
npx opennextjs-cloudflare build   # Generates .open-next/ worker bundle
npx wrangler deploy               # Deploys to Cloudflare Workers

# Database (D1):
npx wrangler d1 execute linkedin-sim-db --file=schema.sql   # Apply schema
npx wrangler d1 execute linkedin-sim-db --command="SELECT ..." # Ad-hoc query
```

**Critical:** `wrangler deploy` alone reuses stale `.open-next/` artifacts. Always run `opennextjs-cloudflare build` first when code has changed.

## Architecture

Next.js 16 App Router deployed to Cloudflare Workers via `@opennextjs/cloudflare` (OpenNext adapter). Single-page client app with API routes backed by D1 (SQLite).

### Cloudflare Bindings

D1 and secrets are **not** on `process.env`. Access them through:

```typescript
import { getCloudflareContext } from "@opennextjs/cloudflare";
const { env } = await getCloudflareContext({ async: true });
const db = env.DB;           // D1Database
const key = env.SOME_SECRET; // Wrangler secret
```

The helper at `src/lib/db.ts` wraps this — use `getDB()` and `getEnv()` in route handlers.

### Auth

Custom JWT using Web Crypto API (no node-only deps — must stay Workers-compatible). PBKDF2 password hashing in `src/lib/auth.ts`, session management in `src/lib/session.ts`. Session stored as httpOnly cookie named `session`.

### AI Integration

DeepSeek API called via OpenAI SDK (`openai` package) with custom `baseURL`. The simulate endpoint at `src/app/api/simulate/route.ts` has a large system prompt that defines 8 personas and the JSON response schema. In-memory rate limiting (resets on worker restart).

### UI Components

shadcn/ui v4 components using `@base-ui/react` primitives (not Radix). Tailwind CSS v4 with `@tailwindcss/postcss`. Dark mode via `class="dark"` on `<html>`.

**Known quirk:** base-ui sets `data-orientation="horizontal"` but shadcn Tailwind classes use `data-horizontal:` variant. The Tabs component has explicit `data-horizontal`/`data-vertical` boolean attributes to bridge this mismatch — preserve this pattern if adding new base-ui components with orientation.

## Environment Variables

Set via `wrangler secret put <NAME>` for production, `.dev.vars` for local:

- `DEEPSEEK_API_KEY` — required for simulation
- `JWT_SECRET` — required for auth (falls back to insecure default)

## Database Schema

Two tables in D1 (`schema.sql`): `users` (id, name, email, password_hash, plan) and `simulations` (id, user_id, post_text, result as JSON string, score). UUIDs as TEXT primary keys.
