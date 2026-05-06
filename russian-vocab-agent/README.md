# Russian Vocab Agent

Sends 5 C1/C2-level Russian words by email every morning, cycling through 10 themes. Words are persisted to a local SQLite database for future use.

## Prerequisites

- Python 3.11+
- An Anthropic API key
- A Gmail account with an app password (see below)

## Install

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Config

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USERNAME` | Your Gmail address |
| `SMTP_PASSWORD` | Your **app password** (not your login password — see below) |
| `SENDER_EMAIL` | Same as `SMTP_USERNAME` |
| `RECIPIENT_EMAIL` | Where to send the email |

### Gmail app password setup

1. Enable **2-Step Verification** at [myaccount.google.com/security](https://myaccount.google.com/security)
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Name it anything (e.g. "Russian Vocab Agent") → click **Create**
4. Copy the 16-character password and use it as `SMTP_PASSWORD`

## Run manually

```bash
source .venv/bin/activate
python main.py
```

## Schedule (7am daily)

### Unix / macOS — cron

```bash
crontab -e
```

Add (replace paths with your own):

```
0 7 * * * /path/to/russian-vocab-agent/.venv/bin/python /path/to/russian-vocab-agent/main.py >> /path/to/logs/vocab.log 2>&1
```

Use the venv Python directly so you don't need to activate it in cron.

### Windows — Task Scheduler

1. Open Task Scheduler → **Create Basic Task**
2. Trigger: **Daily** at **07:00**
3. Action: **Start a program**
   - Program: `C:\path\to\russian-vocab-agent\.venv\Scripts\python.exe`
   - Arguments: `main.py`
   - Start in: `C:\path\to\russian-vocab-agent`

## Database

`vocab.db` is created automatically on first run. It contains:

- `themes` — the 10 topic areas
- `theme_history` — log of which theme was used each day (drives least-recently-used rotation)
- `words` — full history of every generated word with metadata

You can query it directly with any SQLite client for future app use.

## Troubleshooting

**`SMTPAuthenticationError`** — Your app password is wrong or 2-Step Verification isn't enabled on your Google account. Regenerate the app password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).

**`SMTPConnectError`** — Check that `SMTP_HOST=smtp.gmail.com` and `SMTP_PORT=587` are set correctly and that outbound port 587 isn't blocked by a firewall.

**`RuntimeError: Claude returned invalid JSON after two attempts`** — Rare. Check your `ANTHROPIC_API_KEY` is valid and your account has quota remaining.
