// Service pages (/solutions/[slug]): the section list the chrome store reads. Section ids match the home
// page where the section means the same thing (#applications, #how, #faq, #audit), so the nav's section
// links work on both.

import type { ChromeSection } from "@/lib/chrome";

/** Order of the sections on a service page; SmoothScroll hands it to the chrome driver. */
export const SERVICE_SECTIONS: ChromeSection[] = [
  { id: "expect", label: "What to expect", short: "Expect" },
  { id: "deliverables", label: "What you get", short: "Get" },
  { id: "how", label: "How it works", short: "How" },
  { id: "applications", label: "Applications", short: "Apps" },
  { id: "why", label: "Why Decignal", short: "Why" },
  { id: "faq", label: "FAQ" },
  { id: "audit", label: "Free AI audit", short: "Audit" },
];
