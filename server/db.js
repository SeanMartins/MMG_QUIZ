import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'data', 'quiz.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  theme TEXT NOT NULL DEFAULT 'neon',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  music_url TEXT
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_index INTEGER NOT NULL,
  time_limit_seconds INTEGER NOT NULL DEFAULT 20,
  points INTEGER NOT NULL DEFAULT 1000
);

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'lobby',
  current_session_index INTEGER NOT NULL DEFAULT 0,
  current_question_index INTEGER NOT NULL DEFAULT -1,
  question_started_at INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  socket_id TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(game_id, name)
);

CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  answer_index INTEGER,
  time_taken_ms INTEGER NOT NULL,
  correct INTEGER NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  UNIQUE(question_id, team_id)
);
`);

const quizColumns = new Set(db.prepare('PRAGMA table_info(quizzes)').all().map((c) => c.name));
for (const [column, ddl] of [
  ['background_url', 'ALTER TABLE quizzes ADD COLUMN background_url TEXT'],
  ['logo_url', 'ALTER TABLE quizzes ADD COLUMN logo_url TEXT'],
  ['event_title', 'ALTER TABLE quizzes ADD COLUMN event_title TEXT'],
  ['text_color', 'ALTER TABLE quizzes ADD COLUMN text_color TEXT'],
  ['font_family', 'ALTER TABLE quizzes ADD COLUMN font_family TEXT'],
  ['background_overlay', 'ALTER TABLE quizzes ADD COLUMN background_overlay REAL DEFAULT 0.5'],
]) {
  if (!quizColumns.has(column)) db.exec(ddl);
}

export default db;
