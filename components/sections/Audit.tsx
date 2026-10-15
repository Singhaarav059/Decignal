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
  type KeyboardEvent,
  type ReactElement,
} from "react";
import {
  AUDIT_COPY,
  AUDIT_ENDPOINT,
  AUDIT_STEPS,
  CATEGORIES,
  COUNTRIES,
  LIMITS,
  SLOTS,
  SYSTEM_TONE,
  SYSTEM_TYPES,
  auditBrief,
  daySlots,
  formatSlot,
  slotDays,
  tzLabel,
  validateAudit,
  type AuditData,
  type AuditField,
  type AuditFieldErrors,
  type AuditResponse,
  type Category,
  type Country,
  type SystemType,
} from "@/lib/audit";
import { areaBySlug, type AreaSlug } from "@/lib/areas";
import { AUDIT, SERVICE } from "@/lib/copy";
import { jumpTo } from "@/lib/jump";
import { CONTACT_EMAIL } from "@/lib/site";
import { toneVars } from "@/lib/tone";
import SectionTitle from "../ui/SectionTitle";
import { CalendarCheck } from "lucide-react";
import { Arrow } from "../ui/Arrow";

// The free AI audit (E09, COPY-11/12, PROD-02 client): the lead magnet on the ink panel and a
// three-step request card. It sends preferred times, not a booking, so nothing here claims a
// confirmed slot or a calendar invite. Requests go to /api/audit (lib/audit.ts has the contract).

type Step = 1 | 2 | 3;

type Answers = {
  name: string;
  email: string;
  company: string;
  role: string;
  country: string;
  phone: string;
  area: string;
  decision: string;
  systems: SystemType[];
  systemsOther: string;
  slots: string[];
  consent: boolean;
};

type TextKey = "name" | "email" | "company" | "role" | "country" | "phone" | "decision" | "systemsOther";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; ref: string; data: AuditData }
  | { kind: "rate_limited" }
  | { kind: "not_configured" }
  | { kind: "failed" };

/** Preferred-time windows per day, in minutes after local midnight (inside SLOTS.dayStart..dayEnd). */
const WINDOWS = [10 * 60, 12 * 60, 15 * 60];

/** Space the fixed nav takes at the top of the screen; the card's scroll-margin-top in audit.css matches. */
const NAV_CLEAR = 88;

const STEP_FIELDS = AUDIT_STEPS as Record<Step, readonly AuditField[]>;
const stepOf = (f: AuditField): Step => (STEP_FIELDS[1].includes(f) ? 1 : STEP_FIELDS[2].includes(f) ? 2 : 3);

/** The visitor's IANA zone; only read in the browser (step 3 and submit never render on the server). */
const localZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

/** The request body as the server validates it (bot traps are added on send). */
const toRequest = (a: Answers) => ({
  name: a.name,
  email: a.email,
  company: a.company,
  role: a.role,
  country: a.country,
  ...(a.phone.trim() ? { phone: a.phone } : {}),
  area: a.area,
  decision: a.decision,
  systems: a.systems,
  ...(a.systemsOther.trim() ? { systemsOther: a.systemsOther } : {}),
  slots: a.slots,
  timeZone: localZone(),
  consent: a.consent,
});

/** Whatever has been answered so far, for the downloadable brief. */
const toPartial = (a: Answers): Partial<AuditData> => ({
  name: a.name.trim(),
  email: a.email.trim(),
  company: a.company.trim(),
  role: a.role.trim(),
  country: (a.country || undefined) as Country | undefined,
  phone: a.phone.trim() || undefined,
  area: (a.area || undefined) as Category | undefined,
  decision: a.decision.trim(),
  systems: a.systems,
  systemsOther: a.systemsOther.trim() || undefined,
  slots: a.slots,
  timeZone: localZone(),
  consent: a.consent ? true : undefined,
});

