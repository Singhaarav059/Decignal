"use client";

// The audit brief: two short steps (who you are, the decision you want to move faster) and a
// confirmation with the brief to keep. Nothing is sent yet: the booking backend is still to be connected.
import { useState } from "react";
import { ArrowRight, Check, Download } from "lucide-react";
import { AUDIT_SYSTEMS, CATEGORIES, COUNTRIES } from "@/lib/content";

type Data = Record<string, string>;

export function AuditForm() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [data, setData] = useState<Data>({});
  const [area, setArea] = useState<string | null>(null);
  const [systems, setSystems] = useState<string[]>([]);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setData((d) => ({ ...d, [k]: e.target.value }));

  const download = () => {
    const brief = [
      "DECIGNAL · AI AUDIT BRIEF",
      ...Object.entries(data).map(([k, v]) => `${k}: ${v}`),
      `Business area: ${area ?? "To discuss"}`,
      `Systems: ${systems.join(", ") || "To discuss"}`,
    ].join("\n");
    const url = URL.createObjectURL(new Blob([brief], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "decignal-audit-brief.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (step === 3)
    return (
      <div className="r-form r-form-done" role="status">
        <span className="r-form-check">
          <Check size={18} strokeWidth={2.4} />
        </span>
        <p className="r-form-head">Your starting point is ready{data.name ? `, ${data.name.split(" ")[0]}` : ""}.</p>
        <p>
          Your brief covers {area ? area.toLowerCase() : "your operation"}
          {systems.length ? ` and ${systems.join(", ")}` : ""}. Keep a copy for the audit conversation.
        </p>
        <div className="r-form-actions">
          <button type="button" className="r-btn r-btn-light" onClick={download}>
            <Download size={16} strokeWidth={2} /> Download brief
          </button>
          <button type="button" className="r-link" onClick={() => setStep(2)}>
            Edit your brief
          </button>
        </div>
      </div>
    );

  return (
    <form
      className="r-form"
      onSubmit={(e) => {
        e.preventDefault();
        // TODO: connect to the CRM / booking backend. Nothing is sent yet.
        setStep(step === 1 ? 2 : 3);
      }}
    >
      <div className="r-form-top">
        <p className="r-form-head">{step === 1 ? "Tell us about you" : "Your first decision"}</p>
        <p className="r-form-count">0{step} / 02</p>
      </div>
      {step === 1 ? (
        <div className="r-form-grid">
          <Field label="Full name" name="name" autoComplete="name" value={data.name} onChange={set("name")} />
          <Field label="Work email" name="email" type="email" autoComplete="email" value={data.email} onChange={set("email")} />
          <Field label="Company" name="company" autoComplete="organization" value={data.company} onChange={set("company")} />
          <Field label="Role" name="role" autoComplete="organization-title" value={data.role} onChange={set("role")} />
          <label className="r-field">
            <span>Country</span>
            <select name="country" required autoComplete="country-name" value={data.country ?? ""} onChange={set("country")}>
              <option value="" disabled>
                Select
              </option>
              {COUNTRIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <Field label="Phone (optional)" name="phone" type="tel" autoComplete="tel" required={false} value={data.phone} onChange={set("phone")} />
        </div>
      ) : (
        <div className="r-form-grid r-form-one">
          <fieldset className="r-form-chips">
            <legend>Area</legend>
            {CATEGORIES.map((c) => (
              <button type="button" key={c} aria-pressed={area === c} onClick={() => setArea(c)}>
                {c}
              </button>
            ))}
          </fieldset>
          <label className="r-field">
            <span>The decision you want to move faster</span>
            <textarea name="decision" rows={3} required placeholder="For example: rebalancing stock between plants before shortages hit" value={data.decision ?? ""} onChange={set("decision")} />
          </label>
          <fieldset className="r-form-chips">
            <legend>Systems you run</legend>
            {AUDIT_SYSTEMS.map((c) => (
              <button type="button" key={c} aria-pressed={systems.includes(c)} onClick={() => setSystems((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))}>
                {c}
              </button>
            ))}
          </fieldset>
        </div>
      )}
      <div className="r-form-actions">
        <button type="submit" className="r-btn r-btn-light">
          {step === 1 ? "Continue" : "Prepare my brief"} <ArrowRight size={16} strokeWidth={2} />
        </button>
        {step === 2 ? (
          <button type="button" className="r-link" onClick={() => setStep(1)}>
            Back
          </button>
        ) : (
          <p className="r-form-note">Your details stay in this browser until you download your brief.</p>
        )}
      </div>
    </form>
  );
}

function Field({ label, required = true, ...p }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="r-field">
      <span>{label}</span>
      <input required={required} {...p} value={p.value ?? ""} />
    </label>
  );
}
