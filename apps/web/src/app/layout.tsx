import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Text Racers",
  description: "A typing race with a Tetris-99 twist.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 w-full border-b border-zinc-800 bg-background px-6 py-4">
          <h1 className="text-3xl font-bold tracking-wide text-foreground">
            Text <span className="text-teal-500">Racers</span>
          </h1>
        </header>
        {children}
      </body>
    </html>
  );
}
