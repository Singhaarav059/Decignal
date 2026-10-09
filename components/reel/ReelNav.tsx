"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "../ui/Logo";
import { scrollToTarget } from "../SmoothScroll";
import { anchorOf, S } from "@/lib/reel";

const LINKS: { label: string; go: () => void; from: number; to: number }[] = [
  { label: "Home", go: () => scrollToTarget(0), from: S.hero, to: S.systems },
  { label: "Platform", go: () => scrollToTarget(anchorOf(S.signal, 0.05)), from: S.signal, to: S.foundation },
  { label: "Applications", go: () => scrollToTarget(anchorOf(S.yours)), from: S.yours, to: S.outcome },
  { label: "How it works", go: () => scrollToTarget(anchorOf(S.how)), from: S.how, to: S.how },
  { label: "FAQ", go: () => scrollToTarget("#ask"), from: S.ask, to: S.ask },
];

/** Logo left, links centred with the current one underlined, actions right. Light over the evening sky. */
export function ReelNav({ section }: { section: number }) {
  const [open, setOpen] = useState(false);
  return (
    <nav className="r-nav" data-open={open} aria-label="Main">
      <a href="#" className="r-nav-logo" onClick={(e) => (e.preventDefault(), scrollToTarget(0))} aria-label="Decignal, back to top">
        <Logo size={22} />
      </a>
      <ul className="r-nav-links">
        {LINKS.map((l) => (
          <li key={l.label}>
            <button
              data-on={section >= l.from && section <= l.to}
              aria-current={section >= l.from && section <= l.to ? "location" : undefined}
              onClick={() => {
                setOpen(false);
                l.go();
              }}
            >
              {l.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="r-nav-actions">
        <button className="r-btn r-btn-dark r-btn-sm" onClick={() => scrollToTarget("#audit")}>
          Book an audit
        </button>
        <button className="r-nav-menu" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </nav>
  );
}
