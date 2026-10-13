import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { CtaPill } from "@/components/CtaPill";
import { PhoneDock } from "@/components/PhoneDock";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Loader } from "@/components/Loader";
import { Backdrop } from "@/components/Backdrop";
import { Story } from "@/components/story/Story";
import { Editorial } from "@/components/sections/Editorial";
import { Footer } from "@/components/sections/Footer";

export const metadata: Metadata = { alternates: { canonical: "/" } };

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
        <Story />
        <Editorial />
      </main>
      <div className="page-foot">
        <Footer />
      </div>
    </>
  );
}
