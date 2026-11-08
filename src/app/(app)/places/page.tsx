import { requireCouple } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchPlaces } from "@/lib/data";
import { PlacesClient } from "./places-client";

export const metadata = { title: "Places" };

export default async function PlacesPage() {
  const { couple } = await requireCouple();
  const places = await fetchPlaces(await createClient());
  return <PlacesClient initial={places} coupleId={couple.id} />;
}
