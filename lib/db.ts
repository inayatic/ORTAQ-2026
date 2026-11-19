import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";

// shortcut: файловая SQLite; на хостинге с эфемерной файловой системой статистика сбросится при перезапуске — для демо достаточно.
let db: Database.Database | undefined;
function getDb() {
  if (!db) {
    const file = process.env.DB_PATH ?? path.join(process.cwd(), "data/app.db");
    if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
    db = new Database(file);
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY, scenario_id TEXT NOT NULL, level TEXT NOT NULL, lang TEXT NOT NULL,
        turns INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS review_stats (
        session_id TEXT NOT NULL, criterion TEXT, score INTEGER, mistake_tag TEXT);`);
    // Старые базы без колонки: hints = 1, если студент вставлял подсказки.
    if (!db.prepare("PRAGMA table_info(sessions)").all().some((c) => (c as { name: string }).name === "hints"))
      db.exec("ALTER TABLE sessions ADD COLUMN hints INTEGER NOT NULL DEFAULT 0");
  }
  return db;
}

// Текст пишет модель: режем и нормализуем, чтобы в БД не попадали длинные фрагменты диалога.
const short = (s: string) => s.toLowerCase().trim().slice(0, 40);

type Rec = {
  scenarioId: string;
  level: string;
  lang: string;
  turns: number;
  hints: boolean;
  scores: { criterion: string; score: number }[];
  mistakeTags: string[];
};

/** Только анонимные агрегаты: ни реплик, ни цитат. Сбой БД не должен ломать разбор. */
export function recordReview(r: Rec): void {
  try {
    const d = getDb();
    const id = randomUUID();
    d.transaction(() => {
      d.prepare("INSERT INTO sessions (id, scenario_id, level, lang, turns, hints) VALUES (?,?,?,?,?,?)").run(id, r.scenarioId, r.level, r.lang, r.turns, r.hints ? 1 : 0);
      const ins = d.prepare("INSERT INTO review_stats (session_id, criterion, score, mistake_tag) VALUES (?,?,?,?)");
      for (const s of r.scores) ins.run(id, short(s.criterion), s.score, null);
      for (const t of r.mistakeTags) ins.run(id, null, null, short(t));
    })();
  } catch (e) {
    console.error("stats write failed", (e as Error).message);
  }
}

export function getStats() {
  const d = getDb();
  return {
    sessions: d.prepare("SELECT scenario_id, COUNT(*) AS n FROM sessions GROUP BY scenario_id ORDER BY n DESC").all() as { scenario_id: string; n: number }[],
    // Средняя оценка по критериям (0–2) и число сессий отдельно с подсказками и без.
    hints: d
      .prepare(
        `SELECT s.hints AS hints, COUNT(DISTINCT s.id) AS n, ROUND(AVG(r.score), 2) AS avg FROM sessions s JOIN review_stats r ON r.session_id = s.id
         WHERE r.criterion IS NOT NULL GROUP BY s.hints ORDER BY s.hints`,
      )
      .all() as { hints: number; n: number; avg: number }[],
    mistakes: d
      .prepare(
        `SELECT s.scenario_id, r.mistake_tag AS tag, COUNT(*) AS n FROM review_stats r JOIN sessions s ON s.id = r.session_id
         WHERE r.mistake_tag IS NOT NULL GROUP BY s.scenario_id, r.mistake_tag ORDER BY n DESC LIMIT 50`,
      )
      .all() as { scenario_id: string; tag: string; n: number }[],
    criteria: d
      .prepare(
        `SELECT s.scenario_id, r.criterion, ROUND(AVG(r.score), 2) AS avg, COUNT(*) AS n FROM review_stats r JOIN sessions s ON s.id = r.session_id
         WHERE r.criterion IS NOT NULL GROUP BY s.scenario_id, r.criterion ORDER BY s.scenario_id`,
      )
      .all() as { scenario_id: string; criterion: string; avg: number; n: number }[],
  };
}
