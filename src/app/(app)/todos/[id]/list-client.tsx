"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLive } from "@/lib/use-live";
import { fetchTodoList, type Todo, type TodoList } from "@/lib/data";
import { dayKey, fmtRelativeDay, klToISO } from "@/lib/time";
import { PageHeader, EmptyState } from "@/components/page-header";
import { errorText, input } from "@/components/ui";

type Data = { list: TodoList; todos: Todo[] } | null;

export function ListClient({
  initial,
  myId,
  names,
  today,
}: {
  initial: NonNullable<Data>;
  myId: string;
  names: Record<string, string>;
  today: string;
}) {
  const router = useRouter();
  const listId = initial.list.id;
  const { data, setData, reload } = useLive<Data>(initial, () => fetchTodoList(createClient(), listId), [
    { table: "todos", filter: `list_id=eq.${listId}` },
    { table: "todo_lists", filter: `id=eq.${listId}` },
  ]);
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [showDue, setShowDue] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!data) {
    return (
      <>
        <PageHeader title="To-do" back="/todos" />
        <EmptyState title="This list was deleted" body="Your partner may have removed it." />
      </>
    );
  }

  const { list, todos } = data;
  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);
  const sb = () => createClient();

  /** Apply a change locally right away, then sync; roll back on failure. */
  async function mutate(local: (t: Todo[]) => Todo[], remote: () => PromiseLike<{ error: { message: string } | null }>) {
    setError(null);
    setData((d) => d && { ...d, todos: local(d.todos) });
    const { error } = await remote();
    if (error) {
      setError(error.message);
      reload();
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    const due_at = due ? klToISO(due, "09:00") : null;
    setText("");
    setDue("");
    setShowDue(false);
    const temp: Todo = {
      id: `temp-${Date.now()}`,
      list_id: listId,
      text: value,
      done: false,
      done_by: null,
      due_at,
      created_at: new Date().toISOString(),
    };
    await mutate(
      (t) => [...t, temp],
      () => sb().from("todos").insert({ list_id: listId, text: value, due_at }),
    );
    reload(); // swap the temp row for the real one
  }

  const toggle = (t: Todo) =>
    mutate(
      (all) => all.map((x) => (x.id === t.id ? { ...x, done: !t.done, done_by: t.done ? null : myId } : x)),
      () => sb().from("todos").update({ done: !t.done }).eq("id", t.id),
    );

  const remove = (t: Todo) =>
    mutate(
      (all) => all.filter((x) => x.id !== t.id),
      () => sb().from("todos").delete().eq("id", t.id),
    );

  const clearDone = () => {
    const ids = done.map((t) => t.id);
    return mutate(
      (all) => all.filter((x) => !x.done),
      () => sb().from("todos").delete().in("id", ids),
    );
  };

  async function rename(e: React.SyntheticEvent) {
    e.preventDefault();
    const name = renaming?.trim();
    setRenaming(null);
    if (!name || name === list.name) return;
    setData((d) => d && { ...d, list: { ...d.list, name } });
    const { error } = await sb().from("todo_lists").update({ name }).eq("id", listId);
    if (error) {
      setError(error.message);
      reload();
    }
  }

  async function deleteList() {
    if (!window.confirm(`Delete "${list.name}" and its ${todos.length} items?`)) return;
    const { error } = await sb().from("todo_lists").delete().eq("id", listId);
    if (error) return setError(error.message);
    router.replace("/todos");
  }

  const row = (t: Todo) => {
    const pending = t.id.startsWith("temp-");
    const dueKey = t.due_at ? dayKey(t.due_at) : null;
    const overdue = !t.done && dueKey !== null && dueKey < today;
    const meta = [
      dueKey && `Due ${fmtRelativeDay(dueKey, today)}`,
      t.done && t.done_by && `✓ ${names[t.done_by] ?? "Partner"}`,
    ].filter(Boolean);
    return (
      <li key={t.id} className="flex items-center gap-1 border-b border-border last:border-0">
        <button
          onClick={() => toggle(t)}
          disabled={pending}
          role="checkbox"
          aria-checked={t.done}
          className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left"
        >
          <span
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-xs text-white transition ${
              t.done ? "border-brand bg-brand" : "border-border"
            }`}
          >
            {t.done && "✓"}
          </span>
          <span className="min-w-0">
            <span className={`block break-words ${t.done ? "text-muted line-through" : ""}`}>{t.text}</span>
            {meta.length > 0 && (
              <span className={`block text-xs ${overdue ? "text-red-600 dark:text-red-400" : "text-muted"}`}>
                {meta.join(" · ")}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => remove(t)}
          disabled={pending}
          aria-label={`Delete ${t.text}`}
          className="grid h-11 w-11 shrink-0 place-items-center text-xl text-muted"
        >
          ×
        </button>
      </li>
    );
  };

  return (
    <>
      <PageHeader
        back="/todos"
        title={
          renaming !== null ? (
            <form onSubmit={rename}>
              <input
                className="w-full rounded-lg bg-surface px-2 py-1 text-xl font-semibold outline-none ring-1 ring-brand"
                value={renaming}
                onChange={(e) => setRenaming(e.target.value)}
                onBlur={rename}
                maxLength={60}
                autoFocus
                aria-label="List name"
              />
            </form>
          ) : (
            <button onClick={() => setRenaming(list.name)} className="max-w-full truncate text-left">
              {list.name}
            </button>
          )
        }
        action={
          <button onClick={deleteList} className="rounded-full px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400">
            Delete
          </button>
        }
      />

      <form onSubmit={add} className="space-y-2 px-4">
        <div className="flex gap-2">
          <input
            className={input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add an item…"
            maxLength={300}
            enterKeyHint="done"
            aria-label="New item"
          />
          <button
            type="button"
            onClick={() => setShowDue((s) => !s)}
            aria-label="Set due date"
            aria-pressed={showDue || !!due}
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border ${
              showDue || due ? "border-brand bg-brand-soft text-brand" : "border-border bg-surface text-muted"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
          </button>
          <button
            className="h-12 shrink-0 rounded-xl bg-brand px-4 font-semibold text-white disabled:opacity-50"
            disabled={!text.trim()}
          >
            Add
          </button>
        </div>
        {showDue && (
          <label className="flex items-center gap-3 text-sm">
            <span className="text-muted">Due</span>
            <input className={`${input} h-10`} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            {due && (
              <button type="button" onClick={() => setDue("")} className="shrink-0 text-muted">
                Clear
              </button>
            )}
          </label>
        )}
      </form>
      {error && <p className={`${errorText} px-4 pt-2`}>{error}</p>}

      {todos.length === 0 ? (
        <EmptyState title="Nothing here yet" body="Add the first item above." />
      ) : (
        <>
          {open.length > 0 && <ul className="mx-4 mt-4 rounded-2xl border border-border bg-surface">{open.map(row)}</ul>}
          {done.length > 0 && (
            <section className="mt-5">
              <div className="flex items-baseline justify-between px-4 pb-2">
                <h2 className="text-sm font-medium text-muted">Done ({done.length})</h2>
                <button onClick={clearDone} className="text-sm text-muted">
                  Clear done
                </button>
              </div>
              <ul className="mx-4 rounded-2xl border border-border bg-surface">{done.map(row)}</ul>
            </section>
          )}
        </>
      )}
    </>
  );
}
