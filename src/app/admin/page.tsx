import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { AdminAudition, type AuditionClip } from "@/components/AdminAudition";
import { getAdmin } from "@/lib/admin";
import { REGION_PACKS } from "@/lib/regions";
import audition from "@/lib/tts/audition.json";
import { getTtsSettings } from "@/lib/tts/settings";

export const metadata: Metadata = { title: "ฟังเสียง · Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Thai names for the regions (the packs' own labels are English).
const REGION_TH: Record<string, { name: string; area: string }> = {
  bangkok: { name: "กรุงเทพฯ (ภาคกลาง)", area: "สำเนียงมาตรฐาน" },
  chiangmai: { name: "เชียงใหม่ (ภาคเหนือ)", area: "เชียงใหม่ ลำปาง เชียงราย" },
  isan: { name: "อีสาน", area: "ขอนแก่น อุดรฯ โคราช อุบลฯ" },
  south: { name: "ภาคใต้", area: "นครศรีฯ สงขลา สุราษฎร์ฯ" },
  phuket: { name: "ภูเก็ต", area: "ภูเก็ต พังงา กระบี่" },
  east: { name: "ภาคตะวันออก", area: "ชลบุรี ระยอง จันทบุรี" },
  west: { name: "ภาคตะวันตก", area: "กาญจนบุรี ราชบุรี เพชรบุรี" },
};

export default async function AdminPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/admin");
  const admin = await getAdmin();
  if (!admin) notFound(); // signed in but not on the list: pretend the page doesn't exist

  const settings = await getTtsSettings();
  const regions = REGION_PACKS.map((p) => ({
    id: p.id,
    name: REGION_TH[p.id]?.name ?? p.label,
    area: REGION_TH[p.id]?.area ?? p.area,
    hasAccent: p.kind !== "standard",
    sample: { male: p.sample.male.th, female: p.sample.female.th },
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-4 pt-2 lg:pt-6">
      <AdminAudition voices={{ male: settings.male, female: settings.female }} livePace={settings.pace} regions={regions} clips={audition as AuditionClip[]} />
      <p className="px-1 text-xs text-slate-400">เข้าสู่ระบบเป็น {admin.email}</p>
    </div>
  );
}
