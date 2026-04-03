import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getDB(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return (env as any).DB as D1Database;
}

export async function getEnv(): Promise<{ DB: D1Database; DEEPSEEK_API_KEY?: string; JWT_SECRET?: string }> {
  const { env } = await getCloudflareContext({ async: true });
  return env as any;
}
