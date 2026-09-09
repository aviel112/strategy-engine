/* ═══════════════════════════════════════════════════════════════
   strategy-engine · AI proxy  (Google Gemini)

   מקבל את תשובות השאלון + פלט מנוע הכללים, ומחזיר את החלקים
   שדורשים ניסוח אנושי: סלוגן, הוק, משפט מיצוב ו-3 רעיונות תוכן.

   המנוע בצד הלקוח לעולם לא תלוי בזה — הדוח כבר מוצג כשהקריאה יוצאת.
   ═══════════════════════════════════════════════════════════════ */
import express from "express";

const KEY  = process.env.GEMINI_API_KEY;
const BASE = "https://generativelanguage.googleapis.com/v1beta";

if (!KEY) { console.error("חסר GEMINI_API_KEY"); process.exit(1); }

/* ── בחירת מודל ──
   שמות המודלים של Google משתנים תכופות, אז במקום לנחש —
   שואלים את ה-API מה זמין ובוחרים לפי סדר העדפה. */
const PREFER = [
  "gemini-3-pro", "gemini-3-flash",
  "gemini-2.5-pro", "gemini-2.5-flash",
  "gemini-2.0-flash", "gemini-1.5-pro"
];
let MODEL = null;

async function resolveModel(){
  if (process.env.GEMINI_MODEL){
    MODEL = process.env.GEMINI_MODEL;
    console.log("מודל (נכפה):", MODEL);
    return;
  }
  try {
    const r = await fetch(`${BASE}/models`, { headers: { "x-goog-api-key": KEY } });
    const j = await r.json();
    const names = (j.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map(m => m.name.replace(/^models\//, ""));

    /* התאמה מדויקת לפי סדר העדפה, ואם אין — הגרסה החדשה ביותר של אותה משפחה */
    for (const p of PREFER){
      const exact = names.find(n => n === p);
      if (exact) { MODEL = exact; break; }
      const near = names.filter(n => n.startsWith(p) && !n.includes("thinking")).sort().pop();
      if (near) { MODEL = near; break; }
    }
    if (!MODEL) MODEL = names.find(n => n.startsWith("gemini")) || "gemini-2.5-flash";
    console.log("מודל שנבחר:", MODEL, `(מתוך ${names.length} זמינים)`);
  } catch (e) {
    MODEL = "gemini-2.5-flash";
    console.warn("לא הצלחתי לשלוף רשימת מודלים, נופל ל-", MODEL, String(e));
  }
}

/* ── הסכמה של הפלט — Gemini מחזיר JSON תקין לפיה ── */
const SCHEMA = {
  type: "OBJECT",
  properties: {
    positioning: { type: "STRING", description: "משפט מיצוב אחד בעברית, עד 28 מילים, בגוף ראשון" },
    slogan:      { type: "STRING", description: "סלוגן מוביל, עד 6 מילים" },
    hook:        { type: "STRING", description: "משפט פתיחה אחד לסרטון, במרכאות" },
    ideas: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title:  { type: "STRING" },
          body:   { type: "STRING", description: "2-4 משפטים: מה מצלמים, מה אומרים, ולמה זה עובד אצלו" },
          format: { type: "STRING", description: "פורמט ואורך, למשל: ריל · 45-60 שניות" }
        },
        required: ["title", "body", "format"]
      }
    }
  },
  required: ["positioning", "slogan", "hook", "ideas"]
};

