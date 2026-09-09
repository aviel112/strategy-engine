# הפעלה — 3 שלבים, 5 דקות

רק אתה יכול לעשות אותם (הם דורשים את החשבונות שלך).
האתר עובד גם בלעדיהם — פשוט בלי שמירת לידים ובלי הניסוח האישי.

---

## 1 · לידים לגיליון + מייל  ·  3 דקות

1. פותחים **sheets.new** וקוראים לגיליון "לידים — מנוע אסטרטגיה"
2. תפריט **תוספים ← Apps Script** — למחוק הכל, ולהדביק את `apps-script.gs`
3. **Deploy ← New deployment ← Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. מעתיקים את הכתובת שמסתיימת ב-`/exec`
5. ב-`index.html`, בשורה `SHEET_URL:` — מדביקים אותה בין הגרשיים

מרגע זה כל ליד נכנס לגיליון **וגם** שולח לך מייל עם:
הציון, המספרים, הכאב, הבידול — ו**הקוד לגאנט** מוכן להעתקה.

---

## 2 · מפתח Gemini  ·  1 דקה

1. **aistudio.google.com/apikey ← Create API key**
2. מעתיקים את המפתח

*(המנוי שלך ל-Gemini לא כולל את זה — זה מפתח נפרד. יש מכסה חינמית
נדיבה, ולנפח שלך זה כנראה יישאר בחינם.)*

---

## 3 · השרת של ה-AI  ·  1 דקה

```bash
cd "/Users/user/אביאל אינסטגרם סוכנים/strategy-engine/ai-proxy"
npm install
railway init && railway up
railway variables set GEMINI_API_KEY=המפתח_שלך
railway variables set ALLOWED_ORIGINS=https://aviel112.github.io
railway domain
```

מעתיקים את הכתובת שחוזרת, ומדביקים ב-`index.html` בשורה `AI_URL:`.

לבדיקה שהכל עובד: להיכנס ל-`הכתובת/health` — אמור להחזיר
`{"ok":true,"model":"..."}` עם שם המודל שנבחר אוטומטית.

---

## אחרי כל שינוי — פריסה

```bash
cd "/Users/user/אביאל אינסטגרם סוכנים/strategy-engine" && cp index.html README.md SETUP.md /tmp/strategy-engine-deploy/ && cp gantt/index.html /tmp/strategy-engine-deploy/gantt/ && cd /tmp/strategy-engine-deploy && git add -A && git commit -m "update" && git push
```
