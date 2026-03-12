import type { Metadata } from "next";
import { Audiowide, Outfit } from "next/font/google";
import "./globals.css";

const audiowide = Audiowide({
  weight: "400",
  variable: "--font-audiowide",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Phase | DoubleZero Contributor Tool",
  description:
    "Contributor reward analysis and projection tool for the DoubleZero network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${audiowide.variable} ${outfit.variable}`}>
        {children}
      </body>
    </html>
  );
}
