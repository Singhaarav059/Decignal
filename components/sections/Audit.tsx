"use client";

import Link from "next/link";
import {
  cloneElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactElement,
} from "react";
import {
  AUDIT_COPY,
  AUDIT_ENDPOINT,
  AUDIT_FIELDS,
  LIMITS,
  auditBrief,
  validateAudit,
  type AuditData,
  type AuditField,
  type AuditFieldErrors,
  type AuditResponse,
} from "@/lib/audit";
import { AUDIT } from "@/lib/copy";
import { jumpTo } from "@/lib/jump";
import { CONTACT_EMAIL } from "@/lib/site";
import { PLACEHOLDER } from "@/lib/placeholders";
import SectionTitle from "../ui/SectionTitle";
import { CalendarCheck } from "lucide-react";
import { Arrow } from "../ui/Arrow";

// The workflow review enquiry (handoff §8): the introduction on the ink panel and one short request
// card beside it (after it on phones). It asks for a call, not a booking, so nothing here claims a
// confirmed time or a sent email without the server's success. Requests go to /api/audit
// (lib/audit.ts has the contract).

type Answers = { name: string; email: string; company: string; workflow: string; systems: string };

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; ref: string; data: AuditData }
  | { kind: "rate_limited" }
  | { kind: "not_configured" }
  | { kind: "failed" };

/** Space the fixed nav takes at the top of the screen; the card's scroll-margin-top in audit.css matches. */
const NAV_CLEAR = 88;

/** The request body as the server validates it (bot traps are added on send). */
const toRequest = (a: Answers) => ({
  name: a.name,
  email: a.email,
  company: a.company,
  workflow: a.workflow,
  ...(a.systems.trim() ? { systems: a.systems } : {}),
});

/** Whatever has been answered so far, for the downloadable answers. */
const toPartial = (a: Answers): Partial<AuditData> => ({
  name: a.name.trim(),
  email: a.email.trim(),
  company: a.company.trim(),
  workflow: a.workflow.trim(),
  systems: a.systems.trim() || undefined,
});

