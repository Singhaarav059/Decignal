// The enquiry: one data model, validation and wording shared by the short request form (client) and
// app/api/audit/route.ts (server). No server-only imports here. Handoff §8: name, work email, company,
// the workflow and, optionally, the systems in use. No role, country, phone or time slots.

export const AUDIT_ENDPOINT = "/api/audit";

export const LIMITS = {
  name: [2, 120],
  email: 254,
  company: [2, 160],
  workflow: [3, 1200],
  systems: 200,
  source: 200,
} as const;

/** What the form POSTs to AUDIT_ENDPOINT as JSON. */
export type AuditRequest = {
  name: string;
  email: string;
  company: string;
  /** What the visitor would like to improve. */
  workflow: string;
  /** Free text: the systems they use (optional). */
  systems?: string;
  /** The page path the request came from, e.g. "/solutions/finance-and-risk". */
  source?: string;
  /** Honeypot. Hidden from people; anything in it marks the request as a bot. */
  website?: string;
  /** Milliseconds from first field focus to submit, measured on the client (no clock skew). */
  elapsedMs?: number;
};

/** The validated, normalised request (bot traps removed). */
export type AuditData = Omit<AuditRequest, "website" | "elapsedMs">;
export type AuditField = keyof AuditData;
export type AuditFieldErrors = Partial<Record<AuditField, string>>;

/** The fields in form order. */
export const AUDIT_FIELDS = ["name", "email", "company", "workflow", "systems"] as const satisfies readonly AuditField[];

export type AuditErrorCode =
  | "invalid"
  | "rate_limited"
  | "not_configured"
  | "delivery_failed"
  | "bad_request"
  | "too_large"
  | "forbidden"
  | "unsupported_media_type";

/**
 * Responses: 200 ok, 422 invalid (fields), 429 rate_limited (retryAfter seconds, also
 * in Retry-After), 503 not_configured (offer the downloadable brief), 502
 * delivery_failed, 400 bad_request, 413 too_large, 403 forbidden, 415 unsupported_media_type.
 */
export type AuditResponse =
  | { ok: true; ref: string }
  | { ok: false; error: "invalid"; fields: AuditFieldErrors }
  | { ok: false; error: "rate_limited"; retryAfter: number }
  | { ok: false; error: Exclude<AuditErrorCode, "invalid" | "rate_limited"> };

/** Field messages (handoff §8). Shown under the field; plain sentences, no codes. */
const AUDIT_MESSAGES = {
  name: "Please complete this field.",
  email: "Enter a valid email address.",
  required: "Please complete this field.",
  company: "Please complete this field.",
  workflow: "Please complete this field.",
  tooLong: (max: number) => `Keep this to ${max.toLocaleString("en-IN")} characters or fewer.`,
} as const;

/** Form and status wording (handoff §8). Never claims a booked call or a sent email without a backend success. */
export const AUDIT_COPY = {
  submit: "Request a call",
  sending: "Sending your request…",
  invalid: "Some answers need a look. Check the highlighted fields.",
  rate_limited: "Too many requests. Try again in a few minutes.",
  not_configured: (email?: string) =>
    email
      ? "We cannot take requests online yet. Download your answers and email them to us."
      : "We cannot take requests online yet. Download your answers and try again later.",
  errorHeading: "Your request could not be sent",
  errorBody: (email?: string) => (email ? `Please try again. If the problem continues, email ${email}.` : "Please try again."),
  retry: "Try again",
  download: "Download your answers",
  successHeading: "Your request has been received",
  successBody: "We will contact you by email to arrange a time.",
  reference: (ref: string) => `Reference ${ref}`,
} as const;

// ---------------------------------------------------------------- validation

type Result = { ok: true; data: AuditData } | { ok: false; fields: AuditFieldErrors };

// No spaces, commas, brackets or quotes (a trailing comma would pass a looser check and then
// fail at the mail provider), no empty domain labels, a top-level domain of 2+ characters.
const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@(?:[^\s@<>()[\]\\,;:".]+\.)+[^\s@<>()[\]\\,;:".]{2,}$/;

/** One line of text: control characters and runs of whitespace become one space. */
function line(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.normalize("NFC").replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Multi-line text: unified newlines, no other control characters, at most one blank line. */
function block(v: unknown): string {
  if (typeof v !== "string") return "";
  return v
    .normalize("NFC")
    .replace(/\r\n?|[\u2028\u2029]/g, "\n")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]+/g, " ")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Checks and normalises a request body. Works on partial input too, so the form can check before submit. */
export function validateAudit(input: unknown): Result {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const fields: AuditFieldErrors = {};
  const M = AUDIT_MESSAGES;
  const text = (key: "name" | "company", [min, max]: readonly [number, number]) => {
    const v = line(o[key]);
    if (v.length < min) fields[key] = M[key];
    else if (v.length > max) fields[key] = M.tooLong(max);
    return v;
  };

  // Checked in form order, so the first key is the first field to fix.
  const name = text("name", LIMITS.name);
  const email = line(o.email);
  if (!email) fields.email = M.required;
  else if (email.length > LIMITS.email || !EMAIL.test(email)) fields.email = M.email;
  const company = text("company", LIMITS.company);

  const workflow = block(o.workflow);
  if (workflow.length < LIMITS.workflow[0]) fields.workflow = M.workflow;
  else if (workflow.length > LIMITS.workflow[1]) fields.workflow = M.tooLong(LIMITS.workflow[1]);

  const systems = line(o.systems);
  if (systems.length > LIMITS.systems) fields.systems = M.tooLong(LIMITS.systems);

  // Attribution only: a path that fails the check is dropped, never an error for the visitor.
  const rawSource = line(o.source);
  const source = rawSource.startsWith("/") && !rawSource.startsWith("//") && rawSource.length <= LIMITS.source ? rawSource : "";

  if (Object.keys(fields).length) return { ok: false, fields };
  return {
    ok: true,
    data: { name, email, company, workflow, ...(systems ? { systems } : {}), ...(source ? { source } : {}) },
  };
}

/**
 * Honeypot filled, or submitted faster than a person can fill the form. Bots are
 * dropped silently, so only clear signals count: an empty or null honeypot and a
 * missing or zero elapsedMs (not measured) never mark a person as a bot.
 */
export function isLikelyBot(input: unknown): boolean {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const w = o.website;
  if (w !== undefined && w !== null && (typeof w !== "string" || w.trim() !== "")) return true;
  const t = o.elapsedMs;
  return typeof t === "number" && Number.isFinite(t) && t > 0 && t < 2500;
}

// ---------------------------------------------------------------- brief

/**
 * The plain-text brief: the delivered email body, the webhook `text`, and the downloadable fallback in
 * the form. Accepts partial data for the fallback.
 */
export function auditBrief(d: Partial<AuditData>, meta: { ref?: string; submittedAt?: Date } = {}): string {
  const out = ["DECIGNAL · ENQUIRY"];
  if (meta.ref) out.push(`Reference: ${meta.ref}`);
  if (meta.submittedAt) out.push(`Submitted: ${meta.submittedAt.toISOString().slice(0, 16).replace("T", " ")} UTC`);
  out.push(
    "",
    `Name: ${d.name || "Not given"}`,
    `Work email: ${d.email || "Not given"}`,
    `Company: ${d.company || "Not given"}`,
    "",
    "WHAT THEY WOULD LIKE TO IMPROVE",
    d.workflow || "To discuss",
    "",
    "SYSTEMS",
    d.systems || "Not given",
  );
  if (d.source) out.push("", `Sent from: ${d.source}`);
  return out.join("\n");
}
