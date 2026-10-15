import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AREAS, AREA_SLUGS, areaBySlug, type Area } from "@/lib/areas";
import { SERVICE } from "@/lib/copy";
import { OG_BASE, SITE_NAME, SITE_URL, TWITTER_BASE } from "@/lib/site";
import { accentVars, toneVars } from "@/lib/tone";
import { CtaPill } from "@/components/CtaPill";
import { Nav } from "@/components/Nav";
import { PhoneDock } from "@/components/PhoneDock";
import { Footer } from "@/components/sections/Footer";
import { ServiceRuntime } from "@/components/service/ServiceRuntime";
import { SERVICE_SECTIONS } from "@/components/service/sections";
import { ServiceHero } from "@/components/service/ServiceHero";
import { ServiceApps, ServiceClosing, ServiceExample, ServiceExpect, ServiceGet, ServiceOutcomes, ServiceProcess, ServiceQuestions } from "@/components/service/ServiceSections";
import { AreaLinks } from "@/components/service/AreaLinks";

// The phone dock's section links: the four a visitor jumps between, then the call.
const DOCK_IDS = ["expect", "applications", "deliverables", "faq", "audit"];
const DOCK_SECTIONS = SERVICE_SECTIONS.filter((s) => DOCK_IDS.includes(s.id));

// The five functions are the only pages here: any other slug is the root not-found page (notFound below).
// No `dynamicParams = false`: Zoho Catalyst's runtime can't find the prerendered pages and answered 404,
// so a page it can't find is rendered on request instead.
export function generateStaticParams() {
  return AREA_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/solutions/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const area = areaBySlug(slug);
  if (!area) return {};
  const { title, description } = area.meta;
  const url = `/solutions/${area.slug}`;
  // openGraph and twitter replace the layout's objects (shallow merge), so they restate the base. The
  // handoff titles already carry "| Decignal", so the layout's title template is bypassed.
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { ...OG_BASE, title, description, url },
    twitter: { ...TWITTER_BASE, title, description },
  };
}

/** Service and breadcrumb nodes; the Organization they point at is in the root layout. */
function jsonLd(area: Area) {
  const url = `${SITE_URL}/solutions/${area.slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${url}#service`,
        name: area.meta.title,
        serviceType: "Custom AI applications",
        description: area.meta.description,
        url,
        provider: { "@id": `${SITE_URL}/#org` },
        areaServed: { "@type": "Country", name: "India" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: SERVICE.breadcrumb, item: `${SITE_URL}/solutions` },
          { "@type": "ListItem", position: 3, name: area.name, item: url },
        ],
      },
    ],
  };
}

export default async function ServicePage({ params }: PageProps<"/solutions/[slug]">) {
  const { slug } = await params;
  const area = areaBySlug(slug);
  if (!area) notFound();

  return (
    <>
      <ServiceRuntime />
      <Nav variant="page" sections={SERVICE_SECTIONS} />
      <CtaPill />
      <PhoneDock sections={DOCK_SECTIONS} />
      <main id="main" tabIndex={-1} className="svc" style={{ ...toneVars(area.tone), ...accentVars(area.tone) }}>
        <ServiceHero area={area} />
        <ServiceOutcomes area={area} />
        <ServiceExpect area={area} />
        <ServiceApps area={area} />
        <ServiceGet area={area} />
        <ServiceProcess area={area} />
        {/* Below the records, so its 3D mounts on approach rather than with the first screen. */}
        <ServiceExample area={area} />
        <ServiceQuestions area={area} />
        <ServiceClosing area={area} />
        <section className="svc-section svc-others page-wrap" aria-labelledby="svc-others">
          <h2 id="svc-others" className="t-label">
            {SERVICE.others}
          </h2>
          <AreaLinks areas={AREAS.filter((a) => a.slug !== area.slug)} cta="area-other" />
        </section>
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(area)).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
