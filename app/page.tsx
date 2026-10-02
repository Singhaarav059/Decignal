import { Nav } from "@/components/Nav";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Loader } from "@/components/Loader";
import { Backdrop } from "@/components/Backdrop";
import { Story } from "@/components/story/Story";
import { Editorial } from "@/components/sections/Editorial";

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <Loader />
      <Backdrop />
      <Nav />
      <h1 className="sr-only">Decignal turns information from your enterprise systems into decisions.</h1>
      <Story />
      <Editorial />
    </>
  );
}
