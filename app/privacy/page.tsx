import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Footer } from "@/components/sections/Footer";
import { PAGES } from "@/lib/copy";
import { CONTACT_EMAIL, OG_BASE, SHARE_IMAGES, TWITTER_BASE } from "@/lib/site";

// Placeholder notice until the owner supplies the final text (D11, PROD-11). For owner review before
// launch: the legal entity, registered address, a grievance contact (India DPDP Act), how long requests
// are kept and which delivery services are in use. Nothing here names an entity, address or email.
const P = PAGES.privacy;

export const metadata: Metadata = {
  title: P.title,
  description: P.lead,
  alternates: { canonical: "/privacy" },
  openGraph: { ...OG_BASE, title: P.title, description: P.lead, url: "/privacy", images: SHARE_IMAGES },
  twitter: { ...TWITTER_BASE, title: P.title, description: P.lead, images: SHARE_IMAGES },
  // A draft stays out of search results; switch indexing on with the owner's final text.
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  const contact = P.contact(CONTACT_EMAIL);
  const [before, after] = CONTACT_EMAIL ? contact.split(CONTACT_EMAIL) : [contact, undefined];

  return (
    <>
      <SmoothScroll sections={[]} />
      <Nav variant="page" sections={[]} />
      <main id="main" className="bg-bg pt-[calc(var(--section-y)+48px)] pb-[var(--section-y)]">
        <article className="page-wrap">
          <header className="max-w-[40rem]">
            <p className="t-label flex items-center gap-2">
              <span className="size-[7px] rounded-full bg-ink-muted" aria-hidden />
              Draft
            </p>
            <h1 className="t-title mt-4">{P.title}</h1>
            <p className="t-lede mt-6">{P.lead}</p>
            <p className="card-inset t-small mt-8 text-ink-2">{P.draft}</p>
          </header>

          <div className="mt-16 border-t border-line">
            {P.sections.map((s) => (
              <section key={s.title} className="grid-12 gap-y-2 border-b border-line py-7">
                <h2 className="t-subtitle col-span-4 md:col-span-3 lg:col-span-4">{s.title}</h2>
                <p className="t-body col-span-4 max-w-[60ch] text-ink-2 md:col-span-5 lg:col-span-7">{s.text}</p>
              </section>
            ))}
          </div>

          <div className="grid-12 py-7">
            <p className="t-body col-span-4 max-w-[60ch] text-ink-2 md:col-span-5 md:col-start-4 lg:col-span-7 lg:col-start-5">
              {before}
              {CONTACT_EMAIL && (
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-ink underline decoration-line-strong underline-offset-[3px] hover:decoration-current">
                  {CONTACT_EMAIL}
                </a>
              )}
              {after}
            </p>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
