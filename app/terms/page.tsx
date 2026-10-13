import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Footer } from "@/components/sections/Footer";
import { PAGES } from "@/lib/copy";
import { OG_BASE } from "@/lib/site";

// Placeholder terms until the owner supplies the legal text (D11). For owner review before launch: the
// legal entity, governing law and how to reach the owner. Nothing here names an entity or address.
const T = PAGES.terms;

export const metadata: Metadata = {
  title: T.title,
  description: T.lead,
  alternates: { canonical: "/terms" },
  openGraph: { ...OG_BASE, title: T.title, description: T.lead, url: "/terms" },
  // A draft stays out of search results; switch indexing on with the owner's final text.
  robots: { index: false, follow: true },
};

export default function TermsPage() {
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
            <h1 className="t-title mt-4">{T.title}</h1>
            <p className="t-lede mt-6">{T.lead}</p>
            <p className="card-inset t-small mt-8 text-ink-2">{T.draft}</p>
          </header>

          <div className="mt-16 border-t border-line">
            {T.sections.map((s) => (
              <section key={s.title} className="grid-12 gap-y-2 border-b border-line py-7">
                <h2 className="t-subtitle col-span-4 md:col-span-3 lg:col-span-4">{s.title}</h2>
                <p className="t-body col-span-4 max-w-[60ch] text-ink-2 md:col-span-5 lg:col-span-7">{s.text}</p>
              </section>
            ))}
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
