import Link from "next/link";
import { btn } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-4xl" aria-hidden>
        🧭
      </p>
      <h1 className="mt-3 text-xl font-semibold">Not found</h1>
      <p className="mt-1 text-sm text-muted">It may have been deleted, or the link is wrong.</p>
      <Link href="/" className={`${btn} mt-6 max-w-48`}>
        Go home
      </Link>
    </main>
  );
}
