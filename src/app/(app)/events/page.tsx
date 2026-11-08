import { requireCouple } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchEvents } from "@/lib/data";
import { dayKey } from "@/lib/time";
import { EventsClient } from "./events-client";

export const metadata = { title: "Special days" };

export default async function EventsPage() {
  const { couple } = await requireCouple();
  const events = await fetchEvents(await createClient());
  return (
    <EventsClient
      initial={events}
      coupleId={couple.id}
      anniversary={couple.anniversary}
      today={dayKey(new Date())}
    />
  );
}