function downloadBrief(text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "decignal-audit-brief.txt";
  a.click();
  // Some browsers start the download after click() returns; revoke once it has begun.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * The audit section. On a service page pass `area` (its slug) to preselect the business area;
 * `source` names the page a request came from (defaults to the current path).
 */
export function Audit({ area, source }: { area?: AreaSlug; source?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const fid = (k: string) => `audit-${uid}-${k}`;
  const areaInfo = area ? areaBySlug(area) : undefined;
  const areaTone = areaInfo?.tone;

  const [step, setStep] = useState<Step>(1);
  const [answers, setAnswers] = useState<Answers>(() => ({
    name: "",
    email: "",
    company: "",
    role: "",
    country: "",
    phone: "",
    area: (area && areaBySlug(area)?.category) || "",
    decision: "",
    systems: [],
    systemsOther: "",
    slots: [],
    consent: false,
  }));
  const [honeypot, setHoneypot] = useState("");
  // A step shows its errors once the visitor tries to leave it; they then update as they type.
  const [tried, setTried] = useState<Record<Step, boolean>>({ 1: false, 2: false, 3: false });
  const [server, setServer] = useState<AuditFieldErrors>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [focus, setFocus] = useState<{ to: "heading" | "summary"; n: number } | null>(null);
  const started = useRef<number | null>(null);
  const card = useRef<HTMLDivElement>(null);

  const check = useMemo(() => validateAudit(toRequest(answers)), [answers]);
  const live: AuditFieldErrors = check.ok ? {} : check.fields;
  const errorOf = (k: AuditField) => server[k] ?? (tried[stepOf(k)] ? live[k] : undefined);
  const stepErrors = (s: Step) =>
    STEP_FIELDS[s].flatMap((k) => {
      const m = errorOf(k);
      return m ? [{ k, m }] : [];
    });
  const errors = stepErrors(step);

  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => {
    setAnswers((a) => ({ ...a, [k]: v }));
    if (server[k as AuditField] || (k === "slots" && server.timeZone)) {
      setServer((s) => {
        const next = { ...s };
        delete next[k as AuditField];
        if (k === "slots") delete next.timeZone;
        return next;
      });
    }
  };
  const text = (k: TextKey) => ({
    value: answers[k],
    onChange: (e: { target: { value: string } }) => set(k, e.target.value),
  });

  const go = (s: Step, to: "heading" | "summary" = "heading") => {
    setStep(s);
    setFocus({ to, n: Date.now() });
  };

  // Focus follows the flow: the step heading on a step change, the error summary when a step has errors.
  // Focus lands in place; when the target is off screen (a tall step on a phone) the page glides to the
  // card top instead of the browser's own jump.
  useEffect(() => {
    const root = card.current;
    if (!focus || !root) return;
    const el = root.querySelector<HTMLElement>(focus.to === "summary" ? "[data-audit-summary]" : "[data-audit-heading]");
    if (!el) return;
    el.focus({ preventScroll: true });
    const r = el.getBoundingClientRect();
    if (r.top < NAV_CLEAR || r.bottom > window.innerHeight) void jumpTo(root, { focus: false });
  }, [focus]);

  const focusField = (k: AuditField) => {
    const root = card.current;
    if (!root) return;
    const target =
      k === "slots" || k === "timeZone"
        ? root.querySelector<HTMLElement>(`#${fid("slots")} button[tabindex="0"]`)
        : k === "area" || k === "systems"
          ? root.querySelector<HTMLElement>(`input[name="${k}"]:checked`) ?? root.querySelector<HTMLElement>(`input[name="${k}"]`)
          : document.getElementById(fid(k));
    target?.focus();
  };

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
        // stuck somewhere on the way, so the form offers the retry and the brief instead of spinning.
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
        setTried({ 1: true, 2: true, 3: true });
        setStatus({ kind: "idle" });
        const first = Object.keys(json.fields)[0] as AuditField | undefined;
        go(first ? stepOf(first) : 3, "summary");
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
    if (status.kind === "sending") return;
    setTried((t) => ({ ...t, [step]: true }));
    if (step < 3) {
      if (STEP_FIELDS[step].some((k) => live[k] || server[k])) setFocus({ to: "summary", n: Date.now() });
      else go((step + 1) as Step);
      return;
    }
    if (!check.ok) {
      // Earlier steps can only be wrong here if something changed the answers; send the visitor back.
      const first = (Object.keys(check.fields) as AuditField[])[0];
      setTried({ 1: true, 2: true, 3: true });
      if (stepOf(first) === 3) setFocus({ to: "summary", n: Date.now() });
      else go(stepOf(first), "summary");
      return;
    }
    void send(check.data);
  };

  const sent = status.kind === "sent" ? status : null;
  const tz = step === 3 || sent ? (sent?.data.timeZone ?? localZone()) : "UTC";

  return (
    <section id="audit" className="audit section band" data-band={areaTone ?? "night"} aria-labelledby={fid("title")}>
      <div className="page-wrap">
        <div className="audit-panel">
          <div className="audit-grid">
            {/* Home: a neutral dot and the brand's cobalt accent line, as the editorial heads. A service
                page marks both in its area's tone, as its other sections do. */}
            <div className="audit-copy" data-area={areaTone ? "" : undefined}>
              <SectionTitle
                icon={<CalendarCheck size={13} strokeWidth={2.2} />}
                id={fid("title")}
                label={AUDIT.eyebrow}
                lines={[AUDIT.headline[0], AUDIT.headline[1]]}
                tone={areaTone ?? "cobalt"}
                reveal="lines"
                lede={areaInfo ? SERVICE.ctaBand.sub(areaInfo.name) : AUDIT.intro}
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
                <h3 className="t-label">{AUDIT.getTitle}</h3>
                <ol>
                  {AUDIT.get.map((g, i) => (
                    <li key={g.title}>
                      <span className="audit-get-n t-label" aria-hidden>
                        0{i + 1}
                      </span>
                      <span>
                        <span className="audit-get-title t-subtitle">{g.title}</span>
                        <span className="audit-get-text t-body">{g.text}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div data-reveal className="audit-next">
              <h3 className="t-label">{AUDIT.nextTitle}</h3>
              <ol>
                {AUDIT.next.map((n, i) => {
                  // The process follows the form: the questions are step 2, the times step 3.
                  const state = sent
                    ? i < 2
                      ? "done"
                      : i === 2
                        ? "current"
                        : "todo"
                    : i === 0
                      ? step > 2
                        ? "done"
                        : step === 2
                          ? "current"
                          : "todo"
                      : i === 1 && step === 3
                        ? "current"
                        : "todo";
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
              <p className="audit-tail">{AUDIT.tail}</p>
            </div>

            <div ref={card} data-reveal className="audit-card">
              <ol className="audit-steps" aria-label={AUDIT.progressAria}>
                {AUDIT.steps.map((name, i) => {
                  const n = (i + 1) as Step;
                  const state = sent || n < step ? "done" : n === step ? "current" : "todo";
                  const label = `${AUDIT.progress(n)} ${name}`;
                  return (
                    <li key={name} data-state={state}>
                      {state === "done" && !sent ? (
                        <button type="button" onClick={() => go(n)} aria-label={`${AUDIT.back}: ${label}`} title={name}>
                          <span className="audit-steps-bar" />
                        </button>
                      ) : (
                        <span aria-current={state === "current" ? "step" : undefined} title={name}>
                          <span className="audit-steps-bar" />
                          <span className="sr-only">{label}</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>

              {sent ? (
                <div key="sent" className="audit-step" role="status">
                  <p className="audit-ok t-label">
                    <svg className="audit-check" viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                      <circle cx="12" cy="12" r="10.5" />
                      <path d="M7.2 12.4l3.2 3.2 6.4-7" />
                    </svg>
                    {AUDIT_COPY.successEyebrow}
                  </p>
                  <h3 data-audit-heading tabIndex={-1} className="audit-head-title audit-done-title">
                    {AUDIT_COPY.successHeadline(sent.data.name.split(" ")[0])}
                  </h3>
                  <p className="audit-done-body t-lede">{AUDIT_COPY.successBody(sent.data.email)}</p>
                  <Picks slots={sent.data.slots} tz={tz} />
                  <p className="audit-ref">{AUDIT_COPY.reference(sent.ref)}</p>
                  <div className="audit-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => downloadBrief(briefText())}>
                      {AUDIT_COPY.download}
                      <Arrow />
                    </button>
                  </div>
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
                      {AUDIT.steps[step - 1]}
                    </h3>
                    <p className="t-label tabular" aria-hidden>
                      {AUDIT.progress(step)}
                    </p>
                  </div>

                  {tried[step] && errors.length > 0 && (
                    <div className="audit-summary" data-audit-summary tabIndex={-1} aria-labelledby={fid("summary")}>
                      <p id={fid("summary")} className="audit-summary-title">
                        {AUDIT_COPY.invalid}
                      </p>
                      <ul>
                        {errors.map(({ k, m }) => (
                          <li key={k}>
                            <a
                              href={`#${k === "slots" || k === "timeZone" ? fid("slots") : fid(k)}`}
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

                  {step === 1 && (
                    <div key="s1" className="audit-step audit-fields">
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
                      <Field id={fid("role")} label={AUDIT.fields.role.label} error={errorOf("role")}>
                        <input
                          {...text("role")}
                          name="role"
                          placeholder={AUDIT.fields.role.placeholder}
                          autoComplete="organization-title"
                          maxLength={LIMITS.role[1]}
                          required
                        />
                      </Field>
                      <Field id={fid("country")} label={AUDIT.fields.country.label} error={errorOf("country")} select>
                        <select {...text("country")} name="country" autoComplete="country-name" required>
                          <option value="" disabled>
                            {AUDIT.fields.country.placeholder}
                          </option>
                          {COUNTRIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field id={fid("phone")} label={AUDIT.fields.phone.label} error={errorOf("phone")}>
                        <input
                          {...text("phone")}
                          name="phone"
                          type="tel"
                          inputMode="tel"
                          placeholder={AUDIT.fields.phone.placeholder}
                          autoComplete="tel"
                          maxLength={LIMITS.phone[1]}
                        />
                      </Field>
                    </div>
                  )}

                  {step === 2 && (
                    <div key="s2" className="audit-step">
                      <Choices
                        type="radio"
                        name="area"
                        idBase={fid("area")}
                        legend={AUDIT.fields.area.label}
                        error={errorOf("area")}
                        options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                        isOn={(v) => answers.area === v}
                        onToggle={(v) => set("area", v)}
                        first
                      />
                      <Field id={fid("decision")} label={AUDIT.fields.decision.label} error={errorOf("decision")}>
                        <textarea
                          {...text("decision")}
                          name="decision"
                          rows={3}
                          placeholder={AUDIT.fields.decision.placeholder}
                          maxLength={LIMITS.decision[1]}
                          required
                        />
                      </Field>
                      <Choices
                        type="checkbox"
                        name="systems"
                        idBase={fid("systems")}
                        legend={AUDIT.fields.systems.label}
                        error={errorOf("systems")}
                        options={SYSTEM_TYPES.map((s) => ({ value: s, label: s, tone: SYSTEM_TONE[s] }))}
                        isOn={(v) => answers.systems.includes(v as SystemType)}
                        onToggle={(v) => {
                          const s = v as SystemType;
                          const next = answers.systems.includes(s) ? answers.systems.filter((x) => x !== s) : [...answers.systems, s];
                          set("systems", SYSTEM_TYPES.filter((x) => next.includes(x)));
                        }}
                      />
                      <Field id={fid("systemsOther")} label={AUDIT.fields.systemsOther.label} error={errorOf("systemsOther")}>
                        <input
                          {...text("systemsOther")}
                          name="systemsOther"
                          placeholder={AUDIT.fields.systemsOther.placeholder}
                          autoComplete="off"
                          maxLength={LIMITS.systemsOther}
                        />
                      </Field>
                    </div>
                  )}

                  {step === 3 && (
                    <div key="s3" className="audit-step">
                      <fieldset className="audit-times" aria-describedby={`${fid("slots-help")} ${errorOf("slots") || errorOf("timeZone") ? fid("slots-error") : ""}`.trim()}>
                        <legend className="sr-only">{AUDIT.steps[2]}</legend>
                        <p id={fid("slots-help")} className="audit-times-help">
                          <span>{AUDIT_COPY.slotsHelp(tzLabel(tz))}</span>
                          <span>{AUDIT_COPY.slotsHint}</span>
                        </p>
                        <SlotPicker
                          id={fid("slots")}
                          label={AUDIT.steps[2]}
                          value={answers.slots}
                          tz={tz}
                          invalid={!!(errorOf("slots") || errorOf("timeZone"))}
                          onChange={(v) => set("slots", v)}
                        />
                        {(errorOf("slots") || errorOf("timeZone")) && (
                          <p id={fid("slots-error")} className="audit-error">
                            {errorOf("slots") ?? errorOf("timeZone")}
                          </p>
                        )}
                        <Picks slots={answers.slots} tz={tz} live />
                      </fieldset>
                      {CONTACT_EMAIL && (
                        <p className="audit-times-alt">
                          {AUDIT.timesAlt[0]} <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(AUDIT.eyebrow)}`}>{CONTACT_EMAIL}</a>{" "}
                          {AUDIT.timesAlt[1]}
                        </p>
                      )}
                      <div className="audit-consent-wrap" data-invalid={errorOf("consent") ? "" : undefined}>
                        <label className="audit-consent">
                          <input
                            id={fid("consent")}
                            type="checkbox"
                            name="consent"
                            checked={answers.consent}
                            onChange={(e) => set("consent", e.target.checked)}
                            aria-invalid={errorOf("consent") ? true : undefined}
                            aria-describedby={errorOf("consent") ? fid("consent-error") : undefined}
                            required
                          />
                          <span>{AUDIT_COPY.consentLabel}</span>
                        </label>
                        {errorOf("consent") && (
                          <p id={fid("consent-error")} className="audit-error">
                            {errorOf("consent")}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Hidden from people; anything typed here marks the request as a bot. */}
                  <div className="audit-hp" aria-hidden="true">
                    <label>
                      {AUDIT.honeypot}
                      <input name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
                    </label>
                  </div>

                  {step === 3 && <Notice status={status} onDownload={() => downloadBrief(briefText())} mailBody={briefText} />}

                  <div className="audit-actions">
                    {step > 1 && (
                      <button type="button" className="audit-back" onClick={() => go((step - 1) as Step)}>
                        {AUDIT.back}
                      </button>
                    )}
                    {/* One primary at a time: with no delivery channel the brief download leads and a
                        resend steps back; after a failed send the submit itself is the retry. */}
                    <button
                      type="submit"
                      className={`btn ${step === 3 && status.kind === "not_configured" ? "btn-ghost" : "btn-primary"} audit-submit`}
                      aria-disabled={status.kind === "sending" || undefined}
                      aria-busy={status.kind === "sending" || undefined}
                    >
                      <span className="audit-submit-face">
                        <span data-off={status.kind === "sending" || undefined}>
                          {step === 1 ? AUDIT.continue : step === 2 ? AUDIT.toTimes : status.kind === "failed" ? AUDIT_COPY.retry : AUDIT_COPY.submit}
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
                    {AUDIT_COPY.privacyLine}{" "}
                    <Link href="/privacy" target="_blank" rel="noopener">
                      {AUDIT_COPY.privacyLink}
                      <span className="sr-only"> {AUDIT.newTab}</span>
                    </Link>
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
  select,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  select?: boolean;
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
    <div className="audit-field" data-invalid={error ? "" : undefined} data-select={select ? "" : undefined}>
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

/** Chips backed by real radios or checkboxes, so arrows, Space and form semantics work natively. */
function Choices({
  type,
  name,
  idBase,
  legend,
  error,
  options,
  isOn,
  onToggle,
  first,
}: {
  type: "radio" | "checkbox";
  name: string;
  idBase: string;
  legend: string;
  error?: string;
  options: { value: string; label: string; tone?: string }[];
  isOn: (v: string) => boolean;
  onToggle: (v: string) => void;
  /** Marks the group's tab stop as the step's first field (CtaPill auditFocus). */
  first?: boolean;
}) {
  const errId = `${idBase}-error`;
  const stop = first ? Math.max(0, options.findIndex((o) => isOn(o.value))) : -1;
  return (
    <fieldset
      className="audit-choices"
      data-invalid={error ? "" : undefined}
      aria-describedby={error ? errId : undefined}
      role={type === "radio" ? "radiogroup" : undefined}
      aria-required={type === "radio" || undefined}
    >
      <legend className="t-label">{legend}</legend>
      <div className="audit-chips">
        {options.map((o, i) => (
          <label key={o.value} className="audit-chip" style={o.tone ? toneVars(o.tone) : undefined}>
            <input
              id={`${idBase}-${i}`}
              type={type}
              name={name}
              value={o.value}
              checked={isOn(o.value)}
              data-first-field={i === stop || undefined}
              onChange={() => onToggle(o.value)}
              aria-invalid={error ? true : undefined}
            />
            {o.tone && <span className="audit-chip-dot" aria-hidden />}
            {o.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={errId} className="audit-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/**
 * Preferred times: the next working days as rows, three windows each, in the visitor's zone.
 * One tab stop; arrows move between cells (a roving grid), Space or Enter picks, and the pick
 * order is the preference order.
 */
function SlotPicker({
  id,
  label,
  value,
  tz,
  invalid,
  onChange,
}: {
  id: string;
  label: string;
  value: string[];
  tz: string;
  invalid: boolean;
  onChange: (v: string[]) => void;
}) {
  // Days are computed once, in the browser, when the step opens.
  const [rows] = useState(() =>
    slotDays().map((day) => ({
      day,
      slots: daySlots(day)
        .filter((s) => WINDOWS.includes(s.getHours() * 60 + s.getMinutes()))
        .map((s) => s.toISOString()),
    })),
  );
  const [cursor, setCursor] = useState<[number, number]>(() => {
    for (let r = 0; r < rows.length; r++) {
      const c = rows[r].slots.findIndex((s) => value.includes(s));
      if (c >= 0) return [r, c];
    }
    return [0, 0];
  });
  const cells = useRef(new Map<string, HTMLButtonElement>());
  const fmt = useMemo(
    () => ({
      wd: new Intl.DateTimeFormat("en-GB", { weekday: "short" }),
      date: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }),
      time: new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
    }),
    [],
  );
  const full = value.length >= SLOTS.max;

  const move = (r: number, c: number) => {
    const rr = Math.max(0, Math.min(rows.length - 1, r));
    const cc = Math.max(0, Math.min(rows[rr].slots.length - 1, c));
    setCursor([rr, cc]);
    cells.current.get(`${rr}:${cc}`)?.focus();
  };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, r: number, c: number) => {
    const last = rows.length - 1;
    const keys: Record<string, () => void> = {
      ArrowRight: () => move(r, c + 1),
      ArrowLeft: () => move(r, c - 1),
      ArrowDown: () => move(r + 1, c),
      ArrowUp: () => move(r - 1, c),
      Home: () => (e.ctrlKey ? move(0, 0) : move(r, 0)),
      End: () => (e.ctrlKey ? move(last, rows[last].slots.length - 1) : move(r, rows[r].slots.length - 1)),
      PageDown: () => move(r + 5, c),
      PageUp: () => move(r - 5, c),
    };
    if (!keys[e.key]) return;
    e.preventDefault();
    keys[e.key]();
  };
  const toggle = (iso: string) => {
    if (value.includes(iso)) onChange(value.filter((x) => x !== iso));
    else if (!full) onChange([...value, iso]);
  };

  return (
    <div id={id} role="grid" aria-label={label} data-invalid={invalid ? "" : undefined} className="audit-slots">
      {rows.map((row, r) => (
        // A new working week starts with a little air.
        <div key={row.day.toISOString()} role="row" className="audit-slot-row" data-week={r > 0 && row.day.getDay() === 1 ? "" : undefined}>
          <span role="rowheader" className="audit-slot-day">
            <span>{fmt.wd.format(row.day)}</span> <span>{fmt.date.format(row.day)}</span>
          </span>
          {row.slots.map((iso, c) => {
            const n = value.indexOf(iso) + 1;
            const off = full && !n;
            return (
              <span key={iso} role="gridcell" className="audit-slot-cell">
                <button
                  type="button"
                  ref={(el) => {
                    if (el) cells.current.set(`${r}:${c}`, el);
                    else cells.current.delete(`${r}:${c}`);
                  }}
                  className="audit-slot"
                  tabIndex={cursor[0] === r && cursor[1] === c ? 0 : -1}
                  data-first-field={(cursor[0] === r && cursor[1] === c) || undefined}
                  aria-pressed={n > 0}
                  aria-disabled={off || undefined}
                  aria-label={formatSlot(iso, tz)}
                  onClick={() => {
                    setCursor([r, c]);
                    toggle(iso);
                  }}
                  onKeyDown={(e) => onKey(e, r, c)}
                >
                  {fmt.time.format(new Date(iso))}
                  {n > 0 && (
                    <span className="audit-slot-n" aria-hidden>
                      {n}
                    </span>
                  )}
                </button>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** The chosen times in preference order, written out in full. */
function Picks({ slots, tz, live }: { slots: string[]; tz: string; live?: boolean }) {
  return (
    <div className="audit-picks" aria-live={live ? "polite" : undefined}>
      <p className="t-label">
        {AUDIT.picks} <span className="tabular">{AUDIT.picksCount(slots.length, SLOTS.max)}</span>
      </p>
      {slots.length > 0 && (
        <ol>
          {slots.map((s, i) => (
            <li key={s}>
              <span className="audit-slot-n" aria-hidden>
                {i + 1}
              </span>
              {formatSlot(s, tz)}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Request states after a send that did not go through: what happened and what the visitor can do. */
function Notice({ status, onDownload, mailBody }: { status: Status; onDownload: () => void; mailBody: () => string }) {
  if (status.kind !== "rate_limited" && status.kind !== "not_configured" && status.kind !== "failed") return null;
  // The email fallback carries the brief, unless it is too long for a mailto link.
  const body = mailBody();
  const mail = CONTACT_EMAIL
    ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(AUDIT.eyebrow)}${body.length <= 1500 ? `&body=${encodeURIComponent(body)}` : ""}`
    : null;
  const message =
    status.kind === "rate_limited" ? AUDIT_COPY.rate_limited : status.kind === "not_configured" ? AUDIT_COPY.not_configured : AUDIT_COPY.delivery_failed;
  return (
    <div className="audit-notice" role="alert">
      <p>{message}</p>
      <div className="audit-notice-actions">
        {status.kind !== "rate_limited" && (
          <button type="button" className={`btn ${status.kind === "not_configured" ? "btn-primary" : "btn-ghost"}`} onClick={onDownload}>
            {AUDIT_COPY.download}
            <Arrow />
          </button>
        )}
        {mail && CONTACT_EMAIL && status.kind !== "rate_limited" && (
          <a className="audit-notice-mail" href={mail}>
            {AUDIT.orEmail(CONTACT_EMAIL)}
          </a>
        )}
      </div>
    </div>
  );
}
