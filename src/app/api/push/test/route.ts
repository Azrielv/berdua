import { NextResponse } from "next/server";
import type { PushSubscription } from "web-push";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/push/send";

/** Settings → "Send a test": pushes to the signed-in user's own device. */
export async function POST() {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // push_subscription isn't readable with the user's own key, so use the admin client.
  const db = createAdminClient();
  const { data } = await db.from("profiles").select("push_subscription").eq("id", user.id).single();
  if (!data?.push_subscription) {
    return NextResponse.json({ error: "Notifications aren't turned on for this account." }, { status: 400 });
  }

  const res = await sendPush(data.push_subscription as PushSubscription, {
    title: "It works! 💕",
    body: "You'll get reminders before dates, due to-dos and special days.",
    url: "/",
    tag: "test",
  });
  if (res === "gone") {
    await db.from("profiles").update({ push_subscription: null }).eq("id", user.id);
    return NextResponse.json({ error: "This device's subscription expired. Turn notifications off and on again." }, { status: 410 });
  }
  if (res === "failed") return NextResponse.json({ error: "Couldn't send. Check the server logs." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
