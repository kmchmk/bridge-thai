import type { Metadata, Viewport } from "next";
import { ClerkProvider, Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Geist, Noto_Sans_Thai } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const notoThai = Noto_Sans_Thai({ variable: "--font-noto-thai", subsets: ["thai"] });

export const metadata: Metadata = {
  title: "Bridge Thai",
  description: "Learn Thai by role-play: the words change with who you're talking to, and where.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${notoThai.variable} h-full antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <ClerkProvider>
          <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
            <Link href="/" className="flex min-h-11 items-center text-lg font-bold sm:text-xl">🌉 Bridge Thai</Link>
            <div className="flex items-center gap-3 text-sm">
              <Show when="signed-out">
                <SignInButton mode="modal"><button className="min-h-11 rounded-xl bg-amber-500 px-4 font-medium text-white hover:bg-amber-600">Sign in</button></SignInButton>
              </Show>
              <Show when="signed-in"><UserButton /></Show>
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">{children}</main>
        </ClerkProvider>
      </body>
    </html>
  );
}
