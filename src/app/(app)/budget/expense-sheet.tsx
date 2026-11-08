"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { EXPENSE_CATEGORIES, fmtRM, parseAmount, type Expense, type ExpenseCategory } from "@/lib/data";
import { btn, errorText, input } from "@/components/ui";
import type { Member } from "./budget-client";

const PICKABLE = (Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).filter((c) => c !== "settle_up");

export function ExpenseSheet({
  expense,
  defaultDay,
  me,
  partner,
  onClose,
  onSaved,
}: {
  expense: Expense | null;
  defaultDay: string;
  me: Member;
  partner: Member | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const linked = !!expense?.date_id; // amount/date/note come from the date
  const settle = expense?.category === "settle_up";
  const [amount, setAmount] = useState(expense ? expense.amount.toFixed(2) : "");
  const [note, setNote] = useState(expense?.note ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "food");
  const [paidBy, setPaidBy] = useState(expense?.paid_by ?? me.id);
  const [day, setDay] = useState(expense?.spent_on ?? defaultDay);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const parsed = parseAmount(amount);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!linked && parsed === null) return setError("Enter an amount, e.g. 25.50");
    setBusy(true);
    setError(null);
    const sb = createClient();
    const payload: Record<string, unknown> = linked
      ? { paid_by: paidBy }
      : { amount: parsed, note: note.trim() || null, category, paid_by: paidBy, spent_on: day };
    const { error } = expense
      ? await sb.from("expenses").update(payload).eq("id", expense.id)
      : await sb.from("expenses").insert(payload);
    setBusy(false);
    if (error) return setError(error.message);
    onSaved();
  }

  async function remove() {
    if (!expense) return;
    const msg = linked
      ? "This came from a date's actual cost. Remove the cost from the date?"
      : "Delete this expense?";
    if (!window.confirm(msg)) return;
    setBusy(true);
    const sb = createClient();
    const { error } = linked
      ? await sb.from("dates").update({ actual_cost: null }).eq("id", expense.date_id!)
      : await sb.from("expenses").delete().eq("id", expense.id);
    setBusy(false);
    if (error) return setError(error.message);
    onSaved();
  }

  const members = partner ? [me, partner] : [me];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label={expense ? "Edit expense" : "Log spending"}
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-3xl bg-background px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {settle ? "Settle-up" : expense ? "Edit expense" : "Log spending"}
          </h2>
          <button type="button" onClick={onClose} className="text-sm text-muted">
            Cancel
          </button>
        </div>

        {linked ? (
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="text-2xl font-semibold tabular-nums">{fmtRM(expense!.amount)}</p>
            <p className="mt-1 text-sm text-muted">
              From the date &ldquo;{expense!.note}&rdquo;.{" "}
              <Link href={`/dates/${expense!.date_id}/edit`} className="font-medium text-brand">
                Edit cost on the date
              </Link>
            </p>
          </div>
        ) : (
          <>
            <label className="block">
              <span className="sr-only">Amount</span>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 focus-within:border-brand">
                <span className="text-xl font-semibold text-muted">RM</span>
                <input
                  className="h-16 w-full bg-transparent text-3xl font-semibold tabular-nums outline-none"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
                  autoFocus={!expense}
                  disabled={settle}
                />
              </div>
            </label>
            {!settle && (
              <>
                <input
                  className={input}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What for? e.g. Nasi lemak"
                  maxLength={200}
                  aria-label="What for"
                />
                <div className="flex flex-wrap gap-2">
                  {PICKABLE.map((c) => {
                    const on = c === category;
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setCategory(c)}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                          on ? "border-brand bg-brand-soft text-brand" : "border-border bg-surface"
                        }`}
                      >
                        {EXPENSE_CATEGORIES[c].emoji} {EXPENSE_CATEGORIES[c].label}
                      </button>
                    );
                  })}
                </div>
                <label className="flex items-center gap-3">
                  <span className="text-sm font-medium">Date</span>
                  <input
                    className={`${input} h-11`}
                    type="date"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    required
                  />
                </label>
              </>
            )}
          </>
        )}

        {!settle && (
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Who paid?</legend>
            <div className="grid grid-cols-2 gap-2">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={paidBy === m.id}
                  onClick={() => setPaidBy(m.id)}
                  className={`h-11 truncate rounded-xl border px-3 text-sm font-medium ${
                    paidBy === m.id ? "border-brand bg-brand-soft text-brand" : "border-border bg-surface"
                  }`}
                >
                  {m.id === me.id ? `${m.name} (me)` : m.name}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">Split 50/50 between you.</p>
          </fieldset>
        )}

        {error && <p className={errorText}>{error}</p>}
        {!settle && (
          <button className={btn} disabled={busy || (!linked && parsed === null)}>
            {busy ? "Saving…" : expense ? "Save" : parsed ? `Add ${fmtRM(parsed)}` : "Add"}
          </button>
        )}
        {expense && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="w-full py-2 text-sm font-medium text-red-600 disabled:opacity-50 dark:text-red-400"
          >
            {linked ? "Remove cost from date" : settle ? "Delete settle-up" : "Delete"}
          </button>
        )}
      </form>
    </div>
  );
}
