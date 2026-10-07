import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";

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
};

export const viewport: Viewport = {
  themeColor: "#FBF6EF",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
