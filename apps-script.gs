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

const NOTIFY = 'aviamira5@gmail.com';
const GANTT  = 'https://aviel112.github.io/strategy-engine/gantt/';

const HEAD = ['תאריך','שם','עסק','טלפון','אינסטגרם','ציון','מודל','תחום',
              'מחיר ממוצע','לקוחות היום','יעד','פער חודשי ₪','תקציב','שעות',
              'התנגדות','חסם','הכאב','הבידול','קוד לגאנט','כל התשובות'];

function doPost(e){
  try {
    const d = JSON.parse(e.postData.contents);
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
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
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
