from datetime import date

from dotenv import load_dotenv

load_dotenv()

from db import init_db, get_next_theme, save_words
from vocab_generator import generate_vocab
from email_sender import send_vocab_email


def main():
    init_db()
    theme_id, theme = get_next_theme()
    words = generate_vocab(theme)
    today = date.today().isoformat()
    save_words(words, theme_id, today)
    send_vocab_email(words, theme)
    print(f"[{today}] Done: 5 words sent on theme '{theme}'")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        from datetime import datetime
        print(f"[{datetime.now().isoformat()}] ERROR: {e}")
        raise
