// The audit request: one data model, validation and wording shared by the booking
// form (client) and app/api/audit/route.ts (server). No server-only imports here.

import { CATEGORIES, type Category } from "./content";

export { CATEGORIES };
export type { Category };

export const AUDIT_ENDPOINT = "/api/audit";

export const COUNTRIES = ["India", "Nigeria", "Kenya", "South Africa", "Egypt", "Ghana", "Morocco", "Other"] as const;
export type Country = (typeof COUNTRIES)[number];

/** System types (D8): the six story systems, then neutral types. No vendor names. */
export const SYSTEM_TYPES = [
  "ERP",
  "CRM",
  "MES",
  "WMS",
  "Suppliers",
  "External feeds",
  "Data warehouse",
  "Spreadsheets",
  "In-house system",
] as const;
export type SystemType = (typeof SYSTEM_TYPES)[number];

/** System colour per type; types without one render neutral. */
export const SYSTEM_TONE: Partial<Record<SystemType, "cobalt" | "violet" | "emerald" | "saffron" | "tangerine" | "pink">> = {
  ERP: "cobalt",
  CRM: "violet",
  MES: "emerald",
  WMS: "saffron",
  Suppliers: "tangerine",
  "External feeds": "pink",
};

/** Preferred times: 30 minute slots, 10:00 to 17:00 local, the next 10 working days. */
export const SLOTS = { minutes: 30, dayStart: 10 * 60, dayEnd: 17 * 60, days: 10, min: 2, max: 3, horizonDays: 45 } as const;

export const LIMITS = {
  name: [2, 120],
  email: 254,
  company: [2, 160],
  role: [2, 120],
  phone: [6, 24],
  decision: [10, 1200],
  systemsOther: 200,
  timeZone: 64,
  source: 200,
} as const;

