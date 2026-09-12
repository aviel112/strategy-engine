/* ═══════════════════════════════════════════════════════════════
   מנוע האסטרטגיה — קליטת לידים
   שומר כל ליד בגיליון ושולח התראה למייל עם הקוד לגאנט.

   התקנה:
   1. sheets.new  →  לקרוא לגיליון "לידים - מנוע אסטרטגיה"
   2. תוספות ← Apps Script ← למחוק הכל ולהדביק את הקובץ הזה
   3. Deploy ← New deployment ← Web app
      Execute as: Me    |    Who has access: Anyone
   4. להעתיק את הכתובת שמסתיימת ב-/exec ולתת לי אותה
   ═══════════════════════════════════════════════════════════════ */

/* מזהה הגיליון — מתוך הכתובת שלו. ריק = הסקריפט מקושר לגיליון ישירות */
const SHEET_ID = '';

const NOTIFY = 'aviamira5@gmail.com';
const GANTT  = 'https://aviel112.github.io/strategy-engine/gantt/';

/* ← כאן להדביק את המפתח מ-aistudio.google.com/apikey */
const GEMINI_KEY = 'PASTE_YOUR_KEY_HERE';

/* Flash קודם — הוא מה שזמין במכסה החינמית */
const MODELS = ['gemini-3-flash-preview','gemini-2.5-flash',
                'gemini-3.1-flash-lite-preview','gemini-2.5-flash-lite'];

const HEAD = ['תאריך','שם','עסק','טלפון','אינסטגרם','ציון','מודל','תחום',
              'מחיר ממוצע','לקוחות היום','יעד','פער חודשי ₪','תקציב','שעות',
              'התנגדות','חסם','הכאב','הבידול','קוד לגאנט','כל התשובות'];

function doPost(e){
  try {
    const d = JSON.parse(e.postData.contents);

    /* שני תפקידים בכתובת אחת — ניסוח ה-AI, או שמירת ליד */
    if (d.mode === 'ai') return out_(personalize_(d));

    const sh = SguiSheet_();
    const a  = d.answers || {};

    sh.appendRow([
      new Date(),
      d.name || '', d.business || '', "'" + (d.phone || ''), d.instagram || '',
      d.score || '', d.modelName || '', a.field || '',
      num_(a.price), num_(a.cur), num_(a.goal), d.revGap || '',
      num_(a.budget), num_(a.hours),
      OBJ[a.objection] || '', BLK[a.blocker] || '',
      a.pain || '', a.edge || '',
      d.ganttCode || '',
      JSON.stringify(a)
    ]);

    notify_(d, a);
    return out_({ok:true});
  } catch (err) {
    return out_({ok:false, error:String(err)});
  }
}

function doGet(){ return out_({ok:true, alive:true}); }

/* ── המייל ── */
function notify_(d, a){
  const subj = '🎯 ליד חדש — ' + (d.business || d.name || '') +
               ' · ציון ' + (d.score || '?') + '/100';

  const html =
    '<div dir="rtl" style="font-family:Arial,sans-serif;max-width:620px;color:#222">' +
    '<h2 style="margin:0 0 4px">' + esc_(d.business || '') + '</h2>' +
    '<p style="margin:0 0 18px;color:#666">' + esc_(d.name || '') + ' · ' +
      esc_(d.phone || '') + ' · ' + esc_(d.instagram || '') + '</p>' +

    '<table style="border-collapse:collapse;width:100%;font-size:14px">' +
      row_('ציון בשלות', (d.score || '?') + '/100') +
      row_('מודל עסקי', d.modelName || '') +
      row_('מחיר ממוצע', num_(a.price) + ' ₪') +
      row_('לקוחות', num_(a.cur) + ' → ' + num_(a.goal) + ' בחודש') +
      row_('פער חודשי', (d.revGap || 0) + ' ₪') +
      row_('שעות פנויות', num_(a.hours) + ' בשבוע') +
      row_('תקציב פרסום', num_(a.budget) + ' ₪') +
      row_('ההתנגדות', OBJ[a.objection] || '') +
      row_('מה מעכב אותו', BLK[a.blocker] || '') +
    '</table>' +

    '<h3 style="margin:22px 0 6px;font-size:15px">הכאב, במילים שלו</h3>' +
    '<p style="margin:0 0 14px;background:#f6f6f8;padding:11px 13px;border-radius:8px">' +
      esc_(a.pain || '') + '</p>' +

    '<h3 style="margin:0 0 6px;font-size:15px">הבידול</h3>' +
    '<p style="margin:0 0 14px;background:#f6f6f8;padding:11px 13px;border-radius:8px">' +
      esc_(a.edge || '') + '</p>' +

    '<h3 style="margin:0 0 6px;font-size:15px">למה התחיל</h3>' +
    '<p style="margin:0 0 22px;background:#f6f6f8;padding:11px 13px;border-radius:8px">' +
      esc_(a.why || '') + '</p>' +

    (d.ganttCode ?
      '<div style="background:#fdf8ec;border:1px solid #e0cf9f;border-radius:10px;padding:15px">' +
      '<b style="display:block;margin-bottom:6px">קוד לגאנט</b>' +
      '<code style="display:block;background:#fff;border:1px solid #e6e6ea;border-radius:6px;' +
        'padding:9px;font-size:11px;word-break:break-all;direction:ltr;text-align:left">' +
        esc_(d.ganttCode) + '</code>' +
      '<p style="margin:9px 0 0;font-size:13px">' +
        'להעתיק ולהדביק ב־<a href="' + GANTT + '">מחולל הגאנט</a> — כל השדות נטענים לבד.</p>' +
      '</div>' : '') +

    '</div>';

  MailApp.sendEmail({to: NOTIFY, subject: subj, htmlBody: html});
}

