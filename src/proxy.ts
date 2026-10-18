import { clerkMiddleware } from "@clerk/nextjs/server";

// All pages are public; auth-only behaviour (saving progress, admin) checks auth() itself.
// Audio clips (mp3) are static files and skip the middleware entirely.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|mp3|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    // Clerk's auto-proxy path
    "/__clerk/:path*",
  ],
};
