import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, "../data/russian.db");

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

let _db;

function db() {
  if (!_db) {
    _db = new Database(DB_FILE);
    _db.pragma("journal_mode = WAL");
    migrate(_db);
  }
  return _db;
}

function migrate(d) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      date    TEXT    NOT NULL UNIQUE,
      words   TEXT    NOT NULL,
      articles TEXT   NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seen_words (
      word TEXT PRIMARY KEY
    );
  `);
}

export function getAllSeenWords() {
  return db().prepare("SELECT word FROM seen_words").all().map((r) => r.word);
}

export function saveEntry(date, words, articles) {
  const insertEntry = db().prepare(`
    INSERT OR REPLACE INTO entries (date, words, articles) VALUES (?, ?, ?)
  `);
  const insertWord = db().prepare(`
    INSERT OR IGNORE INTO seen_words (word) VALUES (?)
  `);

  const run = db().transaction(() => {
    insertEntry.run(date, JSON.stringify(words), JSON.stringify(articles));
    for (const w of words) insertWord.run(w.word);
  });
  run();
}

export function getEntries() {
  return db()
    .prepare("SELECT date, words, articles FROM entries ORDER BY date DESC")
    .all()
    .map((r) => ({
      date: r.date,
      words: JSON.parse(r.words),
      articles: JSON.parse(r.articles),
    }));
}

export function getEntryByDate(date) {
  const row = db()
    .prepare("SELECT date, words, articles FROM entries WHERE date = ?")
    .get(date);
  if (!row) return null;
  return {
    date: row.date,
    words: JSON.parse(row.words),
    articles: JSON.parse(row.articles),
  };
}

export function getLatestEntry() {
  const row = db()
    .prepare("SELECT date, words, articles FROM entries ORDER BY date DESC LIMIT 1")
    .get();
  if (!row) return null;
  return {
    date: row.date,
    words: JSON.parse(row.words),
    articles: JSON.parse(row.articles),
  };
}
