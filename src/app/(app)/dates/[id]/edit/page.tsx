import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { fetchDate } from "@/lib/data";
import { dayKey } from "@/lib/time";
import { DateForm } from "../../date-form";

export const metadata = { title: "Edit date" };

export default async function EditDatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const date = await fetchDate(await createClient(), id);
  if (!date) notFound();
  return (
    <>
      <PageHeader title="Edit date" back={`/dates/${id}`} />
      <DateForm date={date} defaultDay={dayKey(date.starts_at)} />
    </>
  );
}
