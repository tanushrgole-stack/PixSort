/**
 * Guest session management.
 *
 * Since guests have no account, we persist their identity in:
 *   1. localStorage (primary — instant, same device)
 *   2. A "resume token" in the guest_sessions table (cross-device)
 *
 * The resume link encodes the token: /resume/[token]
 * When a guest opens that link on another device they are automatically
 * signed in as the same user.
 */

const SESSION_KEY = "pixsort_guest_session";
const EVENTS_KEY = "pixsort_saved_events";

export interface GuestSession {
  userId: string;
  eventId: string;
  token: string;        // the server-issued opaque token
  name: string;
  personId?: string;    // set after face enrollment
  memberStatus: "approved" | "pending";
  createdAt: string;
}

export interface SavedEvent {
  id: string;
  name: string;
  type: string;
  joinCode: string;
  role: "host" | "guest";
  createdAt: string;
  accent?: string;
}

// ── Saved Events (Created / Joined) ──────────────────────────────────────────

export function saveUserEvent(event: SavedEvent): void {
  if (typeof window === "undefined") return;
  try {
    const all = getUserEvents();
    // deduplicate by id or joinCode
    const filtered = all.filter((e) => e.id !== event.id && e.joinCode !== event.joinCode);
    const updated = [event, ...filtered];
    localStorage.setItem(EVENTS_KEY, JSON.stringify(updated.slice(0, 20)));
  } catch {
    // storage error ignored
  }
}

export function getUserEvents(): SavedEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedEvent[];
  } catch {
    return [];
  }
}

// ── Local storage ─────────────────────────────────────────────────────────────

export function saveGuestSession(session: GuestSession): void {
  if (typeof window === "undefined") return;
  try {
    const all = loadAllSessions();
    // keyed by eventId — one session per event
    all[session.eventId] = session;
    localStorage.setItem(SESSION_KEY, JSON.stringify(all));
  } catch {
    // storage full or private browsing — silently ignore
  }
}

export function loadGuestSession(eventId: string): GuestSession | null {
  if (typeof window === "undefined") return null;
  try {
    const all = loadAllSessions();
    return all[eventId] ?? null;
  } catch {
    return null;
  }
}

function loadAllSessions(): Record<string, GuestSession> {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, GuestSession>;
  } catch {
    return {};
  }
}

/** Returns the most recently saved session (any event) */
export function getGuestSession(): GuestSession | null {
  if (typeof window === "undefined") return null;
  try {
    const all = loadAllSessions();
    const sessions = Object.values(all);
    if (sessions.length === 0) return null;
    return sessions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  } catch {
    return null;
  }
}

export function clearGuestSession(eventId: string): void {
  if (typeof window === "undefined") return;
  const all = loadAllSessions();
  delete all[eventId];
  localStorage.setItem(SESSION_KEY, JSON.stringify(all));
}

// ── Server-side session ops (via API) ─────────────────────────────────────────

export async function createServerSession(
  userId: string,
  eventId: string,
  deviceLabel?: string
): Promise<string | null> {
  try {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, event_id: eventId, device_label: deviceLabel }),
    });
    if (!res.ok) return null;
    const { token } = await res.json();
    return token as string;
  } catch {
    return null;
  }
}

export async function resolveSessionToken(token: string): Promise<GuestSession | null> {
  try {
    const res = await fetch(`/api/sessions/${token}`);
    if (!res.ok) return null;
    return (await res.json()) as GuestSession;
  } catch {
    return null;
  }
}

/** Returns the sharable "continue on another device" URL */
export function resumeUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/resume/${token}`;
}

/** Returns device label string for the current browser */
export function getDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Unknown device";
  const ua = navigator.userAgent;
  const mobile = /iPhone|Android|iPad/i.test(ua);
  const browser = /Chrome/i.test(ua)
    ? "Chrome"
    : /Safari/i.test(ua)
    ? "Safari"
    : /Firefox/i.test(ua)
    ? "Firefox"
    : "Browser";
  return `${mobile ? "Mobile" : "Desktop"} · ${browser}`;
}
