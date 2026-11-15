import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { apiOk, apiError, generateJoinCode, joinUrl, qrPayload } from "@/lib/api-helpers";
import { EVENT_ACCENT, EVENT_DEFAULT_MOMENTS } from "@/lib/event-presets";
import type { EventType } from "@/types";

/**
 * POST /api/events
 * Body: { name, type, host_id, upload_mode?, require_approval?, expires_at? }
 * Creates the event, seeds default moments, adds host as approved member.
 */
export async function POST(req: NextRequest) {
  const db = createServerClient();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body");
  }

  const { name, type, host_id, upload_mode, require_approval, expires_at } = body as {
    name?: string;
    type?: EventType;
    host_id?: string;
    upload_mode?: "everyone" | "selected";
    require_approval?: boolean;
    expires_at?: string;
  };

  if (!name || !type || !host_id) {
    return apiError("name, type, and host_id are required");
  }

  const validTypes: EventType[] = ["wedding","trip","party","birthday","family","college","corporate"];
  if (!validTypes.includes(type)) {
    return apiError(`type must be one of: ${validTypes.join(", ")}`);
  }

  const join_code = generateJoinCode();
  const accent = EVENT_ACCENT[type];

  // 1. Create event
  const { data: event, error: eventErr } = await db
    .from("events")
    .insert({
      name,
      type,
      host_id,
      join_code,
      accent,
      upload_mode: upload_mode ?? "everyone",
      require_approval: require_approval ?? false,
      expires_at: expires_at ?? undefined,
    })
    .select()
    .single();

  if (eventErr || !event) {
    return apiError(eventErr?.message ?? "Failed to create event", 500);
  }

  // 2. Add host as approved host member
  const { error: memberErr } = await db
    .from("event_members")
    .insert({ event_id: event.id, user_id: host_id, role: "host", status: "approved" });

  if (memberErr) {
    return apiError(memberErr.message, 500);
  }

  // 3. Seed default moments for this event type
  const momentNames = EVENT_DEFAULT_MOMENTS[type] ?? [];
  if (momentNames.length > 0) {
    const momentRows = momentNames.map((m_name, idx) => ({
      event_id: event.id,
      name: m_name,
      order: idx + 1,
    }));
    const { error: momErr } = await db.from("moments").insert(momentRows);
    if (momErr) {
      console.error("Moment seed error:", momErr.message);
    }
  }

  // 4. Fetch the seeded moments to return
  const { data: moments } = await db
    .from("moments")
    .select("*")
    .eq("event_id", event.id)
    .order("order");

  return apiOk(
    {
      event,
      moments: moments ?? [],
      join_url: joinUrl(join_code),
      qr_payload: qrPayload(join_code),
    },
    201
  );
}

/**
 * GET /api/events
 * Returns all events where the calling user is an approved member.
 * Requires ?user_id=<uuid>  (temporary; replace with JWT auth in Phase 2).
 */
export async function GET(req: NextRequest) {
  const db = createServerClient();
  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId) return apiError("user_id query param required");

  const { data, error } = await db
    .from("event_members")
    .select("events(*)")
    .eq("user_id", userId)
    .eq("status", "approved");

  if (error) return apiError(error.message, 500);

  const events = (data ?? []).map((row: { events: unknown }) => row.events);
  return apiOk({ events });
}
