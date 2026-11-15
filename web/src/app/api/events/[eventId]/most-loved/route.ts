import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { apiOk, apiError } from "@/lib/api-helpers";

type Params = { params: Promise<{ eventId: string }> };

/**
 * GET /api/events/[eventId]/most-loved
 * Returns top favorited photos for this event.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || 10), 30);

  // 1. Get photo IDs with favorites count
  const { data: favCounts, error: favError } = await db
    .from("favorites")
    .select("photo_id, photos!inner(event_id)")
    .eq("photos.event_id", eventId);

  if (favError) {
    // If join fails or table empty, fallback to recent photos
    const { data: fallbackPhotos } = await db
      .from("photos")
      .select("*, moments(name)")
      .eq("event_id", eventId)
      .eq("status", "done")
      .limit(limit);

    return apiOk({
      photos: (fallbackPhotos || []).map((p) => ({
        id: p.id,
        url: p.storage_path,
        thumbUrl: p.thumb_path || p.storage_path,
        width: p.width || 1200,
        height: p.height || 800,
        momentName: p.moments?.name,
        favoriteCount: 1,
      })),
    });
  }

  // Count occurrences
  const countMap: Record<string, number> = {};
  for (const f of favCounts || []) {
    countMap[f.photo_id] = (countMap[f.photo_id] || 0) + 1;
  }

  const sortedPhotoIds = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  if (sortedPhotoIds.length === 0) {
    // Fallback to top 6 photos in the event
    const { data: fallbackPhotos } = await db
      .from("photos")
      .select("*, moments(name)")
      .eq("event_id", eventId)
      .limit(6);

    return apiOk({
      photos: (fallbackPhotos || []).map((p) => ({
        id: p.id,
        url: p.storage_path,
        thumbUrl: p.thumb_path || p.storage_path,
        width: p.width || 1200,
        height: p.height || 800,
        momentName: p.moments?.name,
        favoriteCount: 0,
      })),
    });
  }

  const { data: photos, error: photoError } = await db
    .from("photos")
    .select("*, moments(name), users:uploaded_by(name)")
    .in("id", sortedPhotoIds);

  if (photoError) return apiError(photoError.message, 500);

  const formatted = (photos || [])
    .map((p) => ({
      id: p.id,
      url: p.storage_path,
      thumbUrl: p.thumb_path || p.storage_path,
      width: p.width || 1200,
      height: p.height || 800,
      momentId: p.moment_id,
      momentName: p.moments?.name,
      uploaderName: p.users?.name,
      favoriteCount: countMap[p.id] || 0,
    }))
    .sort((a, b) => b.favoriteCount - a.favoriteCount);

  return apiOk({ photos: formatted });
}