/** What the form POSTs to AUDIT_ENDPOINT as JSON. */
export type AuditRequest = {
  name: string;
  email: string;
  company: string;
  role: string;
  country: Country;
  phone?: string;
  area: Category;
  decision: string;
  systems: SystemType[];
  /** Free text, e.g. product names or other systems. */
  systemsOther?: string;
  /** 2 to 3 preferred start times, in preference order, as Date#toISOString() (UTC). */
  slots: string[];
  /** Visitor's IANA zone: Intl.DateTimeFormat().resolvedOptions().timeZone. */
  timeZone: string;
  consent: true;
  /** The page path the request came from, e.g. "/solutions/finance-and-risk" (SP-10). */
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

/** Which fields each form step owns, to route a 422 back to the right step. */
export const AUDIT_STEPS = {
  1: ["name", "email", "company", "role", "country", "phone"],
  2: ["area", "decision", "systems", "systemsOther"],
  3: ["slots", "timeZone", "consent"],
} as const satisfies Record<1 | 2 | 3, readonly AuditField[]>;

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

/** Field messages (COPY-12). Shown under the field; plain sentences, no codes. */
export const AUDIT_MESSAGES = {
  name: "Enter your name",
  email: "Enter a work email, like name@company.com",
  company: "Enter your company",
  role: "Enter your role",
  country: "Choose a country",
  phone: "Enter a phone number with its country code, or leave it empty",
  area: "Choose a business area",
  decision: "Describe the decision in a sentence",
  systems: "Choose from the listed systems",
  slots: "Choose two or three times",
  slotPast: "One of your times has passed. Choose a later one",
  slotFar: "Choose times in the next few weeks",
  timeZone: "We could not read your time zone. Reload the page and try again",
  consent: "Tick the box so we can arrange your audit",
  tooLong: (max: number) => `Keep this to ${max.toLocaleString("en-GB")} characters or fewer`,
} as const;

/** Form and status wording for the booking UI (COPY-11/12 fallback: preferences, not a booked slot). */
export const AUDIT_COPY = {
  consentLabel: "I agree to Decignal using these details to arrange and prepare my audit.",
  privacyLine: "We use these details only to arrange and prepare your audit.",
  privacyLink: "Privacy notice",
  slotsHelp: (tz: string) => `30 minutes · Times shown in ${tz}`,
  slotsHint: "Choose two or three times. We confirm one by email.",
  submit: "Request my audit",
  sending: "Sending",
  invalid: "Some answers need a look. Check the highlighted fields.",
  rate_limited: "Too many requests. Try again in a few minutes.",
  not_configured: "We cannot take requests online yet. Download your brief to keep your answers.",
  delivery_failed: "We could not send your request. Your answers are saved. Try again, or download your brief.",
  retry: "Try again",
  download: "Download your brief",
  successEyebrow: "Audit requested",
  successHeadline: (firstName?: string) => (firstName ? `Request received, ${firstName}.` : "Request received."),
  successBody: (email: string) => `We will email ${email} to confirm one of your times.`,
  reference: (ref: string) => `Reference ${ref}`,
} as const;

// ---------------------------------------------------------------- validation

type Result = { ok: true; data: AuditData } | { ok: false; fields: AuditFieldErrors };

// No spaces, commas, brackets or quotes (a trailing comma would pass a looser check and then
// fail at the mail provider), no empty domain labels, a top-level domain of 2+ characters.
const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@(?:[^\s@<>()[\]\\,;:".]+\.)+[^\s@<>()[\]\\,;:".]{2,}$/;
const PHONE = /^[+()\d\s.-]+$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

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

export function isTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz || tz.length > LIMITS.timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks and normalises a request body. Works on partial input too, so the form can
 * run it before submit and show the errors for the current step (see AUDIT_STEPS).
 */
export function validateAudit(input: unknown, now = Date.now()): Result {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const fields: AuditFieldErrors = {};
  const M = AUDIT_MESSAGES;

  const text = (key: "name" | "company" | "role", [min, max]: readonly [number, number]) => {
    const v = line(o[key]);
    if (v.length < min) fields[key] = M[key];
    else if (v.length > max) fields[key] = M.tooLong(max);
    return v;
  };

  // Checked in form order, so the first key is the first field to fix.
  const name = text("name", LIMITS.name);
  const email = line(o.email);
  if (email.length > LIMITS.email || !EMAIL.test(email)) fields.email = M.email;
  const company = text("company", LIMITS.company);
  const role = text("role", LIMITS.role);

  const country = line(o.country) as Country;
  if (!COUNTRIES.includes(country)) fields.country = M.country;

  const phone = line(o.phone);
  const digits = phone.replace(/\D/g, "").length;
  if (phone && (!PHONE.test(phone) || phone.length > LIMITS.phone[1] || digits < LIMITS.phone[0])) fields.phone = M.phone;

  const area = line(o.area) as Category;
  if (!CATEGORIES.includes(area)) fields.area = M.area;

  const decision = block(o.decision);
  if (decision.length < LIMITS.decision[0]) fields.decision = M.decision;
  else if (decision.length > LIMITS.decision[1]) fields.decision = M.tooLong(LIMITS.decision[1]);

  let systems: SystemType[] = [];
  if (o.systems !== undefined && o.systems !== null) {
    const raw = Array.isArray(o.systems) ? o.systems.map(line) : null;
    if (!raw || raw.length > SYSTEM_TYPES.length || raw.some((s) => !SYSTEM_TYPES.includes(s as SystemType))) {
      fields.systems = M.systems;
    } else {
      systems = SYSTEM_TYPES.filter((s) => raw.includes(s));
    }
  }

  const systemsOther = line(o.systemsOther);
  if (systemsOther.length > LIMITS.systemsOther) fields.systemsOther = M.tooLong(LIMITS.systemsOther);

  const slots: string[] = [];
  const rawSlots = Array.isArray(o.slots) ? o.slots : [];
  for (const s of rawSlots.slice(0, SLOTS.max + 1)) {
    const t = typeof s === "string" && ISO.test(s) ? Date.parse(s) : NaN;
    if (Number.isNaN(t)) {
      fields.slots = M.slots;
      break;
    }
    if (t <= now) {
      fields.slots = M.slotPast;
      break;
    }
    if (t > now + SLOTS.horizonDays * 864e5) {
      fields.slots = M.slotFar;
      break;
    }
    const iso = new Date(t).toISOString();
    if (!slots.includes(iso)) slots.push(iso);
  }
  if (!fields.slots && (slots.length < SLOTS.min || slots.length > SLOTS.max || rawSlots.length > SLOTS.max)) {
    fields.slots = M.slots;
  }

  const timeZone = line(o.timeZone);
  if (!isTimeZone(timeZone)) fields.timeZone = M.timeZone;

  if (o.consent !== true) fields.consent = M.consent;

  // Attribution only: a path that fails the check is dropped, never an error for the visitor.
  const rawSource = line(o.source);
  const source = rawSource.startsWith("/") && !rawSource.startsWith("//") && rawSource.length <= LIMITS.source ? rawSource : "";

  if (Object.keys(fields).length) return { ok: false, fields };
  return {
    ok: true,
    data: {
      name,
      email,
      company,
      role,
      country,
      ...(phone ? { phone } : {}),
      area,
      decision,
      systems,
      ...(systemsOther ? { systemsOther } : {}),
      slots,
      timeZone,
      consent: true,
      ...(source ? { source } : {}),
    },
  };
}

/**
 * Honeypot filled, or submitted faster than a person can fill three steps. Bots are
 * dropped silently, so only clear signals count: an empty or null honeypot and a
 * missing or zero elapsedMs (not measured) never mark a person as a bot.
 */
export function isLikelyBot(input: unknown): boolean {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const w = o.website;
  if (w !== undefined && w !== null && (typeof w !== "string" || w.trim() !== "")) return true;
  const t = o.elapsedMs;
  return typeof t === "number" && Number.isFinite(t) && t > 0 && t < 3000;
}

// ---------------------------------------------------------------- time helpers

/** The next working days (Mon to Fri) after `from`, as local midnights in the runtime's zone. */
export function slotDays(from = new Date(), count: number = SLOTS.days): Date[] {
  const days: Date[] = [];
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  while (days.length < count) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d));
  }
  return days;
}

