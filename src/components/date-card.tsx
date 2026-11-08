import Link from "next/link";
import { CATEGORIES, type DateRow } from "@/lib/data";
import { fmtTime } from "@/lib/time";

export function DateCard({ date, meta }: { date: DateRow; meta?: string }) {
  const cat = CATEGORIES[date.category];
  return (
    <Link
      href={`/dates/${date.id}`}
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 transition active:scale-[.99]"
    >
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl"
        style={{ background: `${cat.color}22` }}
        aria-hidden
      >
        {cat.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{date.title}</p>
        <p className="truncate text-sm text-muted">
          {meta ?? fmtTime(date.starts_at)}
          {date.place_name && ` · ${date.place_name}`}
        </p>
      </div>
    </Link>
  );
}
