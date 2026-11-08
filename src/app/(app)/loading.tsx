/** Skeleton shown while a tab's server data loads. */
export default function Loading() {
  const block = "animate-pulse rounded-2xl bg-border/60";
  return (
    <div aria-busy="true" aria-label="Loading" className="pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center px-4">
        <div className={`${block} h-6 w-36 rounded-lg`} />
      </div>
      <div className="space-y-3 px-4">
        <div className={`${block} h-32`} />
        <div className={`${block} h-16`} />
        <div className={`${block} h-16`} />
        <div className={`${block} h-16`} />
      </div>
    </div>
  );
}
