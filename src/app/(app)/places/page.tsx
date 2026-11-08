import { requireCoupleAnd } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchPlaces } from "@/lib/data";
import { PlacesClient } from "./places-client";

export const metadata = { title: "Places" };

export default async function PlacesPage() {
  const sb = await createClient();
  const [{ couple }, places] = await requireCoupleAnd([fetchPlaces(sb)]);
  return <PlacesClient initial={places} coupleId={couple.id} />;
}
