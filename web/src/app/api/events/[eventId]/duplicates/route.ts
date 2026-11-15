import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { apiOk, apiError } from "@/lib/api-helpers";

type Params = { params: Promise<{ eventId: string }> };

/**
 * Hamming distance between two hex string pHashes
 */
function hammingDistance(hexA?: string | null, hexB?: string | null): number {
  if (!hexA || !hexB) return 999;
  if (hexA.startsWith("dup:") || hexB.startsWith("dup:")) return 999;
  try {
    const binA = BigInt("0x" + hexA);
    const binB = BigInt("0x" + hexB);
    let xor = binA ^ binB;
    let dist = 0;
    while (xor > 0n) {
      dist += Number(xor & 1n);
      xor >>= 1n;
    }
    return dist;
  } catch {
    return 999;
  }
}

/**
 * GET /api/events/[eventId]/duplicates
 * Returns groups of duplicate or near-duplicate photos.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();

  const { data: photos, error } = await db
    .from("photos")
    .select("*, moments(id, name), users:uploaded_by(name)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) return apiError(error.message, 500);
  if (!photos || photos.length === 0) return apiOk({ groups: [] });

  // Group photos
  const groupMap = new Map<string, typeof photos>();

  for (const photo of photos) {
    let key: string | null = null;
    const phash = photo.phash || "";

    if (phash.startsWith("dup:")) {
      key = phash.replace("dup:", "");
    }

    if (!key && phash && !phash.startsWith("retry:")) {
      // Check against existing root keys with hamming distance <= 8
      for (const [existingKey, group] of groupMap.entries()) {
        const rootPhoto = group[0];
        if (rootPhoto.phash && hammingDistance(rootPhoto.phash, phash) <= 8) {
          key = existingKey;
          break;
        }
      }
    }

    if (key) {
      const existing = groupMap.get(key) || [];
      existing.push(photo);
      groupMap.set(key, existing);
    } else if (phash && !phash.startsWith("retry:")) {
      // Start a candidate group with this photo as potential root
      groupMap.set(photo.id, [photo]);
    }
  }

  // Filter only groups with 2 or more photos (actual duplicates)
  const duplicateGroups: Array<{
    id: string;
    bestPhotoId: string;
    photos: Array<Record<string, unknown>>;
  }> = [];

  for (const [rootId, groupPhotos] of groupMap.entries()) {
    if (groupPhotos.length >= 2) {
      // Best photo heuristic: highest resolution or first created
      const sorted = [...groupPhotos].sort((a, b) => {
        const resA = (a.width || 0) * (a.height || 0);
        const resB = (b.width || 0) * (b.height || 0);
        return resB - resA;
      });

      duplicateGroups.push({
        id: rootId,
        bestPhotoId: sorted[0].id,
        photos: groupPhotos.map((p: any) => ({
          id: p.id,
          url: p.storage_path,
          thumbUrl: p.thumb_path || p.storage_path,
          width: p.width || 1200,
          height: p.height || 800,
          momentId: p.moment_id,
          momentName: p.moments?.name,
          uploaderName: p.users?.name || "Guest",
          phash: p.phash,
          takenAt: p.taken_at,
          createdAt: p.created_at,
        })),
      });
    }
  }

  return apiOk({ groups: duplicateGroups });
}

/**
 * POST /api/events/[eventId]/duplicates
 * Pick best photo and hide or remove the rest.
 * Body: { best_photo_id: string, hide_photo_ids: string[], user_id?: string, action?: 'hide' | 'delete' }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();

  let body: {
    best_photo_id?: string;
    hide_photo_ids?: string[];
    user_id?: string;
    action?: "hide" | "delete";
  };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON");
  }

  const { best_photo_id, hide_photo_ids, user_id, action = "hide" } = body;

  if (!best_photo_id || !hide_photo_ids || hide_photo_ids.length === 0) {
    return apiError("best_photo_id and hide_photo_ids are required");
  }

  if (action === "delete" && user_id) {
    // Check if host
    const { data: member } = await db
      .from("event_members")
      .select("role")
      .eq("event_id", eventId)
      .eq("user_id", user_id)
      .single();

    if (member?.role === "host") {
      await db
        .from("photos")
        .delete()
        .eq("event_id", eventId)
        .in("id", hide_photo_ids);

      return apiOk({ resolved: true, deleted_count: hide_photo_ids.length });
    }
  }

  // Default action: hide photos for the user in hidden_photos
  if (user_id) {
    const records = hide_photo_ids.map((photo_id) => ({
      user_id,
      photo_id,
    }));

    await db.from("hidden_photos").upsert(records, { onConflict: "user_id,photo_id" });
  }

  return apiOk({ resolved: true, hidden_count: hide_photo_ids.length });
}
