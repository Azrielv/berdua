import { requireCoupleAnd } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchMemories } from "@/lib/data";
import { MemoriesClient } from "./memories-client";

export const metadata = { title: "Memories" };

export default async function MemoriesPage() {
  const nowISO = new Date().toISOString();
  const sb = await createClient();
  const [{ couple }, memories] = await requireCoupleAnd([fetchMemories(sb, nowISO)]);
  return <MemoriesClient initial={memories} coupleId={couple.id} nowISO={nowISO} />;
}
