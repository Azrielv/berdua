"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLive } from "@/lib/use-live";
import { fetchDueTodos, type TodoWithList } from "@/lib/data";
import { addDays, dayKey, fmtRelativeDay, klToISO } from "@/lib/time";

/** Home card: open to-dos due today or overdue, tickable in place. */
export function TodayTodos({
  initial,
  coupleId,
  today,
  myId,
  names,
}: {
  initial: TodoWithList[];
  coupleId: string;
  today: string;
  myId: string;
  names: Record<string, string>;
}) {
  const { data, setData, reload } = useLive(
    initial,
    () => fetchDueTodos(createClient(), klToISO(addDays(today, 1))),
    [{ table: "todos", filter: `couple_id=eq.${coupleId}` }],
  );

  // Items ticked here stay visible (struck through) until you leave Home,
  // even though the live refresh only returns open items — so a mis-tap
  // can be undone.
  const [ticked, setTicked] = useState<Record<string, TodoWithList>>({});
  const items = [
    ...data.filter((t) => !ticked[t.id]),
    ...Object.values(ticked),
  ].sort((a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? ""));

  async function tick(t: TodoWithList) {
    const nowDone = !t.done;
    setTicked((m) => {
      const copy = { ...m };
      if (nowDone) copy[t.id] = { ...t, done: true, done_by: myId };
      else delete copy[t.id];
      return copy;
    });
    if (!nowDone) setData((all) => (all.some((x) => x.id === t.id) ? all : [...all, { ...t, done: false, done_by: null }]));
    const { error } = await createClient().from("todos").update({ done: nowDone }).eq("id", t.id);
    if (error) {
      setTicked((m) => {
        const copy = { ...m };
        delete copy[t.id];
        return copy;
      });
      reload();
    }
  }

  return (
    <section className="mt-5">
      <div className="flex items-baseline justify-between px-4 pb-2">
        <h2 className="font-semibold">Today&apos;s to-dos</h2>
        <Link href="/todos" className="text-sm font-medium text-brand">
          All lists
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="mx-4 rounded-2xl border border-dashed border-border bg-surface p-4 text-sm text-muted">
          Nothing due today 🎉 Give items a due date to see them here.
        </p>
      ) : (
        <ul className="mx-4 rounded-2xl border border-border bg-surface">
          {items.map((t) => {
            const due = t.due_at ? dayKey(t.due_at) : today;
            const overdue = !t.done && due < today;
            return (
              <li key={t.id} className="border-b border-border last:border-0">
                <button
                  onClick={() => tick(t)}
                  role="checkbox"
                  aria-checked={t.done}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-xs text-white ${
                      t.done ? "border-brand bg-brand" : "border-border"
                    }`}
                  >
                    {t.done && "✓"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate ${t.done ? "text-muted line-through" : ""}`}>{t.text}</span>
                    <span className={`block truncate text-xs ${overdue ? "text-red-600 dark:text-red-400" : "text-muted"}`}>
                      {t.todo_lists?.name}
                      {overdue && ` · was due ${fmtRelativeDay(due, today)}`}
                      {t.done && t.done_by && ` · ✓ ${names[t.done_by] ?? "Partner"}`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
