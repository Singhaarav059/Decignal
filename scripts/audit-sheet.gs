// Google Apps Script: appends each audit request to the bound Google Sheet.
// Setup (once):
//   1. In the sheet: Extensions > Apps Script, paste this file, set SECRET below to a long random string.
//   2. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone. Copy the /exec URL.
//   3. Set AUDIT_WEBHOOK_URL=<that URL>?key=<SECRET> in .env.local and on Railway.
// The site POSTs the JSON payload from app/api/audit (sendWebhook). One row per request.
// Version 2 (the short workflow-review form) sends name, email, company, workflow and systems; it also
// fills `decision` and `systemsOther`, so a sheet set up for version 1 keeps its columns in place.
// Role, country, phone, area and preferred times stay empty from version 2 on.

const SECRET = "change-me";
const SHEET_NAME = "Decignal inquiries";

const COLUMNS = [
  ["Submitted", (d) => d.submittedAt],
  ["Ref", (d) => d.ref],
  ["Name", (d) => d.name],
  ["Work email", (d) => d.email],
  ["Company", (d) => d.company],
  ["Role", (d) => d.role],
  ["Country", (d) => d.country],
  ["Phone", (d) => d.phone],
  ["Area", (d) => d.area],
  ["Decision", (d) => d.workflow || d.decision],
  ["Systems", (d) => (Array.isArray(d.systems) ? d.systems.join(", ") : "")],
  ["Systems (other)", (d) => d.systemsOther || (typeof d.systems === "string" ? d.systems : "")],
  ["Preferred times", (d) => (d.slotsLocal || []).join("\n")],
  ["Time zone", (d) => d.timeZone],
  ["Source page", (d) => d.source],
];

function doPost(e) {
  if (!e || !e.parameter || e.parameter.key !== SECRET) return json({ ok: false, error: "forbidden" });

  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: "bad_request" });
  }
  if (data.type !== "audit_request") return json({ ok: false, error: "bad_request" });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(COLUMNS.map((c) => c[0]));
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight("bold");
    }
    sheet.appendRow(COLUMNS.map((c) => cell(c[1](data))));
  } finally {
    lock.releaseLock();
  }
  return json({ ok: true });
}

// Visitor text is stored as plain text: a leading = + - @ would otherwise run as a formula.
function cell(v) {
  if (v === undefined || v === null) return "";
  const s = String(v);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function json(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
