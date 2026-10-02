import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

// One clean family. Optical sizing keeps headlines tight and body text open.
const sans = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  axes: ["opsz"],
});

const mono = Geist_Mono({
  variable: "--font-label",
  subsets: ["latin"],
  weight: ["400", "500"],
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
    <html lang="en" className={`${sans.variable} ${mono.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
