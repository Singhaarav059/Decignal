import Image from "next/image";
import { AREA_PHOTO } from "@/lib/area-photos";
import type { Area } from "@/lib/areas";

/**
 * The place an area's decisions are made, as a duotone in the area's colour: the photograph in
 * greyscale under a pale solid of the tone (editorial.css), so every place reads in the site's palette
 * and sits flat with the panels. Nothing sits over it; the area's drawing goes with its signal.
 *
 * The frame clips. Its inner layer (.area-photo-move) is taller than the frame, so AreaStack can settle
 * it as the panel lands; the cover (.area-photo-cover) is a solid of the tone that AreaStack lifts as
 * the panel lands, so the place develops out of the colour. Both are still everywhere else.
 */
export function AreaPhoto({ area, sizes, eager }: { area: Area; sizes: string; eager?: boolean }) {
  const photo = AREA_PHOTO[area.slug];
  return (
    <figure className="area-photo">
      <div className="area-photo-frame">
        <div className="area-photo-move">
          <Image src={photo.src} alt={photo.alt} sizes={sizes} loading={eager ? "eager" : "lazy"} className="area-photo-img" />
        </div>
        <span className="area-photo-cover" aria-hidden />
      </div>
    </figure>
  );
}
