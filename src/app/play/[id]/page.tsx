import { notFound, redirect } from "next/navigation";
import { LOCATIONS } from "@/lib/atlas/catalog";
export default async function Play({ params }: PageProps<"/play/[id]">) {
  const { id } = await params;
  if (!LOCATIONS.some((l) => l.id === id)) notFound();
  redirect(`/adventure?scene=${encodeURIComponent(id)}`);
}
