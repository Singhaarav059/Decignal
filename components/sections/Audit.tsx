"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/content";
import { Arrow } from "../ui/Arrow";
import { CalendarCheck, MessagesSquare, Target } from "lucide-react";

const BENEFIT_ICONS = [MessagesSquare, Target, CalendarCheck];

const COUNTRIES = ["India", "Nigeria", "Kenya", "South Africa", "Egypt", "Ghana", "Morocco", "Other"];
const SYSTEMS = ["SAP", "Oracle", "Microsoft Dynamics", "Salesforce", "Custom / in-house", "Spreadsheets"];

type Data = Record<string, string>;

export function Audit() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [data, setData] = useState<Data>({});
  const [area, setArea] = useState<string | null>(null);
  const [systems, setSystems] = useState<string[]>([]);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setData((d) => ({ ...d, [k]: e.target.value }));

  // The progress line fills with the task itself: each required answer moves it on.
  const req1 = ["name", "email", "company", "role", "country"];
  const done1 = req1.filter((k) => (k === "email" ? /\S+@\S+\.\S+/.test(data.email ?? "") : (data[k] ?? "").trim())).length;
  const done2 = [area, (data.decision ?? "").trim(), systems.length ? "y" : ""].filter(Boolean).length;
  const fill = step === 3 ? 1 : step === 2 ? 0.5 + (done2 / 3) * 0.5 : (done1 / req1.length) * 0.5;

  return (
    <section id="audit" className="audit scroll-mt-24 px-3 pt-16 md:px-5 md:pt-16">
      <div
        className="audit-panel relative overflow-clip rounded-[36px] px-6 py-16 md:rounded-[48px] md:px-14 md:py-16"
        style={{ background: "var(--color-cobalt)" }}
      >
      <div className="audit-grid relative mx-auto grid max-w-6xl gap-9 lg:grid-cols-[1fr_1.1fr]">
        <div className="audit-copy text-white">
          <p data-reveal className="eyebrow inline-flex items-center gap-2.5 text-white!">
            <span className="size-1.5 rounded-full bg-white" />
            Free AI audit
          </p>
          <h2 data-reveal className="audit-title display mt-5 max-w-[15ch] text-[clamp(32px,3.8vw,54px)]">
            Bring us the decision that should move faster.
          </h2>
          <p data-reveal className="audit-intro mt-7 max-w-[42ch] text-[17px] leading-relaxed text-white/95">
            30 minutes on one workflow: the systems behind it and the outcome worth solving first.
          </p>
          <ol data-reveal className="audit-benefits mt-10 border-t border-white/25">
            {[
              ["A working session", "No generic product presentation."],
              ["A clear first use case", "Leave with a practical starting point."],
              ["No commitment", "We decide together if the next step makes sense."],
            ].map(([t, d], i) => (
              <li key={t} className="grid grid-cols-[48px_1fr] items-start border-b border-white/25 py-5">
                <span className="flex size-8 items-center justify-center rounded-xl bg-white/15 text-white" aria-hidden>
                  {(() => {
                    const Icon = BENEFIT_ICONS[i];
                    return <Icon size={16} strokeWidth={2} />;
                  })()}
                </span>
                <span>
                  <span className="block font-serif text-2xl leading-tight">{t}</span>
                  <span className="audit-benefit-d mt-1 block text-[15px] text-white/95">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div
          data-reveal
          className="audit-card relative self-start rounded-[28px] bg-paper p-6 shadow-[0_40px_80px_-30px_rgba(20,19,15,0.55)] md:p-9 lg:sticky lg:top-28"
        >
          {/* The card answers each completed step with a brief cobalt ring. */}
          <span key={step} className="audit-ring" aria-hidden />
          <div
            className="audit-progress"
            role="progressbar"
            aria-label="Brief progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(fill * 100)}
          >
            <span style={{ transform: `scaleX(${fill})` }} />
            <i data-done={step > 1 || undefined} style={{ left: "50%" }} />
            <i data-done={step > 2 || undefined} style={{ left: "100%" }} />
          </div>
          {step < 3 ? (
            <form
              className="audit-form"
              onSubmit={(e) => {
                e.preventDefault();
                // TODO: connect to the CRM / booking backend. Nothing is sent yet.
                setStep(step === 1 ? 2 : 3);
              }}
            >
              <div className="flex items-baseline justify-between border-b border-line-strong pb-4">
                <p className="font-serif text-3xl">{step === 1 ? "Tell us about you" : "Your first decision"}</p>
                <p className="eyebrow tabular">0{step} / 02</p>
              </div>

              {step === 1 && (
                <div key="s1" className="audit-step grid gap-x-6 sm:grid-cols-2">
                  <Field label="Full name" placeholder="Priya Raman" name="name" required autoComplete="name" value={data.name} onChange={set("name")} />
                  <Field
                    label="Work email"
                    placeholder="priya@company.com"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={data.email}
                    onChange={set("email")}
                  />
                  <Field label="Company" placeholder="Company name" name="company" required autoComplete="organization" value={data.company} onChange={set("company")} />
                  <Field label="Role" placeholder="Head of Supply Chain" name="role" required autoComplete="organization-title" value={data.role} onChange={set("role")} />
                  <label className="audit-field block border-b border-line py-4 transition-colors duration-[var(--dur-3)] focus-within:border-cobalt">
                    <span className="eyebrow">Country</span>
                    <select
                      required
                      value={data.country ?? ""}
                      onChange={set("country")}
                      className="mt-2 block w-full bg-transparent text-[17px] outline-none"
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      {COUNTRIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <Field label="Phone (optional)" placeholder="+91" name="phone" type="tel" autoComplete="tel" value={data.phone} onChange={set("phone")} />
                </div>
              )}

              {step === 2 && (
                <div key="s2" className="audit-step">
                  <fieldset className="border-b border-line py-5">
                    <legend className="eyebrow">Area</legend>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {CATEGORIES.map((c) => (
                        <Chip key={c} on={area === c} onClick={() => setArea(c)}>
                          {c}
                        </Chip>
                      ))}
                    </div>
                  </fieldset>
                  <label className="audit-field block border-b border-line py-5 transition-colors duration-[var(--dur-3)] focus-within:border-cobalt">
                    <span className="eyebrow">The decision you want to move faster</span>
                    <textarea
                      required
                      rows={3}
                      value={data.decision ?? ""}
                      onChange={set("decision")}
                      placeholder="For example: rebalancing stock between plants before shortages hit"
                      className="mt-2 block w-full resize-none bg-transparent text-[17px] leading-relaxed outline-none placeholder:text-ink-soft/80"
                    />
                  </label>
                  <fieldset className="border-b border-line py-5">
                    <legend className="eyebrow">Systems you run</legend>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {SYSTEMS.map((s) => (
                        <Chip
                          key={s}
                          on={systems.includes(s)}
                          onClick={() => setSystems((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]))}
                        >
                          {s}
                        </Chip>
                      ))}
                    </div>
                  </fieldset>
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                {step === 2 ? (
                  <button type="button" onClick={() => setStep(1)} className="rounded text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline">
                    Back
                  </button>
                ) : (
                  <p className="max-w-[34ch] text-[13px] text-ink-soft">
                    Prepare a brief for your audit. Your details stay in this browser until you download them.
                  </p>
                )}
                <button type="submit" className="btn btn-primary min-h-12! shrink-0 max-sm:w-full max-sm:justify-center">
                  {step === 1 ? "Continue" : "Prepare my brief"}
                  <Arrow />
                </button>
              </div>
            </form>
          ) : (
            <div className="audit-step pt-2" role="status">
              <p className="flex items-center gap-2.5 eyebrow audit-ok">
                <svg className="audit-check" viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                  <circle cx="12" cy="12" r="10.5" />
                  <path d="M7.2 12.4l3.2 3.2 6.4-7" />
                </svg>
                Brief prepared
              </p>
              <p className="mt-5 font-serif text-4xl leading-[1.05]">
                Your starting point is ready{data.name ? `, ${data.name.split(" ")[0]}` : ""}.
              </p>
              <p className="mt-5 max-w-[44ch] text-[16px] leading-relaxed text-ink-2">
                Your brief covers {area ? area.toLowerCase() : "your operation"} and the systems involved. Keep a copy for your audit conversation. These details stay in this browser; no request has been sent.
              </p>
              <button className="btn btn-primary mt-6" onClick={() => {
                const brief = ["DECIGNAL · AI AUDIT BRIEF", ...Object.entries(data).map(([key,value]) => `${key}: ${value}`), `Business area: ${area ?? "To discuss"}`, `Systems: ${systems.join(", ") || "To discuss"}`].join("\n");
                const url = URL.createObjectURL(new Blob([brief], {type:"text/plain"}));
                const a = document.createElement("a"); a.href=url; a.download="decignal-audit-brief.txt"; a.click(); URL.revokeObjectURL(url);
              }}>Download brief <Arrow /></button>
              <button className="mt-4 block rounded text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline" onClick={() => setStep(2)}>Edit your brief</button>
            </div>
          )}
        </div>
      </div>
      </div>
    </section>
  );
}

function Field({
  label,
  ...p
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="audit-field block border-b border-line py-4 transition-colors duration-[var(--dur-3)] focus-within:border-cobalt">
      <span className="eyebrow">{label}</span>
      <input
        {...p}
        value={p.value ?? ""}
        className="mt-2 block w-full bg-transparent text-[17px] outline-none placeholder:text-ink-soft/60"
      />
    </label>
  );
}

function Chip({ on, ...p }: { on: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={on}
      {...p}
      className={`min-h-9 rounded-full px-3.5 text-sm transition-colors duration-200 ${
        on ? "bg-cobalt text-white" : "border border-line hover:border-line-strong"
      }`}
    />
  );
}
