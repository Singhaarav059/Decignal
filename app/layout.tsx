import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree, Fraunces } from "next/font/google";
import "./globals.css";
import "./reel.css";

// Fraunces carries the display type: a calm, softly cornered serif at a light weight.
const reel = Fraunces({
  variable: "--font-reel",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
});

// Bricolage Grotesque carries headlines and labels (optical size tightens it at display sizes,
// width lets labels run a touch condensed); Figtree carries everything people read.
const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
});

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Decignal · Turn information into decisions",
  description:
    "Decignal connects the systems you already run and turns operational data into clear, explainable decisions your teams approve.",
  openGraph: {
    type: "website",
    siteName: "Decignal",
    title: "Decignal · Turn information into decisions",
    description:
      "Connect the systems you already run. See the signal, the evidence and the action on one layer your teams approve.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Decignal · Turn information into decisions",
    description:
      "Connect the systems you already run. See the signal, the evidence and the action on one layer your teams approve.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#E6EEF6",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${reel.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
