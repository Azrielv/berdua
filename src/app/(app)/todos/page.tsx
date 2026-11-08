import { requireCouple } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchTodoLists } from "@/lib/data";
import { ListsClient } from "./lists-client";

export const metadata = { title: "To-do" };

export default async function TodosPage() {
  const { couple } = await requireCouple();
  const lists = await fetchTodoLists(await createClient());
  return <ListsClient initial={lists} coupleId={couple.id} />;
}
