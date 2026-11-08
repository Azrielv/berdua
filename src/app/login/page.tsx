import { LoginForm } from "./login-form";
import { APP_NAME } from "@/lib/config";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon.svg" alt="" width={64} height={64} className="mb-5" />
      <h1 className="text-3xl font-semibold tracking-tight">{APP_NAME}</h1>
      <p className="mt-1 text-muted">Plan dates, places and life — together.</p>
      <LoginForm
        initialError={
          error
            ? "That sign-in link didn't work. It may have expired, or opened in a different browser. Type the 6-digit code from the email instead, or request a new one."
            : null
        }
        googleEnabled={process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true"}
      />
    </main>
  );
}
