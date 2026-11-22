import type { Metadata, Viewport } from "next";
import { Bungee, Inter } from "next/font/google";
import "./globals.css";

const bungee = Bungee({ variable: "--font-bungee", weight: "400", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PetFigure: Turn your pet into an action figure",
  description:
    "Upload a photo and get your pet as a retro collectible action figure in its own toy box. Free preview in about 30 seconds.",
};

export const viewport: Viewport = {
  themeColor: "#e5262e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bungee.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
