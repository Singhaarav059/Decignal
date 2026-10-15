import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Footer } from "@/components/sections/Footer";
import { META, PAGES } from "@/lib/copy";
import { OG_BASE, SHARE_IMAGES, TWITTER_BASE } from "@/lib/site";

// Built from the handoff's terms structure (§9) and the stand-in facts in lib/placeholders.ts. Every
// identity, contact and practice there must be verified and legally reviewed before launch.
const T = PAGES.terms;

export const metadata: Metadata = {
  title: { absolute: META.terms.title },
  description: META.terms.description,
  alternates: { canonical: "/terms" },
  openGraph: { ...OG_BASE, title: META.terms.title, description: META.terms.description, url: "/terms", images: SHARE_IMAGES },
  twitter: { ...TWITTER_BASE, title: META.terms.title, description: META.terms.description, images: SHARE_IMAGES },
  // Stays out of search results until the placeholder facts are replaced and reviewed.
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
              {T.effective}
            </p>
            <h1 className="t-title mt-4">{T.title}</h1>
            <p className="t-lede mt-6">{T.lead}</p>
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
