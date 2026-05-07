import json
from datetime import datetime

import anthropic

_client = anthropic.Anthropic()

_SYSTEM = (
    "You are a Russian language teacher specialising in B2 level vocabulary. "
    "You always respond with valid JSON only — no markdown, no backticks, no explanation."
)

_USER_TEMPLATE = """Generate 5 B2-level Russian vocabulary words on the theme: "{theme}".

For each word return:
- word: the Russian word, with stress mark if possible (e.g. переговóры)
- pos: part of speech in English (e.g. "noun (plural)", "verb (imperfective)", "adjective")
- translation: concise English translation
- example_ru: one natural example sentence in Russian using the word

Return a JSON array of exactly 5 objects. No other text.{exclusion}

Example format:
[
  {{
    "word": "переговóры",
    "pos": "noun (plural)",
    "translation": "negotiations",
    "example_ru": "Переговоры между странами зашли в тупик."
  }}
]"""


def _call_api(theme: str, seen_words: list[str]) -> str:
    exclusion = (
        f"\n\nDo NOT use any of these words (already covered): {', '.join(seen_words)}"
        if seen_words else ""
    )
    response = _client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        system=_SYSTEM,
        messages=[{"role": "user", "content": _USER_TEMPLATE.format(theme=theme, exclusion=exclusion)}],
    )
    return response.content[0].text.strip()


def generate_vocab(theme: str, seen_words: list[str] | None = None) -> list[dict]:
    seen_words = seen_words or []
    raw = _call_api(theme, seen_words)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        print(f"[{datetime.now().isoformat()}] JSON parse failed on first attempt, retrying...")
        print(f"Raw response: {raw}")

    raw = _call_api(theme, seen_words)
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"[{datetime.now().isoformat()}] JSON parse failed on retry.")
        print(f"Raw response: {raw}")
        raise RuntimeError(f"Claude returned invalid JSON after two attempts: {e}") from e