/** Slot start times for one local day, SLOTS.dayStart to the last start before SLOTS.dayEnd. */
export function daySlots(day: Date): Date[] {
  const out: Date[] = [];
  for (let m = SLOTS.dayStart; m + SLOTS.minutes <= SLOTS.dayEnd; m += SLOTS.minutes) {
    out.push(new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(m / 60), m % 60));
  }
  return out;
}

// Chrome and Node still report some legacy zone ids (Asia/Calcutta); show today's city name.
const CITY_NAMES: Record<string, string> = {
  Calcutta: "Kolkata",
  Kiev: "Kyiv",
  Saigon: "Ho Chi Minh",
  Katmandu: "Kathmandu",
  Rangoon: "Yangon",
  Asmera: "Asmara",
};

/** "Kolkata (UTC+5:30)" for a zone at a given moment (offsets move with DST). */
export function tzLabel(timeZone: string, at: Date = new Date()): string {
  if (!isTimeZone(timeZone)) return "UTC";
  let offset = "";
  try {
    offset =
      new Intl.DateTimeFormat("en-GB", { timeZone, timeZoneName: "shortOffset" })
        .formatToParts(at)
        .find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    // Older engines without shortOffset: fall back to the zone name alone.
  }
  const utc = offset.replace(/^GMT/, "UTC").replace(/^UTC\+?0?$/, "UTC");
  // UTC, Etc/GMT+5, EST or "+05:30" name no place: show the offset alone.
  const place = timeZone.includes("/") && !timeZone.startsWith("Etc/") ? timeZone.split("/").pop()!.replace(/_/g, " ") : "";
  const city = CITY_NAMES[place] ?? place;
  if (!city) return utc || timeZone;
  return utc ? `${city} (${utc})` : city;
}

/** "Wed 14 Oct, 11:30 to 12:00" in the given zone. */
export function formatSlot(iso: string, timeZone: string): string {
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return iso;
  const end = new Date(start.getTime() + SLOTS.minutes * 6e4);
  const tz = isTimeZone(timeZone) ? timeZone : "UTC";
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short" });
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${day.format(start)}, ${time.format(start)} to ${time.format(end)}`;
}

// ---------------------------------------------------------------- brief

/**
 * The plain-text brief: the delivered email body, the webhook `text`, and the
 * downloadable fallback in the form. Accepts partial data for the fallback.
 */
export function auditBrief(d: Partial<AuditData>, meta: { ref?: string; submittedAt?: Date } = {}): string {
  const tz = d.timeZone && isTimeZone(d.timeZone) ? d.timeZone : "UTC";
  const out = ["DECIGNAL · AI AUDIT REQUEST"];
  if (meta.ref) out.push(`Reference: ${meta.ref}`);
  if (meta.submittedAt) out.push(`Submitted: ${meta.submittedAt.toISOString().slice(0, 16).replace("T", " ")} UTC`);
  out.push(
    "",
    "ABOUT",
    `Name: ${d.name || "Not given"}`,
    `Work email: ${d.email || "Not given"}`,
    `Company: ${d.company || "Not given"}`,
    `Role: ${d.role || "Not given"}`,
    `Country: ${d.country || "Not given"}`,
    `Phone: ${d.phone || "Not given"}`,
    "",
    "DECISION",
    `Business area: ${d.area || "To discuss"}`,
    "The decision to move faster:",
    d.decision || "To discuss",
    "",
    "SYSTEMS",
    d.systems?.length ? d.systems.join(", ") : "To discuss",
  );
  if (d.systemsOther) out.push(`Also: ${d.systemsOther}`);
  out.push("", "PREFERRED TIMES (30 MINUTES)");
  if (d.slots?.length) {
    out.push(`Time zone: ${tzLabel(tz, new Date(d.slots[0]))}`);
    d.slots.forEach((s, i) => {
      const utc = tz === "UTC" ? "" : ` (UTC: ${formatSlot(s, "UTC")})`;
      out.push(`${i + 1}. ${formatSlot(s, tz)}${utc}`);
    });
  } else {
    out.push("To arrange by email");
  }
  if (d.source) out.push("", `Sent from: ${d.source}`);
  if (d.consent) out.push("", "Consent: agreed to be contacted to arrange and prepare this audit.");
  return out.join("\n");
}
