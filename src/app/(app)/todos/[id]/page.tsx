import { notFound } from "next/navigation";
import { memberNames, requireCouple } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchTodoList } from "@/lib/data";
import { dayKey } from "@/lib/time";
import { ListClient } from "./list-client";

export const metadata = { title: "To-do list" };

export default async function TodoListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireCouple();
  const data = await fetchTodoList(await createClient(), id);
  if (!data) notFound();
  return (
    <ListClient
      initial={data}
      myId={session.profile.id}
      names={memberNames(session)}
      today={dayKey(new Date())}
    />
  );
}
