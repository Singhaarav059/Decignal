import type { ReactNode } from "react";
import { accentVars, toneVars, type Tone } from "@/lib/tone";

type Props = {
  /** Line one in ink; line two (optional) in the tone's text-safe ink, on its own line. */
  lines: [ReactNode] | [ReactNode, ReactNode];
  /** Label above the title, with a dot in the tone. */
  label?: ReactNode;
  /** The chapter's or area's system colour (dot and accent line). */
  tone?: Tone | string;
  /** display: hero and final statements only. title: section heads. card: inside the StoryCard. */
  size?: "display" | "title" | "card";
  as?: "h1" | "h2" | "h3";
  lede?: ReactNode;
  align?: "start" | "center";
  /** lines: each line rises out of its own mask (the editorial's [data-lines] reveal). */
  reveal?: "lines";
  id?: string;
  className?: string;
  /** Extra classes on the heading element. */
  headingClassName?: string;
};

const SIZE = { display: "t-display", title: "t-title", card: "t-title-card" } as const;

/**
 * The two-line headline: an optional label, line one in ink, line two in the accent ink, then an
 * optional lede. Stack spacing: label to title 16px, title to lede 24px.
 */
export default function SectionTitle({
  lines,
  label,
  tone = "cobalt",
  size = "title",
  as: Heading = "h2",
  lede,
  align = "start",
  reveal,
  id,
  className,
  headingClassName,
}: Props) {
  const [first, second] = lines;
  return (
    <div
      className={`section-title${className ? ` ${className}` : ""}`}
      data-align={align === "center" ? "center" : undefined}
      style={{ ...toneVars(tone), ...accentVars(tone) }}
    >
      {label && (
        <p className="t-label section-title-label">
          <span className="section-title-dot" aria-hidden />
          {label}
        </p>
      )}
      <Heading id={id} className={`${SIZE[size]}${headingClassName ? ` ${headingClassName}` : ""}`} data-lines={reveal === "lines" ? "" : undefined}>
        <span className="line-mask">
          <span>{first}</span>
        </span>
        {/* A space between the lines keeps the heading's text readable as one sentence (copy, search). */}
        {second !== undefined && " "}
        {second !== undefined && (
          <span className="line-mask accent">
            <span>{second}</span>
          </span>
        )}
      </Heading>
      {lede && <p className="t-lede section-title-lede">{lede}</p>}
    </div>
  );
}
