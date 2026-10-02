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

  return (
    <section id="audit" className="scroll-mt-24 px-3 pt-24 md:px-5 md:pt-32">
      <div
        className="relative overflow-clip rounded-[36px] px-6 py-16 md:rounded-[48px] md:px-14 md:py-24"
        style={{ background: "var(--color-cobalt)" }}
      >
      <div className="relative mx-auto grid max-w-6xl gap-14 md:grid-cols-[1fr_1.1fr]">
        <div className="text-white">
          <p data-reveal className="eyebrow inline-flex items-center gap-2.5 text-white/85!">
            <span className="size-1.5 rounded-full bg-white" />
            Free AI audit
          </p>
          <h2 data-reveal className="display mt-5 max-w-[15ch] text-[clamp(38px,4.4vw,64px)]">
            Bring us the decision that should move faster.
          </h2>
          <p data-reveal className="mt-7 max-w-[42ch] text-[17px] leading-relaxed text-white/85">
            In a focused 30-minute session we identify the workflow, the systems and the measurable outcome worth
            solving first.
          </p>
          <ol data-reveal className="mt-10 border-t border-white/25">
            {[
              ["A working conversation", "No generic product presentation."],
              ["A practical starting point", "Leave with a clearer first use case."],
              ["No commitment required", "We decide together if the next step makes sense."],
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
                  <span className="mt-1 block text-[15px] text-white/80">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div
          data-reveal
          className="self-start rounded-[28px] bg-paper p-6 shadow-[0_40px_80px_-30px_rgba(20,19,15,0.55)] md:sticky md:top-28 md:p-9"
        >
          {step < 3 ? (
            <form
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
                <div className="grid gap-x-6 sm:grid-cols-2">
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
                  <label className="block border-b border-line py-4">
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
                <div>
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
                  <label className="block border-b border-line py-5">
                    <span className="eyebrow">The decision you want to move faster</span>
                    <textarea
                      required
                      rows={3}
                      value={data.decision ?? ""}
                      onChange={set("decision")}
                      placeholder="For example: rebalancing stock between plants before shortages hit"
                      className="mt-2 block w-full resize-none bg-transparent text-[17px] leading-relaxed outline-none placeholder:text-ink-soft/70"
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

              <div className="mt-8 flex items-center justify-between gap-4">
                {step === 2 ? (
                  <button type="button" onClick={() => setStep(1)} className="text-sm text-ink-2 hover:text-ink">
                    Back
                  </button>
                ) : (
                  <p className="max-w-[34ch] text-[13px] text-ink-soft">
                    We use these details only to prepare for your audit and reply to you.
                  </p>
                )}
                <button type="submit" className="btn btn-primary min-h-12!">
                  {step === 1 ? "Continue" : "Request my audit"}
                  <Arrow />
                </button>
              </div>
            </form>
          ) : (
            <div className="border-t border-line-strong pt-8">
              <p className="flex items-center gap-2.5 eyebrow text-ok">
                <span className="size-1.5 rounded-full bg-ok" /> Request received
              </p>
              <p className="mt-5 font-serif text-4xl leading-[1.05]">
                Thank you{data.name ? `, ${data.name.split(" ")[0]}` : ""}. We will reply within one working day.
              </p>
              <p className="mt-5 max-w-[44ch] text-[16px] leading-relaxed text-ink-2">
                We will come prepared with questions about {area ? area.toLowerCase() : "your operation"} and the
                systems involved, so the 30 minutes are spent on your decision.
              </p>
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
    <label className="block border-b border-line py-4 transition-colors duration-300 focus-within:border-cobalt">
      <span className="eyebrow">{label}</span>
      <input
        {...p}
        value={p.value ?? ""}
        className="mt-2 block w-full bg-transparent text-[17px] outline-none placeholder:text-ink-soft/45"
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
