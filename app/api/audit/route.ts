import type { NextRequest } from "next/server";
import { auditBrief, isLikelyBot, validateAudit, type AuditData, type AuditResponse } from "@/lib/audit";
import { clientIp, createLimiter } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site";

// Enquiries from the homepage form (handoff §8). Delivery is configured by env, any channel may be set:
//   AUDIT_WEBHOOK_URL                                  POST JSON (Slack, Make, Zapier, n8n, CRM hook)
//   RESEND_API_KEY + AUDIT_TO_EMAIL + AUDIT_FROM_EMAIL  email through the Resend REST API
// With none set the route answers 503 not_configured and the form offers the brief download.
// Logs carry the reference id and status codes only, never personal data.

export const runtime = "nodejs";

const MAX_BODY = 16 * 1024;
const TIMEOUT = 5000;
// Apps Script cold starts plus the sheet lock (scripts/audit-sheet.gs) can pass 5s; a timeout there
// would report failure for a row that was written, and the visitor's retry would duplicate it.
const WEBHOOK_TIMEOUT = 15000;

// Per IP: a burst of 5, then one more every 2 minutes (5 per 10 minutes sustained).
const perIp = createLimiter({ capacity: 5, refillMs: 2 * 60_000 });
// Whole site: 100 deliveries an hour, so a flood of addresses cannot drain the email quota.
const perSite = createLimiter({ capacity: 100, refillMs: 36_000 });

const reply = (body: AuditResponse, status: number, headers?: Record<string, string>) =>
  Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });

const REF_CHARS = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
function makeRef() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return "DA-" + Array.from(bytes, (b) => REF_CHARS[b % REF_CHARS.length]).join("");
}

/** Reads at most MAX_BODY bytes; null when the body is larger. */
async function readCapped(request: NextRequest): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

/** Same-origin only: a browser Origin must match the host the request came in on. */
function originAllowed(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Non-browser clients send none; JSON-only + limits still apply.
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  const allowed = [request.headers.get("x-forwarded-host"), request.headers.get("host"), new URL(SITE_URL).host];
  return allowed.some((h) => h?.split(",")[0].trim() === host);
}

function channels() {
  const { AUDIT_WEBHOOK_URL, RESEND_API_KEY, AUDIT_TO_EMAIL, AUDIT_FROM_EMAIL } = process.env;
  return {
    webhook: AUDIT_WEBHOOK_URL || null,
    resend:
      RESEND_API_KEY && AUDIT_TO_EMAIL && AUDIT_FROM_EMAIL
        ? { key: RESEND_API_KEY, to: AUDIT_TO_EMAIL.split(",").map((s) => s.trim()).filter(Boolean), from: AUDIT_FROM_EMAIL }
        : null,
  };
}

async function sendWebhook(url: string, data: AuditData, ref: string, submittedAt: Date, brief: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "audit_request",
      version: 2,
      ref,
      submittedAt: submittedAt.toISOString(),
      ...data,
      // The sheet script deployed before version 2 reads these columns; mapping the short form onto
      // them keeps one row per request without redeploying it (scripts/audit-sheet.gs).
      decision: data.workflow,
      systemsOther: data.systems ?? "",
      // `text` makes the same payload readable in a Slack incoming webhook. &, < and > are
      // escaped as Slack asks, so visitor text cannot post <!channel> pings or disguised links.
      text: brief.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
    }),
    signal: AbortSignal.timeout(WEBHOOK_TIMEOUT),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`webhook ${res.status}`);
  // Apps Script (scripts/audit-sheet.gs) always answers 200, so it reports failures as {"ok":false}, and
  // a script that throws (lock timeout, quota) answers with an HTML error page: only {"ok":true} counts.
  const appsScript = new URL(url).hostname === "script.google.com";
  const json = res.headers.get("content-type")?.includes("application/json");
  if (!json && appsScript) throw new Error("webhook non_json");
  if (json) {
    const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (body?.ok === false || (appsScript && body?.ok !== true)) throw new Error(`webhook ${body?.error ?? "rejected"}`);
  }
}

async function sendEmail(
  cfg: { key: string; to: string[]; from: string },
  data: AuditData,
  ref: string,
  brief: string,
) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${cfg.key}`,
      "content-type": "application/json",
      "idempotency-key": `audit-${ref}`,
    },
    body: JSON.stringify({
      from: cfg.from,
      to: cfg.to,
      reply_to: data.email,
      subject: `Decignal enquiry: ${data.company} (${ref})`,
      text: brief,
    }),
    signal: AbortSignal.timeout(TIMEOUT),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`resend ${res.status}`);
}

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return reply({ ok: false, error: "forbidden" }, 403);

  const limit = perIp.take(clientIp(request.headers));
  if (!limit.ok) {
    return reply({ ok: false, error: "rate_limited", retryAfter: limit.retryAfter }, 429, {
      "retry-after": String(limit.retryAfter),
    });
  }

  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) {
    return reply({ ok: false, error: "unsupported_media_type" }, 415);
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) {
    return reply({ ok: false, error: "too_large" }, 413);
  }
  const raw = await readCapped(request);
  if (raw === null) return reply({ ok: false, error: "too_large" }, 413);

  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return reply({ ok: false, error: "bad_request" }, 400);
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return reply({ ok: false, error: "bad_request" }, 400);
  }

  const ref = makeRef();
  // Bots get the same success a person would, and nothing is delivered.
  if (isLikelyBot(input)) return reply({ ok: true, ref }, 200);

  const checked = validateAudit(input);
  if (!checked.ok) return reply({ ok: false, error: "invalid", fields: checked.fields }, 422);

  const { webhook, resend } = channels();
  if (!webhook && !resend) return reply({ ok: false, error: "not_configured" }, 503);

  const site = perSite.take("all");
  if (!site.ok) {
    return reply({ ok: false, error: "rate_limited", retryAfter: site.retryAfter }, 429, {
      "retry-after": String(site.retryAfter),
    });
  }

  const submittedAt = new Date();
  const brief = auditBrief(checked.data, { ref, submittedAt });
  const jobs: { name: string; run: Promise<void> }[] = [];
  if (webhook) jobs.push({ name: "webhook", run: sendWebhook(webhook, checked.data, ref, submittedAt, brief) });
  if (resend) jobs.push({ name: "email", run: sendEmail(resend, checked.data, ref, brief) });

  const results = await Promise.allSettled(jobs.map((j) => j.run));
  const sent = jobs.filter((_, i) => results[i].status === "fulfilled").map((j) => j.name);
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      // Only the channel and a status or error name: no payload, no addresses.
      const why = r.reason instanceof Error ? (r.reason.name === "Error" ? r.reason.message : r.reason.name) : "unknown";
      console.error(`[audit] ${ref} ${jobs[i].name} failed: ${why}`);
    }
  });

  if (!sent.length) return reply({ ok: false, error: "delivery_failed" }, 502);
  console.info(`[audit] ${ref} delivered via ${sent.join(", ")}`);
  return reply({ ok: true, ref }, 200);
}
