import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { SetupForm } from "@/components/SetupForm";
import { getDb, schema } from "@/db";
import { setupSchema } from "@/lib/setup";

async function savedSetup() {
  try {
    const { userId } = await auth();
    if (!userId) return undefined;
    const [row] = await getDb().select().from(schema.learnerProfiles).where(eq(schema.learnerProfiles.userId, userId)).limit(1);
    const parsed = setupSchema.safeParse(row);
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export default async function Home() {
  const initial = await savedSetup();
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Thai changes with who you&apos;re talking to.</h1>
        <p className="text-stone-600 dark:text-stone-300">
          Pick your setup — your gender, theirs, how you know each other, and where you are — then play through
          real-life scenes. Say it right and people warm up to you; get the register wrong and they notice.
        </p>
      </section>
      <SetupForm initial={initial} />
    </div>
  );
}
