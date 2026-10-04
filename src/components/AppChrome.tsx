"use client";

import { ClerkProvider, Show, SignInButton, UserButton } from "@clerk/nextjs";
import { enUS } from "@clerk/localizations/en-US";
import { thTH } from "@clerk/localizations/th-TH";
import Image from "next/image";
import Link from "next/link";
import { useNative, useT } from "@/components/LangProvider";

/** The header and authentication UI follow the same menu language as the game. */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const language = useNative();
  const t = useT();
  return (
          <ClerkProvider
            localization={language === "th" ? thTH : enUS}
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl="/"
            signUpFallbackRedirectUrl="/"
            appearance={{
              variables: { colorPrimary: "#0a7fbd", borderRadius: "0.75rem" },
              elements: {
                userButtonTrigger: {
                  minWidth: "2.75rem",
                  height: "2.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  padding: 0,
                },
                userButtonAvatarBox: { width: "2.25rem", height: "2.25rem" },
              },
            }}
          >
            <header className="site-header mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 short:py-1 sm:px-6 sm:py-4 short:sm:py-1 lg:px-8">
              <Link
                href="/"
                aria-label="Bridge Thai"
                className="flex min-h-11 min-w-11 items-center gap-2.5 text-lg font-bold sm:text-xl"
              >
                <Image
                  src="/logo.png"
                  alt=""
                  width={36}
                  height={36}
                  priority
                  className="site-logo size-8 rounded-lg sm:size-9"
                />
                <span className="site-brand max-[359px]:hidden">
                  Bridge Thai
                </span>
                <span className="game-brand" aria-hidden="true">
                  Little Bangkok<small>&amp; beyond</small>
                </span>
              </Link>
              <div className="flex items-center gap-2 text-sm sm:gap-3">
                <Show when="signed-out">
                  <SignInButton>
                    <button className="site-sign-in min-h-11 rounded-xl bg-brand-600 px-4 font-medium text-white hover:bg-brand-700">
                      {t.signIn}
                    </button>
                  </SignInButton>
                </Show>
                <Show when="signed-in">
                  <UserButton />
                </Show>
              </div>
            </header>
            <main className="site-main mx-auto w-full max-w-5xl flex-1 px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">
              {children}
            </main>
          </ClerkProvider>
  );
}
