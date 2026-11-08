"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLive } from "@/lib/use-live";
import { fetchTodoLists, type TodoListSummary } from "@/lib/data";
import { PageHeader, EmptyState } from "@/components/page-header";
import { errorText, input } from "@/components/ui";

export function ListsClient({ initial, coupleId }: { initial: TodoListSummary[]; coupleId: string }) {
  const router = useRouter();
  const { data: lists } = useLive(initial, () => fetchTodoLists(createClient()), [
    { table: "todo_lists", filter: `couple_id=eq.${coupleId}` },
    { table: "todos", filter: `couple_id=eq.${coupleId}` },
  ]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error } = await createClient()
      .from("todo_lists")
      .insert({ name: name.trim() })
      .select("id")
      .single();
    setBusy(false);
    if (error) return setError(error.message);
    setName("");
    router.push(`/todos/${data.id}`);
  }

  return (
    <>
      <PageHeader title="To-do" />
      <form onSubmit={create} className="flex gap-2 px-4">
        <input
          className={input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New list, e.g. Groceries"
          maxLength={60}
          aria-label="New list name"
        />
        <button
          className="h-12 shrink-0 rounded-xl bg-brand px-5 font-semibold text-white disabled:opacity-50"
          disabled={busy || !name.trim()}
        >
          Add
        </button>
      </form>
      {error && <p className={`${errorText} px-4 pt-2`}>{error}</p>}

      {lists.length === 0 ? (
        <EmptyState title="No lists yet" body="Create one for groceries, trip packing, chores…" />
      ) : (
        <ul className="mt-4 space-y-2 px-4">
          {lists.map((l) => {
            const total = l.todos.length;
            const done = l.todos.filter((t) => t.done).length;
            const open = total - done;
            return (
              <li key={l.id}>
                <Link
                  href={`/todos/${l.id}`}
                  className="block rounded-2xl border border-border bg-surface p-4 transition active:scale-[.99]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-medium">{l.name}</p>
                    <span className="shrink-0 text-sm text-muted">
                      {total === 0 ? "Empty" : open === 0 ? "All done ✓" : `${open} left`}
                    </span>
                  </div>
                  {total > 0 && (
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${(done / total) * 100}%` }} />
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
