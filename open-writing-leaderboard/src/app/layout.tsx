import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/components/theme-provider";
import { PaletteProvider } from "@/components/palette-provider";
import { SessionProvider } from "@/components/session-provider";
import { Header } from "@/components/header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Open Writing Leaderboard",
  description: "Benchmarking creative writing capabilities of language models",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <PaletteProvider>
              <div className="min-h-screen bg-background">
                <Header />
                <main className="mx-auto max-w-7xl px-0 sm:px-4 py-8">
                  {children}
                </main>
              </div>
            </PaletteProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
