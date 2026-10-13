"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { jumpTo, type JumpOptions } from "@/lib/jump";

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  /** "#faq" for a section on this page, "/#faq" for a home section, or a route. */
  href: string;
  /** Runs after a plain click has started the jump or the navigation (close a menu or a preview). */
  onDone?: () => void;
  /** Where focus lands after an in-page jump (defaults to the section). */
  focus?: JumpOptions["focus"];
};

/** The in-page part of an href when it points at this page: "#faq", or "/#faq" on "/". */
function sameDocHash(href: string, pathname: string) {
  if (href.startsWith("#")) return href;
  const i = href.indexOf("#");
  if (i < 0) return null;
  const path = href.slice(0, i) || "/";
  return path === pathname ? href.slice(i) : null;
}

/**
 * A real link (crawlable, middle-click and open-in-new-tab work) that moves within the page through
 * jumpTo when its section is here, and navigates otherwise. Cross-page section links ("/#faq") skip
 * Next's own scroll so the home page's loader can land on the hash.
 */
export function SectionLink({ href, onDone, focus, onClick, scroll, ...rest }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const hash = sameDocHash(href, pathname);

  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (rest.target && rest.target !== "_self") return;
    if (hash) {
      let here = false;
      try {
        here = !!document.getElementById(decodeURIComponent(hash.slice(1)));
      } catch {}
      if (here) {
        e.preventDefault();
        void jumpTo(hash, { focus });
      } else if (pathname !== "/") {
        // A section this page does not have lives on the home page.
        e.preventDefault();
        router.push(`/${hash}`, { scroll: false });
      }
    }
    onDone?.();
  };

  return <Link href={href} scroll={scroll ?? (href.includes("#") ? false : undefined)} onClick={handle} {...rest} />;
}
