// Builds notification text for each reminder type. Pure, so it's unit-testable.
import { CATEGORIES, type DateCategory } from "../data";
import { EVENT_KINDS, occurrenceLabel, type SpecialEvent } from "../events";
import { fmtTime } from "../time";

export type PushMessage = { title: string; body: string; url: string; tag: string };

export type ReminderRow = {
  id: string;
  couple_id: string;
  target_type: "date_day_before" | "date_soon" | "todo_due" | "event" | "anniversary";
  target_id: string;
  remind_at: string;
};

export type Targets = {
  dates: Map<string, { id: string; title: string; starts_at: string; category: DateCategory; place_name: string | null }>;
  todos: Map<string, { id: string; list_id: string; text: string; done: boolean; list_name: string | null }>;
  events: Map<string, SpecialEvent>;
  anniversaries: Map<string, string>; // couple_id → anniversary date
};

/** "YYYY" of the day after `iso` in KL — the day a "tomorrow" reminder is about. */
function klYearOfTomorrow(iso: string) {
  const d = new Date(new Date(iso).getTime() + 8 * 3600_000 + 86_400_000);
  return d.getUTCFullYear();
}

/** Returns null when the target no longer exists or no longer applies. */
export function buildMessage(r: ReminderRow, t: Targets): PushMessage | null {
  switch (r.target_type) {
    case "date_day_before":
    case "date_soon": {
      const d = t.dates.get(r.target_id);
      if (!d) return null;
      const emoji = CATEGORIES[d.category]?.emoji ?? "💕";
      const when = r.target_type === "date_soon" ? "In 2 hours" : "Tomorrow";
      return {
        title: `${when}: ${d.title} ${emoji}`,
        body: [fmtTime(d.starts_at), d.place_name].filter(Boolean).join(" · "),
        url: `/dates/${d.id}`,
        tag: `date-${d.id}`,
      };
    }
    case "todo_due": {
      const td = t.todos.get(r.target_id);
      if (!td || td.done) return null;
      return {
        title: `Due today: ${td.text}`,
        body: td.list_name ? `From “${td.list_name}”` : "Shared to-do",
        url: `/todos/${td.list_id}`,
        tag: `todo-${td.id}`,
      };
    }
    case "event": {
      const e = t.events.get(r.target_id);
      if (!e) return null;
      const year = klYearOfTomorrow(r.remind_at);
      const years = e.recurring_yearly ? year - +e.event_date.slice(0, 4) : 0;
      return {
        title: `Tomorrow: ${occurrenceLabel({ event: e, years: years > 0 ? years : null })} ${EVENT_KINDS[e.kind].emoji}`,
        body: e.kind === "birthday" ? "Don't forget the cake 🎂" : "Countdown's almost over!",
        url: "/events",
        tag: `event-${e.id}-${year}`,
      };
    }
    case "anniversary": {
      const date = t.anniversaries.get(r.target_id);
      if (!date) return null;
      const year = klYearOfTomorrow(r.remind_at);
      const years = year - +date.slice(0, 4);
      return {
        title: "Tomorrow is your anniversary 💍",
        body: years > 0 ? `${years} year${years === 1 ? "" : "s"} together. Plan something special!` : "Plan something special!",
        url: "/events",
        tag: `anniversary-${year}`,
      };
    }
  }
}
