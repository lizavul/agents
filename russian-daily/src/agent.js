import Anthropic from "@anthropic-ai/sdk";
import nodemailer from "nodemailer";
import { getAllSeenWords, saveEntry as dbSaveEntry, getEntries, getEntryByDate, getLatestEntry } from "./db.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Step 1: Generate 5 B2 Russian words ─────────────────────────────────────
async function generateWords() {
  console.log("📚 Generating Russian words...");

  const seenWords = getAllSeenWords();
  const exclusionNote = seenWords.length > 0
    ? `\n\nDo NOT use any of these words (already covered in previous sessions):\n${seenWords.join(", ")}`
    : "";

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    system: `You are a Russian language tutor specialising in B2 level vocabulary.
Return ONLY a valid JSON array. No markdown, no backticks, no explanation.`,
    messages: [
      {
        role: "user",
        content: `Generate 5 B2 level Russian words or phrases.
Mix word types: include verbs, nouns, adjectives, and maybe one idiom or fixed expression.
Choose words that are genuinely useful in modern spoken/written Russian, not archaic.${exclusionNote}

Return a JSON array of 5 objects with this exact shape:
[
  {
    "word": "слоняться",
    "type": "глагол",
    "translation": "to wander/loaf around (aimlessly)",
    "definition": "Бесцельно ходить туда-сюда, проводить время без дела.",
    "example_ru": "Он целый день слонялся по городу, не зная, чем заняться.",
    "example_en": "He wandered around the city all day, not knowing what to do with himself.",
    "note": "Often carries a slightly negative/lazy connotation. Common in informal speech."
  }
]`,
      },
    ],
  });

  let text = response.content[0].text.trim();
  text = text.replace(/```json|```/g, "").trim();
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No JSON array found in word response");
  return JSON.parse(text.slice(start, end + 1));
}

// ─── Step 2: Find 5 Russian articles via web search ──────────────────────────
async function findArticles() {
  console.log("🔍 Searching for Russian articles...");

  // Step 2a: search (web_search requires the beta header)
  const searchResponse = await anthropic.beta.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 3000,
    betas: ["web-search-2025-03-05"],
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    system: "You find interesting Russian-language articles for B2/C1 language learners.",
    messages: [
      {
        role: "user",
        content: `Search for 5 interesting Russian-language articles published recently.
Look for articles from quality Russian sources like: Meduza, Arzamas, Кот Шрёдингера, Наука и жизнь, Wonderzine, The Insider, or similar reputable sites.
Choose varied topics: culture, science, society, history, lifestyle — avoid pure politics or heavy news.
Pick articles that would be genuinely interesting and readable for someone at B2/C1 level.
For each article include: title, source name, URL, a short Russian summary, a short English summary, and topic.`,
      },
    ],
  });

  const searchText = searchResponse.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  if (!searchText.trim()) throw new Error("No text returned from article search");

  // Step 2b: reformat the prose result as clean JSON
  const formatResponse = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    system: "Return ONLY a valid JSON array. No markdown, no backticks, no explanation.",
    messages: [
      {
        role: "user",
        content: `Format the following articles as a JSON array of exactly 5 objects.
Each object must have these fields:
  "title"      — article title in Russian
  "source"     — source name (e.g. Meduza)
  "url"        — full URL
  "summary_ru" — 2-3 sentence summary in Russian
  "summary_en" — 2-3 sentence summary in English
  "topic"      — one of: наука|культура|общество|история|стиль жизни|технологии

Articles:
${searchText}

Return ONLY the JSON array, nothing else.`,
      },
    ],
  });

  let raw = formatResponse.content[0].text.trim();
  raw = raw.replace(/```json|```/g, "").trim();
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No JSON array found in article response");
  return JSON.parse(raw.slice(start, end + 1));
}

// ─── Step 3: Persist to SQLite ───────────────────────────────────────────────
async function saveEntry(words, articles) {
  const today = new Date().toISOString().split("T")[0];
  dbSaveEntry(today, words, articles);
  console.log(`💾 Saved entry for ${today}`);
  return today;
}

// ─── Step 4: Send email digest ────────────────────────────────────────────────
async function sendEmail(words, articles, date) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("⚠️  No SMTP config — skipping email.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const wordRows = words
    .map(
      (w) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #f0ede6;">
        <div style="font-size:18px;font-weight:700;color:#1a1a1a;font-family:Georgia,serif;">${w.word}</div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin:2px 0 6px;">${w.type} · ${w.translation}</div>
        <div style="font-size:13px;color:#444;margin-bottom:4px;">${w.definition}</div>
        <div style="font-size:13px;color:#1a6b3c;font-style:italic;">${w.example_ru}</div>
        <div style="font-size:12px;color:#888;font-style:italic;">${w.example_en}</div>
        ${w.note ? `<div style="font-size:11px;color:#aaa;margin-top:4px;">💡 ${w.note}</div>` : ""}
      </td>
    </tr>`
    )
    .join("");

  const articleRows = articles
    .map(
      (a) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #f0ede6;">
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">${a.source} · ${a.topic}</div>
        <a href="${a.url}" style="font-size:15px;font-weight:600;color:#1a6b3c;text-decoration:none;">${a.title}</a>
        <div style="font-size:13px;color:#444;margin-top:5px;">${a.summary_ru}</div>
        <div style="font-size:12px;color:#888;margin-top:3px;">${a.summary_en}</div>
      </td>
    </tr>`
    )
    .join("");

  const platformUrl = process.env.PLATFORM_URL || "http://localhost:3000";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fafaf8;font-family:Georgia,serif;">
  <div style="max-width:580px;margin:0 auto;padding:32px 16px;">
    
    <div style="margin-bottom:28px;">
      <div style="font-size:11px;color:#888;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;">Ежедневный русский · ${date}</div>
      <div style="font-size:26px;font-weight:700;color:#1a1a1a;">Ваши слова на сегодня</div>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e8e6e0;border-radius:8px;margin-bottom:28px;">
      ${wordRows}
    </table>

    <div style="font-size:20px;font-weight:700;color:#1a1a1a;margin-bottom:12px;">Статьи для чтения</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e8e6e0;border-radius:8px;margin-bottom:28px;">
      ${articleRows}
    </table>

    <div style="text-align:center;padding:16px;background:#e8f5ee;border-radius:8px;">
      <a href="${platformUrl}" style="font-size:13px;color:#1a6b3c;text-decoration:none;font-family:Arial,sans-serif;">
        View on your learning platform →
      </a>
    </div>

  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Русский каждый день" <${process.env.SMTP_USER}>`,
    to: process.env.TO_EMAIL || process.env.SMTP_USER,
    subject: `🇷🇺 Русский ${date} — 5 новых слов`,
    html,
  });

  console.log("📧 Email sent!");
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export async function runAgent() {
  console.log(`\n🤖 Russian Daily Agent starting — ${new Date().toISOString()}`);
  try {
    const words = await generateWords();
    const articles = await findArticles();
    const date = await saveEntry(words, articles);
    await sendEmail(words, articles, date);
    console.log("✅ Agent run complete.\n");
  } catch (err) {
    console.error("❌ Agent error:", err);
    throw err;
  }
}
