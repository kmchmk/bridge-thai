import type { Metadata, Viewport } from "next";
import { Geist, Noto_Sans_Thai } from "next/font/google";
import { LangProvider } from "@/components/LangProvider";
import { getMenuLanguage } from "@/lib/lang.server";
import { AppChrome } from "@/components/AppChrome";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const notoThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bridgethai.vercel.app"),
  title: "Bridge Thai",
  description:
    "Learn Thai by role-play: the words change with who you're talking to, and where.",
  // The app is bilingual on purpose; browser auto-translate would rewrite the very sentences being taught.
  other: { google: "notranslate" },
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
  const native = await getMenuLanguage();
  return (
    <html
      lang={native}
      translate="no"
      className={`${geistSans.variable} ${notoThai.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        <LangProvider native={native}>
          <AppChrome>{children}</AppChrome>
        </LangProvider>
      </body>
    </html>
  );
}
