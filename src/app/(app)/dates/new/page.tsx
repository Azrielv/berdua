import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { fetchPlace } from "@/lib/data";
import { dayKey, isDayKey } from "@/lib/time";
import { DateForm } from "../date-form";

export const metadata = { title: "New date" };

export default async function NewDatePage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; place?: string }>;
}) {
  const { day, place: placeId } = await searchParams;
  const defaultDay = isDayKey(day) ? day : dayKey(new Date());
  // "Plan a date here" from Places / the spinner pre-fills the location.
  const place = placeId ? await fetchPlace(await createClient(), placeId) : null;

  return (
    <>
      <PageHeader title="New date" back={place ? "/places" : `/calendar?d=${defaultDay}`} />
      <DateForm
        defaultDay={defaultDay}
        initialTitle={place ? place.name : undefined}
        initialLocation={
          place
            ? {
                place_name: place.name,
                address: place.address ?? "",
                lat: place.lat,
                lng: place.lng,
                place_id: place.place_id,
              }
            : undefined
        }
      />
    </>
  );
}
