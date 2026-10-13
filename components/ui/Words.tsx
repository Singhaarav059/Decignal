import { Fragment, type CSSProperties, type ReactNode } from "react";

/**
 * A headline line split into words, each in its own mask, so the line can rise word by word (a wave
 * across the headline) and a wrapped line never shows a word in the row above. Splitting by word, not
 * by letter, keeps the font's kerning. --w is the word's place in the headline, for CSS delays; `from`
 * continues the count from an earlier line. Anything but a string renders as it is.
 */
export function Words({ children, from = 0 }: { children: ReactNode; from?: number }) {
  if (typeof children !== "string") return <>{children}</>;
  const words = children.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="word">
            <span style={{ "--w": from + i } as CSSProperties}>{w}</span>
          </span>
          {i < words.length - 1 && " "}
        </Fragment>
      ))}
    </>
  );
}

/** How many words a line holds, to continue the count on the next line. */
export const wordCount = (n: ReactNode) => (typeof n === "string" ? n.split(" ").length : 0);
