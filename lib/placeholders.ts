// Facts the founder has not supplied yet (handoff §3, §9, §11 "Founder facts to resolve").
// Every value here is a stand-in so the pages render complete; each one is marked and must be replaced
// with the verified fact before launch. Nothing else on the site invents identity, contact or legal facts.

export const PLACEHOLDER = {
  /** PLACEHOLDER: replace before launch. The legal entity or verified trading identity. */
  operator: "Decignal Technologies",
  /** PLACEHOLDER: replace before launch. The rights holder in the copyright line. */
  rightsHolder: "Decignal Technologies",
  /** PLACEHOLDER: replace before launch. A monitored business inbox (NEXT_PUBLIC_CONTACT_EMAIL overrides it). */
  email: "hello@decignal.example",
  /** PLACEHOLDER: replace before launch. A monitored inbox for privacy requests. */
  privacyEmail: "privacy@decignal.example",
  /** PLACEHOLDER: replace before launch. The date the legal pages take effect. */
  effective: "15 October 2026",
  /** Founder details for the About section, taken from demazetech.com (15 October 2026). */
  founder: {
    name: "Krupal Chaudhary",
    role: "Founder & CEO",
    experience:
      "Founded Demaze Technologies in Ahmedabad, where a team of 35+ has delivered 45+ AI and software projects over six years.",
    linkedin: "https://www.linkedin.com/in/krupalchaudhary",
  },
  /** PLACEHOLDER: replace before launch. What the website actually does with enquiry data (handoff §9). */
  privacy: {
    formDestination: "a Google Sheet the Decignal team controls, through a Google Apps Script web app",
    hosting: "Railway",
    email: "our business email provider",
    analytics: "This website does not run analytics or advertising cookies.",
    retention: "We keep enquiry details for up to 12 months after our last contact, unless you ask us to delete them sooner.",
  },
} as const;
