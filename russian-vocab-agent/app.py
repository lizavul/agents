from flask import Flask, jsonify, render_template
from db import init_db, get_all_words, get_seen_word_list
import sqlite3
from pathlib import Path

app = Flask(__name__)
DB_PATH = Path(__file__).parent / "vocab.db"


def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_words_with_themes():
    with _connect() as conn:
        rows = conn.execute("""
            SELECT w.word, w.pos, w.translation, w.example_ru, w.run_date, t.name AS theme
            FROM words w
            JOIN themes t ON t.id = w.theme_id
            ORDER BY w.run_date DESC, w.id ASC
        """).fetchall()
    return [dict(r) for r in rows]


def get_theme_names():
    with _connect() as conn:
        rows = conn.execute(
            "SELECT DISTINCT t.name FROM themes t JOIN words w ON w.theme_id = t.id ORDER BY t.name"
        ).fetchall()
    return [r["name"] for r in rows]


@app.get("/api/words")
def api_words():
    return jsonify(get_words_with_themes())


@app.get("/api/themes")
def api_themes():
    return jsonify(get_theme_names())


@app.get("/")
def index():
    return render_template("index.html")


if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5001)
