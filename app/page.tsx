import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { CtaPill } from "@/components/CtaPill";
import { PhoneDock } from "@/components/PhoneDock";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Loader } from "@/components/Loader";
import { Backdrop } from "@/components/Backdrop";
import { StoryRoot } from "@/components/story/Story";
import { Editorial } from "@/components/sections/Editorial";
import { Footer } from "@/components/sections/Footer";
import { PerfProbe } from "@/components/PerfProbe";
import { OG_BASE, SHARE_DESCRIPTION, SHARE_IMAGES, SHARE_TITLE } from "@/lib/site";

// openGraph restated for og:url only (the layout's has none, so the 404 page inherits no URL).
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...OG_BASE, title: SHARE_TITLE, description: SHARE_DESCRIPTION, url: "/", images: SHARE_IMAGES },
};

// Landmarks: the skip link and the header (Nav), the chrome's own navigation, then the story and the
// sections in <main> (the hero headline is the page's h1), and the footer outside it as contentinfo.
export default function Home() {
  return (
    <>
      <SmoothScroll />
      <Loader />
      <Backdrop />
      <Nav />
      <CtaPill />
      <PhoneDock />
      <main id="main">
        <StoryRoot />
        <Editorial />
      </main>
      <div className="page-foot">
        <Footer />
      </div>
      <PerfProbe />
    </>
  );
}
