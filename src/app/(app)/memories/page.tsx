import { requireCouple } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchMemories } from "@/lib/data";
import { MemoriesClient } from "./memories-client";

export const metadata = { title: "Memories" };

export default async function MemoriesPage() {
  const { couple } = await requireCouple();
  const nowISO = new Date().toISOString();
  const memories = await fetchMemories(await createClient(), nowISO);
  return <MemoriesClient initial={memories} coupleId={couple.id} nowISO={nowISO} />;
}
