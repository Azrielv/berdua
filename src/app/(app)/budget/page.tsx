import { displayName, requireCoupleAnd } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchBalanceRows, fetchExpensesForMonth, netBalance } from "@/lib/data";
import { addMonths, dayKey, isMonthKey } from "@/lib/time";
import { BudgetClient } from "./budget-client";

export const metadata = { title: "Budget" };

export default async function BudgetPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const today = dayKey(new Date());
  const month = isMonthKey(m) ? m : today.slice(0, 7);
  const sb = await createClient();
  const [{ profile, partner, couple }, expenses, balanceRows] = await requireCoupleAnd([fetchExpensesForMonth(sb, month, addMonths(month, 1)),
    fetchBalanceRows(sb),
  ]);

  return (
    <BudgetClient
      key={month}
      month={month}
      today={today}
      coupleId={couple.id}
      me={{ id: profile.id, name: displayName(profile, "You") }}
      partner={partner ? { id: partner.id, name: displayName(partner) } : null}
      initial={{ expenses, balance: netBalance(balanceRows, profile.id) }}
    />
  );
}
