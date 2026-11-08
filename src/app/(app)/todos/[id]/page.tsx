import { notFound } from "next/navigation";
import { memberNames, requireCoupleAnd } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchTodoList } from "@/lib/data";
import { dayKey } from "@/lib/time";
import { ListClient } from "./list-client";

export const metadata = { title: "To-do list" };

export default async function TodoListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const [session, data] = await requireCoupleAnd([fetchTodoList(sb, id)]);
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
