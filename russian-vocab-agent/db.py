import os
import sqlite3
from pathlib import Path

DB_PATH = Path(os.environ.get("DB_PATH", Path(__file__).parent / "vocab.db"))

THEMES = [
    "business and negotiations",
    "travel and geography",
    "emotions and psychology",
    "politics and society",
    "technology and science",
    "arts and culture",
    "law and bureaucracy",
    "health and medicine",
    "philosophy and ethics",
    "environment and nature",
]


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS themes (
                id   INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE
            );

            CREATE TABLE IF NOT EXISTS theme_history (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                theme_id INTEGER NOT NULL REFERENCES themes(id),
                used_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS words (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                theme_id    INTEGER NOT NULL REFERENCES themes(id),
                run_date    DATE NOT NULL,
                word        TEXT NOT NULL,
                pos         TEXT NOT NULL,
                translation TEXT NOT NULL,
                example_ru  TEXT NOT NULL,
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        if conn.execute("SELECT COUNT(*) FROM themes").fetchone()[0] == 0:
            conn.executemany(
                "INSERT INTO themes (name) VALUES (?)",
                [(t,) for t in THEMES],
            )


def get_next_theme() -> tuple[int, str]:
    with _connect() as conn:
        row = conn.execute("""
            SELECT t.id, t.name
            FROM themes t
            LEFT JOIN theme_history th ON th.theme_id = t.id
            GROUP BY t.id
            ORDER BY MAX(th.used_at) ASC NULLS FIRST
            LIMIT 1
        """).fetchone()

        theme_id, theme_name = row["id"], row["name"]
        conn.execute(
            "INSERT INTO theme_history (theme_id) VALUES (?)", (theme_id,)
        )

    return theme_id, theme_name


def save_words(words: list[dict], theme_id: int, run_date: str) -> None:
    with _connect() as conn:
        conn.executemany(
            """
            INSERT INTO words (theme_id, run_date, word, pos, translation, example_ru)
            VALUES (:theme_id, :run_date, :word, :pos, :translation, :example_ru)
            """,
            [
                {
                    "theme_id": theme_id,
                    "run_date": run_date,
                    "word": w["word"],
                    "pos": w["pos"],
                    "translation": w["translation"],
                    "example_ru": w["example_ru"],
                }
                for w in words
            ],
        )


def get_words_by_theme(theme_name: str) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT w.* FROM words w
            JOIN themes t ON t.id = w.theme_id
            WHERE t.name = ?
            ORDER BY w.created_at DESC
            """,
            (theme_name,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_all_words() -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM words ORDER BY created_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def get_seen_word_list() -> list[str]:
    with _connect() as conn:
        rows = conn.execute("SELECT word FROM words").fetchall()
    return [r["word"] for r in rows]