/* ── עזר ── */
const OBJ = {price:'״יקר לי״', know:'״לא מכיר אותך״', what:'״לא הבנתי מה אתה נותן״',
             comp:'״יש זול יותר״', time:'״לא עכשיו״'};
const BLK = {time:'אין זמן', what:'לא יודע מה להעלות', cam:'לא נוח מול מצלמה',
             money:'אין תקציב', result:'מעלה ולא קורה כלום'};

function SguiSheet_(){
  const ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID)
                      : SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheets()[0];
  if (sh.getLastRow() === 0){
    sh.appendRow(HEAD);
    sh.getRange(1, 1, 1, HEAD.length).setFontWeight('bold')
      .setBackground('#1d1d26').setFontColor('#f0c368');
    sh.setFrozenRows(1);
  }
  return sh;
}
function num_(v){ const x = parseFloat(v); return isNaN(x) ? 0 : x; }
function esc_(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function row_(k, v){
  return '<tr><td style="padding:7px 0;color:#666;width:130px">' + esc_(k) + '</td>' +
         '<td style="padding:7px 0;font-weight:bold">' + esc_(v) + '</td></tr>';
}
function out_(o){
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}


/* ═══════════════════════════════════════════════════════════════
   שכבת ה-AI — מנסחת את החלקים האישיים דרך Gemini
   ═══════════════════════════════════════════════════════════════ */

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

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    positioning: {type:'STRING', description:'משפט מיצוב אחד בעברית, עד 28 מילים, בגוף ראשון'},
    slogan:      {type:'STRING', description:'סלוגן מוביל, עד 6 מילים'},
    hook:        {type:'STRING', description:'משפט פתיחה אחד לסרטון, במרכאות'},
    ideas: {
      type:'ARRAY',
      items:{ type:'OBJECT',
        properties:{
          title:  {type:'STRING'},
          body:   {type:'STRING', description:'2-4 משפטים: מה מצלמים, מה אומרים, ולמה זה עובד אצלו'},
          format: {type:'STRING', description:'פורמט ואורך, למשל: ריל · 45-60 שניות'}
        },
        required:['title','body','format'] }
    }
  },
  required:['positioning','slogan','hook','ideas']
};

function personalize_(d){
  if (!GEMINI_KEY || GEMINI_KEY.indexOf('PASTE') === 0) return {error:'no_key'};

  const a = d.answers || {}, c = d.computed || {}, w = d.who || {};
  const brief = [
    'שם: ' + (w.first||'') + ' | עסק: ' + (w.business||''),
    'תחום: ' + (a.field||'') + (a.field_txt ? ' (' + a.field_txt + ')' : '') +
      ' | מודל עסקי: ' + (c.model||''),
    'קהל: ' + (c.audience||'') + ' | טון שבחר: ' + (a.tone||''),
    'הבעיה שהוא פותר, במילים שלו: "' + (a.pain||'') + '"',
    'למה הוא התחיל: "' + (a.why||'') + '"',
    'הבידול שלו, במילים שלו: "' + (a.edge||'') + '"',
    'ערכים: ' + (a.values||[]).join(', '),
    'ההתנגדות שחוזרת אצלו: ' + (a.objection === 'other' ? a.objection_txt : a.objection),
    'מה מעכב אותו בשיווק: ' + (a.blocker === 'other' ? a.blocker_txt : a.blocker),
    'פלטפורמות ליבה: ' + (c.platforms||[]).join(', '),
    'קצב: ' + c.feed + ' לפיד בשבוע, ' + c.stories + ' סטוריז ביום',
    'ציון בשלות: ' + c.score + '/100 (' + c.band + ')',
    'פער: ' + c.gapClients + ' לקוחות ו-' + c.revGap + ' ש"ח בחודש'
  ].join('\n');

  const payload = JSON.stringify({
    systemInstruction: {parts:[{text: SYSTEM}]},
    contents: [{role:'user', parts:[{text: brief}]}],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: SCHEMA,
      temperature: 0.9
    }
  });

  /* מנסה מודל אחרי מודל — אם אחד חסום או נגמרה לו המכסה, יורד לבא */
  for (let i = 0; i < MODELS.length; i++){
    try {
      const r = UrlFetchApp.fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + MODELS[i] + ':generateContent',
        { method:'post', contentType:'application/json', payload: payload,
          headers:{'x-goog-api-key': GEMINI_KEY}, muteHttpExceptions:true });

      if (r.getResponseCode() !== 200){
        console.warn(MODELS[i], r.getResponseCode(), r.getContentText().slice(0,200));
        continue;
      }
      const j = JSON.parse(r.getContentText());
      const txt = j.candidates && j.candidates[0] &&
                  j.candidates[0].content.parts[0].text;
      if (!txt) continue;
      const out = JSON.parse(txt);
      out.ideas = (out.ideas || []).slice(0, 3);
      out.model = MODELS[i];
      return out;
    } catch (err){
      console.warn(MODELS[i], String(err));
    }
  }
  return {error:'all_models_failed'};
}
