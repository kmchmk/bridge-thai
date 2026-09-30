import type { Metadata, Viewport } from "next";
import { ClerkProvider, Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Geist, Noto_Sans_Thai } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { LangProvider } from "@/components/LangProvider";
import { LangSwitch } from "@/components/LangSwitch";
import { getNative } from "@/lib/lang.server";
import { dictionaries } from "@/lib/i18n";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const notoThai = Noto_Sans_Thai({ variable: "--font-noto-thai", subsets: ["thai"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://bridgethai.vercel.app"),
  title: "Bridge Thai",
  description: "Learn Thai by role-play: the words change with who you're talking to, and where.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1219" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const native = await getNative();
  const t = dictionaries[native];
  return (
    <html lang={native} className={`${geistSans.variable} ${notoThai.variable} h-full antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <LangProvider native={native}>
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
          appearance={{ variables: { colorPrimary: "#0a7fbd", borderRadius: "0.75rem" } }}
        >
          <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 short:py-1 sm:px-6 sm:py-4 short:sm:py-1 lg:px-8">
            <Link href="/" aria-label="Bridge Thai" className="flex min-h-11 min-w-11 items-center gap-2.5 text-lg font-bold sm:text-xl">
              <Image src="/logo.png" alt="" width={36} height={36} priority className="size-8 rounded-lg sm:size-9" />
              <span className="max-[359px]:hidden">Bridge Thai</span>
            </Link>
            <div className="flex items-center gap-2 text-sm sm:gap-3">
              <LangSwitch />
              <Show when="signed-out">
                <SignInButton><button className="min-h-11 rounded-xl bg-brand-600 px-4 font-medium text-white hover:bg-brand-700">{t.signIn}</button></SignInButton>
              </Show>
              <Show when="signed-in"><UserButton /></Show>
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">{children}</main>
        </ClerkProvider>
        </LangProvider>
      </body>
    </html>
  );
}
