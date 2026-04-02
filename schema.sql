DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS simulations;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE simulations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_text TEXT NOT NULL,
  result TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_simulations_user ON simulations(user_id, created_at DESC);
