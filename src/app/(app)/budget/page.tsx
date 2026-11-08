import { displayName, requireCouple } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchBalance, fetchExpensesForMonth } from "@/lib/data";
import { addMonths, dayKey, isMonthKey } from "@/lib/time";
import { BudgetClient } from "./budget-client";

export const metadata = { title: "Budget" };

export default async function BudgetPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const { profile, partner, couple } = await requireCouple();
  const today = dayKey(new Date());
  const month = isMonthKey(m) ? m : today.slice(0, 7);
  const sb = await createClient();
  const [expenses, balance] = await Promise.all([
    fetchExpensesForMonth(sb, month, addMonths(month, 1)),
    fetchBalance(sb, profile.id),
  ]);

  return (
    <BudgetClient
      key={month}
      month={month}
      today={today}
      coupleId={couple.id}
      me={{ id: profile.id, name: displayName(profile, "You") }}
      partner={partner ? { id: partner.id, name: displayName(partner) } : null}
      initial={{ expenses, balance }}
    />
  );
}
