import { notFound } from "next/navigation";
import { memberNames, requireCoupleAnd } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchDate, fetchDatePhotos, isUuid } from "@/lib/data";
import { DateDetail } from "./date-detail";

export const metadata = { title: "Date" };

export default async function DatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const sb = await createClient();
  const [session, date, photos] = await requireCoupleAnd([fetchDate(sb, id), fetchDatePhotos(sb, id)]);
  if (!date) notFound();
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
