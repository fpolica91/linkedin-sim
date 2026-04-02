export interface Env {
  DB: D1Database;
  DEEPSEEK_API_KEY: string;
  JWT_SECRET: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  plan: string;
  created_at: string;
}
