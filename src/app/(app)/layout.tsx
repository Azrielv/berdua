import { BottomNav } from "@/components/bottom-nav";
import { requireCouple } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireCouple();
  return (
    <>
      <main className="mx-auto min-h-dvh max-w-md pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)]">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
