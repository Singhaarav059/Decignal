// Function pages (/solutions/[slug]): the section list the chrome store reads. Section ids match the home
// page where the section means the same thing (#applications, #example, #faq, #audit), so the nav's
// section links work on both (handoff §6).

import type { ChromeSection } from "@/lib/chrome";

/** Order of the sections on a service page; SmoothScroll hands it to the chrome driver. */
export const SERVICE_SECTIONS: ChromeSection[] = [
  { id: "outcomes", label: "What changes", short: "Changes" },
  { id: "applications", label: "Application examples", short: "Examples" },
  { id: "example", label: "Illustrative example", short: "Example" },
  { id: "faq", label: "Questions", short: "FAQ" },
  { id: "audit", label: "Talk to Decignal", short: "Talk" },
];
