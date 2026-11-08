import { requireCoupleAnd } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchTodoLists } from "@/lib/data";
import { ListsClient } from "./lists-client";

export const metadata = { title: "To-do" };

export default async function TodosPage() {
  const sb = await createClient();
  const [{ couple }, lists] = await requireCoupleAnd([fetchTodoLists(sb)]);
  return <ListsClient initial={lists} coupleId={couple.id} />;
}
