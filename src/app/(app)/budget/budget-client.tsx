"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLive } from "@/lib/use-live";
import {
  EXPENSE_CATEGORIES,
  fetchBalance,
  fetchExpensesForMonth,
  fmtRM,
  monthSpend,
  type Expense,
  type ExpenseCategory,
} from "@/lib/data";
import { addMonths, fmtMonth, fmtRelativeDay } from "@/lib/time";
import { PageHeader, EmptyState } from "@/components/page-header";
import { errorText } from "@/components/ui";
import { ExpenseSheet } from "./expense-sheet";

export type Member = { id: string; name: string };
type Data = { expenses: Expense[]; balance: number };

export function BudgetClient({
  month,
  today,
  coupleId,
  me,
  partner,
  initial,
}: {
  month: string;
  today: string;
  coupleId: string;
  me: Member;
  partner: Member | null;
  initial: Data;
}) {
  const { data, reload } = useLive<Data>(
    initial,
    async () => {
      const sb = createClient();
      const [expenses, balance] = await Promise.all([
        fetchExpensesForMonth(sb, month, addMonths(month, 1)),
        fetchBalance(sb, me.id),
      ]);
      return { expenses, balance };
    },
    [{ table: "expenses", filter: `couple_id=eq.${coupleId}` }],
  );
  const [sheet, setSheet] = useState<null | "new" | Expense>(null);
  const [error, setError] = useState<string | null>(null);

  const names: Record<string, string> = { [me.id]: me.name };
  if (partner) names[partner.id] = partner.name;

  const { expenses, balance } = data;
  const total = monthSpend(expenses);
  const paidBy = (id: string) =>
    expenses.filter((e) => e.paid_by === id && e.category !== "settle_up").reduce((s, e) => s + e.amount, 0);

  const byCategory = new Map<ExpenseCategory, number>();
  for (const e of expenses) {
    if (e.category === "settle_up") continue;
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  }
  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);

  const byDay = new Map<string, Expense[]>();
  for (const e of expenses) byDay.set(e.spent_on, [...(byDay.get(e.spent_on) ?? []), e]);

  async function settleUp() {
    if (!partner || balance === 0) return;
    const amount = Math.abs(balance);
    const payer = balance > 0 ? partner : me;
    const payee = balance > 0 ? me : partner;
    if (!window.confirm(`Record that ${payer.name} paid ${payee.name} ${fmtRM(amount)}?`)) return;
    setError(null);
    const { error } = await createClient()
      .from("expenses")
      .insert({ amount, category: "settle_up", paid_by: payer.id, note: "Settled up" });
    if (error) setError(error.message);
    reload();
  }

  const navBtn = "grid h-10 w-10 place-items-center rounded-full text-muted active:bg-border/50";
  const isThisMonth = today.startsWith(month);

  return (
    <>
      <PageHeader
        title="Budget"
        action={
          <div className="flex items-center">
            <Link href={`/budget?m=${addMonths(month, -1)}`} aria-label="Previous month" className={navBtn}>
              ‹
            </Link>
            <Link href={`/budget?m=${addMonths(month, 1)}`} aria-label="Next month" className={navBtn}>
              ›
            </Link>
          </div>
        }
      />

      <div className="space-y-3 px-4">
        <section className="rounded-2xl bg-brand p-5 text-white shadow-sm">
          <p className="text-sm opacity-90">
            {isThisMonth ? "Spent this month" : `Spent in ${fmtMonth(month)}`}
          </p>
          <p className="mt-1 font-display text-4xl font-semibold tabular-nums">{fmtRM(total)}</p>
          <p className="mt-2 text-sm opacity-90">
            {me.name} {fmtRM(paidBy(me.id))}
            {partner && ` · ${partner.name} ${fmtRM(paidBy(partner.id))}`}
          </p>
        </section>

        {partner && (
          <section className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
            <div>
              <p className="text-sm text-muted">Balance (all time, split 50/50)</p>
              <p className="mt-0.5 font-semibold">
                {balance === 0
                  ? "All settled ✓"
                  : balance > 0
                    ? `${partner.name} owes you ${fmtRM(balance)}`
                    : `You owe ${partner.name} ${fmtRM(-balance)}`}
              </p>
            </div>
            {balance !== 0 && (
              <button
                onClick={settleUp}
                className="shrink-0 rounded-full border border-border px-4 py-2 text-sm font-semibold"
              >
                Settle up
              </button>
            )}
          </section>
        )}
        {error && <p className={errorText}>{error}</p>}

        {categories.length > 0 && (
          <section className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="mb-3 text-sm font-medium text-muted">By category</h2>
            <ul className="space-y-2.5">
              {categories.map(([c, amt]) => (
                <li key={c}>
                  <div className="flex justify-between text-sm">
                    <span>
                      {EXPENSE_CATEGORIES[c].emoji} {EXPENSE_CATEGORIES[c].label}
                    </span>
                    <span className="tabular-nums">{fmtRM(amt)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(amt / total) * 100}%`, background: EXPENSE_CATEGORIES[c].color }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {expenses.length === 0 ? (
        <EmptyState title="No spending logged" body="Tap + to log what you spent and who paid." />
      ) : (
        <div className="mt-5 space-y-4 px-4">
          {[...byDay.entries()].map(([day, items]) => (
            <section key={day}>
              <h3 className="mb-1.5 text-sm font-medium text-muted">{fmtRelativeDay(day, today)}</h3>
              <ul className="rounded-2xl border border-border bg-surface">
                {items.map((e) => {
                  const cat = EXPENSE_CATEGORIES[e.category];
                  const settle = e.category === "settle_up";
                  return (
                    <li key={e.id} className="border-b border-border last:border-0">
                      <button onClick={() => setSheet(e)} className="flex w-full items-center gap-3 p-3 text-left">
                        <span
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg"
                          style={{ background: `${cat.color}22` }}
                          aria-hidden
                        >
                          {cat.emoji}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{e.note || cat.label}</span>
                          <span className="block truncate text-sm text-muted">
                            {settle
                              ? `${names[e.paid_by ?? ""] ?? "Someone"} paid back`
                              : `${names[e.paid_by ?? ""] ?? "Someone"} paid`}
                            {e.date_id && " · from a date"}
                          </span>
                        </span>
                        <span className={`shrink-0 font-semibold tabular-nums ${settle ? "text-muted" : ""}`}>
                          {fmtRM(e.amount)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30">
        <div className="mx-auto flex max-w-md justify-end px-4">
          <button
            onClick={() => setSheet("new")}
            aria-label="Log spending"
            className="pointer-events-auto grid h-14 w-14 place-items-center rounded-full bg-brand text-3xl font-light text-white shadow-lg transition active:scale-95"
          >
            +
          </button>
        </div>
      </div>

      {sheet && (
        <ExpenseSheet
          expense={sheet === "new" ? null : sheet}
          defaultDay={isThisMonth ? today : `${month}-01`}
          me={me}
          partner={partner}
          onClose={() => setSheet(null)}
          onSaved={() => {
            setSheet(null);
            reload();
          }}
        />
      )}
    </>
  );
}
