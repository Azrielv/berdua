import Link from "next/link";

export function PageHeader({
  title,
  action,
  back,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  back?: string;
}) {
  return (
    <header className="sticky top-0 z-30 bg-background pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center gap-2 px-4">
        {back && (
          <Link
            href={back}
            aria-label="Back"
            className="-ml-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
        )}
        <h1 className="min-w-0 flex-1 truncate font-display text-2xl font-semibold tracking-tight">{title}</h1>
        {action}
      </div>
    </header>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-4 mt-6 rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}

/** Round "+" button that floats above the bottom nav. */
export function Fab({ href, label }: { href: string; label: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30">
      <div className="mx-auto flex max-w-md justify-end px-4">
        <Link
          href={href}
          aria-label={label}
          className="pointer-events-auto grid h-14 w-14 place-items-center rounded-full bg-brand text-3xl font-light text-white shadow-lg transition active:scale-95"
        >
          +
        </Link>
      </div>
    </div>
  );
}
