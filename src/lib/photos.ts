"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { PHOTO_BUCKET, type Photo } from "./data";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/** Resize + re-encode as JPEG in the browser. Null if the browser can't decode it. */
export async function compressImage(file: Blob, maxSide: number, quality = 0.82): Promise<Blob | null> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    return await new Promise((res) => canvas.toBlob((b) => res(b), "image/jpeg", quality));
  } catch {
    return null;
  }
}

/** Compresses, uploads (full + thumbnail) and records one photo. */
export async function uploadPhoto(sb: SupabaseClient, coupleId: string, dateId: string, file: File) {
  const id = crypto.randomUUID();
  const folder = `${coupleId}/${dateId}`;

  const full = await compressImage(file, 1600);
  const thumb = full ? await compressImage(full, 480, 0.75) : null;
  let body: Blob = full ?? file;
  let contentType = full ? "image/jpeg" : file.type;
  if (!full) {
    // Couldn't decode (e.g. HEIC in some browsers): upload the original if allowed.
    if (!ALLOWED.includes(file.type)) throw new Error(`${file.name}: unsupported image type`);
    if (file.size > MAX_BYTES) throw new Error(`${file.name}: larger than 10 MB`);
    body = file;
    contentType = file.type;
  }
  const ext = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
  const storage_path = `${folder}/${id}.${ext}`;
  const thumb_path = thumb ? `${folder}/${id}_t.jpg` : null;

  const bucket = sb.storage.from(PHOTO_BUCKET);
  const up = await bucket.upload(storage_path, body, { contentType, cacheControl: "31536000" });
  if (up.error) throw up.error;
  if (thumb && thumb_path) {
    const t = await bucket.upload(thumb_path, thumb, { contentType: "image/jpeg", cacheControl: "31536000" });
    if (t.error) throw t.error;
  }
  const { error } = await sb.from("date_photos").insert({ id, date_id: dateId, storage_path, thumb_path });
  if (error) {
    await bucket.remove([storage_path, ...(thumb_path ? [thumb_path] : [])]);
    throw error;
  }
}

/** Removes the files, then the rows. */
export async function deletePhotos(sb: SupabaseClient, photos: Pick<Photo, "id" | "storage_path" | "thumb_path">[]) {
  if (photos.length === 0) return;
  const paths = photos.flatMap((p) => [p.storage_path, ...(p.thumb_path ? [p.thumb_path] : [])]);
  const rm = await sb.storage.from(PHOTO_BUCKET).remove(paths);
  if (rm.error) throw rm.error;
  const { error } = await sb.from("date_photos").delete().in("id", photos.map((p) => p.id));
  if (error) throw error;
}
