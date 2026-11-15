import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { apiOk, apiError } from "@/lib/api-helpers";

type Params = { params: Promise<{ eventId: string }> };

/**
 * GET /api/events/[eventId]/progress
 *
 * Returns photo processing counts directly from the DB
 * (no AI service required — always works).
 * Also optionally proxies to the AI service for richer stats.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();

  const { data, error } = await db
    .from("photos")
    .select("status")
    .eq("event_id", eventId);

  if (error) return apiError(error.message, 500);

  const rows = data ?? [];
  const counts = { pending: 0, processing: 0, done: 0, failed: 0 };
  for (const r of rows) {
    const s = r.status as keyof typeof counts;
    if (s in counts) counts[s]++;
  }

  const total = rows.length;
  const percent = total > 0 ? Math.round((counts.done / total) * 1000) / 10 : 0;

  return apiOk({
    event_id: eventId,
    total,
    done: counts.done,
    pending: counts.pending,
    processing: counts.processing,
    failed: counts.failed,
    percent,
    label: `Sorted ${counts.done} / ${total} photos`,
  });
}
