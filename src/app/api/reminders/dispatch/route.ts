import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import type { PushSubscription } from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildMessage, type ReminderRow, type Targets } from "@/lib/push/messages";
import { sendPush } from "@/lib/push/send";
import type { SpecialEvent } from "@/lib/events";

/**
 * Called by pg_cron every few minutes (see supabase/cron.sql).
 * Claims due reminders and pushes them to both partners' devices.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const { data: due, error } = await db.rpc("claim_due_reminders");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const reminders = (due ?? []) as ReminderRow[];
  if (reminders.length === 0) return NextResponse.json({ claimed: 0 });

  const ids = (type: ReminderRow["target_type"][]) =>
    [...new Set(reminders.filter((r) => type.includes(r.target_type)).map((r) => r.target_id))];
  const coupleIds = [...new Set(reminders.map((r) => r.couple_id))];

  const [dates, todos, events, couples, members] = await Promise.all([
    db.from("dates").select("id, title, starts_at, category, place_name").in("id", ids(["date_day_before", "date_soon"])),
    db.from("todos").select("id, list_id, text, done, todo_lists(name)").in("id", ids(["todo_due"])),
    db.from("events").select("id, title, event_date, kind, recurring_yearly").in("id", ids(["event"])),
    db.from("couples").select("id, anniversary").in("id", ids(["anniversary"])),
    db.from("profiles").select("id, couple_id, push_subscription").in("couple_id", coupleIds).not("push_subscription", "is", null),
  ]);

  const targets: Targets = {
    dates: new Map((dates.data ?? []).map((d) => [d.id, d])),
    todos: new Map(
      (todos.data ?? []).map((t) => {
        const list = t.todo_lists as unknown as { name: string } | null;
        return [t.id, { id: t.id, list_id: t.list_id, text: t.text, done: t.done, list_name: list?.name ?? null }];
      }),
    ),
    events: new Map((events.data ?? []).map((e) => [e.id, e as SpecialEvent])),
    anniversaries: new Map((couples.data ?? []).filter((c) => c.anniversary).map((c) => [c.id, c.anniversary as string])),
  };

  const stats = { claimed: reminders.length, sent: 0, skipped: 0, failed: 0, removedSubscriptions: 0 };
  const gone = new Set<string>();

  for (const r of reminders) {
    const msg = buildMessage(r, targets);
    const recipients = (members.data ?? []).filter((m) => m.couple_id === r.couple_id && !gone.has(m.id));
    if (!msg || recipients.length === 0) {
      stats.skipped++;
      continue;
    }
    const results = await Promise.all(
      recipients.map(async (m) => [m.id, await sendPush(m.push_subscription as PushSubscription, msg)] as const),
    );
    for (const [userId, res] of results) {
      if (res === "sent") stats.sent++;
      else if (res === "failed") stats.failed++;
      else gone.add(userId);
    }
  }

  if (gone.size) {
    await db.from("profiles").update({ push_subscription: null }).in("id", [...gone]);
    stats.removedSubscriptions = gone.size;
  }
  return NextResponse.json(stats);
}
