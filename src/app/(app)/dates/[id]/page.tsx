import { notFound } from "next/navigation";
import { memberNames, requireCouple } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchDate, fetchDatePhotos } from "@/lib/data";
import { DateDetail } from "./date-detail";

export const metadata = { title: "Date" };

export default async function DatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireCouple();
  const sb = await createClient();
  const date = await fetchDate(sb, id);
  if (!date) notFound();
  const photos = await fetchDatePhotos(sb, date.id);
  return (
    <DateDetail
      initial={date}
      names={memberNames(session)}
      photos={photos}
      coupleId={session.couple.id}
      nowISO={new Date().toISOString()}
    />
  );
}