const SYSTEM = `אתה יועץ שיווק ישראלי ותיק שכותב עבור בעל עסק קטן.

הקלט הוא תשובות שבעל העסק מילא בשאלון אבחון, יחד עם תוצאות של מנוע כללים שכבר חישב עבורו פלטפורמות, תמהיל תוכן ומספרים. המשימה שלך היא רק החלקים שדורשים ניסוח אנושי.

כללי כתיבה — קריטיים:
- עברית טבעית ומדוברת. לא תרגומית, לא מנופחת, בלי ז'רגון שיווקי ריק.
- להשתמש במילים שלו: הכאב, הסיפור והבידול שהוא כתב חוזרים בטקסט כמעט כלשונם. זה מה שגורם לו להרגיש שמישהו קרא אותו.
- לפנות אליו בגוף שני יחיד, בגובה העיניים. בלי "אנו ממליצים".
- קונקרטי מעל הכל. "תצלם את הרגע שאתה מרים איתו את המשקולת" ולא "תייצר תוכן אותנטי".
- בלי אימוג'ים. בלי כותרות משנה. בלי סימני קריאה מיותרים.

הסלוגן המוביל: עד 6 מילים, קליט, שאפשר לחתום בו כל סרטון. נובע מהבידול הספציפי שלו, לא סיסמה גנרית. בלי חריזה מאולצת.

ההוק: משפט פתיחה אחד לסרטון שעוצר גלילה בשלוש שניות. חייב לגעת בכאב שהוא כתב, במילים של הצופה. במרכאות.

משפט המיצוב: משפט אחד, גוף ראשון, שמחבר את מי שהוא פונה אליו + הבעיה שהוא פותר + הבידול. חייב להיות משפט שהוא באמת יכול לשים בביו. עד 28 מילים.

שלושת רעיונות התוכן: מותאמים לפלטפורמה הראשית שלו, לטון שבחר, ולהתנגדות שציין. כל רעיון חייב להיות משהו שאפשר לצלם השבוע עם הטלפון — לא הפקה. אחד מהשלושה חייב להתמודד ישירות עם ההתנגדות שלו.`;

/* ── השרת ── */
const app = express();
app.use(express.json({ limit: "128kb" }));

const ORIGINS = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
app.use((req, res, next) => {
  const o = req.headers.origin;
  if (!ORIGINS.length || (o && ORIGINS.includes(o))){
    res.set("Access-Control-Allow-Origin", o || "*");
    res.set("Vary", "Origin");
  }
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

/* בלימת הצפה — הקריאה מגיעה מהדפדפן, אז מגבילים לפי IP */
const hits = new Map();
app.use((req, res, next) => {
  if (req.method !== "POST") return next();
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip;
  const now = Date.now(), win = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter(t => now - t < win);
  if (list.length >= 8) return res.status(429).json({ error: "rate_limited" });
  list.push(now); hits.set(ip, list);
  next();
});

app.post("/", async (req, res) => {
  try {
    const { answers, computed, who } = req.body || {};
    if (!answers || !computed) return res.status(400).json({ error: "bad_request" });

    const brief = [
      `שם: ${who?.first || ""} | עסק: ${who?.business || ""}`,
      `תחום: ${answers.field} | מודל עסקי: ${computed.model}`,
      `קהל: ${computed.audience} | טון שבחר: ${answers.tone}`,
      `הבעיה שהוא פותר, במילים שלו: "${answers.pain}"`,
      `למה הוא התחיל: "${answers.why}"`,
      `הבידול שלו, במילים שלו: "${answers.edge}"`,
      `ערכים: ${(answers.values || []).join(", ")}`,
      `ההתנגדות שחוזרת אצלו: ${answers.objection}`,
      `מה מעכב אותו בשיווק: ${answers.blocker}`,
      `פלטפורמות ליבה: ${(computed.platforms || []).join(", ")}`,
      `קצב: ${computed.feed} לפיד בשבוע, ${computed.stories} סטוריז ביום`,
      `ציון בשלות: ${computed.score}/100 (${computed.band})`,
      `פער: ${computed.gapClients} לקוחות ו-${computed.revGap} ש"ח בחודש`
    ].join("\n");

    const r = await fetch(`${BASE}/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: brief }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: SCHEMA,
          temperature: 0.9
        }
      })
    });

    if (!r.ok){
      const t = await r.text();
      console.error("[gemini]", r.status, t.slice(0, 400));
      return res.status(502).json({ error: "upstream" });
    }

    const j = await r.json();
    const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!txt) return res.status(502).json({ error: "empty" });

    const out = JSON.parse(txt);
    out.ideas = (out.ideas || []).slice(0, 3);
    res.json(out);
  } catch (e) {
    console.error("[ai-proxy]", e?.message || e);
    /* הדוח בצד הלקוח כבר מוצג — כישלון כאן משאיר את גרסת הכללים */
    res.status(502).json({ error: "failed" });
  }
});

app.get("/health", (_, res) => res.json({ ok: true, model: MODEL }));

await resolveModel();
app.listen(process.env.PORT || 8080, () => console.log("ai-proxy up · " + MODEL));