function downloadBrief(text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "decignal-workflow-review.txt";
  a.click();
  // Some browsers start the download after click() returns; revoke once it has begun.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The enquiry section, on the homepage only (solution pages close with a link to it). */
export function Audit({ source }: { source?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const fid = (k: string) => `audit-${uid}-${k}`;

  const [answers, setAnswers] = useState<Answers>({ name: "", email: "", company: "", workflow: "", systems: "" });
  const [honeypot, setHoneypot] = useState("");
  // Errors show once the visitor tries to send; they then update as they type.
  const [tried, setTried] = useState(false);
  const [server, setServer] = useState<AuditFieldErrors>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [focus, setFocus] = useState<{ to: "heading" | "summary"; n: number } | null>(null);
  const started = useRef<number | null>(null);
  const card = useRef<HTMLDivElement>(null);

  const check = useMemo(() => validateAudit(toRequest(answers)), [answers]);
  const live: AuditFieldErrors = check.ok ? {} : check.fields;
  const errorOf = (k: AuditField) => server[k] ?? (tried ? live[k] : undefined);
  const errors = AUDIT_FIELDS.flatMap((k) => {
    const m = errorOf(k);
    return m ? [{ k, m }] : [];
  });

  const set = (k: keyof Answers, v: string) => {
    setAnswers((a) => ({ ...a, [k]: v }));
    if (server[k]) {
      setServer((s) => {
        const next = { ...s };
        delete next[k];
        return next;
      });
    }
  };
  const text = (k: keyof Answers) => ({
    value: answers[k],
    onChange: (e: { target: { value: string } }) => set(k, e.target.value),
  });

  // Focus follows the flow: the success heading after a send, the error summary when fields need a look.
  // When the target is off screen (on a phone) the page glides to the card top instead of jumping.
  useEffect(() => {
    const root = card.current;
    if (!focus || !root) return;
    const el = root.querySelector<HTMLElement>(focus.to === "summary" ? "[data-audit-summary]" : "[data-audit-heading]");
    if (!el) return;
    el.focus({ preventScroll: true });
    const r = el.getBoundingClientRect();
    if (r.top < NAV_CLEAR || r.bottom > window.innerHeight) void jumpTo(root, { focus: false });
  }, [focus]);

  const focusField = (k: AuditField) => document.getElementById(fid(k))?.focus();

  const from = () => source ?? window.location.pathname;

  const briefText = () => {
    const sent = status.kind === "sent" ? status : null;
    const data = sent ? sent.data : check.ok ? check.data : toPartial(answers);
    return auditBrief({ ...data, source: from() }, sent ? { ref: sent.ref } : {});
  };

  async function send(data: AuditData) {
    setStatus({ kind: "sending" });
    const elapsedMs = started.current === null ? 0 : Math.round(performance.now() - started.current);
    try {
      const res = await fetch(AUDIT_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...data, website: honeypot, ...(elapsedMs > 0 ? { elapsedMs } : {}), source: from() }),
        // The route answers within about 15s (its slowest channel, the webhook); past 30s the request is
        // stuck somewhere on the way, so the form offers the retry instead of spinning.
        signal: typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(30_000) : undefined,
      });
      const json = (await res.json().catch(() => null)) as AuditResponse | null;
      if (res.ok && json?.ok) {
        setStatus({ kind: "sent", ref: json.ref, data });
        setFocus({ to: "heading", n: Date.now() });
        return;
      }
      if (json && !json.ok && json.error === "invalid") {
        setServer(json.fields);
        setTried(true);
        setStatus({ kind: "idle" });
        setFocus({ to: "summary", n: Date.now() });
        return;
      }
      if (res.status === 429) setStatus({ kind: "rate_limited" });
      else if (res.status === 503) setStatus({ kind: "not_configured" });
      else setStatus({ kind: "failed" });
    } catch {
      setStatus({ kind: "failed" });
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Submit once while sending; the answers stay in place whatever happens.
    if (status.kind === "sending") return;
    setTried(true);
    if (!check.ok) {
      setFocus({ to: "summary", n: Date.now() });
      return;
    }
    void send(check.data);
  };

  const sent = status.kind === "sent" ? status : null;
  const failed = status.kind === "failed";

  return (
    <section id="audit" className="audit section band" data-band="night" aria-labelledby={fid("title")}>
      <div className="page-wrap">
        <div className="audit-panel">
          <div className="audit-grid">
            <div className="audit-copy">
              <SectionTitle
                icon={<CalendarCheck size={13} strokeWidth={2.2} />}
                id={fid("title")}
                label={AUDIT.eyebrow}
                lines={[AUDIT.headline[0], AUDIT.headline[1]]}
                tone="cobalt"
                reveal="lines"
                lede={AUDIT.intro}
              />
              <dl data-reveal className="audit-facts">
                {AUDIT.facts.map((f) => (
                  <div key={f.k}>
                    <dt className="t-label">{f.k}</dt>
                    <dd className="t-subtitle">{f.v}</dd>
                  </div>
                ))}
              </dl>
              <div data-reveal className="audit-get">
                <h3 className="t-label">{AUDIT.expectTitle}</h3>
                <p className="audit-get-text t-body">{AUDIT.expectations}</p>
              </div>
            </div>

            <div data-reveal className="audit-next">
              <h3 className="t-label">{AUDIT.nextTitle}</h3>
              <ol>
                {AUDIT.next.map((n, i) => {
                  const state = sent ? (i === 0 ? "done" : i === 1 ? "current" : "todo") : i === 0 ? "current" : "todo";
                  return (
                    <li key={n} data-state={state} aria-current={state === "current" ? "step" : undefined}>
                      <span className="audit-next-n" aria-hidden>
                        {state === "done" ? <Check /> : i + 1}
                      </span>
                      <span>{n}</span>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div ref={card} data-reveal className="audit-card">
              {sent ? (
                <div key="sent" className="audit-step" role="status">
                  <p className="audit-ok t-label">
                    <svg className="audit-check" viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                      <circle cx="12" cy="12" r="10.5" />
                      <path d="M7.2 12.4l3.2 3.2 6.4-7" />
                    </svg>
                    {AUDIT.cardTitle}
                  </p>
                  <h3 data-audit-heading tabIndex={-1} className="audit-head-title audit-done-title">
                    {AUDIT_COPY.successHeading}
                  </h3>
                  <p className="audit-done-body t-lede">{AUDIT_COPY.successBody}</p>
                  <p className="audit-ref">{AUDIT_COPY.reference(sent.ref)}</p>
                </div>
              ) : (
                <form
                  className="audit-form"
                  noValidate
                  onSubmit={onSubmit}
                  onFocus={() => {
                    if (started.current === null) started.current = performance.now();
                  }}
                >
                  <div className="audit-head">
                    <h3 data-audit-heading tabIndex={-1} className="audit-head-title">
                      {AUDIT.cardTitle}
                    </h3>
                  </div>

                  {tried && errors.length > 0 && (
                    <div className="audit-summary" data-audit-summary tabIndex={-1} aria-labelledby={fid("summary")}>
                      <p id={fid("summary")} className="audit-summary-title">
                        {AUDIT_COPY.invalid}
                      </p>
                      <ul>
                        {errors.map(({ k, m }) => (
                          <li key={k}>
                            <a
                              href={`#${fid(k)}`}
                              onClick={(e) => {
                                e.preventDefault();
                                focusField(k);
                              }}
                            >
                              {m}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="audit-step audit-fields">
                    <Field id={fid("name")} label={AUDIT.fields.name.label} error={errorOf("name")}>
                      <input
                        {...text("name")}
                        data-first-field
                        name="name"
                        placeholder={AUDIT.fields.name.placeholder}
                        autoComplete="name"
                        maxLength={LIMITS.name[1]}
                        required
                      />
                    </Field>
                    <Field id={fid("email")} label={AUDIT.fields.email.label} error={errorOf("email")}>
                      <input
                        {...text("email")}
                        name="email"
                        type="email"
                        inputMode="email"
                        placeholder={AUDIT.fields.email.placeholder}
                        autoComplete="email"
                        spellCheck={false}
                        maxLength={LIMITS.email}
                        required
                      />
                    </Field>
                    <Field id={fid("company")} label={AUDIT.fields.company.label} error={errorOf("company")}>
                      <input
                        {...text("company")}
                        name="company"
                        placeholder={AUDIT.fields.company.placeholder}
                        autoComplete="organization"
                        maxLength={LIMITS.company[1]}
                        required
                      />
                    </Field>
                    <Field id={fid("systems")} label={AUDIT.fields.systems.label} error={errorOf("systems")}>
                      <input
                        {...text("systems")}
                        name="systems"
                        placeholder={AUDIT.fields.systems.placeholder}
                        autoComplete="off"
                        maxLength={LIMITS.systems}
                      />
                    </Field>
                  </div>
                  <div className="audit-step">
                    <Field id={fid("workflow")} label={AUDIT.fields.workflow.label} error={errorOf("workflow")}>
                      <textarea
                        {...text("workflow")}
                        name="workflow"
                        rows={4}
                        placeholder={AUDIT.fields.workflow.placeholder}
                        maxLength={LIMITS.workflow[1]}
                        required
                      />
                    </Field>
                  </div>

                  {/* Hidden from people; anything typed here marks the request as a bot. */}
                  <div className="audit-hp" aria-hidden="true">
                    <label>
                      {AUDIT.honeypot}
                      <input name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
                    </label>
                  </div>

                  <Notice status={status} onDownload={() => downloadBrief(briefText())} mailBody={briefText} />

                  <div className="audit-actions">
                    {/* One primary at a time: with no delivery channel the download leads; after a failed
                        send the submit itself is the retry. */}
                    <button
                      type="submit"
                      className={`btn ${status.kind === "not_configured" ? "btn-ghost" : "btn-primary"} audit-submit`}
                      aria-disabled={status.kind === "sending" || undefined}
                      aria-busy={status.kind === "sending" || undefined}
                    >
                      <span className="audit-submit-face">
                        <span data-off={status.kind === "sending" || undefined}>
                          {failed ? AUDIT_COPY.retry : AUDIT_COPY.submit}
                          <Arrow />
                        </span>
                        <span data-off={status.kind !== "sending" || undefined}>
                          <span className="audit-spin" aria-hidden />
                          {AUDIT_COPY.sending}
                        </span>
                      </span>
                    </button>
                  </div>
                  <p className="audit-privacy">
                    {AUDIT.privacyLine}{" "}
                    <Link href="/privacy" target="_blank" rel="noopener">
                      {AUDIT.privacyLink}
                      <span className="sr-only"> {AUDIT.newTab}</span>
                    </Link>
                    .
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Check() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
      <path d="M3.5 8.4l2.9 2.9 6.1-6.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A labelled control with an underline, its error under it. The child gets id, aria and class. */
function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactElement<InputHTMLAttributes<HTMLElement>>;
}) {
  const errId = `${id}-error`;
  const control = cloneElement(children, {
    id,
    className: "audit-input",
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errId : undefined,
  });
  return (
    <div className="audit-field" data-invalid={error ? "" : undefined}>
      <label htmlFor={id} className="t-label">
        {label}
      </label>
      {control}
      {error && (
        <p id={errId} className="audit-error">
          {error}
        </p>
      )}
    </div>
  );
}

/** Request states after a send that did not go through: what happened and what the visitor can do. */
function Notice({ status, onDownload, mailBody }: { status: Status; onDownload: () => void; mailBody: () => string }) {
  if (status.kind !== "rate_limited" && status.kind !== "not_configured" && status.kind !== "failed") return null;
  const email = CONTACT_EMAIL ?? PLACEHOLDER.email;
  // The email fallback carries the answers, unless they are too long for a mailto link.
  const body = mailBody();
  const mail = `mailto:${email}?subject=${encodeURIComponent(AUDIT.eyebrow)}${body.length <= 1500 ? `&body=${encodeURIComponent(body)}` : ""}`;
  return (
    <div className="audit-notice" role="alert">
      {status.kind === "failed" ? (
        <>
          <p className="audit-summary-title">{AUDIT_COPY.errorHeading}</p>
          <p>{AUDIT_COPY.errorBody(email)}</p>
        </>
      ) : (
        <p>{status.kind === "rate_limited" ? AUDIT_COPY.rate_limited : AUDIT_COPY.not_configured}</p>
      )}
      <div className="audit-notice-actions">
        {status.kind === "not_configured" && (
          <button type="button" className="btn btn-primary" onClick={onDownload}>
            {AUDIT_COPY.download}
            <Arrow />
          </button>
        )}
        {status.kind !== "rate_limited" && (
          <a className="audit-notice-mail" href={mail}>
            {AUDIT.orEmail(email)}
          </a>
        )}
      </div>
    </div>
  );
}
