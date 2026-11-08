"use client";

/** 1–5 hearts. Read-only unless `onChange` is given; tapping the current value clears it. */
export function Hearts({
  value,
  onChange,
  size = "text-2xl",
}: {
  value: number | null;
  onChange?: (v: number | null) => void;
  size?: string;
}) {
  if (!onChange) {
    if (!value) return null;
    return (
      <span className="text-brand" aria-label={`${value} out of 5 hearts`}>
        {"♥".repeat(value)}
        <span className="text-border">{"♥".repeat(5 - value)}</span>
      </span>
    );
  }
  return (
    <div role="radiogroup" aria-label="Rating" className={`flex gap-1 ${size}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} heart${n > 1 ? "s" : ""}`}
          onClick={() => onChange(value === n ? null : n)}
          className={`transition active:scale-90 ${value && n <= value ? "text-brand" : "text-border"}`}
        >
          ♥
        </button>
      ))}
    </div>
  );
}
