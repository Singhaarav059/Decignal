import Image from "next/image";
import { AREA_PHOTO } from "@/lib/area-photos";
import type { Area } from "@/lib/areas";

/**
 * The place an area's decisions are made, as a duotone in the area's colour: the photograph in
 * greyscale under a pale solid of the tone (editorial.css), so every place reads in the site's palette
 * and sits flat with the panels. The warm tones screen the photograph over the tone instead (data-tone). Nothing sits over it; the area's drawing goes with its signal.
 *
 * The frame clips an inner layer (.area-photo-move) a little taller than itself, which carries the tone.
 */
export function AreaPhoto({ area, sizes, eager }: { area: Area; sizes: string; eager?: boolean }) {
  const photo = AREA_PHOTO[area.slug];
  return (
    <figure className="area-photo" data-tone={area.tone}>
      <div className="area-photo-frame">
        <div className="area-photo-move">
          <Image src={photo.src} alt={photo.alt} sizes={sizes} loading={eager ? "eager" : "lazy"} className="area-photo-img" />
        </div>
      </div>
    </figure>
  );
}
