import "server-only";
import { currentUser } from "@clerk/nextjs/server";

/** Comma-separated allow-list in ADMIN_EMAILS. Unset ⇒ nobody is an admin. */
export const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

/** The signed-in user if — and only if — one of their *verified* emails is on the admin list. */
export async function getAdmin(): Promise<{ id: string; email: string } | null> {
  const user = await currentUser();
  if (!user) return null;
  const allowed = adminEmails();
  const match = user.emailAddresses.find((e) => e.verification?.status === "verified" && allowed.includes(e.emailAddress.toLowerCase()));
  return match ? { id: user.id, email: match.emailAddress.toLowerCase() } : null;
}
